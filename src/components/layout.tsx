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

// ===== 공통 푸터 =====
export const SiteFooter: FC = () => (
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
      <div class="mt-8 pt-6 border-t border-white/10 text-xs text-white/40">
        © 2026 명륜세무회계. All rights reserved.
      </div>
    </div>
  </footer>
)

// ===== 공통 스크립트 (이메일 난독화 해제, 헤더 스크롤 그림자) =====
export const CommonScript: FC = () => (
  <script src="/static/app.js"></script>
)
