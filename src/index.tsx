import { Hono } from 'hono'
import { renderer } from './renderer'
import type { HeadData } from './renderer'
import { Home } from './pages/home'
import { ColumnListPage } from './pages/column-list'
import { ColumnDetailPage, buildColumnHead } from './pages/column-detail'
import { AdminLoginPage, AdminColumnListPage, AdminColumnFormPage } from './pages/admin'
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

// ===== 헬퍼: 관리자 인증 검사 (API용) =====
// Authorization 헤더 또는 쿠키에서 Google OAuth 세션 토큰 검증
// 토큰은 Google 로그인 후 서버에서 발급 (HMAC 서명 포함)
async function checkAdminAuth(c: any): Promise<boolean> {
  // 1. Authorization Bearer 헤더 확인
  const auth = c.req.header('Authorization')
  if (auth && auth.startsWith('Bearer ')) {
    const token = auth.slice(7)
    const result = verifySessionToken(token, c.env as AppEnv)
    if (result.valid) return true
  }
  // 2. 쿠키에서 admin_session 토큰 확인 (fetch 시 자동 전송)
  const cookieHeader = c.req.header('cookie') || ''
  const match = cookieHeader.match(/admin_session=([^;]+)/)
  if (match) {
    const token = decodeURIComponent(match[1])
    const result = verifySessionToken(token, c.env as AppEnv)
    if (result.valid) return true
  }
  return false
}

// ===== 헬퍼: 페이지 라우트용 쿠키 기반 인증 검사 =====
// 관리자 페이지 렌더링 시 쿠키에서 토큰을 읽어 인증 확인
function checkAdminAuthCookie(c: any): { authed: boolean; email?: string } {
  // 쿠키에서 admin_session 토큰 추출
  const cookieHeader = c.req.header('cookie') || ''
  const match = cookieHeader.match(/admin_session=([^;]+)/)
  if (!match) return { authed: false }
  const token = decodeURIComponent(match[1])
  const result = verifySessionToken(token, c.env as AppEnv)
  if (result.valid) {
    return { authed: true, email: result.email }
  }
  return { authed: false }
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
app.get('/admin/column/login', (c) => {
  // 이미 인증된 경우 관리자 목록으로 리다이렉트
  const { authed } = checkAdminAuthCookie(c)
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

// 관리자 칼럼 목록 — 쿠키 인증 필요
app.get('/admin/column', async (c) => {
  const { authed, email } = checkAdminAuthCookie(c)
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

// 관리자 칼럼 작성 폼 — 쿠키 인증 필요
app.get('/admin/column/new', (c) => {
  const { authed } = checkAdminAuthCookie(c)
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

// 관리자 칼럼 수정 폼 — 쿠키 인증 필요
app.get('/admin/column/edit/:id', async (c) => {
  const { authed } = checkAdminAuthCookie(c)
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

  // 허용된 이메일인지 확인
  if (!isAllowedEmail(result.email, c.env as AppEnv)) {
    const msg = encodeURIComponent('허용되지 않은 Google 계정입니다.')
    return c.redirect(`/admin/column/login?error=${msg}`)
  }

  // 세션 토큰 발급
  const token = createSessionToken(result.email, c.env as AppEnv)

  // 쿠키 설정 (HttpOnly, Secure, 4시간) + 관리자 페이지로 리다이렉트
  c.header(
    'Set-Cookie',
    `admin_session=${encodeURIComponent(token)}; HttpOnly; Path=/; Max-Age=14400; SameSite=Lax${redirectBase.startsWith('https://') ? '; Secure' : ''}`
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
  if (!await checkAdminAuth(c)) {
    return c.json({ ok: false, error: '인증이 필요합니다.' }, 401)
  }
  const columns = await getAllColumnsForAdmin(c.env.DB)
  return c.json({ ok: true, columns })
})

// 관리자 칼럼 생성 API
app.post('/api/admin/column', async (c) => {
  if (!await checkAdminAuth(c)) {
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
  if (!await checkAdminAuth(c)) {
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
  if (!await checkAdminAuth(c)) {
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

// ===== 시드 엔드포인트 =====
// D1이 비어있을 때 더미 데이터 18개 삽입
// 인증 필요 (관리자만 실행 가능)
app.post('/api/admin/seed', async (c) => {
  if (!await checkAdminAuth(c)) {
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
