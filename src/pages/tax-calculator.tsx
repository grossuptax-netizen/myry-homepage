import type { FC } from 'hono/jsx'
import { SiteHeader, SiteFooter, CommonScript } from '../components/layout'

// ===== 세금계산기 페이지 (준비 중 플레이스홀더) =====
// 사용자 요청: "세금계산기부분은 나중에 따로 기능을 만들거야"
// 메뉴 링크가 404가 되지 않도록 플레이스홀더 페이지 제공
export const TaxCalculatorPage: FC = () => (
  <html lang="ko">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>세금계산기 (준비 중) | 명륜세무회계</title>
      <meta name="description" content="정육점·축산물 세무 전용 세금계산기. 현재 준비 중입니다. 오픈 시 의제매입세액공제·부가세·종합소득세 시뮬레이션을 제공합니다." />
      <meta name="robots" content="noindex" />
      <script src="https://cdn.tailwindcss.com" />
      <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet" />
      <link href="/static/style.css" rel="stylesheet" />
    </head>
    <body class="bg-cream">
      <SiteHeader activeNav="calculator" />

      <main class="pt-16">
        <section class="py-24 md:py-32 min-h-[70vh] flex items-center">
          <div class="max-w-2xl mx-auto px-5 text-center">
            <span class="inline-flex items-center gap-2 bg-white border border-gold text-brand text-sm font-bold px-4 py-1.5 rounded-full mb-8 shadow-sm">
              <i class="fas fa-calculator text-gold"></i> 세금계산기
            </span>

            <div class="mb-8">
              <i class="fas fa-tools text-6xl text-gold-dark/70"></i>
            </div>

            <h1 class="text-3xl md:text-4xl font-black text-navy leading-tight mb-5">
              세금계산기, <span class="text-brand">준비 중</span>입니다
            </h1>

            <p class="text-lg text-navy/70 leading-relaxed mb-10">
              정육점·축산물 사장님을 위한 전용 세금계산기를 준비하고 있어요.
              <br />
              오픈하면 의제매입세액공제·부가세·종합소득세를
              <br className="hidden md:block" />
              간편하게 시뮬레이션할 수 있습니다.
            </p>

            <div class="bg-white rounded-2xl p-6 border border-gold/30 shadow-sm text-left mb-10">
              <p class="text-sm font-bold text-navy mb-3">
                <i class="fas fa-bell text-gold mr-2"></i>오픈 알림을 받고 싶으신가요?
              </p>
              <p class="text-sm text-navy/60 leading-relaxed">
                무료 상담신청을 남겨주시면 세금계산기 오픈과 함께
                <br className="hidden md:block" />
                맞춤형 절세 안내를 받아보실 수 있습니다.
              </p>
            </div>

            <div class="flex flex-col sm:flex-row gap-3 justify-center">
              <a
                href="/#consult"
                class="inline-flex items-center justify-center gap-2 bg-brand hover:bg-brand-dark text-white font-bold px-7 py-3.5 rounded-full transition shadow-md shadow-brand/30"
              >
                <i class="fas fa-comment-dots"></i> 무료 상담신청
              </a>
              <a
                href="/column"
                class="inline-flex items-center justify-center gap-2 bg-white hover:bg-cream-soft text-navy font-bold px-7 py-3.5 rounded-full transition border border-navy/15"
              >
                <i class="fas fa-book-open text-gold"></i> 인사이트 칼럼 보기
              </a>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
      <CommonScript />
    </body>
  </html>
)
