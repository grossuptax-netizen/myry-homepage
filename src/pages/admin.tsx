import type { FC } from 'hono/jsx'
import { CATEGORIES, getCategoryLabel } from '../lib/columns'
import { SORTED_COLUMNS, DUMMY_COLUMNS } from '../lib/dummy-data'
import { SiteHeader, SiteFooter, CommonScript } from '../components/layout'

// ===== 관리자 로그인 페이지 =====
export const AdminLoginPage: FC = () => (
  <>
    <SiteHeader />
    <main class="pt-32 pb-20 min-h-screen flex items-center">
      <div class="max-w-md mx-auto px-5 w-full">
        <div class="bg-white rounded-3xl shadow-xl border border-gold/30 p-8 md:p-10">
          <div class="text-center mb-8">
            <div class="w-16 h-16 mx-auto rounded-2xl bg-navy text-gold flex items-center justify-center mb-4 ring-1 ring-gold/40">
              <i class="fas fa-lock text-2xl"></i>
            </div>
            <h1 class="text-2xl font-black text-navy">칼럼 관리자</h1>
            <p class="mt-2 text-sm text-ink/60">관리자 비밀번호를 입력해 주세요.</p>
          </div>

          <form id="admin-login-form" class="space-y-4">
            <div>
              <label class="block text-sm font-bold mb-1.5 text-navy" for="admin-pw">
                관리자 비밀번호
              </label>
              <div class="relative">
                <input
                  id="admin-pw"
                  name="password"
                  type="password"
                  required
                  placeholder="비밀번호 입력"
                  autocomplete="current-password"
                  class="w-full rounded-xl border border-navy/15 bg-cream-soft px-4 py-3 pr-11 focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand focus:bg-white transition"
                />
                <button
                  type="button"
                  id="toggle-pw"
                  class="absolute right-3 top-1/2 -translate-y-1/2 text-ink/40 hover:text-brand transition"
                  aria-label="비밀번호 표시/숨기기"
                >
                  <i class="fas fa-eye"></i>
                </button>
              </div>
            </div>

            <button
              type="submit"
              id="admin-login-btn"
              class="flex items-center justify-center w-full bg-brand hover:bg-brand-dark text-white font-bold py-3.5 rounded-xl transition shadow-lg shadow-brand/30 ring-1 ring-gold/50"
            >
              <i class="fas fa-sign-in-alt mr-2"></i> 로그인
            </button>

            <p id="login-error" class="text-sm text-center text-red-600 hidden">
              <i class="fas fa-exclamation-circle mr-1"></i>
              <span id="login-error-msg">비밀번호가 올바르지 않습니다.</span>
            </p>
          </form>

          <div class="mt-6 pt-6 border-t border-gold/20 text-center">
            <a href="/" class="text-sm text-ink/50 hover:text-brand transition">
              <i class="fas fa-home mr-1"></i> 홈으로 돌아가기
            </a>
          </div>
        </div>
      </div>
    </main>
    <SiteFooter />
    <CommonScript />
    <script src="/static/admin.js"></script>
  </>
)

// ===== 관리자 칼럼 목록 페이지 =====
export const AdminColumnListPage: FC = () => (
  <>
    <SiteHeader />
    <main class="pt-24 pb-20 min-h-screen">
      <div class="max-w-6xl mx-auto px-5">
        {/* 헤더 */}
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <nav aria-label="breadcrumb" class="text-sm text-ink/50 mb-2">
              <a href="/" class="hover:text-brand transition">홈</a>
              <span class="mx-2">›</span>
              <span class="text-navy font-medium">관리자</span>
              <span class="mx-2">›</span>
              <span class="text-navy font-medium">칼럼 관리</span>
            </nav>
            <h1 class="text-2xl font-black text-navy">
              <i class="fas fa-newspaper text-gold mr-2"></i>칼럼 관리
            </h1>
            <p class="mt-1 text-sm text-ink/60">총 {DUMMY_COLUMNS.length}개의 칼럼</p>
          </div>
          <div class="flex items-center gap-3">
            <button
              id="admin-logout"
              class="inline-flex items-center gap-2 text-sm font-bold text-ink/60 hover:text-brand transition bg-white border border-navy/15 px-4 py-2.5 rounded-full"
            >
              <i class="fas fa-sign-out-alt"></i> 로그아웃
            </button>
            <a
              href="/admin/column/new"
              class="inline-flex items-center gap-2 bg-brand hover:bg-brand-dark text-white text-sm font-bold px-5 py-2.5 rounded-full transition shadow-md shadow-brand/30 ring-1 ring-gold/50"
            >
              <i class="fas fa-plus"></i> 새 칼럼 작성
            </a>
          </div>
        </div>

        {/* 칼럼 목록 테이블 */}
        <div class="bg-white rounded-2xl border border-gold/30 shadow-sm overflow-hidden">
          <div class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead class="bg-navy text-white">
                <tr>
                  <th class="px-4 py-3 text-left font-bold whitespace-nowrap">카테고리</th>
                  <th class="px-4 py-3 text-left font-bold">제목</th>
                  <th class="px-4 py-3 text-left font-bold whitespace-nowrap">작성자</th>
                  <th class="px-4 py-3 text-left font-bold whitespace-nowrap">발행일</th>
                  <th class="px-4 py-3 text-right font-bold whitespace-nowrap">조회</th>
                  <th class="px-4 py-3 text-center font-bold whitespace-nowrap">관리</th>
                </tr>
              </thead>
              <tbody>
                {SORTED_COLUMNS.map((col, i) => (
                  <tr class={`border-t border-gold/20 hover:bg-cream-soft transition ${i % 2 === 1 ? 'bg-cream-soft/50' : ''}`}>
                    <td class="px-4 py-3 whitespace-nowrap">
                      <span class="inline-flex items-center text-xs font-bold text-brand bg-brand-soft px-2 py-1 rounded-full">
                        {getCategoryLabel(col.category)}
                      </span>
                    </td>
                    <td class="px-4 py-3">
                      <a
                        href={`/column/${col.category}/${col.slug}`}
                        class="font-medium text-navy hover:text-brand transition line-clamp-1"
                      >
                        {col.title}
                      </a>
                    </td>
                    <td class="px-4 py-3 whitespace-nowrap text-ink/70">{col.author}</td>
                    <td class="px-4 py-3 whitespace-nowrap text-ink/70">{col.publishedAt}</td>
                    <td class="px-4 py-3 text-right text-ink/70 whitespace-nowrap">{col.views}</td>
                    <td class="px-4 py-3 text-center whitespace-nowrap">
                      <a
                        href={`/admin/column/edit/${col.id}`}
                        class="inline-flex items-center gap-1 text-xs font-bold text-navy hover:text-brand transition mr-3"
                      >
                        <i class="fas fa-pen-to-square"></i> 수정
                      </a>
                      <button
                        type="button"
                        class="admin-delete-btn inline-flex items-center gap-1 text-xs font-bold text-red-600 hover:text-red-700 transition"
                        data-id={col.id}
                        data-title={col.title}
                      >
                        <i class="fas fa-trash"></i> 삭제
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </main>
    <SiteFooter />
    <CommonScript />
    <script src="/static/admin.js"></script>
  </>
)

// ===== 관리자 칼럼 작성/수정 폼 페이지 =====
interface AdminColumnFormPageProps {
  mode: 'new' | 'edit'
  columnId?: number
}

export const AdminColumnFormPage: FC<AdminColumnFormPageProps> = ({ mode, columnId }) => {
  const isEdit = mode === 'edit'
  const col = isEdit && columnId ? DUMMY_COLUMNS.find((c) => c.id === columnId) : undefined

  return (
    <>
      <SiteHeader />
      <main class="pt-24 pb-20 min-h-screen">
        <div class="max-w-4xl mx-auto px-5">
          {/* 헤더 */}
          <div class="mb-8">
            <nav aria-label="breadcrumb" class="text-sm text-ink/50 mb-2">
              <a href="/" class="hover:text-brand transition">홈</a>
              <span class="mx-2">›</span>
              <a href="/admin/column" class="hover:text-brand transition">칼럼 관리</a>
              <span class="mx-2">›</span>
              <span class="text-navy font-medium">{isEdit ? '칼럼 수정' : '새 칼럼 작성'}</span>
            </nav>
            <h1 class="text-2xl font-black text-navy">
              <i class={`fas ${isEdit ? 'fa-pen-to-square' : 'fa-pen'} text-gold mr-2`}></i>
              {isEdit ? '칼럼 수정' : '새 칼럼 작성'}
            </h1>
          </div>

          {/* 작성 폼 */}
          <form id="column-form" class="space-y-6">
            <input type="hidden" name="id" value={col?.id ?? ''} />

            {/* 제목 */}
            <div class="bg-white rounded-2xl border border-gold/30 p-6 shadow-sm">
              <label class="block text-sm font-bold mb-2 text-navy" for="f-title">
                제목 <span class="text-brand">*</span>
              </label>
              <input
                id="f-title"
                name="title"
                type="text"
                required
                value={col?.title ?? ''}
                placeholder="칼럼 제목을 입력하세요"
                class="w-full rounded-xl border border-navy/15 bg-cream-soft px-4 py-3 focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand focus:bg-white transition text-lg font-bold"
              />
            </div>

            {/* 카테고리 + 발행일 */}
            <div class="grid md:grid-cols-2 gap-6">
              <div class="bg-white rounded-2xl border border-gold/30 p-6 shadow-sm">
                <label class="block text-sm font-bold mb-2 text-navy" for="f-category">
                  카테고리 <span class="text-brand">*</span>
                </label>
                <select
                  id="f-category"
                  name="category"
                  required
                  class="w-full rounded-xl border border-navy/15 bg-cream-soft px-4 py-3 focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand focus:bg-white transition"
                >
                  {CATEGORIES.map((cat) => (
                    <option value={cat.slug} selected={col?.category === cat.slug}>
                      {cat.label}
                    </option>
                  ))}
                </select>
                <p class="mt-2 text-xs text-ink/50">단일 선택만 가능합니다.</p>
              </div>

              <div class="bg-white rounded-2xl border border-gold/30 p-6 shadow-sm">
                <label class="block text-sm font-bold mb-2 text-navy" for="f-date">
                  발행일 <span class="text-brand">*</span>
                </label>
                <input
                  id="f-date"
                  name="published_at"
                  type="date"
                  required
                  value={col?.publishedAt ?? new Date().toISOString().slice(0, 10)}
                  class="w-full rounded-xl border border-navy/15 bg-cream-soft px-4 py-3 focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand focus:bg-white transition"
                />
              </div>
            </div>

            {/* 본문 (리치 텍스트) */}
            <div class="bg-white rounded-2xl border border-gold/30 p-6 shadow-sm">
              <label class="block text-sm font-bold mb-2 text-navy" for="f-content">
                본문 <span class="text-brand">*</span>
              </label>
              <p class="text-xs text-ink/50 mb-3">
                <i class="fas fa-info-circle text-gold mr-1"></i>
                텍스트, 이미지, 표를 삽입할 수 있습니다. 소제목은 H2/H3 태그로 구조화하세요.
              </p>
              {/* 간단한 툴바 */}
              <div class="flex flex-wrap gap-1 mb-2 border-b border-navy/10 pb-2">
                <button type="button" class="format-btn" data-cmd="bold" title="굵게">
                  <i class="fas fa-bold"></i>
                </button>
                <button type="button" class="format-btn" data-cmd="italic" title="기울임">
                  <i class="fas fa-italic"></i>
                </button>
                <button type="button" class="format-btn" data-cmd="formatBlock" data-val="h2" title="소제목 H2">
                  H2
                </button>
                <button type="button" class="format-btn" data-cmd="formatBlock" data-val="h3" title="소제목 H3">
                  H3
                </button>
                <button type="button" class="format-btn" data-cmd="insertUnorderedList" title="글머리 기호">
                  <i class="fas fa-list-ul"></i>
                </button>
                <button type="button" class="format-btn" data-cmd="insertOrderedList" title="번호 매기기">
                  <i class="fas fa-list-ol"></i>
                </button>
                <button type="button" class="format-btn" data-cmd="formatBlock" data-val="blockquote" title="인용구">
                  <i class="fas fa-quote-right"></i>
                </button>
                <button type="button" class="format-btn" id="insert-image-btn" title="이미지 삽입">
                  <i class="fas fa-image"></i>
                </button>
                <button type="button" class="format-btn" id="insert-table-btn" title="표 삽입">
                  <i class="fas fa-table"></i>
                </button>
              </div>
              {/* 숨겨진 이미지 업로드 input */}
              <input type="file" id="content-image-input" accept="image/*" class="hidden" />
              {/* contentEditable 영역 */}
              <div
                id="f-content"
                contenteditable="true"
                class="prose-admin min-h-[400px] w-full rounded-xl border border-navy/15 bg-cream-soft px-4 py-3 focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand focus:bg-white transition overflow-y-auto"
                dangerouslySetInnerHTML={col ? { __html: col.content } : undefined}
              />
              {/* 실제 제출용 hidden input */}
              <input type="hidden" name="content" id="f-content-hidden" value="" />
            </div>

            {/* 대표 썸네일 이미지 */}
            <div class="bg-white rounded-2xl border border-gold/30 p-6 shadow-sm">
              <label class="block text-sm font-bold mb-2 text-navy" for="f-thumbnail">
                대표 썸네일 이미지 <span class="text-brand">*</span>
              </label>
              <div class="flex flex-col sm:flex-row gap-4">
                <div class="shrink-0">
                  <div id="thumbnail-preview" class="w-48 aspect-[16/10] rounded-xl border border-gold/30 bg-cream-soft overflow-hidden flex items-center justify-center">
                    {col?.thumbnail ? (
                      <img src={col.thumbnail} alt={col.thumbnailAlt} class="w-full h-full object-cover" />
                    ) : (
                      <i class="fas fa-image text-3xl text-gold/40"></i>
                    )}
                  </div>
                </div>
                <div class="flex-1 space-y-3">
                  <input
                    id="f-thumbnail"
                    name="thumbnail"
                    type="file"
                    accept="image/*"
                    class="w-full text-sm file:mr-3 file:py-2.5 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-bold file:bg-brand file:text-white hover:file:bg-brand-dark file:cursor-pointer cursor-pointer"
                  />
                  {col?.thumbnail && (
                    <input type="hidden" name="thumbnail_existing" value={col.thumbnail} />
                  )}
                  <div>
                    <label class="block text-xs font-bold mb-1 text-navy" for="f-thumb-alt">
                      이미지 alt 텍스트 (대체 텍스트)
                    </label>
                    <input
                      id="f-thumb-alt"
                      name="thumbnail_alt"
                      type="text"
                      value={col?.thumbnailAlt ?? ''}
                      placeholder="예: 정육점 의제매입세액공제 - 면세 한우 매입 부가세"
                      class="w-full rounded-lg border border-navy/15 bg-cream-soft px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand focus:bg-white transition"
                    />
                    <p class="mt-1 text-xs text-ink/50">
                      <i class="fas fa-magic-wand-sparkles text-gold mr-1"></i>
                      정육점, 축산물, 의제매입세액공제 등의 키워드가 포함되면 더 좋습니다. 미입력 시 자동 보정됩니다.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* 작성자 */}
            <div class="bg-white rounded-2xl border border-gold/30 p-6 shadow-sm">
              <label class="block text-sm font-bold mb-2 text-navy" for="f-author">
                작성자 <span class="text-brand">*</span>
              </label>
              <input
                id="f-author"
                name="author"
                type="text"
                required
                value={col?.author ?? '김명륜 세무사'}
                placeholder="세무사명"
                class="w-full rounded-xl border border-navy/15 bg-cream-soft px-4 py-3 focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand focus:bg-white transition"
              />
            </div>

            {/* URL 슬러그 */}
            <div class="bg-white rounded-2xl border border-gold/30 p-6 shadow-sm">
              <label class="block text-sm font-bold mb-2 text-navy" for="f-slug">
                URL 슬러그 <span class="text-brand">*</span>
              </label>
              <div class="flex items-center gap-2">
                <span class="text-sm text-ink/50 whitespace-nowrap">/column/[카테고리]/</span>
                <input
                  id="f-slug"
                  name="slug"
                  type="text"
                  required
                  value={col?.slug ?? ''}
                  placeholder="butcher-deemed-vat-credit-guide"
                  class="flex-1 rounded-xl border border-navy/15 bg-cream-soft px-4 py-3 focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand focus:bg-white transition font-mono text-sm"
                />
              </div>
              <p class="mt-2 text-xs text-ink/50">
                <i class="fas fa-info-circle text-gold mr-1"></i>
                정육점 세무 관련 의미 있는 영문 슬러그를 사용하세요.
                제목 입력 시 자동 생성되지만 수동 수정 가능합니다.
              </p>
            </div>

            {/* 한 줄 요약 */}
            <div class="bg-white rounded-2xl border border-gold/30 p-6 shadow-sm">
              <label class="block text-sm font-bold mb-2 text-navy" for="f-excerpt">
                한 줄 요약 (목록용, 2줄 이내)
              </label>
              <textarea
                id="f-excerpt"
                name="excerpt"
                rows={2}
                value={col?.excerpt ?? ''}
                placeholder="목록 페이지 카드에 표시될 요약문"
                class="w-full rounded-xl border border-navy/15 bg-cream-soft px-4 py-3 focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand focus:bg-white transition resize-none"
              />
            </div>

            {/* SEO 설정 */}
            <div class="bg-navy text-white rounded-2xl border border-gold/40 p-6 shadow-sm">
              <h3 class="text-lg font-black mb-1">
                <i class="fas fa-magnifying-glass text-gold mr-2"></i>SEO 설정
              </h3>
              <p class="text-sm text-white/60 mb-5">검색엔진 최적화를 위한 메타 정보입니다.</p>

              <div class="space-y-5">
                {/* 메타 타이틀 */}
                <div>
                  <label class="block text-sm font-bold mb-2 text-white" for="f-meta-title">
                    메타 타이틀 (SEO)
                  </label>
                  <input
                    id="f-meta-title"
                    name="meta_title"
                    type="text"
                    value={col?.metaTitle ?? ''}
                    placeholder="미입력 시 제목 자동 사용"
                    class="w-full rounded-xl border border-white/15 bg-white/10 px-4 py-3 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-gold focus:border-gold transition"
                  />
                </div>

                {/* 메타 설명 */}
                <div>
                  <label class="block text-sm font-bold mb-2 text-white" for="f-meta-desc">
                    메타 설명 (SEO, 최대 160자)
                  </label>
                  <textarea
                    id="f-meta-desc"
                    name="meta_description"
                    rows={3}
                    maxlength={160}
                    value={col?.metaDescription ?? ''}
                    placeholder="미입력 시 본문 앞부분에서 자동 발췌"
                    class="w-full rounded-xl border border-white/15 bg-white/10 px-4 py-3 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-gold focus:border-gold transition resize-none"
                  />
                  <p class="mt-1 text-xs text-white/40">
                    <span id="meta-desc-count">{col?.metaDescription?.length ?? 0}</span>/160자
                  </p>
                </div>
              </div>
            </div>

            {/* 제출 버튼 */}
            <div class="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4">
              <a
                href="/admin/column"
                class="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-white hover:bg-cream-soft text-navy font-bold px-6 py-3.5 rounded-full transition border border-navy/20"
              >
                <i class="fas fa-arrow-left"></i> 목록으로
              </a>
              <button
                type="submit"
                id="column-submit-btn"
                class="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-brand hover:bg-brand-dark text-white font-bold px-8 py-3.5 rounded-full transition shadow-lg shadow-brand/30 ring-1 ring-gold/50"
              >
                <i class="fas fa-save"></i> {isEdit ? '칼럼 수정 완료' : '칼럼 저장'}
              </button>
            </div>
          </form>
        </div>
      </main>
      <SiteFooter />
      <CommonScript />
      <script src="/static/admin.js"></script>
    </>
  )
}
