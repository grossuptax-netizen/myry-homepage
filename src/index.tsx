import { Hono } from 'hono'
import { renderer } from './renderer'
import type { HeadData } from './renderer'
import { Home } from './pages/home'
import { ColumnListPage } from './pages/column-list'
import { ColumnDetailPage, buildColumnHead } from './pages/column-detail'
import { AdminLoginPage, AdminColumnListPage, AdminColumnFormPage } from './pages/admin'
import { CATEGORIES, getCategory } from './lib/columns'
import { SORTED_COLUMNS, getColumnBySlug, DUMMY_COLUMNS } from './lib/dummy-data'

const app = new Hono()

app.use(renderer)

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

// ===== 칼럼 게시판 라우트 =====

// baseUrl 결정 (OG 이미지, canonical, sitemap에 사용)
function getBaseUrl(c: any): string {
  // Cloudflare Pages 환경에서는 요청 헤더에서 도메인 추출
  const proto = c.req.header('x-forwarded-proto') || 'https'
  const host = c.req.header('x-forwarded-host') || c.req.header('host') || 'jung6tax.com'
  return `${proto}://${host}`
}

// 칼럼 목록 페이지 - 전체보기
app.get('/column', (c) => {
  const baseUrl = getBaseUrl(c)
  c.set('head', {
    title: '정육점 세무 칼럼 | 명륜세무회계',
    description:
      '정육점·축산물 세무 전문가의 인사이트. 의제매입세액공제, 한우·한돈 매입 관리, 축산물이력제, 정부지원금 등 정육점 세무 실무 칼럼을 제공합니다.',
    ogTitle: '정육점 세무 칼럼 | 명륜세무회계',
    ogDescription:
      '정육점·축산물 세무 전문가의 인사이트 칼럼. 의제매입세액공제부터 정부지원금까지.',
    canonical: `${baseUrl}/column`,
  } as HeadData)
  return c.render(<ColumnListPage activeCategory={undefined} />)
})

// 칼럼 목록 페이지 - 카테고리 필터
app.get('/column/:categorySlug', (c) => {
  const categorySlug = c.req.param('categorySlug')
  const category = getCategory(categorySlug)

  if (!category) {
    // 존재하지 않는 카테고리는 전체 목록으로 리다이렉트
    return c.redirect('/column')
  }

  const baseUrl = getBaseUrl(c)
  c.set('head', {
    title: `${category.label} 칼럼 | 명륜세무회계 정육점 세무`,
    description: category.desc,
    ogTitle: `${category.label} 칼럼 | 명륜세무회계`,
    ogDescription: category.desc,
    canonical: `${baseUrl}/column/${categorySlug}`,
  } as HeadData)
  return c.render(<ColumnListPage activeCategory={categorySlug} />)
})

// 칼럼 상세 페이지: /column/[카테고리]/[슬러그]
app.get('/column/:categorySlug/:columnSlug', (c) => {
  const categorySlug = c.req.param('categorySlug')
  const columnSlug = c.req.param('columnSlug')
  const baseUrl = getBaseUrl(c)

  const category = getCategory(categorySlug)
  const column = getColumnBySlug(categorySlug, columnSlug)

  if (!category || !column) {
    return c.render(<ColumnDetailPage categorySlug={categorySlug} columnSlug={columnSlug} baseUrl={baseUrl} />)
  }

  // head 데이터 설정 (SEO, OG, canonical, 구조화 데이터)
  const head = buildColumnHead(column, category, baseUrl)
  c.set('head', head)

  return c.render(<ColumnDetailPage categorySlug={categorySlug} columnSlug={columnSlug} baseUrl={baseUrl} />)
})

// ===== 관리자 라우트 =====

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
app.get('/admin/column', (c) => {
  c.set('head', {
    title: '칼럼 관리 | 명륜세무회계',
    description: '칼럼 관리자 페이지',
    robots: 'noindex, nofollow',
  } as HeadData)
  return c.render(<AdminColumnListPage />)
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
app.get('/admin/column/edit/:id', (c) => {
  const id = parseInt(c.req.param('id'), 10)
  c.set('head', {
    title: '칼럼 수정 | 명륜세무회계 칼럼 관리',
    description: '칼럼 수정 페이지',
    robots: 'noindex, nofollow',
  } as HeadData)
  return c.render(<AdminColumnFormPage mode="edit" columnId={id} />)
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

  // 카테고리 페이지 추가
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

// 칼럼 전용 sitemap-columns.xml
// 새 칼럼이 등록될 때마다 자동으로 갱신됨 (D1 연동 시 DB 조회로 동적 생성)
app.get('/sitemap-columns.xml', (c) => {
  const baseUrl = getBaseUrl(c)

  const urls = SORTED_COLUMNS.map((col) => ({
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
