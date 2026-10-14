import { Hono } from 'hono'
import { renderer } from './renderer'
import type { HeadData } from './renderer'
import { Home } from './pages/home'
import { ColumnListPage } from './pages/column-list'
import { ColumnDetailPage, buildColumnHead } from './pages/column-detail'
import { AdminLoginPage, AdminColumnListPage, AdminColumnFormPage, AdminSettingsPage } from './pages/admin'
import { TaxCalculatorPage } from './pages/tax-calculator'
import { CATEGORIES, getCategory } from './lib/columns'
import type { Column } from './lib/columns'
import {
  getAllColumns,
  getAllColumnsForAdmin,
  getColumnsByCategoryDb,
  getColumnBySlugDb,
  getColumnByIdDb,
  getRelatedColumnsDb,
  incrementViewsDb,
  createColumnDb,
  updateColumnDb,
  deleteColumnDb,
  isSlugTakenDb,
  seedDatabase,
  type ColumnInput,
  listAdminEmails,
  addAdminEmail,
  updateAdminEmail,
  deleteAdminEmail,
} from './lib/db'
import {
  createSessionToken,
  verifySessionToken,
  getGoogleAuthUrl,
  exchangeCodeForToken,
  isAllowedEmail,
  isOAuthConfigured,
  getRedirectBase,
  type AppEnv,
} from './lib/auth'

// ===== 앱 타입 정의 (D1 + Google OAuth 바인딩) =====
type AppBindings = {
  DB: D1Database
  // Google OAuth (운영 시 wrangler secret put 으로 설정)
  GOOGLE_CLIENT_ID?: string
  GOOGLE_CLIENT_SECRET?: string
  // 접근 허용된 Google 이메일 (콤마/공백 구분)
  ALLOWED_GOOGLE_EMAILS?: string
  // OAuth 리다이렉트 기본 URL (미설정 시 요청 호스트에서 추출)
  OAUTH_REDIRECT_BASE?: string
}

const app = new Hono<{ Bindings: AppBindings }>()

app.use(renderer)

// ===== 헬퍼: baseUrl 추출 =====
function getBaseUrl(c: any): string {
  const proto = c.req.header('x-forwarded-proto') || 'https'
  const host = c.req.header('x-forwarded-host') || c.req.header('host') || 'jung6tax.com'
  return `${proto}://${host}`
}

// ===== 헬퍼: 관리자 인증 검사 (API + 페이지 통합, 비동기) =====
// 1) Authorization Bearer 헤더 또는 쿠키에서 세션 토큰 검증(HMAC)
// 2) D1의 admin_emails 테이블에서 '현재도 활성 관리자인지' 재확인
//    → 설정 UI에서 비활성화하면 다음 요청부터 즉시 차단
async function checkAdminAuth(c: any): Promise<{ authed: boolean; email?: string }> {
  const env = c.env as AppEnv
  let token: string | null = null

  const auth = c.req.header('Authorization')
  if (auth && auth.startsWith('Bearer ')) {
    token = auth.slice(7)
  } else {
    const cookieHeader = c.req.header('cookie') || ''
    const match = cookieHeader.match(/admin_session=([^;]+)/)
    if (match) token = decodeURIComponent(match[1])
  }

  if (!token) return { authed: false }

  const result = await verifySessionToken(token, env)
  if (!result.valid || !result.email) return { authed: false }

  // 세션 토큰은 유효하지만, 그 사이 관리자 권한이 회수됐을 수 있으니 재확인
  const stillAllowed = await isAllowedEmail(result.email, env)
  if (!stillAllowed) return { authed: false }

  return { authed: true, email: result.email }
}

// ===== 메인 랜딩 페이지 =====
app.get('/', (c) => {
  const { authed } = checkAdminAuthCookie(c)
  return c.render(<Home isAdmin={authed} />)
})

// ===== 상담 신청 접수 API =====
app.post('/api/consult', async (c) => {
  try {
    const body = await c.req.json<{
      name?: string
      phone?: string
      business?: string
      message?: string
      _gotcha?: string
      website?: string
      _form_loaded_at?: string
    }>()

    // 봇 차단: honeypot 필드가 채워져 있으면 봇으로 간주
    if ((body._gotcha && body._gotcha.trim() !== '') || (body.website && body.website.trim() !== '')) {
      return c.json({ ok: true, message: '상담 신청이 정상적으로 접수되었습니다.' })
    }

    // 봇 차단: 폼 로드 후 3초 미만 제출은 봇으로 간주
    if (body._form_loaded_at) {
      const elapsed = Date.now() - parseInt(body._form_loaded_at, 10)
      if (!isNaN(elapsed) && elapsed < 3000) {
        return c.json({ ok: true, message: '상담 신청이 정상적으로 접수되었습니다.' })
      }
    }

    if (!body.name || !body.phone) {
      return c.json({ ok: false, error: '이름과 연락처는 필수입니다.' }, 400)
    }

    return c.json({
      ok: true,
      message: '상담 신청이 정상적으로 접수되었습니다. 1분 내로 연락드리겠습니다.',
      received: {
        name: body.name,
        phone: body.phone,
        business: body.business ?? '',
        message: body.message ?? '',
      },
    })
  } catch (e) {
    return c.json({ ok: false, error: '요청 형식이 올바르지 않습니다.' }, 400)
  }
})

// ===== 칼럼 게시판 라우트 (D1 연동, async) =====

// 칼럼 목록 페이지 - 전체보기
app.get('/column', async (c) => {
  const baseUrl = getBaseUrl(c)
  const columns = await getAllColumns(c.env.DB)
  c.set('head', {
    title: '정육점 세무 칼럼 | 명륜세무회계',
    description:
      '정육점·축산물 세무 전문가의 인사이트. 의제매입세액공제, 한우·한돈 매입 관리, 축산물이력제, 정부지원금 등 정육점 세무 실무 칼럼을 제공합니다.',
    ogTitle: '정육점 세무 칼럼 | 명륜세무회계',
    ogDescription:
      '정육점·축산물 세무 전문가의 인사이트 칼럼. 의제매입세액공제부터 정부지원금까지.',
    canonical: `${baseUrl}/column`,
  } as HeadData)
  const { authed } = checkAdminAuthCookie(c)
  return c.render(<ColumnListPage activeCategory={undefined} columns={columns} isAdmin={authed} />)
})

// 칼럼 목록 페이지 - 카테고리 필터
app.get('/column/:categorySlug', async (c) => {
  const categorySlug = c.req.param('categorySlug')
  const category = getCategory(categorySlug)

  if (!category) {
    return c.redirect('/column')
  }

  const baseUrl = getBaseUrl(c)
  const columns = await getColumnsByCategoryDb(c.env.DB, categorySlug)
  c.set('head', {
    title: `${category.label} 칼럼 | 명륜세무회계 정육점 세무`,
    description: category.desc,
    ogTitle: `${category.label} 칼럼 | 명륜세무회계`,
    ogDescription: category.desc,
    canonical: `${baseUrl}/column/${categorySlug}`,
  } as HeadData)
  const { authed } = checkAdminAuthCookie(c)
  return c.render(<ColumnListPage activeCategory={categorySlug} columns={columns} isAdmin={authed} />)
})

// 칼럼 상세 페이지: /column/[카테고리]/[슬러그]
app.get('/column/:categorySlug/:columnSlug', async (c) => {
  const categorySlug = c.req.param('categorySlug')
  const columnSlug = c.req.param('columnSlug')
  const baseUrl = getBaseUrl(c)

  const category = getCategory(categorySlug)
  const column = await getColumnBySlugDb(c.env.DB, categorySlug, columnSlug)

  if (!category || !column) {
    // 404 페이지
    c.set('head', { title: '칼럼을 찾을 수 없습니다 | 명륜세무회계', robots: 'noindex' } as HeadData)
    const { authed } = checkAdminAuthCookie(c)
    return c.render(<ColumnDetailPage column={undefined} related={[]} baseUrl={baseUrl} isAdmin={authed} />)
  }

  // head 데이터 설정 (SEO, OG, canonical, 구조화 데이터)
  const head = buildColumnHead(column, category, baseUrl)
  c.set('head', head)

  // 관련 칼럼 조회
  const related = await getRelatedColumnsDb(c.env.DB, column, 3)

  // 조회수 증가 (비동기, 응답 지연 방지)
  c.executionCtx.waitUntil(incrementViewsDb(c.env.DB, column.id))

  const { authed } = checkAdminAuthCookie(c)
  return c.render(<ColumnDetailPage column={column} related={related} baseUrl={baseUrl} isAdmin={authed} />)
})

// ===== 세금계산기 페이지 (플레이스홀더 - 기능은 추후 구현) =====
app.get('/tax-calculator', (c) => {
  c.set('head', {
    title: '세금계산기 (준비 중) | 명륜세무회계',
    description:
      '정육점·축산물 세무 전용 세금계산기. 현재 준비 중이며, 오픈 시 의제매입세액공제·부가세·종합소득세 시뮬레이션을 제공합니다.',
    robots: 'noindex',
  } as HeadData)
  const { authed } = checkAdminAuthCookie(c)
  return c.render(<TaxCalculatorPage isAdmin={authed} />)
})

// ===== 관리자 페이지 라우트 =====

// 관리자 로그인 페이지 — Google OAuth 설정 여부를 페이지에 전달
app.get('/admin/column/login', async (c) => {
  // 이미 인증된 경우 관리자 목록으로 리다이렉트
  const { authed } = await checkAdminAuth(c)
  if (authed) {
    return c.redirect('/admin/column')
  }
  const oauthReady = isOAuthConfigured(c.env as AppEnv)
  c.set('head', {
    title: '관리자 로그인 | 명륜세무회계 칼럼 관리',
    description: '칼럼 관리자 로그인 페이지',
    robots: 'noindex, nofollow',
  } as HeadData)
  return c.render(<AdminLoginPage oauthReady={oauthReady} />)
})

// 관리자 칼럼 목록 — 세션 + D1 활성 관리자 재확인
app.get('/admin/column', async (c) => {
  const { authed, email } = await checkAdminAuth(c)
  if (!authed) {
    return c.redirect('/admin/column/login')
  }
  const columns = await getAllColumnsForAdmin(c.env.DB)
  c.set('head', {
    title: '칼럼 관리 | 명륜세무회계',
    description: '칼럼 관리자 페이지',
    robots: 'noindex, nofollow',
  } as HeadData)
  return c.render(<AdminColumnListPage columns={columns} userEmail={email} />)
})

// 관리자 칼럼 작성 폼
app.get('/admin/column/new', async (c) => {
  const { authed } = await checkAdminAuth(c)
  if (!authed) {
    return c.redirect('/admin/column/login')
  }
  c.set('head', {
    title: '새 칼럼 작성 | 명륜세무회계 칼럼 관리',
    description: '새 칼럼 작성 페이지',
    robots: 'noindex, nofollow',
  } as HeadData)
  return c.render(<AdminColumnFormPage mode="new" />)
})

// 관리자 칼럼 수정 폼
app.get('/admin/column/edit/:id', async (c) => {
  const { authed } = await checkAdminAuth(c)
  if (!authed) {
    return c.redirect('/admin/column/login')
  }
  const id = parseInt(c.req.param('id'), 10)
  const column = await getColumnByIdDb(c.env.DB, id)
  c.set('head', {
    title: '칼럼 수정 | 명륜세무회계 칼럼 관리',
    description: '칼럼 수정 페이지',
    robots: 'noindex, nofollow',
  } as HeadData)
  return c.render(<AdminColumnFormPage mode="edit" column={column} />)
})

// ===== 관리자 계정 설정 페이지 =====
app.get('/admin/settings', async (c) => {
  const { authed, email } = await checkAdminAuth(c)
  if (!authed) {
    return c.redirect('/admin/column/login')
  }
  const admins = await listAdminEmails(c.env.DB)
  // 환경변수 fallback 활성화 여부 (활성 관리자가 0명일 때 env ALLOWED_GOOGLE_EMAILS로 접근 중)
  const envFallbackActive = admins.filter((a) => a.isActive).length === 0
  const envFallbackList =
    (c.env.ALLOWED_GOOGLE_EMAILS || '')
      .split(/[,\s]+/)
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean)
  c.set('head', {
    title: '관리자 계정 설정 | 명륜세무회계',
    description: '관리자 이메일 관리 페이지',
    robots: 'noindex, nofollow',
  } as HeadData)
  return c.render(
    <AdminSettingsPage
      admins={admins}
      userEmail={email}
      envFallbackActive={envFallbackActive}
      envFallbackList={envFallbackList}
    />
  )
})

// ===== Google OAuth 인증 라우트 =====

// Google 로그인 시작 — Google 인증 페이지로 리다이렉트
app.get('/api/auth/google', (c) => {
  const redirectBase = getRedirectBase(c.env as AppEnv, c.req.header)
  if (!isOAuthConfigured(c.env as AppEnv)) {
    return c.html('<p>Google OAuth가 설정되지 않았습니다. 관리자에게 문의하세요.</p>', 500)
  }
  const authUrl = getGoogleAuthUrl(c.env as AppEnv, redirectBase)
  return c.redirect(authUrl)
})

// Google OAuth 콜백 — 인증 코드를 토큰으로 교환 후 세션 쿠키 설정
app.get('/api/auth/google/callback', async (c) => {
  const code = c.req.query('code')
  const error = c.req.query('error')

  if (error) {
    return c.redirect('/admin/column/login?error=google_denied')
  }
  if (!code) {
    return c.redirect('/admin/column/login?error=no_code')
  }

  const redirectBase = getRedirectBase(c.env as AppEnv, c.req.header)
  const result = await exchangeCodeForToken(code, c.env as AppEnv, redirectBase)

  if (!result.ok || !result.email) {
    const msg = encodeURIComponent(result.error || '인증 실패')
    return c.redirect(`/admin/column/login?error=${msg}`)
  }

  // 허용된 이메일인지 확인 (D1 + env fallback, 비동기)
  const allowed = await isAllowedEmail(result.email, c.env as AppEnv)
  if (!allowed) {
    const msg = encodeURIComponent('접근 권한이 없습니다. 등록된 관리자 계정이 아닙니다.')
    return c.redirect(`/admin/column/login?error=${msg}`)
  }

  // 세션 토큰 발급 (비동기 HMAC)
  const token = await createSessionToken(result.email, c.env as AppEnv)

  // 쿠키 설정 (HttpOnly, Secure, 7일) + 관리자 페이지로 리다이렉트
  const SEVEN_DAYS = 7 * 24 * 60 * 60
  c.header(
    'Set-Cookie',
    `admin_session=${encodeURIComponent(token)}; HttpOnly; Path=/; Max-Age=${SEVEN_DAYS}; SameSite=Lax${redirectBase.startsWith('https://') ? '; Secure' : ''}`
  )
  return c.redirect('/admin/column')
})

// 로그아웃 — 세션 쿠키 삭제
app.post('/api/auth/logout', (c) => {
  c.header(
    'Set-Cookie',
    'admin_session=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax'
  )
  return c.json({ ok: true })
})

app.get('/api/auth/logout', (c) => {
  c.header(
    'Set-Cookie',
    'admin_session=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax'
  )
  return c.redirect('/admin/column/login')
})

// ===== 관리자 API 라우트 (Google OAuth 세션 인증 + CRUD) =====

// 관리자 칼럼 목록 조회 API
app.get('/api/admin/columns', async (c) => {
  const auth = await checkAdminAuth(c)
  if (!auth.authed) {
    return c.json({ ok: false, error: '인증이 필요합니다.' }, 401)
  }
  const columns = await getAllColumnsForAdmin(c.env.DB)
  return c.json({ ok: true, columns })
})

// 관리자 칼럼 생성 API
app.post('/api/admin/column', async (c) => {
  const auth = await checkAdminAuth(c)
  if (!auth.authed) {
    return c.json({ ok: false, error: '인증이 필요합니다.' }, 401)
  }
  try {
    const input = await c.req.json<ColumnInput>()

    // 필수 필드 검증
    if (!input.title || !input.title.trim()) {
      return c.json({ ok: false, error: '제목은 필수입니다.' }, 400)
    }
    if (!input.category || !getCategory(input.category)) {
      return c.json({ ok: false, error: '올바른 카테고리를 선택하세요.' }, 400)
    }
    if (!input.slug || !input.slug.trim()) {
      return c.json({ ok: false, error: 'URL 슬러그는 필수입니다.' }, 400)
    }
    if (!input.content || !input.content.trim()) {
      return c.json({ ok: false, error: '본문은 필수입니다.' }, 400)
    }
    if (!input.published_at) {
      return c.json({ ok: false, error: '발행일은 필수입니다.' }, 400)
    }

    // slug 중복 확인
    const taken = await isSlugTakenDb(c.env.DB, input.slug)
    if (taken) {
      return c.json({ ok: false, error: '이미 사용 중인 슬러그입니다. 다른 슬러그를 사용하세요.' }, 409)
    }

    const id = await createColumnDb(c.env.DB, input)
    if (id === null) {
      return c.json({ ok: false, error: '데이터베이스를 사용할 수 없습니다.' }, 500)
    }
    return c.json({ ok: true, id, message: '칼럼이 저장되었습니다.' })
  } catch (e: any) {
    console.error('create column error:', e)
    const msg = e?.message || '저장 중 오류가 발생했습니다.'
    return c.json({ ok: false, error: msg }, 500)
  }
})

// 관리자 칼럼 수정 API
app.put('/api/admin/column/:id', async (c) => {
  const auth = await checkAdminAuth(c)
  if (!auth.authed) {
    return c.json({ ok: false, error: '인증이 필요합니다.' }, 401)
  }
  try {
    const id = parseInt(c.req.param('id'), 10)
    if (isNaN(id)) {
      return c.json({ ok: false, error: '올바르지 않은 칼럼 ID입니다.' }, 400)
    }

    const input = await c.req.json<ColumnInput>()

    // 필수 필드 검증
    if (!input.title || !input.title.trim()) {
      return c.json({ ok: false, error: '제목은 필수입니다.' }, 400)
    }
    if (!input.category || !getCategory(input.category)) {
      return c.json({ ok: false, error: '올바른 카테고리를 선택하세요.' }, 400)
    }
    if (!input.slug || !input.slug.trim()) {
      return c.json({ ok: false, error: 'URL 슬러그는 필수입니다.' }, 400)
    }
    if (!input.content || !input.content.trim()) {
      return c.json({ ok: false, error: '본문은 필수입니다.' }, 400)
    }

    // slug 중복 확인 (자신 제외)
    const taken = await isSlugTakenDb(c.env.DB, input.slug, id)
    if (taken) {
      return c.json({ ok: false, error: '이미 사용 중인 슬러그입니다. 다른 슬러그를 사용하세요.' }, 409)
    }

    const success = await updateColumnDb(c.env.DB, id, input)
    if (!success) {
      return c.json({ ok: false, error: '데이터베이스를 사용할 수 없습니다.' }, 500)
    }
    return c.json({ ok: true, message: '칼럼이 수정되었습니다.' })
  } catch (e: any) {
    console.error('update column error:', e)
    const msg = e?.message || '수정 중 오류가 발생했습니다.'
    return c.json({ ok: false, error: msg }, 500)
  }
})

// 관리자 칼럼 삭제 API
app.delete('/api/admin/column/:id', async (c) => {
  const auth = await checkAdminAuth(c)
  if (!auth.authed) {
    return c.json({ ok: false, error: '인증이 필요합니다.' }, 401)
  }
  try {
    const id = parseInt(c.req.param('id'), 10)
    if (isNaN(id)) {
      return c.json({ ok: false, error: '올바르지 않은 칼럼 ID입니다.' }, 400)
    }

    const success = await deleteColumnDb(c.env.DB, id)
    if (!success) {
      return c.json({ ok: false, error: '데이터베이스를 사용할 수 없습니다.' }, 500)
    }
    return c.json({ ok: true, message: '칼럼이 삭제되었습니다.' })
  } catch (e: any) {
    console.error('delete column error:', e)
    const msg = e?.message || '삭제 중 오류가 발생했습니다.'
    return c.json({ ok: false, error: msg }, 500)
  }
})

// ===== 관리자 이메일(허용 목록) API =====

// 전체 관리자 이메일 목록 조회
app.get('/api/admin/admins', async (c) => {
  const auth = await checkAdminAuth(c)
  if (!auth.authed) {
    return c.json({ ok: false, error: '인증이 필요합니다.' }, 401)
  }
  const admins = await listAdminEmails(c.env.DB)
  return c.json({ ok: true, admins, currentEmail: auth.email })
})

// 관리자 이메일 추가
app.post('/api/admin/admins', async (c) => {
  const auth = await checkAdminAuth(c)
  if (!auth.authed) {
    return c.json({ ok: false, error: '인증이 필요합니다.' }, 401)
  }
  try {
    const body = await c.req.json<{ email?: string; displayName?: string; note?: string }>()
    if (!body?.email) {
      return c.json({ ok: false, error: '이메일을 입력하세요.' }, 400)
    }
    const result = await addAdminEmail(c.env.DB, {
      email: body.email,
      displayName: body.displayName,
      note: body.note,
    })
    if (!result.ok) {
      return c.json({ ok: false, error: result.error }, 400)
    }
    return c.json({ ok: true, id: result.id, message: '관리자가 추가되었습니다.' })
  } catch (e: any) {
    console.error('add admin error:', e)
    return c.json({ ok: false, error: '요청 형식이 올바르지 않습니다.' }, 400)
  }
})

// 관리자 이메일 수정 (활성 토글, 이름/메모 변경)
app.patch('/api/admin/admins/:id', async (c) => {
  const auth = await checkAdminAuth(c)
  if (!auth.authed) {
    return c.json({ ok: false, error: '인증이 필요합니다.' }, 401)
  }
  try {
    const id = parseInt(c.req.param('id'), 10)
    if (isNaN(id)) {
      return c.json({ ok: false, error: '잘못된 ID입니다.' }, 400)
    }
    const body = await c.req.json<{ displayName?: string | null; note?: string | null; isActive?: boolean }>()

    // 안전장치: 본인을 비활성화하여 자신을 잠가버리는 상황 방지
    if (body.isActive === false) {
      const all = await listAdminEmails(c.env.DB)
      const target = all.find((a) => a.id === id)
      if (target && target.email.toLowerCase() === (auth.email || '').toLowerCase()) {
        return c.json(
          { ok: false, error: '현재 로그인한 본인 계정은 비활성화할 수 없습니다.' },
          400
        )
      }
      // 추가 안전장치: 활성 관리자가 본인 1명뿐일 때 마지막 활성 계정을 비활성화하면 잠김
      const activeOthers = all.filter((a) => a.isActive && a.id !== id)
      if (activeOthers.length === 0) {
        return c.json(
          { ok: false, error: '마지막 활성 관리자는 비활성화할 수 없습니다. (잠김 방지)' },
          400
        )
      }
    }

    const result = await updateAdminEmail(c.env.DB, id, body)
    if (!result.ok) {
      return c.json({ ok: false, error: result.error }, 400)
    }
    return c.json({ ok: true, message: '수정되었습니다.' })
  } catch (e: any) {
    console.error('update admin error:', e)
    return c.json({ ok: false, error: '요청 형식이 올바르지 않습니다.' }, 400)
  }
})

// 관리자 이메일 삭제
app.delete('/api/admin/admins/:id', async (c) => {
  const auth = await checkAdminAuth(c)
  if (!auth.authed) {
    return c.json({ ok: false, error: '인증이 필요합니다.' }, 401)
  }
  try {
    const id = parseInt(c.req.param('id'), 10)
    if (isNaN(id)) {
      return c.json({ ok: false, error: '잘못된 ID입니다.' }, 400)
    }
    // 안전장치: 본인 삭제 금지
    const all = await listAdminEmails(c.env.DB)
    const target = all.find((a) => a.id === id)
    if (!target) {
      return c.json({ ok: false, error: '존재하지 않는 관리자입니다.' }, 404)
    }
    if (target.email.toLowerCase() === (auth.email || '').toLowerCase()) {
      return c.json(
        { ok: false, error: '현재 로그인한 본인 계정은 삭제할 수 없습니다. 다른 관리자 계정으로 로그인 후 삭제해주세요.' },
        400
      )
    }
    const result = await deleteAdminEmail(c.env.DB, id)
    if (!result.ok) {
      return c.json({ ok: false, error: result.error }, 500)
    }
    return c.json({ ok: true, message: '삭제되었습니다.' })
  } catch (e: any) {
    console.error('delete admin error:', e)
    return c.json({ ok: false, error: '삭제 중 오류가 발생했습니다.' }, 500)
  }
})

// ===== 시드 엔드포인트 =====
// D1이 비어있을 때 더미 데이터 18개 삽입
// 인증 필요 (관리자만 실행 가능)
app.post('/api/admin/seed', async (c) => {
  const auth = await checkAdminAuth(c)
  if (!auth.authed) {
    return c.json({ ok: false, error: '인증이 필요합니다.' }, 401)
  }
  try {
    const result = await seedDatabase(c.env.DB)
    if (result.skipped) {
      return c.json({ ok: true, message: '데이터베이스에 이미 데이터가 있어 시드를 건너뛰었습니다.', seeded: 0 })
    }
    return c.json({ ok: true, message: `${result.seeded}개의 더미 칼럼이 삽입되었습니다.`, seeded: result.seeded })
  } catch (e: any) {
    console.error('seed error:', e)
    return c.json({ ok: false, error: '시드 중 오류가 발생했습니다.' }, 500)
  }
})

// ===== SEO 인프라 라우트 =====

// robots.txt
app.get('/robots.txt', (c) => {
  const baseUrl = getBaseUrl(c)
  const robots = `User-agent: *
Allow: /
Disallow: /admin/
Disallow: /api/admin/
Disallow: /api/auth/

Sitemap: ${baseUrl}/sitemap.xml
Sitemap: ${baseUrl}/sitemap-columns.xml
`
  return c.text(robots, 200, { 'Content-Type': 'text/plain; charset=utf-8' })
})

// 메인 sitemap.xml
app.get('/sitemap.xml', (c) => {
  const baseUrl = getBaseUrl(c)
  const today = new Date().toISOString().slice(0, 10)
  const urls = [
    { loc: `${baseUrl}/`, priority: '1.0', changefreq: 'monthly' },
    { loc: `${baseUrl}/column`, priority: '0.9', changefreq: 'weekly' },
  ]

  CATEGORIES.forEach((cat) => {
    urls.push({
      loc: `${baseUrl}/column/${cat.slug}`,
      priority: '0.8',
      changefreq: 'weekly',
    })
  })

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (u) => `  <url>
    <loc>${u.loc}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`
  )
  .join('\n')}
</urlset>`

  return c.body(xml, 200, { 'Content-Type': 'application/xml; charset=utf-8' })
})

// 칼럼 전용 sitemap-columns.xml (D1에서 동적 생성)
app.get('/sitemap-columns.xml', async (c) => {
  const baseUrl = getBaseUrl(c)
  const columns = await getAllColumns(c.env.DB)

  const urls = columns.map((col) => ({
    loc: `${baseUrl}/column/${col.category}/${col.slug}`,
    lastmod: col.publishedAt,
    priority: '0.7',
  }))

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (u) => `  <url>
    <loc>${u.loc}</loc>
    <lastmod>${u.lastmod}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>${u.priority}</priority>
  </url>`
  )
  .join('\n')}
</urlset>`

  return c.body(xml, 200, { 'Content-Type': 'application/xml; charset=utf-8' })
})

export default app
