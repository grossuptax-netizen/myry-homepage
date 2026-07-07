import type { FC, Child } from 'hono/jsx'
import { getCategory, getCategoryLabel, ensureButcherAlt } from '../lib/columns'
import { getMetaTitle, getMetaDescription } from '../lib/dummy-data'
import type { Column } from '../lib/columns'
import type { HeadData } from '../renderer'
import { SiteHeader, SiteFooter, CommonScript } from '../components/layout'

// ===== JSON-LD 구조화 데이터 (Schema.org Article) =====
// 검색엔진에 칼럼 정보를 구조화하여 전달
const ArticleJsonLd: FC<{ column: Column; baseUrl: string }> = ({ column, baseUrl }) => {
  const catLabel = getCategoryLabel(column.category)
  const canonical = `${baseUrl}/column/${column.category}/${column.slug}`
  const imageUrl = column.thumbnail.startsWith('http')
    ? column.thumbnail
    : `${baseUrl}${column.thumbnail}`

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: column.title,
    description: getMetaDescription(column),
    image: imageUrl,
    datePublished: column.publishedAt,
    dateModified: column.publishedAt,
    author: {
      '@type': 'Person',
      name: column.author,
      jobTitle: '세무사',
    },
    publisher: {
      '@type': 'Organization',
      name: '명륜세무회계',
      logo: {
        '@type': 'ImageObject',
        url: `${baseUrl}/static/favicon-192.png`,
      },
    },
    articleSection: catLabel,
    keywords: ['정육점', '축산물', '식육판매업', '의제매입세액공제', catLabel].join(', '),
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': canonical,
    },
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  )
}

// ===== breadcrumb 구조화 데이터 =====
const BreadcrumbJsonLd: FC<{ column: Column; baseUrl: string }> = ({ column, baseUrl }) => {
  const catLabel = getCategoryLabel(column.category)
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: '홈', item: baseUrl },
      { '@type': 'ListItem', position: 2, name: '칼럼', item: `${baseUrl}/column` },
      { '@type': 'ListItem', position: 3, name: catLabel, item: `${baseUrl}/column/${column.category}` },
      { '@type': 'ListItem', position: 4, name: column.title, item: `${baseUrl}/column/${column.category}/${column.slug}` },
    ],
  }
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  )
}

// ===== 관련 칼럼 카드 =====
const RelatedCard: FC<{ column: Column }> = ({ column }) => {
  const detailUrl = `/column/${column.category}/${column.slug}`
  return (
    <a href={detailUrl} class="group block bg-white rounded-xl overflow-hidden border border-gold/30 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition">
      <div class="aspect-[16/10] overflow-hidden bg-cream-soft">
        <img
          src={column.thumbnail}
          alt={column.thumbnailAlt}
          loading="lazy"
          decoding="async"
          class="w-full h-full object-cover group-hover:scale-105 transition duration-500"
        />
      </div>
      <div class="p-4">
        <h4 class="text-sm font-bold leading-snug text-navy line-clamp-2 group-hover:text-brand transition">
          {column.title}
        </h4>
        <time datetime={column.publishedAt} class="block mt-2 text-xs text-ink/50">
          {column.publishedAt.replace(/-/g, '. ')}
        </time>
      </div>
    </a>
  )
}

// ===== 칼럼 head 데이터 빌더 =====
// 라우트에서 c.set('head', buildColumnHead(...)) 로 호출
export function buildColumnHead(
  column: Column,
  category: ReturnType<typeof getCategory>,
  baseUrl: string
): HeadData {
  if (!category) return {}
  const catLabel = category.label
  const detailUrl = `/column/${column.category}/${column.slug}`
  const canonical = `${baseUrl}${detailUrl}`
  const metaTitle = getMetaTitle(column)
  const metaDesc = getMetaDescription(column)
  const ogImage = column.thumbnail.startsWith('http')
    ? column.thumbnail
    : `${baseUrl}${column.thumbnail}`

  const extraHead: Child = (
    <>
      <ArticleJsonLd column={column} baseUrl={baseUrl} />
      <BreadcrumbJsonLd column={column} baseUrl={baseUrl} />
      <meta property="article:published_time" content={column.publishedAt} />
      <meta property="article:author" content={column.author} />
      <meta property="article:section" content={catLabel} />
    </>
  )

  return {
    title: metaTitle,
    description: metaDesc,
    ogTitle: metaTitle,
    ogDescription: metaDesc,
    ogImage,
    ogType: 'article',
    canonical,
    extraHead,
  }
}

// ===== 칼럼 상세 페이지 =====
interface ColumnDetailPageProps {
  column: Column | undefined
  related: Column[]
  baseUrl: string
  isAdmin?: boolean // Google OAuth 로그인 시 관리자페이지 버튼 노출
}

export const ColumnDetailPage: FC<ColumnDetailPageProps> = ({ column, related, baseUrl, isAdmin }) => {
  const category = column ? getCategory(column.category) : undefined

  // 칼럼이 없거나 카테고리가 없으면 404
  if (!column || !category) {
    return (
      <>
        <SiteHeader activeNav="column" isAdmin={isAdmin} />
        <main class="pt-32 pb-20 min-h-screen">
          <div class="max-w-2xl mx-auto px-5 text-center">
            <i class="fas fa-exclamation-circle text-5xl text-gold/50 mb-4"></i>
            <h1 class="text-2xl font-black text-navy">칼럼을 찾을 수 없습니다</h1>
            <p class="mt-3 text-ink/60">요청하신 칼럼이 존재하지 않거나 이동되었을 수 있습니다.</p>
            <a href="/column" class="mt-6 inline-flex items-center gap-2 bg-brand hover:bg-brand-dark text-white font-bold px-6 py-3 rounded-full transition">
              <i class="fas fa-arrow-left"></i> 칼럼 목록으로
            </a>
          </div>
        </main>
        <SiteFooter />
        <CommonScript />
      </>
    )
  }

  const catLabel = category.label
  const thumbnailAlt = ensureButcherAlt(column.thumbnailAlt, column.category)

  return (
    <>
      <SiteHeader activeNav="column" isAdmin={isAdmin} />
      <main>
        {/* ===== 상단 메타 영역 ===== */}
        <section class="relative pt-28 pb-8 bg-gradient-to-b from-cream-soft to-cream overflow-hidden">
          <div class="absolute -top-16 -right-16 w-72 h-72 bg-brand-light rounded-full blur-3xl opacity-30"></div>
          <div class="relative max-w-3xl mx-auto px-5">
            {/* breadcrumb */}
            <nav aria-label="breadcrumb" class="text-sm text-ink/50 mb-5">
              <a href="/" class="hover:text-brand transition">홈</a>
              <span class="mx-2">›</span>
              <a href="/column" class="hover:text-brand transition">칼럼</a>
              <span class="mx-2">›</span>
              <a href={`/column/${column.category}`} class="hover:text-brand transition">{catLabel}</a>
            </nav>

            {/* 카테고리 라벨 */}
            <span class="inline-flex items-center gap-2 text-sm font-bold text-brand bg-brand-soft px-3 py-1.5 rounded-full mb-4">
              <i class={`fas ${category.icon} text-xs`}></i> {catLabel}
            </span>

            {/* 제목 H1 */}
            <h1 class="text-2xl md:text-4xl font-black leading-[1.3] tracking-tight text-navy">
              {column.title}
            </h1>

            {/* 작성자, 발행일 */}
            <div class="mt-5 flex flex-wrap items-center gap-4 text-sm text-ink/60">
              <span class="flex items-center gap-1.5">
                <i class="fas fa-user-pen text-gold"></i>
                <span class="font-medium text-navy/80">{column.author}</span>
              </span>
              <span class="flex items-center gap-1.5">
                <i class="fas fa-calendar text-gold"></i>
                <time datetime={column.publishedAt}>{column.publishedAt.replace(/-/g, '. ')}</time>
              </span>
              <span class="flex items-center gap-1.5">
                <i class="fas fa-eye text-gold"></i>
                조회 {column.views}
              </span>
            </div>
          </div>
        </section>

        {/* ===== 대표 이미지 ===== */}
        <section class="pb-2">
          <div class="max-w-3xl mx-auto px-5">
            <div class="aspect-[16/9] overflow-hidden rounded-2xl border border-gold/30 shadow-lg">
              <img
                src={column.thumbnail}
                alt={thumbnailAlt}
                width="1200"
                height="675"
                class="w-full h-full object-cover"
                fetchpriority="high"
              />
            </div>
          </div>
        </section>

        {/* ===== 본문 영역 ===== */}
        <section class="py-10">
          <div class="max-w-3xl mx-auto px-5">
            <article
              id="column-content"
              class="prose-column"
              dangerouslySetInnerHTML={{ __html: column.content }}
            />

            {/* 목록으로 돌아가기 */}
            <div class="mt-12 pt-8 border-t border-gold/30">
              <a
                href={`/column/${column.category}`}
                class="inline-flex items-center gap-2 text-sm font-bold text-navy hover:text-brand transition"
              >
                <i class="fas fa-arrow-left"></i> {catLabel} 칼럼 목록으로
              </a>
            </div>
          </div>
        </section>

        {/* ===== 관련 칼럼 3개 추천 ===== */}
        {related.length > 0 && (
          <section class="py-12 bg-cream-soft">
            <div class="max-w-6xl mx-auto px-5">
              <h2 class="text-xl font-black text-navy mb-1">
                <i class="fas fa-link text-gold mr-2"></i>관련 칼럼
              </h2>
              <p class="text-sm text-ink/60 mb-6">같은 카테고리의 다른 칼럼을 확인해보세요.</p>
              <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {related.map((r) => (
                  <RelatedCard column={r} />
                ))}
              </div>
            </div>
          </section>
        )}

        {/* ===== 하단 상담신청 CTA ===== */}
        <section class="py-14 bg-gradient-to-b from-cream to-cream-soft">
          <div class="max-w-3xl mx-auto px-5 text-center">
            <div class="bg-white rounded-3xl shadow-xl border border-gold/30 p-8 md:p-12">
              <i class="fas fa-comments text-4xl text-gold mb-4"></i>
              <h2 class="text-xl md:text-2xl font-black text-navy leading-snug">
                이 칼럼의 내용, 내 정육점에 적용하고 싶으신가요?
              </h2>
              <p class="mt-3 text-sm text-ink/70 leading-relaxed">
                정육점·축산물 세무 전문가가 사업장을 분석하고 맞춤 절세 방안을 제안해 드립니다.
                <br class="hidden md:block" />
                1분 만에 신청하시면 전문 상담사가 연락드립니다.
              </p>
              <div class="mt-7 flex flex-col sm:flex-row items-center justify-center gap-3">
                <a
                  href="/#consult"
                  class="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-brand hover:bg-brand-dark text-white font-bold px-8 py-4 rounded-full transition shadow-lg shadow-brand/30 ring-1 ring-gold/50"
                >
                  <i class="fas fa-comment-dots"></i> 무료 상담신청
                </a>
                <a
                  href="/column"
                  class="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-white hover:bg-cream-soft text-navy font-bold px-8 py-4 rounded-full transition border border-navy/20"
                >
                  <i class="fas fa-newspaper"></i> 더 많은 칼럼 보기
                </a>
              </div>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
      <CommonScript />
    </>
  )
}
