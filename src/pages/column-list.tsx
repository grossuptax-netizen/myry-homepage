import type { FC } from 'hono/jsx'
import { CATEGORIES, getCategoryLabel } from '../lib/columns'
import type { Column } from '../lib/columns'
import { SiteHeader, SiteFooter, CommonScript } from '../components/layout'

// ===== 칼럼 카드 (목록용) =====
const ColumnCard: FC<{ column: Column }> = ({ column }) => {
  const catLabel = getCategoryLabel(column.category)
  const detailUrl = `/column/${column.category}/${column.slug}`

  return (
    <article class="group bg-white rounded-2xl overflow-hidden border border-gold/30 shadow-sm hover:shadow-xl hover:-translate-y-1 transition duration-300">
      <a href={detailUrl} class="block">
        {/* 썸네일 이미지 - lazy loading 적용 */}
        <div class="aspect-[16/10] overflow-hidden bg-cream-soft">
          <img
            src={column.thumbnail}
            alt={column.thumbnailAlt}
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
          {/* 발행일 */}
          <time
            datetime={column.publishedAt}
            class="block mt-2.5 text-xs text-ink/50 font-medium"
          >
            {column.publishedAt.replace(/-/g, '. ')}
          </time>
          {/* 한 줄 요약 (2줄 이내) */}
          <p class="mt-2.5 text-sm text-ink/70 leading-relaxed line-clamp-2">
            {column.excerpt}
          </p>
        </div>
      </a>
    </article>
  )
}

// ===== 칼럼 목록 페이지 (EY 인사이트 스타일) =====
// 상단 카테고리 탭 + 카드 그리드, PC 3~4열 / 모바일 1열 반응형
// 모든 카드는 서버 사이드 렌더링으로 SEO 크롤링 안전

interface ColumnListPageProps {
  activeCategory?: string // null/undefined = 전체보기
  columns: Column[] // 라우트에서 D1 조회 후 전달
}

export const ColumnListPage: FC<ColumnListPageProps> = ({ activeCategory, columns }) => {
  const isActive = (slug: string) => activeCategory === slug
  const isAll = !activeCategory

  const activeCat = activeCategory ? CATEGORIES.find((c) => c.slug === activeCategory) : null

  // 카테고리 탭: 전체보기 + 6개 카테고리
  const tabs = [{ slug: '', label: '전체보기', icon: 'fa-grip' }, ...CATEGORIES]

  return (
    <>
      <SiteHeader activeNav="column" />
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
          </div>
        </section>

        {/* ===== 카테고리 필터 탭 ===== */}
        <section class="sticky top-16 z-40 bg-cream/95 backdrop-blur border-b border-gold/30">
          <div class="max-w-6xl mx-auto px-5">
            <div class="flex gap-1 overflow-x-auto py-3 scrollbar-hide" role="tablist" aria-label="칼럼 카테고리">
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
                    <ColumnCard column={column} />
                  ))}
                </div>

                {/* 더보기 버튼 (페이지네이션 대신 더보기 방식) */}
                <div class="mt-12 text-center">
                  <button
                    type="button"
                    id="load-more-btn"
                    class="inline-flex items-center gap-2 bg-white hover:bg-cream-soft text-navy font-bold px-8 py-3.5 rounded-full transition border border-navy/20 hover:border-brand/40 shadow-sm"
                  >
                    <i class="fas fa-arrow-down text-sm"></i> 더 많은 칼럼 보기
                  </button>
                  <p class="mt-3 text-xs text-ink/40">
                    총 {columns.length}개의 칼럼
                  </p>
                </div>
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
      <SiteFooter />
      <CommonScript />
      <script src="/static/column-list.js"></script>
    </>
  )
}
