import type { FC } from 'hono/jsx'

// ===== Header / 상단 네비게이션 =====
const Header: FC = () => (
  <header
    id="site-header"
    class="fixed top-0 inset-x-0 z-50 bg-white/90 backdrop-blur border-b border-gray-100"
  >
    <nav class="max-w-6xl mx-auto px-5 h-16 flex items-center justify-between">
      <a href="#hero" class="flex items-center gap-2 font-black text-xl tracking-tight">
        <span class="inline-flex w-9 h-9 rounded-xl bg-brand text-white items-center justify-center">
          <i class="fas fa-calculator text-sm"></i>
        </span>
        <span>
          명륜<span class="text-brand">세무회계</span>
        </span>
      </a>

      <ul class="hidden md:flex items-center gap-7 text-sm font-medium text-gray-600">
        <li><a href="#strength" class="hover:text-brand transition">업종 전문성</a></li>
        <li><a href="#consulting" class="hover:text-brand transition">절세 컨설팅</a></li>
        <li><a href="#points" class="hover:text-brand transition">차별화 포인트</a></li>
        <li><a href="#process" class="hover:text-brand transition">이용방법</a></li>
        <li><a href="#review" class="hover:text-brand transition">고객후기</a></li>
      </ul>

      <a
        href="#consult"
        class="inline-flex items-center gap-2 bg-brand hover:bg-brand-dark text-white text-sm font-bold px-4 py-2.5 rounded-full transition shadow-sm shadow-brand/30"
      >
        <i class="fas fa-comment-dots"></i> 무료 상담신청
      </a>
    </nav>
  </header>
)

// ===== Hero 섹션 =====
const Hero: FC = () => (
  <section
    id="hero"
    class="relative pt-32 pb-24 bg-gradient-to-b from-brand-soft via-white to-white overflow-hidden"
  >
    <div class="absolute -top-24 -right-24 w-96 h-96 bg-brand-light rounded-full blur-3xl opacity-60"></div>
    <div class="absolute top-40 -left-24 w-72 h-72 bg-brand-light rounded-full blur-3xl opacity-40"></div>

    <div class="relative max-w-6xl mx-auto px-5 text-center">
      <span class="inline-block bg-white border border-brand/30 text-brand text-sm font-bold px-4 py-1.5 rounded-full mb-6 shadow-sm">
        똑똑한 세무의 시작
      </span>
      <h1 class="text-4xl md:text-6xl font-black leading-tight tracking-tight">
        비용은 <span class="text-brand">더 낮게</span>
        <br />
        절세는 <span class="text-brand">더 크게</span>
      </h1>
      <p class="mt-6 text-lg md:text-xl text-gray-600 leading-relaxed">
        명륜세무회계는 업종별 전문 세무사가
        <br class="hidden md:block" />
        사업의 시작부터 성장까지 함께합니다.
      </p>

      <div class="mt-9 flex flex-col sm:flex-row items-center justify-center gap-3">
        <a
          href="#consult"
          class="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-brand hover:bg-brand-dark text-white font-bold px-8 py-4 rounded-full text-lg transition shadow-lg shadow-brand/30"
        >
          <i class="fas fa-comment-dots"></i> 1분 무료 상담신청
        </a>
        <a
          href="#process"
          class="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-white hover:bg-gray-50 text-gray-800 font-bold px-8 py-4 rounded-full text-lg transition border border-gray-200"
        >
          이용방법 보기 <i class="fas fa-arrow-down text-sm"></i>
        </a>
      </div>
      <p class="mt-5 text-sm text-gray-400">월 8만원부터 시작하는 스마트 세무 서비스</p>
    </div>
  </section>
)

// ===== 신뢰 지표 =====
const stats = [
  { label: '고객사', value: '12,000+' },
  { label: '고객사 만족도', value: '98점' },
  { label: '관리 매출', value: '7,700억+' },
  { label: '연간 세금신고건수', value: '16,000+' },
]

const Stats: FC = () => (
  <section id="stats" class="py-16 bg-white">
    <div class="max-w-6xl mx-auto px-5">
      <h2 class="text-center text-2xl md:text-3xl font-black leading-snug">
        수많은 고객님들이 <span class="text-brand">명륜세무회계</span>를
        <br class="md:hidden" /> 선택해주시는 이유는 분명합니다
      </h2>

      <div class="mt-10 grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((s) => (
          <div class="bg-brand-soft rounded-2xl p-6 text-center border border-brand/10">
            <div class="text-3xl md:text-4xl font-black text-brand">{s.value}</div>
            <div class="mt-2 text-sm text-gray-500 font-medium">{s.label}</div>
          </div>
        ))}
      </div>
    </div>
  </section>
)

// ===== 업종별 전문성 =====
const industries = [
  { icon: 'fa-utensils', name: '요식업' },
  { icon: 'fa-cart-shopping', name: '전자상거래' },
  { icon: 'fa-stethoscope', name: '병의원' },
  { icon: 'fa-scissors', name: '미용·뷰티' },
  { icon: 'fa-building', name: '건설업' },
  { icon: 'fa-truck', name: '운송·물류' },
  { icon: 'fa-laptop-code', name: 'IT·스타트업' },
  { icon: 'fa-graduation-cap', name: '학원·교육' },
]

const Strength: FC = () => (
  <section id="strength" class="py-20 bg-brand-soft">
    <div class="max-w-6xl mx-auto px-5">
      <p class="text-center text-brand font-bold mb-3">업종별 전문성</p>
      <h2 class="text-center text-2xl md:text-4xl font-black leading-snug">
        120가지 업종에
        <br />
        전문성 있는 세무사 집단
      </h2>
      <p class="mt-5 text-center text-gray-600 leading-relaxed">
        요식업부터 전자상거래업까지, 명륜세무회계에는
        <br class="hidden md:block" /> 각 업종별 전문가들이 모여있습니다.
      </p>

      <div class="mt-12 grid grid-cols-2 md:grid-cols-4 gap-4">
        {industries.map((it) => (
          <div class="bg-white rounded-2xl p-6 text-center hover:shadow-lg hover:-translate-y-1 transition border border-gray-100">
            <div class="w-14 h-14 mx-auto rounded-2xl bg-brand-soft text-brand flex items-center justify-center mb-3">
              <i class={`fas ${it.icon} text-xl`}></i>
            </div>
            <div class="font-bold">{it.name}</div>
          </div>
        ))}
      </div>
    </div>
  </section>
)

// ===== 무료 컨설팅 / 절세 =====
const consultCards = [
  {
    icon: 'fa-hand-holding-dollar',
    title: '까다로운 정부지원금은 알아서 맞춤 선별',
    desc: '청년채용지원금, 일자리 안정자금 등 받을 수 있는 지원금을 전문가가 빠짐없이 찾아드립니다.',
    highlight: '연간 최대 3,200만원 절세',
  },
  {
    icon: 'fa-percent',
    title: '맞춤형 특례 적용으로 더 많은 절세 혜택',
    desc: '고용증대 세액공제, 벤처인증 세액감면, 가업승계절세까지 사업장에 꼭 맞는 특례를 적용합니다.',
    highlight: '고용증대 · 벤처인증 · 가업승계',
  },
  {
    icon: 'fa-arrows-rotate',
    title: '최적의 시점을 찾아주는 법인전환 컨설팅',
    desc: '개인사업자에서 법인으로, 세금 부담이 가장 줄어드는 최적의 전환 시점을 분석해 드립니다.',
    highlight: '법인전환 전문 팀',
  },
]

const Consulting: FC = () => (
  <section id="consulting" class="py-20 bg-white">
    <div class="max-w-6xl mx-auto px-5">
      <p class="text-center text-brand font-bold mb-3">무료 컨설팅</p>
      <h2 class="text-center text-2xl md:text-4xl font-black leading-snug">
        세무 서비스와 컨설팅을
        <br />
        모두 경험해보세요
      </h2>
      <p class="mt-5 text-center text-gray-600 leading-relaxed">
        명륜세무회계 고객님 중 <span class="text-brand font-bold">60%</span>가 컨설팅을 통해
        <br class="hidden md:block" /> 최대 <span class="text-brand font-bold">1억 8천만원</span> 절세하셨어요.
      </p>

      <div class="mt-12 grid md:grid-cols-3 gap-5">
        {consultCards.map((c) => (
          <div class="rounded-2xl p-7 border border-gray-100 shadow-sm hover:shadow-lg transition bg-gradient-to-b from-white to-brand-soft/40">
            <div class="w-14 h-14 rounded-2xl bg-brand text-white flex items-center justify-center mb-5">
              <i class={`fas ${c.icon} text-xl`}></i>
            </div>
            <h3 class="text-lg font-black leading-snug">{c.title}</h3>
            <p class="mt-3 text-sm text-gray-600 leading-relaxed">{c.desc}</p>
            <div class="mt-5 inline-flex items-center gap-2 text-sm font-bold text-brand bg-brand-soft px-3 py-1.5 rounded-full">
              <i class="fas fa-check-circle"></i> {c.highlight}
            </div>
          </div>
        ))}
      </div>
    </div>
  </section>
)

// ===== 차별화 포인트 (10가지) =====
const points = [
  '영업직원 별도, 담당 세무사 상주',
  '체계적인 관리시스템 보유',
  '다양한 업종별 전문가 보유',
  '세무컨설팅본부와 실시간 협업',
  '시스템을 통한 철저한 적용',
  '고용지원금 무료 대행 서비스 제공',
  '정부지원금에 대한 전문가 컨설팅 제공',
  'R&D 세액공제 연구팀 보유',
  '노무사, 변호사, 법무사 제휴',
  '법인전환 컨설팅 전문 팀 보유',
]

const Points: FC = () => (
  <section id="points" class="py-20 bg-gray-900 text-white">
    <div class="max-w-6xl mx-auto px-5">
      <p class="text-center text-brand font-bold mb-3">차별화 포인트</p>
      <h2 class="text-center text-2xl md:text-4xl font-black leading-snug">
        명륜세무회계는
        <br />
        무엇이 다를까요?
      </h2>

      <div class="mt-12 grid sm:grid-cols-2 gap-3">
        {points.map((p, i) => (
          <div class="flex items-center gap-4 bg-white/5 hover:bg-white/10 rounded-xl px-5 py-4 transition border border-white/5">
            <span class="shrink-0 w-10 h-10 rounded-lg bg-brand flex items-center justify-center font-black">
              {String(i + 1).padStart(2, '0')}
            </span>
            <span class="font-medium text-gray-100">{p}</span>
          </div>
        ))}
      </div>
    </div>
  </section>
)

// ===== 직원관리 서비스 =====
const employeeServices = [
  { icon: 'fa-file-invoice', title: '임금명세서 양식 제공', desc: '법정 의무사항인 임금명세서를 자동 생성하고 제공합니다.' },
  { icon: 'fa-hand-holding-heart', title: '고용지원금 신청 대행', desc: '받을 수 있는 고용지원금을 빠짐없이 찾아 대행 신청합니다.' },
  { icon: 'fa-shield-halved', title: '원천세 · 4대보험 신고', desc: '복잡한 원천세와 4대보험 신고를 정확하게 처리합니다.' },
]

const EmployeeService: FC = () => (
  <section id="employee" class="py-20 bg-brand-soft">
    <div class="max-w-6xl mx-auto px-5">
      <p class="text-center text-brand font-bold mb-3">직원관리 서비스</p>
      <h2 class="text-center text-2xl md:text-4xl font-black leading-snug">
        전문가가 진행하는 직원관리
      </h2>
      <p class="mt-5 text-center text-gray-600">
        임금명세서, 각종 지원금, 세금신고를 도와드립니다.
      </p>

      <div class="mt-12 grid md:grid-cols-3 gap-5">
        {employeeServices.map((s) => (
          <div class="bg-white rounded-2xl p-7 text-center border border-gray-100 shadow-sm hover:shadow-lg transition">
            <div class="w-16 h-16 mx-auto rounded-2xl bg-brand-soft text-brand flex items-center justify-center mb-5">
              <i class={`fas ${s.icon} text-2xl`}></i>
            </div>
            <h3 class="text-lg font-black">{s.title}</h3>
            <p class="mt-3 text-sm text-gray-600 leading-relaxed">{s.desc}</p>
          </div>
        ))}
      </div>
    </div>
  </section>
)

// ===== 이용방법 (5단계) =====
const steps = [
  { no: '01', title: '무료 상담신청', desc: '1분 만에 간편하게 상담신청' },
  { no: '02', title: '사업장 분석 상담', desc: '업종, 매출 등 사업장 정밀분석' },
  { no: '03', title: '수임유형 협의 및 계약', desc: '사업장 분석 결과에 기반한 수임 계약' },
  { no: '04', title: '세무 서비스', desc: '업종 전문 담당자를 통한 집중 케어' },
  { no: '05', title: '컨설팅 서비스', desc: '정부지원금 및 맞춤 컨설팅 진행' },
]

const Process: FC = () => (
  <section id="process" class="py-20 bg-white">
    <div class="max-w-6xl mx-auto px-5">
      <p class="text-center text-brand font-bold mb-3">이용방법</p>
      <h2 class="text-center text-2xl md:text-4xl font-black leading-snug">
        간편하게 신청하고
        <br />
        꼼꼼하게 상담받아요
      </h2>

      <div class="mt-12 grid md:grid-cols-5 gap-4">
        {steps.map((s, i) => (
          <div class="relative bg-brand-soft rounded-2xl p-6 border border-brand/10">
            {i < steps.length - 1 && (
              <i class="fas fa-chevron-right text-brand/40 absolute -right-3 top-1/2 -translate-y-1/2 hidden md:block"></i>
            )}
            <div class="text-2xl font-black text-brand mb-3">{s.no}</div>
            <h3 class="font-black">{s.title}</h3>
            <p class="mt-2 text-sm text-gray-600 leading-relaxed">{s.desc}</p>
          </div>
        ))}
      </div>
    </div>
  </section>
)

// ===== 고객후기 =====
const reviews = [
  {
    company: '(주)서북',
    text: '세무사님과 언제든 상담할 수 있고 빠르게 업무 처리를 해주셔서 너무 좋습니다. 창업해서 신경 쓸 게 많았는데 세무와 맞춤 컨설팅까지 해주시니 든든합니다.',
  },
  {
    company: '(주)구도로',
    text: '절세, 정부지원금 등의 자금 혜택으로 사업 운영에 많은 도움을 받았습니다. 갑작스레 법률 자문이 필요했는데 덕분에 잘 해결되었어요.',
  },
  {
    company: '(주)카뷰',
    text: '세무 서비스와 컨설팅 서비스를 한 번에 진행받을 수 있어서 편하고 좋습니다. 담당자분이 친절하게 응대해주십니다.',
  },
  {
    company: '바이에른식육학교',
    text: '제 사업 분야를 전문으로 하시는 세무사여서 언제나 해박한 지식을 가지고 계시고, 담당 매니저님도 일처리를 잘 해주시니 전반적으로 만족스럽습니다.',
  },
]

const Reviews: FC = () => (
  <section id="review" class="py-20 bg-brand-soft">
    <div class="max-w-6xl mx-auto px-5">
      <p class="text-center text-brand font-bold mb-3">고객후기</p>
      <h2 class="text-center text-2xl md:text-4xl font-black leading-snug">
        명륜세무회계를 만나고
        <br />
        이렇게 달라졌어요
      </h2>

      <div class="mt-12 grid md:grid-cols-2 gap-5">
        {reviews.map((r) => (
          <div class="bg-white rounded-2xl p-7 border border-gray-100 shadow-sm">
            <div class="flex items-center gap-1 text-brand mb-4">
              <i class="fas fa-star"></i>
              <i class="fas fa-star"></i>
              <i class="fas fa-star"></i>
              <i class="fas fa-star"></i>
              <i class="fas fa-star"></i>
            </div>
            <p class="text-gray-700 leading-relaxed">{r.text}</p>
            <div class="mt-5 font-black text-gray-900">{r.company}</div>
          </div>
        ))}
      </div>
    </div>
  </section>
)

// ===== 가격 / 상담신청 폼 (CTA) =====
const Consult: FC = () => (
  <section id="consult" class="py-20 bg-gradient-to-b from-white to-brand-soft">
    <div class="max-w-5xl mx-auto px-5">
      <div class="grid md:grid-cols-2 gap-10 items-center bg-white rounded-3xl shadow-xl border border-brand/10 overflow-hidden">
        {/* 좌측 안내 */}
        <div class="p-8 md:p-12 bg-brand text-white">
          <p class="font-bold/80 mb-3 text-white/80">스마트한 세무서비스를</p>
          <h2 class="text-3xl md:text-4xl font-black leading-tight">
            월 8만원부터
          </h2>
          <p class="mt-6 leading-relaxed text-white/90">
            지금 상담을 신청하시면 1분 내로
            <br />
            전문 상담사가 연락드립니다.
          </p>
          <ul class="mt-8 space-y-3 text-white/95">
            <li class="flex items-center gap-3"><i class="fas fa-check-circle"></i> 무료 사업장 분석</li>
            <li class="flex items-center gap-3"><i class="fas fa-check-circle"></i> 정부지원금 무료 진단</li>
            <li class="flex items-center gap-3"><i class="fas fa-check-circle"></i> 업종 전문 세무사 매칭</li>
          </ul>
        </div>

        {/* 우측 폼 */}
        <div class="p-8 md:p-12">
          <h3 class="text-xl font-black mb-1">무료 상담신청</h3>
          <p class="text-sm text-gray-500 mb-6">간단한 정보만 남겨주세요.</p>

          <form id="consult-form" class="space-y-4">
            <div>
              <label class="block text-sm font-bold mb-1.5" for="f-name">이름 *</label>
              <input
                id="f-name"
                name="name"
                type="text"
                required
                placeholder="홍길동"
                class="w-full rounded-xl border border-gray-200 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand transition"
              />
            </div>
            <div>
              <label class="block text-sm font-bold mb-1.5" for="f-phone">연락처 *</label>
              <input
                id="f-phone"
                name="phone"
                type="tel"
                required
                placeholder="010-1234-5678"
                class="w-full rounded-xl border border-gray-200 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand transition"
              />
            </div>
            <div>
              <label class="block text-sm font-bold mb-1.5" for="f-business">업종 / 상호 (선택)</label>
              <input
                id="f-business"
                name="business"
                type="text"
                placeholder="예) 요식업 / 명륜식당"
                class="w-full rounded-xl border border-gray-200 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand transition"
              />
            </div>
            <div>
              <label class="block text-sm font-bold mb-1.5" for="f-message">문의 내용 (선택)</label>
              <textarea
                id="f-message"
                name="message"
                rows={3}
                placeholder="궁금하신 내용을 적어주세요."
                class="w-full rounded-xl border border-gray-200 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand transition resize-none"
              ></textarea>
            </div>

            <button
              type="submit"
              id="consult-submit"
              class="w-full bg-brand hover:bg-brand-dark text-white font-bold py-4 rounded-xl transition shadow-lg shadow-brand/30"
            >
              <i class="fas fa-paper-plane mr-2"></i> 무료 상담 신청하기
            </button>
            <p id="consult-result" class="text-sm text-center hidden"></p>
          </form>
        </div>
      </div>
    </div>
  </section>
)

// ===== Footer =====
const Footer: FC = () => (
  <footer id="site-footer" class="bg-gray-900 text-gray-400 py-12">
    <div class="max-w-6xl mx-auto px-5">
      <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
        <div>
          <div class="flex items-center gap-2 font-black text-xl text-white mb-3">
            <span class="inline-flex w-8 h-8 rounded-lg bg-brand text-white items-center justify-center">
              <i class="fas fa-calculator text-sm"></i>
            </span>
            명륜<span class="text-brand">세무회계</span>
          </div>
          <p class="text-sm leading-relaxed">
            비용은 더 낮게, 절세는 더 크게.
            <br />
            업종별 전문 세무사가 함께하는 스마트 세무 서비스.
          </p>
        </div>
        <div class="text-sm space-y-1.5">
          <p><i class="fas fa-phone text-brand mr-2"></i> 1588-0000</p>
          <p><i class="fas fa-envelope text-brand mr-2"></i> contact@myeongnyun-tax.co.kr</p>
          <p><i class="fas fa-clock text-brand mr-2"></i> 평일 09:00 ~ 18:00</p>
        </div>
      </div>
      <div class="mt-8 pt-6 border-t border-white/10 text-xs text-gray-500">
        © 2026 명륜세무회계. All rights reserved. | 본 사이트는 데모 목적으로 제작되었습니다.
      </div>
    </div>
  </footer>
)

// ===== 페이지 조립 =====
export const Home: FC = () => (
  <>
    <Header />
    <main>
      <Hero />
      <Stats />
      <Strength />
      <Consulting />
      <Points />
      <EmployeeService />
      <Process />
      <Reviews />
      <Consult />
    </main>
    <Footer />
    <script src="/static/app.js"></script>
  </>
)
