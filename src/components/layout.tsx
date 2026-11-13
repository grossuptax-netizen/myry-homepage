import type { FC } from 'hono/jsx'

// ===== 공통 헤더 (홈페이지 + 칼럼 페이지 공용) =====
// 기존 홈페이지 디자인 그대로 유지하되, 칼럼 메뉴 추가
// isAdmin: Google OAuth 로그인(grossuptax@gmail.com) 시 true → 관리자페이지 버튼 노출
interface HeaderProps {
  activeNav?: string
  isAdmin?: boolean
}

export const SiteHeader: FC<HeaderProps> = ({ activeNav, isAdmin }) => (
  <header
    id="site-header"
    class="fixed top-0 inset-x-0 z-50 bg-cream/95 backdrop-blur border-b border-gold/30"
  >
    <nav class="max-w-6xl mx-auto px-5 h-16 flex items-center justify-between">
      <a href="/" class="flex items-center gap-2.5 font-black text-xl tracking-tight leading-none">
        <img
          src="/static/logo-symbol.png"
          alt="명륜세무회계 로고"
          class="h-6 w-auto object-contain block"
        />
        <span class="text-navy leading-none">명륜<span class="text-brand">세무회계</span></span>
      </a>

      <ul class="hidden md:flex items-center gap-7 text-sm font-medium text-navy/80">
        <li><a href="/#strength" class="hover:text-brand transition">업종전문성</a></li>
        <li><a href="/#points" class="hover:text-brand transition">차별화포인트</a></li>
        <li>
          <a
            href="/column"
            class={`hover:text-brand transition ${activeNav === 'column' ? 'text-brand font-bold' : ''}`}
          >
            인사이트
          </a>
        </li>
        <li>
          <a
            href="/tax-calculator"
            class={`hover:text-brand transition ${activeNav === 'calculator' ? 'text-brand font-bold' : ''}`}
          >
            세금계산기
          </a>
        </li>
      </ul>

      <div class="flex items-center gap-2">
        {isAdmin && (
          <a
            href="/admin/column"
            class="inline-flex items-center gap-1.5 bg-navy hover:bg-navy-dark text-white text-sm font-bold px-4 py-2.5 rounded-full transition shadow-md shadow-navy/30 ring-1 ring-gold/50"
          >
            <i class="fas fa-gear"></i> 관리자페이지
          </a>
        )}
        <a
          href="/#consult"
          class="inline-flex items-center gap-2 bg-brand hover:bg-brand-dark text-white text-sm font-bold px-4 py-2.5 rounded-full transition shadow-md shadow-brand/30 ring-1 ring-gold/50"
        >
          <i class="fas fa-comment-dots"></i> 무료 상담신청
        </a>
      </div>
    </nav>
  </header>
)

// ===== 하단 작은 '관리자' 링크 =====
// 구글 로그인 후 지금 보던 페이지로 돌아오고, 그 페이지에 관리 버튼(글쓰기·수정·삭제)이 켜짐.
// 로그인 상태에서는 '로그아웃'으로 바뀜. 로그인은 30일 유지(방문 시 자동 연장).
const ADMIN_LINK_SCRIPT =
  "(function(){var a=document.querySelector('[data-admin-link]');if(!a)return;" +
  "a.href=a.getAttribute('href')+'?next='+encodeURIComponent(location.pathname+location.search);})();"

export const AdminFooterLink: FC<{ isAdmin?: boolean }> = ({ isAdmin }) => (
  <>
    {isAdmin ? (
      <a href="/api/auth/logout" data-admin-link class="hover:text-white/80 transition">
        <i class="fas fa-right-from-bracket mr-1"></i>로그아웃
      </a>
    ) : (
      <a href="/api/auth/google" data-admin-link rel="nofollow" class="hover:text-white/80 transition">
        관리자
      </a>
    )}
    <script dangerouslySetInnerHTML={{ __html: ADMIN_LINK_SCRIPT }} />
  </>
)

// ===== 사업자 정보 (맨 아래 한 줄, myhoteltax.com 과 같은 값) =====
export const BusinessInfo: FC = () => (
  <p class="flex flex-wrap gap-x-4 gap-y-1 text-white/55">
    <span>상호 명륜세무회계</span>
    <span>대표자 전창로 세무사</span>
    <span>사업자등록번호 890-57-00386</span>
    <span>주소 경기 고양시 덕양구 도래울로 110 4층 409호</span>
  </p>
)

// ===== 공통 푸터 =====
export const SiteFooter: FC<{ isAdmin?: boolean }> = ({ isAdmin }) => (
  <footer id="site-footer" class="bg-navy-dark text-white/70 py-12 border-t-2 border-gold/40">
    <div class="max-w-6xl mx-auto px-5">
      <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
        <div>
          <div class="flex items-center gap-2.5 font-black text-xl tracking-tight text-white mb-3 leading-none">
            <img
              src="/static/logo-symbol.png"
              alt="명륜세무회계 로고"
              class="h-6 w-auto object-contain block"
            />
            <span class="text-white leading-none">명륜<span class="text-gold">세무회계</span></span>
          </div>
          <p class="text-sm leading-relaxed">
            비용은 더 낮게, 절세는 더 크게.
            <br />
            정육점·축산물 전문 세무사가 함께하는 세무 서비스.
          </p>
        </div>
        <div class="text-sm space-y-1.5">
          <p><i class="fas fa-phone text-gold mr-2"></i> 031-8027-2888</p>
          <p>
            <i class="fas fa-envelope text-gold mr-2"></i>
            <a
              id="footer-email"
              href="#"
              data-e="116,103,64,109,121,114,121,116,97,120,46,99,111,109"
              rel="nofollow"
              aria-label="이메일 주소 보기"
            >
              이메일 주소 보기
            </a>
          </p>
          <p><i class="fas fa-clock text-gold mr-2"></i> 평일 09:00 ~ 18:00</p>
        </div>
      </div>
      <div class="mt-8 pt-6 border-t border-white/10 text-xs text-white/40 space-y-2">
        <BusinessInfo />
        <div class="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span>© 2026 명륜세무회계. All rights reserved.</span>
          <span aria-hidden="true">·</span>
          <AdminFooterLink isAdmin={isAdmin} />
        </div>
      </div>
    </div>
  </footer>
)

// ===== 오른쪽에 떠 있는 상담 버튼 (방문자가 보는 페이지 공용, 관리자 화면에는 넣지 않음) =====
// 주소·번호를 바꾸려면 아래 값만 고치면 됩니다
const KAKAO_CHAT_URL = 'https://pf.kakao.com/_QLxaPxj/chat'
const NAVER_TALK_URL = 'https://talk.naver.com/WXK4RB9' // 비워 두면 상담신청 폼으로 이동
const PHONE_DISPLAY = '031-8027-2888'
const PHONE_TEL = 'tel:03180272888'

export const FloatingConsult: FC = () => (
  <aside class="floating-consult" aria-label="빠른 상담">
    <a class="fc-item" href={KAKAO_CHAT_URL} target="_blank" rel="noopener noreferrer">
      <span class="fc-icon fc-kakao"><i class="fas fa-comment" aria-hidden="true"></i></span>
      <span class="fc-label">카톡 상담</span>
    </a>
    <a
      class="fc-item"
      href={NAVER_TALK_URL || '/#consult'}
      {...(NAVER_TALK_URL ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
    >
      <span class="fc-icon fc-naver" aria-hidden="true">N</span>
      <span class="fc-label">네이버톡톡</span>
    </a>
    <a class="fc-item" href={PHONE_TEL} aria-label={`전화 상담 ${PHONE_DISPLAY}`}>
      <span class="fc-icon fc-phone"><i class="fas fa-phone" aria-hidden="true"></i></span>
      <span class="fc-label">전화 상담</span>
      <span class="fc-tip" aria-hidden="true">{PHONE_DISPLAY}</span>
    </a>
  </aside>
)

// ===== 공통 스크립트 (이메일 난독화 해제, 헤더 스크롤 그림자) =====
export const CommonScript: FC = () => (
  <script src="/static/app.js"></script>
)
