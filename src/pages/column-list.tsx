import type { FC } from 'hono/jsx'
import { CATEGORIES, getCategoryLabel, getDisplayThumbnail } from '../lib/columns'
import type { Column } from '../lib/columns'
import { getSeoScore, SEO_DONE_SCORE } from '../lib/seo-score'
import { SiteHeader, SiteFooter, CommonScript, FloatingConsult } from '../components/layout'

// ===== 칼럼 카드 (목록용) =====
// 관리자에게만: SEO 점수 80점 이상이면 'SEO 완료', 아니면 점수 (글쓰기 화면 SEO 점검과 같은 점수)
const SeoMark: FC<{ column: Column }> = ({ column }) => {
  const score = getSeoScore(column)
  return score >= SEO_DONE_SCORE ? (
    <span class="shrink-0 inline-flex items-center gap-1 text-[11px] font-bold text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full" title={`SEO 점수 ${score}점`}>
      <i class="fas fa-circle-check"></i> SEO 완료
    </span>
  ) : (
    <span
      class={`shrink-0 inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full border ${
        score >= 55 ? 'text-amber-700 bg-amber-50 border-amber-200' : 'text-red-700 bg-red-50 border-red-200'
      }`}
      title={`${SEO_DONE_SCORE}점 이상이면 SEO 완료로 표시됩니다`}
    >
      SEO {score}점
    </span>
  )
}

const ColumnCard: FC<{ column: Column; isAdmin?: boolean }> = ({ column, isAdmin }) => {
  const catLabel = getCategoryLabel(column.category)
  const detailUrl = `/column/${column.category}/${column.slug}`

  return (
    <article class="group bg-white rounded-2xl overflow-hidden border border-gold/30 shadow-sm hover:shadow-xl hover:-translate-y-1 transition duration-300">
      <a href={detailUrl} class="block">
        {/* 썸네일 이미지 - lazy loading 적용 */}
        <div class="aspect-[16/10] overflow-hidden bg-cream-soft">
          <img
            src={getDisplayThumbnail(column)}
            alt={column.thumbnailAlt || column.title}
            loading="lazy"
            decoding="async"
            width="640"
            height="400"
            class="w-full h-full object-cover group-hover:scale-105 transition duration-500"
          />
        </div>
        {/* 카드 본문 */}
        <div class="p-5">
          {/* 카테고리 라벨 */}
          <span class="inline-flex items-center gap-1.5 text-xs font-bold text-brand bg-brand-soft px-2.5 py-1 rounded-full mb-3">
            {catLabel}
          </span>
          {/* 제목 */}
          <h3 class="text-base font-black leading-snug text-navy line-clamp-2 group-hover:text-brand transition">
            {column.title}
          </h3>
          {/* 발행일 (관리자에게는 SEO 표시도) */}
          <div class="mt-2.5 flex items-center justify-between gap-2">
            <time datetime={column.publishedAt} class="block text-xs text-ink/50 font-medium">
              {column.publishedAt.replace(/-/g, '. ')}
            </time>
            {isAdmin && <SeoMark column={column} />}
          </div>
          {/* 한 줄 요약 (2줄 이내) */}
          <p class="mt-2.5 text-sm text-ink/70 leading-relaxed line-clamp-2">
            {column.excerpt}
          </p>
        </div>
      </a>
    </article>
  )
}

// ===== 페이지 번호 (‹ 1 … 4 5 6 … 10 ›) =====
// 일반 링크라 검색엔진도 2페이지 이후 글을 따라갈 수 있음
const Pagination: FC<{ page: number; totalPages: number; basePath: string }> = ({ page, totalPages, basePath }) => {
  if (totalPages <= 1) return null
  const href = (n: number) => (n <= 1 ? basePath : `${basePath}?page=${n}`)
  const nums: (number | '…')[] = []
  for (let n = 1; n <= totalPages; n++) {
    if (n === 1 || n === totalPages || Math.abs(n - page) <= 2) nums.push(n)
    else if (nums[nums.length - 1] !== '…') nums.push('…')
  }
  const box = 'inline-flex items-center justify-center min-w-[2.5rem] h-10 px-3 rounded-full text-sm font-bold transition'
  const idle = `${box} bg-white text-navy/70 border border-gold/30 hover:text-brand hover:border-brand/40`
  const off = `${box} bg-white text-navy/25 border border-gold/20 cursor-default`
  return (
    <nav class="mt-12 flex flex-wrap items-center justify-center gap-1.5" aria-label="칼럼 페이지">
      {page > 1 ? (
        <a href={href(page - 1)} rel="prev" class={idle} aria-label="이전 페이지">
          <i class="fas fa-chevron-left text-xs"></i>
        </a>
      ) : (
        <span class={off} aria-hidden="true"><i class="fas fa-chevron-left text-xs"></i></span>
      )}
      {nums.map((n) =>
        n === '…' ? (
          <span class="px-1 text-navy/40" aria-hidden="true">…</span>
        ) : n === page ? (
          <span aria-current="page" class={`${box} bg-brand text-white shadow-md shadow-brand/30`}>{n}</span>
        ) : (
          <a href={href(n)} class={idle}>{n}</a>
        )
      )}
      {page < totalPages ? (
        <a href={href(page + 1)} rel="next" class={idle} aria-label="다음 페이지">
          <i class="fas fa-chevron-right text-xs"></i>
        </a>
      ) : (
        <span class={off} aria-hidden="true"><i class="fas fa-chevron-right text-xs"></i></span>
      )}
    </nav>
  )
}

// ===== 칼럼 목록 페이지 (EY 인사이트 스타일) =====
// 상단 카테고리 탭 + 카드 그리드, PC 3~4열 / 모바일 1열 반응형
// 모든 카드는 서버 사이드 렌더링으로 SEO 크롤링 안전

interface ColumnListPageProps {
  activeCategory?: string // null/undefined = 전체보기
  columns: Column[] // 이 페이지에 보일 글 (최대 12개)
  page: number // 지금 페이지 (1부터)
  totalPages: number
  total: number // 이 분류(또는 전체)의 글 수
  counts: Record<string, number> // 분류별 글 수 ('' = 전체)
  isAdmin?: boolean // Google OAuth 로그인 시 관리자페이지 버튼 노출
}

export const ColumnListPage: FC<ColumnListPageProps> = ({ activeCategory, columns, page, totalPages, total, counts, isAdmin }) => {
  const isActive = (slug: string) => activeCategory === slug
  const isAll = !activeCategory

  const activeCat = activeCategory ? CATEGORIES.find((c) => c.slug === activeCategory) : null

  // 카테고리 탭: 전체보기 + 전체 카테고리
  const tabs = [{ slug: '', label: '전체보기', icon: 'fa-grip' }, ...CATEGORIES]

  return (
    <>
      <SiteHeader activeNav="column" isAdmin={isAdmin} />
      <main>
        {/* ===== 페이지 헤더 (히어로 영역) ===== */}
        <section class="relative pt-28 pb-12 bg-gradient-to-b from-cream-soft via-cream to-cream overflow-hidden">
          <div class="absolute -top-16 -right-16 w-80 h-80 bg-brand-light rounded-full blur-3xl opacity-40"></div>
          <div class="absolute top-20 -left-20 w-64 h-64 bg-gold-light rounded-full blur-3xl opacity-30"></div>
          <div class="relative max-w-6xl mx-auto px-5">
            <nav aria-label="breadcrumb" class="text-sm text-ink/50 mb-4">
              <a href="/" class="hover:text-brand transition">홈</a>
              <span class="mx-2">›</span>
              <span class="text-navy font-medium">칼럼</span>
              {activeCat && (
                <>
                  <span class="mx-2">›</span>
                  <span class="text-navy font-medium">{activeCat.label}</span>
                </>
              )}
            </nav>
            <span class="inline-flex items-center gap-2 bg-white border border-gold text-brand text-sm font-bold px-4 py-1.5 rounded-full mb-5 shadow-sm">
              <i class="fas fa-newspaper text-gold"></i> 정육점 · 축산물 세무 칼럼
            </span>
            <h1 class="text-3xl md:text-5xl font-black leading-[1.25] tracking-tight text-navy">
              정육점 세무 <span class="text-brand">전문가 인사이트</span>
            </h1>
            <p class="mt-4 text-base md:text-lg text-ink/75 leading-relaxed max-w-2xl">
              의제매입세액공제, 한우·한돈 매입 관리, 축산물이력제부터 정부지원금까지.
              <br class="hidden md:block" />
              정육점·축산물 세무에 특화된 실무 노하우를 공유합니다.
            </p>
            {/* 관리자 전용: 글쓰기 버튼 (일반 방문자에게는 HTML 자체가 출력되지 않음) */}
            {isAdmin && (
              <a
                href="/admin/column/new"
                class="mt-6 inline-flex items-center gap-2 bg-navy hover:bg-navy-dark text-white text-sm font-bold px-5 py-2.5 rounded-full transition shadow-md shadow-navy/30 ring-1 ring-gold/50"
              >
                <i class="fas fa-pen"></i> 글쓰기
              </a>
            )}
          </div>
        </section>

        {/* ===== 카테고리 필터 탭 ===== */}
        <section class="sticky top-16 z-40 bg-cream/95 backdrop-blur border-b border-gold/30">
          <div class="max-w-6xl mx-auto px-5">
            <div class="flex gap-1 overflow-x-auto md:flex-wrap md:overflow-visible py-3 scrollbar-hide" role="tablist" aria-label="칼럼 카테고리">
              {tabs.map((tab) => {
                const active = tab.slug === '' ? isAll : isActive(tab.slug)
                const href = tab.slug === '' ? '/column' : `/column/${tab.slug}`
                return (
                  <a
                    href={href}
                    role="tab"
                    aria-selected={active ? 'true' : 'false'}
                    class={`shrink-0 inline-flex items-center gap-2 text-sm font-bold px-4 py-2.5 rounded-full transition whitespace-nowrap ${
                      active
                        ? 'bg-brand text-white shadow-md shadow-brand/30'
                        : 'bg-white text-navy/70 hover:text-brand hover:bg-brand-soft border border-gold/30'
                    }`}
                  >
                    <i class={`fas ${tab.icon} text-xs`}></i>
                    {tab.label}
                    <span
                      class={`min-w-[1.5rem] text-center text-xs font-bold px-1.5 py-0.5 rounded-full ${
                        active ? 'bg-white/25 text-white' : 'bg-cream-soft text-navy/60'
                      }`}
                    >
                      {counts[tab.slug] || 0}
                    </span>
                  </a>
                )
              })}
            </div>
          </div>
        </section>

        {/* ===== 카드 그리드 ===== */}
        <section class="py-12 bg-cream">
          <div class="max-w-6xl mx-auto px-5">
            {/* 카테고리 설명 */}
            {activeCat && (
              <p class="text-sm text-ink/60 mb-8 leading-relaxed">
                <i class="fas fa-info-circle text-gold mr-1.5"></i>
                {activeCat.desc}
              </p>
            )}

            {/* 카드 그리드: PC 3열, 태블릿 2열, 모바일 1열 */}
            {columns.length > 0 ? (
              <>
                <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {columns.map((column) => (
                    <ColumnCard column={column} isAdmin={isAdmin} />
                  ))}
                </div>

                <Pagination
                  page={page}
                  totalPages={totalPages}
                  basePath={activeCategory ? `/column/${activeCategory}` : '/column'}
                />
                <p class="mt-4 text-center text-xs text-ink/40">총 {total}개의 칼럼</p>
              </>
            ) : (
              <div class="text-center py-20">
                <i class="fas fa-folder-open text-5xl text-gold/40 mb-4"></i>
                <p class="text-lg font-bold text-navy/70">해당 카테고리에 칼럼이 없습니다.</p>
                <p class="mt-2 text-sm text-ink/50">곧 정육점 세무 전문 칼럼이 추가될 예정입니다.</p>
              </div>
            )}
          </div>
        </section>

        {/* ===== 하단 CTA (상담신청 유도) ===== */}
        <section class="py-12 bg-cream-soft">
          <div class="max-w-4xl mx-auto px-5 text-center">
            <h2 class="text-xl md:text-2xl font-black text-navy leading-snug">
              정육점 세무, 전문가와 함께하세요
            </h2>
            <p class="mt-3 text-sm text-ink/70">
              칼럼 내용이 궁금하거나 내 사업장에 적용하고 싶다면 무료 상담을 신청해주세요.
            </p>
            <a
              href="/#consult"
              class="mt-6 inline-flex items-center gap-2 bg-brand hover:bg-brand-dark text-white font-bold px-8 py-3.5 rounded-full transition shadow-lg shadow-brand/30 ring-1 ring-gold/50"
            >
              <i class="fas fa-comment-dots"></i> 무료 상담신청
            </a>
          </div>
        </section>
      </main>
      <SiteFooter isAdmin={isAdmin} />
      <FloatingConsult />
      <CommonScript />
      <script src="/static/column-list.js"></script>
    </>
  )
}
