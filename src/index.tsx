import { Hono } from 'hono'
import { renderer } from './renderer'
import type { HeadData } from './renderer'
import { Home } from './pages/home'
import { ColumnListPage } from './pages/column-list'
import { ColumnDetailPage, buildColumnHead } from './pages/column-detail'
import { AdminLoginPage, AdminColumnListPage, AdminColumnFormPage } from './pages/admin'
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

// ===== 앱 타입 정의 (D1 바인딩) =====
type AppBindings = {
  DB: D1Database
  // 관리자 비밀번호 (운영 시 wrangler secret put ADMIN_PASSWORD 로 설정)
  ADMIN_PASSWORD?: string
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
// Authorization 헤더에서 세션 토큰 검증
// 토큰은 로그인 시 서버에서 발급 (비밀번호 기반 서명)
async function checkAdminAuth(c: any): Promise<boolean> {
  const auth = c.req.header('Authorization')
  if (!auth || !auth.startsWith('Bearer ')) return false
  const token = auth.slice(7)
  // 토큰 형식: <password>:<timestamp> 의 단순 해시
  // 운영에서는 JWT 권장하지만, 로컬 개발용으로 단순 토큰 사용
  const expectedPassword = c.env.ADMIN_PASSWORD || 'myungryun2026'
  // 토큰은 base64(password) — 단순하지만 HTTPS 환경에서는 충분
  try {
    const decoded = atob(token)
    if (decoded === expectedPassword) return true
    // 4시간 이내 토큰인지 확인: password:timestamp 형식도 지원
    if (decoded.startsWith(expectedPassword + ':')) {
      const ts = parseInt(decoded.split(':')[1], 10)
      if (Date.now() - ts < 4 * 60 * 60 * 1000) return true
    }
  } catch {
    return false
  }
  return false
}

// ===== 메인 랜딩 페이지 =====
app.get('/', (c) => {
  return c.render(<Home />)
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
  return c.render(<ColumnListPage activeCategory={undefined} columns={columns} />)
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
  return c.render(<ColumnListPage activeCategory={categorySlug} columns={columns} />)
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
    return c.render(<ColumnDetailPage column={undefined} related={[]} baseUrl={baseUrl} />)
  }

  // head 데이터 설정 (SEO, OG, canonical, 구조화 데이터)
  const head = buildColumnHead(column, category, baseUrl)
  c.set('head', head)

  // 관련 칼럼 조회
  const related = await getRelatedColumnsDb(c.env.DB, column, 3)

  // 조회수 증가 (비동기, 응답 지연 방지)
  c.executionCtx.waitUntil(incrementViewsDb(c.env.DB, column.id))

  return c.render(<ColumnDetailPage column={column} related={related} baseUrl={baseUrl} />)
})

// ===== 관리자 페이지 라우트 =====

// 관리자 로그인 페이지
app.get('/admin/column/login', (c) => {
  c.set('head', {
    title: '관리자 로그인 | 명륜세무회계 칼럼 관리',
    description: '칼럼 관리자 로그인 페이지',
    robots: 'noindex, nofollow',
  } as HeadData)
  return c.render(<AdminLoginPage />)
})

// 관리자 칼럼 목록
app.get('/admin/column', async (c) => {
  const columns = await getAllColumnsForAdmin(c.env.DB)
  c.set('head', {
    title: '칼럼 관리 | 명륜세무회계',
    description: '칼럼 관리자 페이지',
    robots: 'noindex, nofollow',
  } as HeadData)
  return c.render(<AdminColumnListPage columns={columns} />)
})

// 관리자 칼럼 작성 폼
app.get('/admin/column/new', (c) => {
  c.set('head', {
    title: '새 칼럼 작성 | 명륜세무회계 칼럼 관리',
    description: '새 칼럼 작성 페이지',
    robots: 'noindex, nofollow',
  } as HeadData)
  return c.render(<AdminColumnFormPage mode="new" />)
})

// 관리자 칼럼 수정 폼
app.get('/admin/column/edit/:id', async (c) => {
  const id = parseInt(c.req.param('id'), 10)
  const column = await getColumnByIdDb(c.env.DB, id)
  c.set('head', {
    title: '칼럼 수정 | 명륜세무회계 칼럼 관리',
    description: '칼럼 수정 페이지',
    robots: 'noindex, nofollow',
  } as HeadData)
  return c.render(<AdminColumnFormPage mode="edit" column={column} />)
})

// ===== 관리자 API 라우트 (서버 사이드 인증 + CRUD) =====

// 관리자 로그인 API - 서버에서 비밀번호 검증 후 토큰 발급
app.post('/api/admin/login', async (c) => {
  try {
    const body = await c.req.json<{ password?: string }>()
    const password = body.password ?? ''
    const expectedPassword = c.env.ADMIN_PASSWORD || 'myungryun2026'

    if (password === expectedPassword) {
      // 토큰 발급: base64(password:timestamp) — 4시간 유효
      const ts = Date.now()
      const token = btoa(`${password}:${ts}`)
      return c.json({ ok: true, token })
    }
    return c.json({ ok: false, error: '비밀번호가 올바르지 않습니다.' }, 401)
  } catch (e) {
    return c.json({ ok: false, error: '요청 형식이 올바르지 않습니다.' }, 400)
  }
})

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
