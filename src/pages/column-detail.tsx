import type { FC, Child } from 'hono/jsx'
import { getCategory, getCategoryLabel, ensureButcherAlt, getModifiedDate, getShareImage, getDisplayThumbnail } from '../lib/columns'
import { getMetaTitle, getMetaDescription } from '../lib/dummy-data'
import type { Column } from '../lib/columns'
import type { HeadData } from '../renderer'
import { SiteHeader, SiteFooter, CommonScript, FloatingConsult } from '../components/layout'

// ===== JSON-LD 구조화 데이터 (Schema.org Article) =====
// 검색엔진에 칼럼 정보를 구조화하여 전달
const ArticleJsonLd: FC<{ column: Column; baseUrl: string }> = ({ column, baseUrl }) => {
  const catLabel = getCategoryLabel(column.category)
  const canonical = `${baseUrl}/column/${column.category}/${column.slug}`
  const imageUrl = getShareImage(getDisplayThumbnail(column), baseUrl).url

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: column.title,
    description: getMetaDescription(column),
    image: imageUrl,
    inLanguage: 'ko-KR',
    datePublished: column.publishedAt,
    dateModified: getModifiedDate(column),
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
          src={getDisplayThumbnail(column)}
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

// ===== 관리자 전용: 검색엔진이 보는 정보 =====
// 메타 타이틀·설명은 화면에 안 보이므로, 발행 후 실제로 무엇이 검색엔진에 전달되는지 관리자에게 보여줌
const AdminSeoBox: FC<{ column: Column; baseUrl: string }> = ({ column, baseUrl }) => {
  const html = column.content || ''
  const h2 = (html.match(/<h2[\s>]/gi) || []).length
  const h3 = (html.match(/<h3[\s>]/gi) || []).length
  const imgs = html.match(/<img\b[^>]*>/gi) || []
  const withAlt = imgs.filter((tag) => /\balt="[^"]+"/i.test(tag)).length
  const share = getShareImage(getDisplayThumbnail(column), baseUrl)
  const url = `${baseUrl}/column/${column.category}/${column.slug}`
  const Row: FC<{ label: string; children: Child }> = ({ label, children }) => (
    <div class="grid grid-cols-[7.5rem_1fr] gap-3 py-2 border-b border-navy/10 last:border-0">
      <dt class="text-ink/50">{label}</dt>
      <dd class="text-navy break-all">{children}</dd>
    </div>
  )
  return (
    <aside class="mt-10 rounded-2xl border border-dashed border-navy/30 bg-white/70 p-5 text-sm">
      <p class="font-black text-navy mb-1">
        <i class="fas fa-magnifying-glass text-gold mr-1.5"></i>검색엔진이 보는 정보
        <span class="ml-2 text-xs font-medium text-ink/40">(관리자에게만 보임)</span>
      </p>
      {/* 구글 검색 결과 모양 */}
      <div class="my-3 rounded-xl bg-white border border-navy/10 px-4 py-3">
        <p class="text-xs text-[#4d5156] truncate">{url.replace(/^https?:\/\//, '')}</p>
        <p class="mt-1 text-lg leading-snug text-[#1a0dab]">{getMetaTitle(column)}</p>
        <p class="mt-1 text-sm leading-relaxed text-[#4d5156]">{getMetaDescription(column)}</p>
      </div>
      <dl>
        <Row label="핵심 검색어">{column.focusKeyword || <span class="text-red-600">미설정</span>}</Row>
        <Row label="메타 타이틀">
          {column.metaTitle ? column.metaTitle : <span class="text-amber-700">비어 있음 → '제목 | 명륜세무회계' 자동 사용</span>}
        </Row>
        <Row label="메타 설명">
          {column.metaDescription
            ? column.metaDescription
            : <span class="text-amber-700">비어 있음 → {column.excerpt ? '한 줄 요약' : '본문 앞부분'} 자동 사용</span>}
        </Row>
        <Row label="소제목">
          H2 {h2}개 · H3 {h3}개{h2 === 0 && <span class="ml-2 text-red-600">(소제목이 없음)</span>}
        </Row>
        <Row label="사진 설명(alt)">
          사진 {imgs.length}장 중 {withAlt}장 설명 있음
        </Row>
        <Row label="공유 이미지">{share.url.replace(/^https?:\/\//, '').slice(0, 80)}{share.url.length > 88 ? '…' : ''}</Row>
        <Row label="글 주소">{url}</Row>
      </dl>
    </aside>
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
  const shareImage = getShareImage(getDisplayThumbnail(column), baseUrl)

  const extraHead: Child = (
    <>
      <ArticleJsonLd column={column} baseUrl={baseUrl} />
      <BreadcrumbJsonLd column={column} baseUrl={baseUrl} />
      <meta property="article:published_time" content={column.publishedAt} />
      <meta property="article:modified_time" content={getModifiedDate(column)} />
      <meta property="article:author" content={column.author} />
      <meta property="article:section" content={catLabel} />
      {shareImage.width && <meta property="og:image:width" content={String(shareImage.width)} />}
      {shareImage.height && <meta property="og:image:height" content={String(shareImage.height)} />}
    </>
  )

  return {
    title: metaTitle,
    description: metaDesc,
    ogTitle: metaTitle,
    ogDescription: metaDesc,
    ogImage: shareImage.url,
    ogImageAlt: ensureButcherAlt(column.thumbnailAlt || column.title, column.category),
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
        <SiteFooter isAdmin={isAdmin} />
        <FloatingConsult />
        <CommonScript />
      </>
    )
  }

  const catLabel = category.label
  const thumbnailAlt = ensureButcherAlt(column.thumbnailAlt || column.title, column.category)

  return (
    <>
      <SiteHeader activeNav="column" isAdmin={isAdmin} />
      <main>
        {/* ===== 상단 메타 영역 ===== */}
        <section class="relative pt-28 pb-8 bg-gradient-to-b from-cream-soft to-cream overflow-hidden">
          <div class="absolute -top-16 -right-16 w-72 h-72 bg-brand-light rounded-full blur-3xl opacity-30"></div>
          <div class="relative max-w-3xl mx-auto px-5">
            {/* 임시저장 글 미리보기 안내 (관리자에게만 보이는 화면) */}
            {column.isPublished === false && (
              <div class="mb-5 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border border-gold bg-gold-soft px-4 py-3 text-sm text-navy">
                <span class="font-bold">
                  <i class="fas fa-file-pen text-gold mr-1.5"></i>임시저장된 글 미리보기
                </span>
                <span class="text-ink/70">방문자에게는 보이지 않습니다. 수정 화면에서 '발행하기'를 누르면 공개됩니다.</span>
              </div>
            )}

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

            {/* 관리자 전용: 수정 / 삭제 버튼 (일반 방문자에게는 HTML 자체가 출력되지 않음) */}
            {isAdmin && (
              <div class="mt-5 flex items-center gap-2">
                <a
                  href={`/admin/column/edit/${column.id}`}
                  class="inline-flex items-center gap-1.5 bg-white hover:bg-cream-soft text-navy text-sm font-bold px-4 py-2 rounded-full transition border border-navy/20"
                >
                  <i class="fas fa-pen-to-square"></i> 수정
                </a>
                <button
                  type="button"
                  id="column-delete-btn"
                  data-id={column.id}
                  data-title={column.title}
                  data-back={`/column/${column.category}`}
                  class="inline-flex items-center gap-1.5 bg-white hover:bg-red-50 text-red-600 text-sm font-bold px-4 py-2 rounded-full transition border border-red-200"
                >
                  <i class="fas fa-trash"></i> 삭제
                </button>
              </div>
            )}
          </div>
        </section>

        {/* ===== 대표 이미지 =====
            썸네일을 따로 올린 글만 표시. 썸네일이 없는 글(카페 글 붙여넣기 등)은
            본문 첫 사진이 바로 이어지므로 같은 사진이 두 번 보이지 않게 생략 */}
        {column.thumbnail && (
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
        )}

        {/* ===== 본문 영역 ===== */}
        <section class="py-10">
          <div class="max-w-3xl mx-auto px-5">
            <article
              id="column-content"
              class="prose-column"
              dangerouslySetInnerHTML={{ __html: column.content }}
            />

            {/* 관리자에게만: 검색엔진이 이 글에서 읽는 정보 (SEO 최적화가 실제로 반영됐는지 확인용) */}
            {isAdmin && <AdminSeoBox column={column} baseUrl={baseUrl} />}

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
      <SiteFooter isAdmin={isAdmin} />
      <FloatingConsult />
      <CommonScript />
      {isAdmin && <script src="/static/column-admin.js"></script>}
    </>
  )
}
