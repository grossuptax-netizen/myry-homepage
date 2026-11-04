import type { FC } from 'hono/jsx'
import { CATEGORIES, getCategoryLabel, todayKst } from '../lib/columns'
import type { Column } from '../lib/columns'
import type { AdminEmail } from '../lib/db'
import { SiteHeader, SiteFooter, CommonScript } from '../components/layout'

// ===== 관리자 공통 네비게이션 바 =====
interface AdminNavProps {
  active?: 'columns' | 'settings'
  userEmail?: string
}

const AdminNav: FC<AdminNavProps> = ({ active, userEmail }) => (
  <div class="bg-white rounded-2xl border border-gold/30 shadow-sm px-4 py-3 mb-6 flex flex-wrap items-center justify-between gap-3">
    <div class="flex flex-wrap items-center gap-1">
      <a
        href="/admin/column"
        class={`inline-flex items-center gap-2 text-sm font-bold px-4 py-2 rounded-full transition ${
          active === 'columns'
            ? 'bg-brand text-white shadow-sm ring-1 ring-gold/50'
            : 'text-navy/70 hover:bg-cream-soft hover:text-brand'
        }`}
      >
        <i class="fas fa-newspaper"></i> 칼럼 관리
      </a>
      <a
        href="/admin/settings"
        class={`inline-flex items-center gap-2 text-sm font-bold px-4 py-2 rounded-full transition ${
          active === 'settings'
            ? 'bg-brand text-white shadow-sm ring-1 ring-gold/50'
            : 'text-navy/70 hover:bg-cream-soft hover:text-brand'
        }`}
      >
        <i class="fas fa-user-shield"></i> 관리자 계정
      </a>
    </div>
    <div class="flex items-center gap-3 text-xs">
      {userEmail && (
        <span class="hidden sm:inline-flex items-center gap-1.5 text-ink/60">
          <i class="fab fa-google text-gold"></i>
          <span class="font-medium">{userEmail}</span>
        </span>
      )}
      <button
        id="admin-logout"
        type="button"
        class="inline-flex items-center gap-1.5 text-ink/60 hover:text-brand transition font-bold border border-navy/15 px-3 py-1.5 rounded-full"
      >
        <i class="fas fa-sign-out-alt"></i> 로그아웃
      </button>
    </div>
  </div>
)

// ===== 관리자 로그인 페이지 =====
interface AdminLoginPageProps {
  oauthReady?: boolean // Google OAuth 설정 완료 여부
}

export const AdminLoginPage: FC<AdminLoginPageProps> = ({ oauthReady }) => (
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
            <p class="mt-2 text-sm text-ink/60">허용된 Google 계정으로 로그인하세요.</p>
          </div>

          {/* Google 로그인 버튼 — OAuth 설정 시 노출 */}
          {oauthReady ? (
            <a
              href="/api/auth/google"
              id="google-login-btn"
              class="flex items-center justify-center gap-3 w-full bg-white hover:bg-gray-50 text-navy font-bold py-3.5 rounded-xl transition border-2 border-navy/15 hover:border-navy/30 shadow-sm"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" class="flex-shrink-0">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Google 계정으로 로그인
            </a>
          ) : (
            <div class="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
              <p class="font-bold mb-1">
                <i class="fas fa-exclamation-triangle mr-1"></i> Google 로그인 미설정
              </p>
              <p class="text-xs leading-relaxed">
                관리자에게 Google OAuth 설정을 요청하세요.<br />
                (GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, ALLOWED_GOOGLE_EMAILS)
              </p>
            </div>
          )}

          {/* 로그인 에러 메시지 (콜백에서 리다이렉트 시 표시) */}
          <p id="login-error" class="text-sm text-center text-red-600 mt-4 hidden">
            <i class="fas fa-exclamation-circle mr-1"></i>
            <span id="login-error-msg">로그인에 실패했습니다.</span>
          </p>

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
interface AdminColumnListPageProps {
  columns: Column[] // 라우트에서 D1 조회 후 전달
  userEmail?: string // 로그인한 사용자 이메일 (Google OAuth)
}

export const AdminColumnListPage: FC<AdminColumnListPageProps> = ({ columns, userEmail }) => (
  <>
    <SiteHeader />
    <main class="pt-24 pb-20 min-h-screen">
      <div class="max-w-6xl mx-auto px-5">
        {/* 관리자 네비게이션 */}
        <AdminNav active="columns" userEmail={userEmail} />

        {/* 헤더 */}
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 class="text-2xl font-black text-navy">
              <i class="fas fa-newspaper text-gold mr-2"></i>칼럼 관리
            </h1>
            <p class="mt-1 text-sm text-ink/60">총 {columns.length}개의 칼럼</p>
          </div>
          <div class="flex items-center gap-3">
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
                {columns.map((col, i) => (
                  <tr class={`border-t border-gold/20 hover:bg-cream-soft transition ${i % 2 === 1 ? 'bg-cream-soft/50' : ''}`}>
                    <td class="px-4 py-3 whitespace-nowrap">
                      <span class="inline-flex items-center text-xs font-bold text-brand bg-brand-soft px-2 py-1 rounded-full">
                        {getCategoryLabel(col.category)}
                      </span>
                    </td>
                    <td class="px-4 py-3">
                      <div class="flex items-center gap-2">
                        {col.isPublished === false && (
                          <span class="shrink-0 inline-flex items-center gap-1 text-[11px] font-bold text-navy bg-gold-soft border border-gold/60 px-2 py-0.5 rounded-full">
                            <i class="fas fa-file-pen text-gold"></i> 임시저장
                          </span>
                        )}
                        <a
                          href={
                            col.isPublished === false
                              ? `/admin/column/edit/${col.id}`
                              : `/column/${col.category}/${col.slug}`
                          }
                          class="font-medium text-navy hover:text-brand transition line-clamp-1"
                        >
                          {col.title}
                        </a>
                      </div>
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
// ===== 글쓰기 툴바 (네이버 스마트에디터처럼) =====
// [본문▾][기본서체▾][15▾] | B I U S | 글자색 배경색 | 정렬▾ 줄간격▾ | ※ 링크 | 목록 사진 표
// 동작은 admin.js 의 '글쓰기 툴바' 부분 (드롭다운은 data-menu, 메뉴 항목은 data-action/data-value)
const TOOLBAR_PARA = [
  { value: 'p', label: '본문', cls: 'text-sm' },
  { value: 'h2', label: '소제목', cls: 'text-lg font-black' },
  { value: 'h3', label: '작은 소제목', cls: 'text-base font-bold' },
  { value: 'blockquote', label: '인용구', cls: 'text-sm italic border-l-4 border-gold pl-2' },
]
const TOOLBAR_FONTS = [
  { value: '', label: '기본서체' },
  { value: "'Nanum Gothic'", label: '나눔고딕' },
  { value: "'Nanum Myeongjo'", label: '나눔명조' },
  { value: "'Gowun Dodum'", label: '고운돋움' },
  { value: "'Gowun Batang'", label: '고운바탕' },
  { value: "'Nanum Pen Script'", label: '나눔손글씨 펜' },
]
const TOOLBAR_SIZES = [11, 13, 15, 16, 19, 24, 28, 30, 34, 38]
const TOOLBAR_TEXT_COLORS = [
  '#000000', '#555555', '#888888', '#bbbbbb', '#ff0010', '#ff6c00', '#ffb400', '#00a84b',
  '#00b2f0', '#0c3fdf', '#8e00ff', '#ff00a6', '#8b1a1a', '#1a2a4a', '#a88a35', '#6b4226',
]
const TOOLBAR_BG_COLORS = [
  '#fff1a8', '#ffe1c2', '#ffd6d6', '#ffd6f3', '#e9dcff', '#d6e4ff', '#d4f3ff', '#d4f5dc',
  '#fff200', '#ffc000', '#ff9c9c', '#a8e6ff', '#b8f0a8', '#e0e0e0',
]
const TOOLBAR_ALIGNS = [
  { value: 'justifyLeft', icon: 'fa-align-left', label: '왼쪽 정렬' },
  { value: 'justifyCenter', icon: 'fa-align-center', label: '가운데 정렬' },
  { value: 'justifyRight', icon: 'fa-align-right', label: '오른쪽 정렬' },
  { value: 'justifyFull', icon: 'fa-align-justify', label: '양쪽 정렬' },
]
const TOOLBAR_LINE_HEIGHTS = ['150%', '180%', '200%', '250%']
const TOOLBAR_SYMBOLS = '※ ★ ☆ ● ○ ◎ ■ □ ◆ ◇ ▲ △ ▶ ▷ ▼ ▽ ✔ ✓ ✗ ♥ ☎ → ← ↑ ↓ ⇒ ① ② ③ ④ ⑤ ⑥ ⑦ ⑧ ⑨ ⑩ · … ℃ ㎡ ㎏ ％ 「 」 『 』 【 】'.split(' ')

const ToolbarSep: FC = () => <span class="tb-sep" aria-hidden="true"></span>

const EditorToolbar: FC = () => (
  <div id="editor-toolbar" class="relative flex flex-wrap items-center gap-0.5 mb-2 rounded-lg border border-navy/10 bg-white px-1 py-1">
    {/* 문단 스타일 */}
    <div class="relative">
      <button type="button" class="tb-drop" data-menu="tb-menu-para" title="문단 스타일">
        <span id="tb-para-label">본문</span> <i class="fas fa-chevron-down tb-caret"></i>
      </button>
      <div id="tb-menu-para" class="tb-menu hidden">
        {TOOLBAR_PARA.map((p) => (
          <button type="button" class={`tb-item ${p.cls}`} data-action="para" data-value={p.value}>{p.label}</button>
        ))}
      </div>
    </div>
    {/* 글꼴 */}
    <div class="relative">
      <button type="button" class="tb-drop" data-menu="tb-menu-font" title="글꼴">
        <span id="tb-font-label">기본서체</span> <i class="fas fa-chevron-down tb-caret"></i>
      </button>
      <div id="tb-menu-font" class="tb-menu hidden">
        {TOOLBAR_FONTS.map((f) => (
          <button type="button" class="tb-item" data-action="font" data-value={f.value} style={f.value ? `font-family:${f.value}` : ''}>{f.label}</button>
        ))}
      </div>
    </div>
    {/* 글자 크기 */}
    <div class="relative">
      <button type="button" class="tb-drop" data-menu="tb-menu-size" title="글자 크기">
        <span id="tb-size-label">15</span> <i class="fas fa-chevron-down tb-caret"></i>
      </button>
      <div id="tb-menu-size" class="tb-menu tb-menu-narrow hidden">
        {TOOLBAR_SIZES.map((s) => (
          <button type="button" class="tb-item" data-action="size" data-value={String(s)}>{s}</button>
        ))}
      </div>
    </div>
    <ToolbarSep />
    {/* 굵게 · 기울임 · 밑줄 · 취소선 */}
    <button type="button" class="tb-btn" data-cmd="bold" title="굵게"><i class="fas fa-bold"></i></button>
    <button type="button" class="tb-btn" data-cmd="italic" title="기울임"><i class="fas fa-italic"></i></button>
    <button type="button" class="tb-btn" data-cmd="underline" title="밑줄"><i class="fas fa-underline"></i></button>
    <button type="button" class="tb-btn" data-cmd="strikeThrough" title="취소선"><i class="fas fa-strikethrough"></i></button>
    {/* 글자색 */}
    <div class="relative">
      <button type="button" class="tb-btn tb-drop-btn" data-menu="tb-menu-color" title="글자색">
        <span class="tb-t">T<span id="tb-color-bar" class="tb-colorbar"></span></span>
      </button>
      <div id="tb-menu-color" class="tb-menu tb-palette hidden">
        <button type="button" class="tb-item tb-palette-reset" data-action="color" data-value="">기본 글자색</button>
        <div class="tb-swatches">
          {TOOLBAR_TEXT_COLORS.map((c) => (
            <button type="button" class="tb-swatch" data-action="color" data-value={c} style={`background:${c}`} title={c}></button>
          ))}
        </div>
      </div>
    </div>
    {/* 배경색 (형광펜) */}
    <div class="relative">
      <button type="button" class="tb-btn tb-drop-btn" data-menu="tb-menu-bg" title="배경색 (형광펜)">
        <span class="tb-t tb-t-box">T</span>
      </button>
      <div id="tb-menu-bg" class="tb-menu tb-palette hidden">
        <button type="button" class="tb-item tb-palette-reset" data-action="bg" data-value="">배경색 없음</button>
        <div class="tb-swatches">
          {TOOLBAR_BG_COLORS.map((c) => (
            <button type="button" class="tb-swatch" data-action="bg" data-value={c} style={`background:${c}`} title={c}></button>
          ))}
        </div>
      </div>
    </div>
    <ToolbarSep />
    {/* 정렬 */}
    <div class="relative">
      <button type="button" class="tb-btn tb-drop-btn" data-menu="tb-menu-align" title="정렬">
        <i id="tb-align-icon" class="fas fa-align-left"></i>
      </button>
      <div id="tb-menu-align" class="tb-menu tb-menu-narrow hidden">
        {TOOLBAR_ALIGNS.map((a) => (
          <button type="button" class="tb-item" data-action="align" data-value={a.value} data-icon={a.icon}>
            <i class={`fas ${a.icon} mr-2`}></i>{a.label}
          </button>
        ))}
      </div>
    </div>
    {/* 줄간격 */}
    <div class="relative">
      <button type="button" class="tb-btn tb-drop-btn" data-menu="tb-menu-lh" title="줄간격">
        <i class="fas fa-arrows-up-down"></i>
      </button>
      <div id="tb-menu-lh" class="tb-menu tb-menu-narrow hidden">
        {TOOLBAR_LINE_HEIGHTS.map((v) => (
          <button type="button" class="tb-item" data-action="lh" data-value={v}>{v}</button>
        ))}
      </div>
    </div>
    <ToolbarSep />
    {/* 특수문자 */}
    <div class="relative">
      <button type="button" class="tb-btn tb-drop-btn" data-menu="tb-menu-symbol" title="특수문자">※</button>
      <div id="tb-menu-symbol" class="tb-menu tb-palette hidden">
        <div class="tb-symbols">
          {TOOLBAR_SYMBOLS.map((s) => (
            <button type="button" class="tb-symbol" data-action="symbol" data-value={s}>{s}</button>
          ))}
        </div>
      </div>
    </div>
    {/* 링크 */}
    <button type="button" class="tb-btn" id="tb-link" title="링크"><i class="fas fa-link"></i></button>
    <ToolbarSep />
    {/* 목록 · 사진 · 표 */}
    <button type="button" class="tb-btn" data-cmd="insertUnorderedList" title="글머리 기호"><i class="fas fa-list-ul"></i></button>
    <button type="button" class="tb-btn" data-cmd="insertOrderedList" title="번호 매기기"><i class="fas fa-list-ol"></i></button>
    <button type="button" class="tb-btn" id="insert-image-btn" title="사진 넣기"><i class="fas fa-image"></i></button>
    <button type="button" class="tb-btn" id="insert-table-btn" title="표 넣기"><i class="fas fa-table"></i></button>
  </div>
)

interface AdminColumnFormPageProps {
  mode: 'new' | 'edit'
  column?: Column // 수정 모드일 때 기존 칼럼 데이터 (라우트에서 D1 조회 후 전달)
}

export const AdminColumnFormPage: FC<AdminColumnFormPageProps> = ({ mode, column }) => {
  const isEdit = mode === 'edit'
  const col = isEdit ? column : undefined
  // 새 글이거나 임시저장 글이면 '임시저장' + '발행하기', 이미 공개된 글이면 '수정 완료'만
  const canDraft = !col || col.isPublished === false

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
          <form id="column-form" class="space-y-6" data-published={col?.isPublished === false || !col ? '0' : '1'}>
            <input type="hidden" name="id" value={col?.id ?? ''} />
            {/* 네이버 글 담기로 가져온 글의 원본 주소 (columns.source_url) */}
            <input type="hidden" name="source_url" value={col?.sourceUrl ?? ''} />

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
                  data-state={col ? 'saved' : 'today'}
                  value={col?.publishedAt ?? todayKst()}
                  class="w-full rounded-xl border border-navy/15 bg-cream-soft px-4 py-3 focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand focus:bg-white transition"
                />
                <p id="date-hint" class="mt-2 text-xs text-ink/50">
                  {col ? '저장된 발행일입니다.' : '오늘 날짜로 올라갑니다. 날짜를 눌러 바꿀 수 있습니다.'}
                </p>
              </div>
            </div>

            {/* 본문 (리치 텍스트) */}
            <div class="bg-white rounded-2xl border border-gold/30 p-6 shadow-sm">
              {/* 본문 제목 줄: 왼쪽 '본문', 오른쪽 마지막 임시저장 시각 + 임시저장 버튼 */}
              <div class="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 mb-2">
                <label class="block text-sm font-bold text-navy" for="f-content">
                  본문 <span class="text-brand">*</span>
                </label>
                {canDraft && (
                  <div class="flex flex-wrap items-center justify-end gap-x-3 gap-y-1">
                    <p
                      id="draft-status"
                      class="text-xs sm:text-sm text-ink/60"
                      data-saved-at={col?.savedAt ?? ''}
                      data-preview-url={col ? `/column/${col.category}/${col.slug}` : ''}
                    ></p>
                    {/* 왼쪽: 임시저장 / 오른쪽 숫자: 임시저장 글 목록 열기 */}
                    <div class="inline-flex items-stretch bg-white rounded-full border border-navy/20 overflow-hidden text-sm font-bold">
                      <button
                        type="button"
                        id="column-draft-btn"
                        class="inline-flex items-center gap-2 text-navy hover:bg-cream-soft pl-4 pr-3 py-2 transition"
                      >
                        <i class="fas fa-floppy-disk"></i> 임시저장
                      </button>
                      <span class="w-px my-2 bg-navy/20" aria-hidden="true"></span>
                      <button
                        type="button"
                        id="draft-list-btn"
                        class="inline-flex items-center pl-3 pr-4 py-2 text-green-600 hover:bg-cream-soft transition"
                        title="임시저장 글 보기"
                        aria-haspopup="dialog"
                      >
                        <span id="draft-count">0</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
              <p class="text-xs text-ink/50 mb-3">
                <i class="fas fa-info-circle text-gold mr-1"></i>
                텍스트, 이미지, 표를 삽입할 수 있습니다. 소제목은 H2/H3 태그로 구조화하세요.
                <br />
                <i class="fas fa-paste text-gold mr-1"></i>
                네이버 카페·블로그 글을 붙여넣으면 서식이 자동 정리되고, 이미지는 Cloudinary로 자동 업로드됩니다.
              </p>
              {/* 네이버 글 담기로 가져온 글 안내 (원본 주소, 꼬리말 정리 + 되돌리기) */}
              <div id="clip-status" class="hidden"></div>
              {/* 붙여넣은 이미지 업로드 진행/실패 안내 */}
              <p id="paste-status" class="hidden"></p>
              {/* 툴바 (네이버 스마트에디터 배치) */}
              <EditorToolbar />
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

              {/* '네이버 글 담기' 즐겨찾기 버튼(북마클릿) 설치 안내 */}
              <details class="mt-4 rounded-xl border border-green-200 bg-green-50/60 text-sm text-ink/80">
                <summary class="cursor-pointer px-4 py-3 font-bold text-green-800">
                  <i class="fas fa-bookmark mr-1.5"></i> 네이버 카페·블로그 글 가져오기 — ‘네이버 글 담기’ 즐겨찾기 버튼 설치
                </summary>
                <div class="px-4 pb-4 leading-relaxed">
                  <p>
                    내 네이버 로그인으로 글을 읽어 <b>회원 전용 카페 글</b>도 가져옵니다. 사진은 스크롤하지 않아도 모두 들어오고,
                    정육점 Cloudinary 로 옮겨집니다.
                  </p>
                  <p class="my-3 flex flex-wrap items-center gap-3">
                    <a
                      id="clipBookmarklet"
                      href="#"
                      title="즐겨찾기 막대로 끌어다 놓으세요"
                      class="inline-flex items-center gap-1.5 rounded-lg bg-green-700 px-4 py-2 font-bold text-white no-underline cursor-grab"
                    >
                      <i class="fas fa-bookmark"></i> 네이버 글 담기
                    </a>
                    <span>← 이 버튼을 즐겨찾기 막대로 끌어다 놓으세요</span>
                  </p>
                  <ol class="ml-5 list-decimal space-y-1">
                    <li>크롬·엣지에서 <b>Ctrl + Shift + B</b> 를 눌러 주소창 아래에 즐겨찾기 막대가 보이게 합니다.</li>
                    <li>위의 초록색 <b>네이버 글 담기</b> 버튼을 마우스로 꾹 눌러 즐겨찾기 막대 위로 끌어다 놓습니다.</li>
                    <li>네이버에 로그인한 뒤 가져올 카페·블로그 글을 엽니다.</li>
                    <li>
                      즐겨찾기 막대의 <b>네이버 글 담기</b>를 누르면 네이버 화면 오른쪽 위에 상자가 뜹니다.
                      <b>정육점 홈페이지로 보내기</b>를 누르면 이 홈페이지 글쓰기가 새 탭으로 열리고 제목·본문·사진이 자동으로 들어갑니다.
                    </li>
                  </ol>
                  <p class="mt-2 text-ink/60">
                    끌어다 놓기가 안 되면:{' '}
                    <button type="button" id="clipCopyCode" class="rounded border border-green-700/40 bg-white px-2 py-0.5 text-xs font-bold text-green-800">
                      버튼 코드 복사
                    </button>{' '}
                    → 즐겨찾기 막대 빈 곳을 오른쪽 클릭 → ‘페이지 추가’(엣지: ‘즐겨찾기 추가’) → 이름에 <b>네이버 글 담기</b>, URL 칸에 Ctrl+V → 저장
                  </p>
                  <p class="mt-1 text-ink/60">
                    ‘정육점 홈페이지로 보내기’는 <b id="clipSite"></b> 으로, ‘호텔 홈페이지로 보내기’는 <b>https://myhoteltax.com</b> 으로 보냅니다.
                    실제 홈페이지용 버튼은 실제 홈페이지(jung6tax.com) 글쓰기 화면에서 다시 끌어다 놓으세요.
                  </p>
                </div>
              </details>
            </div>

            {/* 대표 썸네일 이미지 */}
            <div class="bg-white rounded-2xl border border-gold/30 p-6 shadow-sm">
              <label class="block text-sm font-bold mb-2 text-navy" for="f-thumbnail">
                대표 썸네일 이미지 <span class="text-xs font-medium text-ink/50">(선택)</span>
              </label>
              <p class="text-xs text-ink/50 mb-3">
                <i class="fas fa-cloud-arrow-up text-gold mr-1"></i>
                파일 선택 시 Cloudinary CDN에 자동 업로드됩니다. (최대 10MB)
                <br />
                <i class="fas fa-wand-magic-sparkles text-gold mr-1"></i>
                선택하지 않으면 본문의 첫 번째 사진이 자동으로 대표 이미지가 됩니다.
              </p>
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
                placeholder="목록 페이지 카드에 표시될 요약문"
                class="w-full rounded-xl border border-navy/15 bg-cream-soft px-4 py-3 focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand focus:bg-white transition resize-none"
              >
                {/* textarea 는 value 속성이 아니라 안쪽 글자로 기존 값을 넣어야 수정 화면에 보임 */}
                {col?.excerpt ?? ''}
              </textarea>
            </div>

            {/* SEO 설정 */}
            <div class="bg-navy text-white rounded-2xl border border-gold/40 p-6 shadow-sm">
              <h3 class="text-lg font-black mb-1">
                <i class="fas fa-magnifying-glass text-gold mr-2"></i>SEO 설정
              </h3>
              <p class="text-sm text-white/60 mb-5">
                검색 결과와 카카오톡 공유 미리보기에 표시되는 정보입니다. 비워 두면 자동으로 채워집니다.
              </p>

              {/* SEO 최적화 적용 (붙여넣은 기존 글을 한 번에 최적화) */}
              <div class="mb-6 rounded-xl border border-gold/50 bg-gold/10 p-4">
                <div class="flex flex-wrap items-center justify-between gap-3">
                  <div class="text-sm text-white/80">
                    <p class="font-bold text-white">기존 글을 붙여넣었다면 한 번에 최적화하세요</p>
                    <p class="text-xs text-white/60 mt-0.5">
                      소제목 만들기 · 핵심 검색어 추천 · 메타 타이틀/설명 · 한 줄 요약 · 영문 주소 · 사진 설명 (본문 문장은 바꾸지 않음)
                    </p>
                  </div>
                  <button
                    type="button"
                    id="seo-optimize-btn"
                    class="shrink-0 inline-flex items-center gap-2 rounded-full bg-gold hover:bg-gold-dark px-5 py-2.5 text-sm font-black text-navy shadow-md transition"
                  >
                    <i class="fas fa-wand-magic-sparkles"></i> SEO 최적화 적용
                  </button>
                </div>
                <div id="seo-optimize-result" class="hidden mt-3 rounded-lg bg-navy-dark/60 px-4 py-3 text-sm text-white/90"></div>
              </div>

              <div class="space-y-5">
                {/* 핵심 검색어 (SEO 점검 기준) */}
                <div>
                  <label class="block text-sm font-bold mb-2 text-white" for="f-focus-keyword">
                    핵심 검색어
                  </label>
                  <input
                    id="f-focus-keyword"
                    name="focus_keyword"
                    type="text"
                    maxlength={50}
                    value={col?.focusKeyword ?? ''}
                    placeholder="이 글로 검색되고 싶은 말 (예: 해고예고수당, 정육점 의무교육)"
                    class="w-full rounded-xl border border-white/15 bg-white/10 px-4 py-3 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-gold focus:border-gold transition"
                  />
                  <p class="mt-1 text-xs text-white/40">
                    사장님들이 실제로 검색할 만한 말 1개. 아래 'SEO 점검'이 이 검색어를 기준으로 확인합니다. (화면에는 표시되지 않음)
                  </p>
                </div>

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
                    placeholder="미입력 시 '제목 | 명륜세무회계' 자동 사용"
                    class="w-full rounded-xl border border-white/15 bg-white/10 px-4 py-3 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-gold focus:border-gold transition"
                  />
                  <p class="mt-1 text-xs text-white/40">
                    <span id="meta-title-count">0</span>자 · 권장 40자 이내 (길면 검색 결과에서 잘림), 검색어를 앞쪽에
                  </p>
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
                    placeholder="미입력 시 '한 줄 요약' → 본문 앞부분 순으로 자동 사용"
                    class="w-full rounded-xl border border-white/15 bg-white/10 px-4 py-3 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-gold focus:border-gold transition resize-none"
                  >
                    {col?.metaDescription ?? ''}
                  </textarea>
                  <p class="mt-1 text-xs text-white/40">
                    <span id="meta-desc-count">{col?.metaDescription?.length ?? 0}</span>/160자 · 권장 80~120자
                  </p>
                </div>

                {/* 검색 결과 미리보기 (입력 내용에 따라 실시간 갱신) */}
                <div>
                  <p class="text-sm font-bold mb-2 text-white">
                    <i class="fab fa-google text-gold mr-1.5"></i>검색 결과 미리보기
                  </p>
                  <div class="rounded-xl bg-white px-4 py-3.5 text-left">
                    <p id="seo-preview-url" class="text-xs text-[#4d5156] truncate">jung6tax.com › column</p>
                    <p id="seo-preview-title" class="mt-1 text-lg leading-snug text-[#1a0dab] truncate">
                      {col?.metaTitle || (col ? `${col.title} | 명륜세무회계` : '제목 | 명륜세무회계')}
                    </p>
                    <p id="seo-preview-desc" class="mt-1 text-sm leading-relaxed text-[#4d5156] line-clamp-2"></p>
                  </div>
                  <p id="seo-preview-warn" class="mt-2 text-xs text-gold hidden"></p>
                </div>

                {/* SEO 점검 (입력 내용에 따라 실시간 갱신) */}
                <div class="rounded-xl bg-white/5 border border-white/15 p-4">
                  <div class="flex flex-wrap items-center justify-between gap-2 mb-3">
                    <p class="text-sm font-bold text-white">
                      <i class="fas fa-clipboard-check text-gold mr-1.5"></i>SEO 점검
                    </p>
                    <p class="text-sm">
                      <span id="seo-score" class="inline-flex items-center rounded-full px-3 py-0.5 font-black bg-white/10 text-white">-</span>
                    </p>
                  </div>
                  <ul id="seo-checklist" class="space-y-1.5 text-sm"></ul>
                  <div class="mt-4 flex flex-wrap gap-2">
                    <button type="button" id="seo-fix-alt" class="rounded-full border border-white/25 px-3 py-1.5 text-xs font-bold text-white hover:bg-white/10 transition">
                      <i class="fas fa-image mr-1"></i>사진 설명(alt) 자동 채우기
                    </button>
                    <button type="button" id="seo-fix-desc" class="rounded-full border border-white/25 px-3 py-1.5 text-xs font-bold text-white hover:bg-white/10 transition">
                      <i class="fas fa-align-left mr-1"></i>요약으로 메타 설명 채우기
                    </button>
                  </div>
                  <p class="mt-3 text-xs text-white/40">
                    점검은 참고용입니다. 모두 초록색이 아니어도 저장·발행할 수 있어요. 설명이 빠진 사진은 저장할 때 제목으로 자동 채워집니다.
                  </p>
                </div>
              </div>
            </div>

            {/* 제출 버튼 */}
            <div class="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4">
              <a
                href="/admin/column"
                id="column-back-link"
                class="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-white hover:bg-cream-soft text-navy font-bold px-6 py-3.5 rounded-full transition border border-navy/20"
              >
                <i class="fas fa-arrow-left"></i> 목록으로
              </a>
              <button
                type="submit"
                id="column-submit-btn"
                class="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-brand hover:bg-brand-dark text-white font-bold px-8 py-3.5 rounded-full transition shadow-lg shadow-brand/30 ring-1 ring-gold/50"
              >
                <i class={`fas ${canDraft ? 'fa-paper-plane' : 'fa-save'}`}></i> {canDraft ? '발행하기' : '칼럼 수정 완료'}
              </button>
            </div>
          </form>

          {/* 임시저장 글 창 (임시저장 옆 숫자를 누르면 열림) */}
          {canDraft && (
            <div id="draft-modal" class="hidden fixed inset-0 z-[60] items-center justify-center bg-black/30 px-4" role="dialog" aria-modal="true" aria-labelledby="draft-modal-title">
              <div class="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-navy/10 overflow-hidden">
                <div class="flex items-start justify-between px-6 pt-6">
                  <h2 id="draft-modal-title" class="text-2xl font-black text-navy">임시저장 글</h2>
                  <button type="button" id="draft-modal-close" class="text-2xl leading-none text-ink/50 hover:text-navy transition" aria-label="닫기">
                    <i class="fas fa-xmark"></i>
                  </button>
                </div>
                <div class="flex items-center justify-between px-6 pt-4 pb-3 border-b border-navy/10">
                  <p class="text-sm text-ink/60">
                    총 <span id="draft-modal-count" class="font-bold text-green-600">0</span>개
                  </p>
                  <button type="button" id="draft-edit-toggle" class="text-sm font-bold text-navy border border-navy/20 rounded px-4 py-1.5 hover:bg-cream-soft transition">
                    편집
                  </button>
                </div>
                <ul id="draft-modal-list" class="max-h-[60vh] overflow-y-auto divide-y divide-navy/10 pb-3"></ul>
              </div>
            </div>
          )}
        </div>
      </main>
      <SiteFooter />
      <CommonScript />
      <script src="/static/admin.js"></script>
    </>
  )
}

// ===== 관리자 계정(허용 이메일) 설정 페이지 =====
interface AdminSettingsPageProps {
  admins: AdminEmail[]
  userEmail?: string
  envFallbackActive?: boolean // 환경변수 fallback 모드 활성화 여부
  envFallbackList?: string[] // 환경변수 부트스트랩 이메일 (참고용 노출)
}

export const AdminSettingsPage: FC<AdminSettingsPageProps> = ({
  admins,
  userEmail,
  envFallbackActive,
  envFallbackList,
}) => (
  <>
    <SiteHeader />
    <main class="pt-24 pb-20 min-h-screen">
      <div class="max-w-5xl mx-auto px-5">
        {/* 관리자 네비게이션 */}
        <AdminNav active="settings" userEmail={userEmail} />

        {/* 헤더 */}
        <div class="mb-6">
          <h1 class="text-2xl font-black text-navy">
            <i class="fas fa-user-shield text-gold mr-2"></i>관리자 계정 설정
          </h1>
          <p class="mt-1 text-sm text-ink/60">
            Google 로그인을 허용할 이메일을 관리합니다. 이 목록에 포함된 활성 계정만 관리자 페이지에 접근할 수 있습니다.
          </p>
        </div>

        {/* 환경변수 Fallback 안내 */}
        {envFallbackActive && (
          <div class="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-6 text-sm">
            <p class="font-bold text-amber-800 mb-1">
              <i class="fas fa-triangle-exclamation mr-1"></i> 환경변수 Fallback 모드
            </p>
            <p class="text-amber-700 text-xs leading-relaxed">
              아직 등록된 활성 관리자가 없어 환경변수 <code class="bg-amber-100 px-1 rounded">ALLOWED_GOOGLE_EMAILS</code>로 접근 중입니다.
              아래에 관리자 계정을 1개 이상 추가하면 환경변수 fallback은 자동으로 비활성화되고, 이 테이블이 유일한 진실 공급원이 됩니다.
              {envFallbackList && envFallbackList.length > 0 && (
                <>
                  <br />
                  현재 fallback 이메일: {envFallbackList.map((e) => (
                    <code class="bg-amber-100 px-1 rounded mr-1">{e}</code>
                  ))}
                </>
              )}
            </p>
          </div>
        )}

        {/* 새 관리자 추가 폼 */}
        <div class="bg-white rounded-2xl border border-gold/30 shadow-sm p-6 mb-6">
          <h2 class="text-lg font-black text-navy mb-4">
            <i class="fas fa-user-plus text-brand mr-2"></i>관리자 추가
          </h2>
          <form id="admin-email-add-form" class="grid md:grid-cols-[1.4fr_1fr_1fr_auto] gap-3 items-end">
            <div>
              <label class="block text-xs font-bold mb-1 text-navy" for="ae-email">
                Google 이메일 <span class="text-brand">*</span>
              </label>
              <input
                id="ae-email"
                name="email"
                type="email"
                required
                placeholder="admin@example.com"
                class="w-full rounded-xl border border-navy/15 bg-cream-soft px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand focus:bg-white transition"
              />
            </div>
            <div>
              <label class="block text-xs font-bold mb-1 text-navy" for="ae-name">
                표시 이름 (선택)
              </label>
              <input
                id="ae-name"
                name="displayName"
                type="text"
                placeholder="홍길동 세무사"
                class="w-full rounded-xl border border-navy/15 bg-cream-soft px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand focus:bg-white transition"
              />
            </div>
            <div>
              <label class="block text-xs font-bold mb-1 text-navy" for="ae-note">
                메모 (선택)
              </label>
              <input
                id="ae-note"
                name="note"
                type="text"
                placeholder="운영 담당"
                class="w-full rounded-xl border border-navy/15 bg-cream-soft px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand focus:bg-white transition"
              />
            </div>
            <button
              type="submit"
              id="admin-email-add-btn"
              class="inline-flex items-center justify-center gap-2 bg-brand hover:bg-brand-dark text-white text-sm font-bold px-5 py-2.5 rounded-full transition shadow-md shadow-brand/30 ring-1 ring-gold/50 whitespace-nowrap"
            >
              <i class="fas fa-plus"></i> 추가
            </button>
          </form>
          <p id="admin-email-add-msg" class="mt-3 text-sm hidden"></p>
        </div>

        {/* 관리자 목록 테이블 */}
        <div class="bg-white rounded-2xl border border-gold/30 shadow-sm overflow-hidden">
          <div class="px-6 py-4 border-b border-gold/20 flex items-center justify-between">
            <h2 class="text-lg font-black text-navy">
              <i class="fas fa-list text-brand mr-2"></i>등록된 관리자 ({admins.length})
            </h2>
          </div>
          {admins.length === 0 ? (
            <div class="p-10 text-center text-ink/50">
              <i class="fas fa-inbox text-4xl text-gold/30 mb-3"></i>
              <p class="text-sm">아직 등록된 관리자가 없습니다. 위 폼에서 추가해주세요.</p>
            </div>
          ) : (
            <div class="overflow-x-auto">
              <table class="w-full text-sm">
                <thead class="bg-navy text-white">
                  <tr>
                    <th class="px-4 py-3 text-left font-bold">이메일</th>
                    <th class="px-4 py-3 text-left font-bold whitespace-nowrap">표시 이름</th>
                    <th class="px-4 py-3 text-left font-bold whitespace-nowrap">메모</th>
                    <th class="px-4 py-3 text-center font-bold whitespace-nowrap">상태</th>
                    <th class="px-4 py-3 text-left font-bold whitespace-nowrap">등록일</th>
                    <th class="px-4 py-3 text-center font-bold whitespace-nowrap">관리</th>
                  </tr>
                </thead>
                <tbody id="admin-email-tbody">
                  {admins.map((a, i) => (
                    <tr
                      class={`border-t border-gold/20 hover:bg-cream-soft transition ${i % 2 === 1 ? 'bg-cream-soft/50' : ''}`}
                      data-id={a.id}
                      data-email={a.email}
                    >
                      <td class="px-4 py-3">
                        <div class="font-medium text-navy flex items-center gap-2">
                          <i class="fab fa-google text-gold"></i>
                          <span class="font-mono text-xs sm:text-sm">{a.email}</span>
                          {userEmail && userEmail.toLowerCase() === a.email.toLowerCase() && (
                            <span class="inline-flex items-center text-[10px] font-bold text-brand bg-brand-soft px-1.5 py-0.5 rounded-full">
                              현재 로그인
                            </span>
                          )}
                        </div>
                      </td>
                      <td class="px-4 py-3 text-ink/70 whitespace-nowrap">
                        {a.displayName ?? <span class="text-ink/30">—</span>}
                      </td>
                      <td class="px-4 py-3 text-ink/70">
                        {a.note ?? <span class="text-ink/30">—</span>}
                      </td>
                      <td class="px-4 py-3 text-center whitespace-nowrap">
                        <label class="inline-flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            class="admin-active-toggle sr-only peer"
                            data-id={a.id}
                            checked={a.isActive}
                          />
                          <span class="w-10 h-5 bg-gray-300 peer-checked:bg-brand rounded-full relative transition after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:w-4 after:h-4 after:bg-white after:rounded-full after:transition peer-checked:after:translate-x-5"></span>
                          <span class={`text-xs font-bold ${a.isActive ? 'text-brand' : 'text-ink/40'}`}>
                            {a.isActive ? '활성' : '중지'}
                          </span>
                        </label>
                      </td>
                      <td class="px-4 py-3 text-ink/60 text-xs whitespace-nowrap">
                        {a.createdAt?.slice(0, 10) ?? '—'}
                      </td>
                      <td class="px-4 py-3 text-center whitespace-nowrap">
                        <button
                          type="button"
                          class="admin-email-delete-btn inline-flex items-center gap-1 text-xs font-bold text-red-600 hover:text-red-700 transition"
                          data-id={a.id}
                          data-email={a.email}
                          disabled={userEmail && userEmail.toLowerCase() === a.email.toLowerCase() ? true : undefined}
                          title={
                            userEmail && userEmail.toLowerCase() === a.email.toLowerCase()
                              ? '현재 로그인한 본인은 삭제할 수 없습니다. 다른 계정으로 로그인 후 삭제하세요.'
                              : '관리자 삭제'
                          }
                        >
                          <i class="fas fa-trash"></i> 삭제
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* 안내 */}
        <div class="mt-6 bg-cream-soft rounded-2xl p-5 text-sm text-ink/70 border border-gold/20">
          <p class="font-bold text-navy mb-2">
            <i class="fas fa-info-circle text-gold mr-1"></i>안내
          </p>
          <ul class="space-y-1.5 list-disc list-inside leading-relaxed">
            <li>등록된 이메일로 Google 로그인한 사용자만 관리자 페이지에 접근할 수 있습니다.</li>
            <li>'상태' 토글을 끄면 해당 계정의 신규 로그인이 즉시 차단됩니다. (이미 발급된 세션은 만료 시 재로그인 거부)</li>
            <li>현재 로그인한 본인은 안전상 삭제할 수 없습니다. (다른 계정으로 로그인 후 삭제하세요)</li>
            <li>등록 가능한 활성 관리자가 모두 사라지면 환경변수 ALLOWED_GOOGLE_EMAILS로 fallback 됩니다.</li>
          </ul>
        </div>
      </div>
    </main>
    <SiteFooter />
    <CommonScript />
    <script src="/static/admin.js"></script>
  </>
)
