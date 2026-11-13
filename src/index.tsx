import { Hono } from 'hono'
import { renderer } from './renderer'
import type { HeadData } from './renderer'
import { Home } from './pages/home'
import { ColumnListPage } from './pages/column-list'
import { ColumnDetailPage, buildColumnHead } from './pages/column-detail'
import { AdminLoginPage, AdminColumnListPage, AdminColumnFormPage, AdminSettingsPage } from './pages/admin'
import { TaxCalculatorPage } from './pages/tax-calculator'
import { CATEGORIES, getCategory, getModifiedDate, todayKst } from './lib/columns'
import type { Column } from './lib/columns'
import { cloudinaryConfig, importImage, CLOUDINARY_FOLDER } from './lib/cloudinary'
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
  listDraftsDb,
  findColumnsBySourceDb,
  isSlugTakenDb,
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
  createOAuthState,
  SESSION_MAX_AGE_SECONDS,
  isValidOAuthState,
  signCloudinaryParams,
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
  // 세션 쿠키 서명용 비밀키
  SESSION_SECRET?: string
  // Cloudinary 서명 업로드용 (관리자만 업로드 가능하게)
  CLOUDINARY_API_KEY?: string
  CLOUDINARY_API_SECRET?: string
  CLOUDINARY_CLOUD_NAME?: string
  // '1' 이면 검색엔진 수집 제외 (시연용 사이트 전용, 실제 사이트에는 설정하지 않음)
  SITE_NOINDEX?: string
}

// Cloudinary 업로드 preset (공개값). cloud name·폴더는 lib/cloudinary.ts
const CLOUDINARY_UPLOAD_PRESET = 'jung6tax_upload'

// 네이버 원본 주소만 저장 (카페·블로그, 500자 이내). 그 밖의 값은 버림
function normalizeSourceUrl(raw: unknown): string | null {
  if (typeof raw !== 'string') return null
  const url = raw.trim()
  if (!url || url.length > 500) return null
  return /^https:\/\/(cafe|blog)\.naver\.com\//i.test(url) ? url : null
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
  let fromCookie = false

  const auth = c.req.header('Authorization')
  if (auth && auth.startsWith('Bearer ')) {
    token = auth.slice(7)
  } else {
    const cookieHeader = c.req.header('cookie') || ''
    const match = cookieHeader.match(/admin_session=([^;]+)/)
    if (match) {
      token = decodeURIComponent(match[1])
      fromCookie = true
    }
  }

  if (!token) return { authed: false }

  const result = await verifySessionToken(token, env)
  if (!result.valid || !result.email) return { authed: false }

  // 세션 토큰은 유효하지만, 그 사이 관리자 권한이 회수됐을 수 있으니 재확인
  const stillAllowed = await isAllowedEmail(result.email, env)
  if (!stillAllowed) return { authed: false }

  // 자동 연장: 발급된 지 하루가 지난 쿠키는 새 30일짜리로 교체
  // → 30일 안에 한 번이라도 방문하면 로그인이 계속 유지됨 (매 요청마다 갱신하지 않도록 하루 간격)
  const ONE_DAY_MS = 24 * 60 * 60 * 1000
  if (fromCookie && result.issuedAt && Date.now() - result.issuedAt > ONE_DAY_MS) {
    const fresh = await createSessionToken(result.email, env)
    setSessionCookie(c, fresh)
  }

  return { authed: true, email: result.email }
}

// ===== 헬퍼: 관리자 세션 쿠키 설정 (HttpOnly, 30일, https 에서는 Secure) =====
function setSessionCookie(c: any, token: string): void {
  const redirectBase = getRedirectBase(c.env as AppEnv, (name: string) => c.req.header(name))
  c.header(
    'Set-Cookie',
    `admin_session=${encodeURIComponent(token)}; HttpOnly; Path=/; Max-Age=${SESSION_MAX_AGE_SECONDS}; SameSite=Lax${redirectBase.startsWith('https://') ? '; Secure' : ''}`,
    { append: true }
  )
}

// ===== 헬퍼: 공개 페이지용 관리자 여부 체크 (비동기) =====
// 공개 페이지(홈, 칼럼 목록/상세 등)에서 관리자 버튼(관리자페이지·글쓰기·수정·삭제)을
// 노출할지 결정. 쿠키 서명 + D1 admin_emails 재확인까지 하므로
// 설정에서 권한을 회수하면 버튼도 즉시 사라짐.
// 쿠키가 없는 일반 방문자는 D1 조회 없이 바로 false.
async function checkAdminAuthCookie(c: any): Promise<{ authed: boolean; email?: string }> {
  const cookieHeader = c.req.header('cookie') || ''
  if (!/admin_session=/.test(cookieHeader)) return { authed: false }
  const result = await checkAdminAuth(c)
  if (result.authed) {
    // 관리자 버튼이 들어간 HTML 이 CDN/브라우저 공용 캐시에 저장되어
    // 다른 방문자에게 보이는 일이 없도록 캐시 금지
    c.header('Cache-Control', 'private, no-store')
  }
  return result
}

// ===== 메인 랜딩 페이지 =====
app.get('/', async (c) => {
  const { authed } = await checkAdminAuthCookie(c)
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
  const { authed } = await checkAdminAuthCookie(c)
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
  const { authed } = await checkAdminAuthCookie(c)
  return c.render(<ColumnListPage activeCategory={categorySlug} columns={columns} isAdmin={authed} />)
})

// 칼럼 상세 페이지: /column/[카테고리]/[슬러그]
app.get('/column/:categorySlug/:columnSlug', async (c) => {
  const categorySlug = c.req.param('categorySlug')
  const columnSlug = c.req.param('columnSlug')
  const baseUrl = getBaseUrl(c)

  const category = getCategory(categorySlug)
  const { authed } = await checkAdminAuthCookie(c)
  // 관리자는 임시저장 글도 미리보기 가능 (방문자에게는 '찾을 수 없음')
  const column = await getColumnBySlugDb(c.env.DB, categorySlug, columnSlug, authed)

  if (!category || !column) {
    // 404 페이지
    c.set('head', { title: '칼럼을 찾을 수 없습니다 | 명륜세무회계', robots: 'noindex' } as HeadData)
    return c.render(<ColumnDetailPage column={undefined} related={[]} baseUrl={baseUrl} isAdmin={authed} />)
  }

  // head 데이터 설정 (SEO, OG, canonical, 구조화 데이터)
  const head = buildColumnHead(column, category, baseUrl)
  if (column.isPublished === false) head.robots = 'noindex, nofollow'
  c.set('head', head)

  // 관련 칼럼 조회
  const related = await getRelatedColumnsDb(c.env.DB, column, 3)

  // 조회수 증가 (비동기, 응답 지연 방지) — 임시저장 글 미리보기는 제외
  if (column.isPublished !== false) {
    c.executionCtx.waitUntil(incrementViewsDb(c.env.DB, column.id))
  }

  return c.render(<ColumnDetailPage column={column} related={related} baseUrl={baseUrl} isAdmin={authed} />)
})

// ===== 세금계산기 페이지 (플레이스홀더 - 기능은 추후 구현) =====
app.get('/tax-calculator', async (c) => {
  c.set('head', {
    title: '세금계산기 (준비 중) | 명륜세무회계',
    description:
      '정육점·축산물 세무 전용 세금계산기. 현재 준비 중이며, 오픈 시 의제매입세액공제·부가세·종합소득세 시뮬레이션을 제공합니다.',
    robots: 'noindex',
  } as HeadData)
  const { authed } = await checkAdminAuthCookie(c)
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
// 로그인/로그아웃 후 돌아갈 주소 — 같은 사이트 안의 경로만 허용 (외부 주소로 튕기는 것 방지)
function safeNextPath(raw: string | undefined | null): string | null {
  if (!raw) return null
  let v = raw
  try { v = decodeURIComponent(raw) } catch { return null }
  if (v.length > 500 || !v.startsWith('/') || v.startsWith('//') || v.includes('\\') || /[\x00-\x1f]/.test(v)) return null
  if (v.startsWith('/api/')) return null
  return v
}

app.get('/api/auth/google', (c) => {
  const redirectBase = getRedirectBase(c.env as AppEnv, (name: string) => c.req.header(name))
  if (!isOAuthConfigured(c.env as AppEnv)) {
    return c.html('<p>Google OAuth가 설정되지 않았습니다. 관리자에게 문의하세요.</p>', 500)
  }
  const secure = redirectBase.startsWith('https://') ? '; Secure' : ''
  // 로그인 CSRF 방지용 state — 10분간 유효한 쿠키에 저장 후 콜백에서 대조
  const state = createOAuthState()
  c.header('Set-Cookie', `oauth_state=${state}; HttpOnly; Path=/api/auth/google; Max-Age=600; SameSite=Lax${secure}`)
  // 로그인 후 돌아갈 페이지 (사이트 하단 '관리자' 링크에서 넘어온 경우)
  const next = safeNextPath(c.req.query('next'))
  if (next) {
    c.header(
      'Set-Cookie',
      `oauth_next=${encodeURIComponent(next)}; HttpOnly; Path=/api/auth/google; Max-Age=600; SameSite=Lax${secure}`,
      { append: true }
    )
  }
  const authUrl = getGoogleAuthUrl(c.env as AppEnv, redirectBase, state)
  return c.redirect(authUrl)
})

// Google OAuth 콜백 — 인증 코드를 토큰으로 교환 후 세션 쿠키 설정
app.get('/api/auth/google/callback', async (c) => {
  const code = c.req.query('code')
  const error = c.req.query('error')

  // state 쿠키는 한 번 쓰고 바로 삭제
  const stateMatch = (c.req.header('cookie') || '').match(/oauth_state=([^;]+)/)
  const nextMatch = (c.req.header('cookie') || '').match(/oauth_next=([^;]+)/)
  const nextPath = safeNextPath(nextMatch?.[1])
  c.header('Set-Cookie', 'oauth_state=; HttpOnly; Path=/api/auth/google; Max-Age=0; SameSite=Lax')
  c.header('Set-Cookie', 'oauth_next=; HttpOnly; Path=/api/auth/google; Max-Age=0; SameSite=Lax', { append: true })

  if (error) {
    return c.redirect('/admin/column/login?error=google_denied')
  }
  if (!code) {
    return c.redirect('/admin/column/login?error=no_code')
  }
  if (!isValidOAuthState(stateMatch?.[1], c.req.query('state'))) {
    const msg = encodeURIComponent('로그인 요청이 만료되었거나 올바르지 않습니다. 다시 시도해 주세요.')
    return c.redirect(`/admin/column/login?error=${msg}`)
  }

  const redirectBase = getRedirectBase(c.env as AppEnv, (name: string) => c.req.header(name))
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

  // 쿠키 설정 (HttpOnly, Secure, 30일) + 관리자 페이지로 리다이렉트
  setSessionCookie(c, token)
  // 사이트에서 로그인한 경우 보던 페이지로 복귀 (관리 버튼이 켜진 상태), 아니면 칼럼 관리 목록
  return c.redirect(nextPath || '/admin/column')
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
  // 사이트 하단 '로그아웃'에서 온 경우 보던 페이지로 (관리자 전용 화면이면 홈으로)
  const next = safeNextPath(c.req.query('next'))
  if (next) return c.redirect(next.startsWith('/admin') ? '/' : next)
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

// ===== 칼럼 입력값 검증 =====
// 발행: 모든 필수 항목 확인
// 임시저장(is_published = 0): 제목만 있으면 저장하고, 비어 있는 항목은 기본값으로 채움
// fallbackDate: 화면이 발행일을 보내지 않았을 때 쓸 날짜 (새 글=오늘, 기존 글=저장된 날짜)
function prepareColumnInput(input: ColumnInput, fallbackDate: string): string | null {
  const isDraft = input.is_published === 0
  input.is_published = isDraft ? 0 : 1
  input.source_url = normalizeSourceUrl(input.source_url)
  input.focus_keyword =
    typeof input.focus_keyword === 'string' ? input.focus_keyword.trim().slice(0, 50) || null : null
  if (!input.title || !input.title.trim()) return '제목은 필수입니다.'
  if (!input.published_at) input.published_at = fallbackDate
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.published_at)) return '발행일 형식이 올바르지 않습니다.'
  if (isDraft) {
    if (!input.category || !getCategory(input.category)) input.category = CATEGORIES[0].slug
    if (!input.slug || !input.slug.trim()) input.slug = `draft-${Date.now()}`
    if (!input.content) input.content = ''
    return null
  }
  if (!input.category || !getCategory(input.category)) return '올바른 카테고리를 선택하세요.'
  if (!input.slug || !input.slug.trim()) return 'URL 슬러그는 필수입니다.'
  if (!input.content || !input.content.trim()) return '본문은 필수입니다.'
  return null
}

// 관리자 칼럼 생성 API
app.post('/api/admin/column', async (c) => {
  const auth = await checkAdminAuth(c)
  if (!auth.authed) {
    return c.json({ ok: false, error: '인증이 필요합니다.' }, 401)
  }
  try {
    const input = await c.req.json<ColumnInput>()

    // 필수 필드 검증 (임시저장은 제목만)
    const invalid = prepareColumnInput(input, todayKst())
    if (invalid) {
      return c.json({ ok: false, error: invalid }, 400)
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
    return c.json({
      ok: true,
      id,
      slug: input.slug,
      category: input.category,
      publishedAt: input.published_at,
      isPublished: input.is_published === 1,
      message: input.is_published === 1 ? '칼럼이 저장되었습니다.' : '임시저장되었습니다.',
    })
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

    // 필수 필드 검증 (임시저장은 제목만)
    const current = input.published_at ? null : await getColumnByIdDb(c.env.DB, id)
    const invalid = prepareColumnInput(input, current?.publishedAt || todayKst())
    if (invalid) {
      return c.json({ ok: false, error: invalid }, 400)
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
    return c.json({
      ok: true,
      id,
      slug: input.slug,
      category: input.category,
      publishedAt: input.published_at,
      isPublished: input.is_published === 1,
      message: input.is_published === 1 ? '칼럼이 수정되었습니다.' : '임시저장되었습니다.',
    })
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

// 임시저장 글 목록 API — 글쓰기 화면의 '임시저장 | N' 버튼과 목록 창에서 사용
app.get('/api/admin/drafts', async (c) => {
  const auth = await checkAdminAuth(c)
  if (!auth.authed) {
    return c.json({ ok: false, error: '인증이 필요합니다.' }, 401)
  }
  try {
    const drafts = await listDraftsDb(c.env.DB)
    return c.json({ ok: true, drafts })
  } catch (e: any) {
    console.error('list drafts error:', e)
    return c.json({ ok: false, error: '임시저장 글을 불러오지 못했습니다.' }, 500)
  }
})

// Cloudinary 업로드 서명 발급 API — 관리자에게만 서명을 내려줌
// 서명 키가 설정되지 않았으면 signed:false 를 돌려주고, 클라이언트는 unsigned preset 으로 업로드
app.post('/api/admin/cloudinary-signature', async (c) => {
  const auth = await checkAdminAuth(c)
  if (!auth.authed) {
    return c.json({ ok: false, error: '인증이 필요합니다.' }, 401)
  }
  const cfg = cloudinaryConfig(c.env)
  if (!cfg) {
    return c.json({ ok: true, signed: false })
  }
  // 직접 올리는 사진도 정육점 폴더(jung6tax)로
  const params = {
    folder: CLOUDINARY_FOLDER,
    timestamp: String(Math.floor(Date.now() / 1000)),
    upload_preset: CLOUDINARY_UPLOAD_PRESET,
  }
  const signature = await signCloudinaryParams(params, cfg.apiSecret)
  return c.json({
    ok: true,
    signed: true,
    cloudName: cfg.cloudName,
    apiKey: cfg.apiKey,
    ...params,
    signature,
  })
})

// 외부 사진(네이버 등) 옮기기 API — 서버가 Referer 없이 받아 정육점 Cloudinary 폴더로 서명 업로드
app.post('/api/admin/cloudinary/import', async (c) => {
  const auth = await checkAdminAuth(c)
  if (!auth.authed) {
    return c.json({ ok: false, error: '인증이 필요합니다.' }, 401)
  }
  const cfg = cloudinaryConfig(c.env)
  if (!cfg) {
    return c.json(
      { ok: false, error: 'Cloudinary 키(CLOUDINARY_API_KEY / CLOUDINARY_API_SECRET)가 설정되지 않았습니다.' },
      503
    )
  }
  const body = await c.req.json<{ url?: string }>().catch(() => ({} as { url?: string }))
  const result = await importImage(cfg, body && body.url)
  return c.json(result, result.ok ? 200 : 502)
})

// 같은 네이버 원본 주소로 등록된 글 찾기 (네이버 글 담기 중복 확인)
app.get('/api/admin/columns/by-source', async (c) => {
  const auth = await checkAdminAuth(c)
  if (!auth.authed) {
    return c.json({ ok: false, error: '인증이 필요합니다.' }, 401)
  }
  const sourceUrl = normalizeSourceUrl(c.req.query('url'))
  if (!sourceUrl) return c.json({ ok: true, matches: [] })
  const exclude = parseInt(c.req.query('exclude') || '', 10)
  const matches = await findColumnsBySourceDb(c.env.DB, sourceUrl, isNaN(exclude) ? undefined : exclude)
  return c.json({ ok: true, matches })
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


// ===== SEO 인프라 라우트 =====

// robots.txt
app.get('/robots.txt', (c) => {
  // 시연용 사이트: 전체 수집 금지
  if (c.env.SITE_NOINDEX === '1') {
    return c.text('User-agent: *\nDisallow: /\n', 200, { 'Content-Type': 'text/plain; charset=utf-8' })
  }
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
    lastmod: getModifiedDate(col),
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
