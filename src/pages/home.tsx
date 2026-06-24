import type { FC } from 'hono/jsx'

// ===== Header / 상단 네비게이션 =====
const Header: FC = () => (
  <header
    id="site-header"
    class="fixed top-0 inset-x-0 z-50 bg-cream/95 backdrop-blur border-b border-gold/30"
  >
    <nav class="max-w-6xl mx-auto px-5 h-16 flex items-center justify-between">
      <a href="#hero" class="flex items-center gap-2.5 font-black text-xl tracking-tight leading-none">
        <img
          src="/static/logo-symbol.png"
          alt="명륜세무회계 로고"
          class="h-6 w-auto object-contain block"
        />
        <span class="text-navy leading-none">명륜<span class="text-brand">세무회계</span></span>
      </a>

      <ul class="hidden md:flex items-center gap-7 text-sm font-medium text-navy/80">
        <li><a href="#strength" class="hover:text-brand transition">업종 전문성</a></li>
        <li><a href="#consulting" class="hover:text-brand transition">절세 컨설팅</a></li>
        <li><a href="#points" class="hover:text-brand transition">차별화 포인트</a></li>
        <li><a href="#process" class="hover:text-brand transition">이용방법</a></li>
        <li><a href="#review" class="hover:text-brand transition">고객후기</a></li>
      </ul>

      <a
        href="#consult"
        class="inline-flex items-center gap-2 bg-brand hover:bg-brand-dark text-white text-sm font-bold px-4 py-2.5 rounded-full transition shadow-md shadow-brand/30 ring-1 ring-gold/50"
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
    class="relative pt-32 pb-24 bg-gradient-to-b from-cream-soft via-cream to-cream overflow-hidden"
  >
    <div class="absolute -top-24 -right-24 w-96 h-96 bg-brand-light rounded-full blur-3xl opacity-50"></div>
    <div class="absolute top-40 -left-24 w-72 h-72 bg-gold-light rounded-full blur-3xl opacity-40"></div>

    <div class="relative max-w-6xl mx-auto px-5 text-center">
      <span class="inline-flex items-center gap-2 bg-white border border-gold text-brand text-sm font-bold px-4 py-1.5 rounded-full mb-6 shadow-sm">
        <i class="fas fa-award text-gold"></i> 정육점 · 축산물 세무 전문
      </span>
      <h1 class="text-4xl md:text-6xl font-black leading-[1.25] tracking-tight text-navy">
        비용은 <span class="text-brand">더 낮게</span>
        <br />
        절세는 <span class="text-brand">더 크게</span>
      </h1>
      <p class="mt-6 text-lg md:text-xl text-ink/80 leading-relaxed">
        명륜세무회계는 정육점·축산물 전문 세무사가
        <br class="hidden md:block" />
        사업의 시작부터 성장까지 함께합니다.
      </p>

      <div class="mt-9 flex flex-col sm:flex-row items-center justify-center gap-3">
        <a
          href="#consult"
          class="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-brand hover:bg-brand-dark text-white font-bold px-8 py-4 rounded-full text-lg transition shadow-lg shadow-brand/30 ring-1 ring-gold/50"
        >
          <i class="fas fa-comment-dots"></i> 1분 무료 상담신청
        </a>
        <a
          href="#process"
          class="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-white hover:bg-cream-soft text-navy font-bold px-8 py-4 rounded-full text-lg transition border border-navy/20"
        >
          이용방법 보기 <i class="fas fa-arrow-down text-sm"></i>
        </a>
      </div>
      <p class="mt-5 text-sm text-ink/50">월 8만원부터 시작하는 업종 특화 세무 서비스</p>
    </div>
  </section>
)

// ===== 신뢰 지표 =====
const stats = [
  { label: '정육·축산 고객사', value: '200+' },
  { label: '압도적인 유지율', value: '99%' },
  { label: '관리 매출', value: '200억+' },
  { label: '연간 세금신고건수', value: '400+' },
]

const Stats: FC = () => (
  <section id="stats" class="py-16 bg-cream">
    <div class="max-w-6xl mx-auto px-5">
      <h2 class="text-center text-2xl md:text-3xl font-black leading-[1.375] text-navy">
        수많은 정육점 사장님들이 <span class="text-brand">명륜세무회계</span>를
        <br class="md:hidden" /> 선택해주시는 이유는 분명합니다
      </h2>

      <div class="mt-10 grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((s) => (
          <div class="bg-white rounded-2xl p-6 text-center border border-gold/40 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition">
            <div class="text-3xl md:text-4xl font-black text-brand">{s.value}</div>
            <div class="mt-2 text-sm text-navy/70 font-medium">{s.label}</div>
          </div>
        ))}
      </div>
    </div>
  </section>
)

// ===== 업종별 전문성 =====
const industries = [
  { icon: 'fa-drumstick-bite', name: '정육점·식육판매업' },
  { icon: 'fa-cow', name: '한우·한돈 전문점' },
  { icon: 'fa-bacon', name: '수입육 전문점' },
  { icon: 'fa-warehouse', name: '축산물 도·소매' },
  { icon: 'fa-utensils', name: '정육식당(고깃집)' },
  { icon: 'fa-bowl-food', name: '축산 가공·즉석식품' },
  { icon: 'fa-truck', name: '축산 운송·물류' },
  { icon: 'fa-shop', name: '온라인 정육 쇼핑몰' },
]

const Strength: FC = () => (
  <section id="strength" class="py-20 bg-cream-soft">
    <div class="max-w-6xl mx-auto px-5">
      <p class="text-center text-brand font-bold mb-3 tracking-wider">업종별 전문성</p>
      <h2 class="text-center text-2xl md:text-4xl font-black leading-[1.375] text-navy">
        정육점에
        <br />
        100% 특화된 세무사 집단
      </h2>
      <p class="mt-5 text-center text-ink/75 leading-relaxed">
        식육판매업의 의제매입세액공제부터 한우·한돈 매입 관리, 축산물이력제 매출 검증까지,
        <br class="hidden md:block" /> 명륜세무회계에는 정육 업종을 가장 잘 아는 전문가들이 모여있습니다.
      </p>

      <div class="mt-12 grid grid-cols-2 md:grid-cols-4 gap-4">
        {industries.map((it) => (
          <div class="bg-white rounded-2xl p-6 text-center hover:shadow-lg hover:-translate-y-1 transition border border-gold/30">
            <div class="w-14 h-14 mx-auto rounded-2xl bg-gold-soft text-gold-dark flex items-center justify-center mb-3 ring-1 ring-gold/40">
              <i class={`fas ${it.icon} text-xl`}></i>
            </div>
            <div class="font-bold text-navy">{it.name}</div>
          </div>
        ))}
      </div>
    </div>
  </section>
)

// ===== 무료 컨설팅 / 절세 =====
const consultCards = [
  {
    icon: 'fa-drumstick-bite',
    title: '정육점 의제매입세액공제 빠짐없이',
    desc: '면세 농축산물(육류) 매입에 대한 의제매입세액공제를 한도까지 정확히 적용해 부가세 부담을 줄여드립니다.',
    highlight: '의제매입 · 부가세 절감 특화',
  },
  {
    icon: 'fa-cow',
    title: '한우·한돈 매입 단가 관리',
    desc: '도매시장·산지·도축장 매입 단가와 부분육 분할 후 매출을 정확히 매칭해 마진 분석과 세금 신고를 한 번에 해결합니다.',
    highlight: '부분육 마진 · 재고 관리 특화',
  },
  {
    icon: 'fa-hand-holding-dollar',
    title: '정부지원금 · 정책자금 맞춤 선별',
    desc: '소상공인 정책자금, 고용지원금, 축산물 위생·HACCP 관련 지원금 등 정육 사업장이 받을 수 있는 지원금을 전문가가 찾아드립니다.',
    highlight: '연간 최대 3,200만원 절세',
  },
]

const Consulting: FC = () => (
  <section id="consulting" class="py-20 bg-cream">
    <div class="max-w-6xl mx-auto px-5">
      <p class="text-center text-brand font-bold mb-3 tracking-wider">무료 컨설팅</p>
      <h2 class="text-center text-2xl md:text-4xl font-black leading-[1.375] text-navy">
        세무 서비스와 컨설팅을
        <br />
        모두 경험해보세요
      </h2>
      <p class="mt-5 text-center text-ink/75 leading-relaxed">
        명륜세무회계 정육점 고객님 중 <span class="text-brand font-bold">60%</span>가 컨설팅을 통해
        <br class="hidden md:block" /> 평균 <span class="text-brand font-bold">수백만원 이상</span> 절세하셨어요.
      </p>

      <div class="mt-12 grid md:grid-cols-3 gap-5">
        {consultCards.map((c) => (
          <div class="rounded-2xl p-7 border border-gold/30 shadow-sm hover:shadow-xl hover:-translate-y-1 transition bg-white">
            <div class="w-14 h-14 rounded-2xl bg-brand text-white flex items-center justify-center mb-5 ring-2 ring-gold/50 shadow-md shadow-brand/20">
              <i class={`fas ${c.icon} text-xl`}></i>
            </div>
            <h3 class="text-lg font-black leading-[1.375] text-navy">{c.title}</h3>
            <p class="mt-3 text-sm text-ink/75 leading-relaxed">{c.desc}</p>
            <div class="mt-5 inline-flex items-center gap-2 text-sm font-bold text-gold-dark bg-gold-soft px-3 py-1.5 rounded-full border border-gold/40">
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
  '정육점 의제매입세액공제 전문 처리',
  '한우·한돈 부분육 매입·매출 매칭 노하우',
  '식육판매업 위생·인허가 세무 이해도 높음',
  '축산물이력제 기반 매입 검증 시스템',
  '소상공인 정책자금·고용지원금 무료 대행',
  '도축·도매·소매 단계별 세무 컨설팅',
  '체계적인 정육 재고·로스율 관리시스템',
  '노무사, 변호사, 법무사 제휴',
  '법인전환 컨설팅 전문 팀 보유',
]

const Points: FC = () => (
  <section id="points" class="relative py-20 bg-cream-soft overflow-hidden">
    {/* 크림 배경 위 부드러운 골드/브랜드 액센트 */}
    <div class="absolute -top-20 -left-20 w-80 h-80 bg-gold-light/40 rounded-full blur-3xl"></div>
    <div class="absolute -bottom-24 -right-20 w-96 h-96 bg-brand-light/40 rounded-full blur-3xl"></div>

    <div class="relative max-w-6xl mx-auto px-5">
      <p class="text-center text-brand font-bold mb-3 tracking-wider">차별화 포인트</p>
      <h2 class="text-center text-2xl md:text-4xl font-black leading-[1.375] text-navy">
        명륜세무회계는
        <br />
        무엇이 <span class="text-brand">다를까요?</span>
      </h2>

      <div class="mt-12 grid sm:grid-cols-2 gap-3">
        {points.map((p, i) => (
          <div class="flex items-center gap-4 bg-white hover:shadow-md rounded-xl px-5 py-4 transition border border-gold/30 shadow-sm">
            <span class="shrink-0 w-10 h-10 rounded-lg bg-brand flex items-center justify-center font-black text-white ring-1 ring-gold/60">
              {String(i + 1).padStart(2, '0')}
            </span>
            <span class="font-medium text-navy/90">{p}</span>
          </div>
        ))}
      </div>
    </div>
  </section>
)

// ===== 직원관리 서비스 =====
const employeeServices = [
  { icon: 'fa-file-invoice', title: '임금명세서 양식 제공', desc: '법정 의무사항인 임금명세서를 자동 생성하고 제공합니다.' },
  { icon: 'fa-hand-holding-heart', title: '고용지원금 신청 대행', desc: '정육점·축산물 사업장이 받을 수 있는 고용지원금을 찾아 대행 신청합니다.' },
  { icon: 'fa-shield-halved', title: '원천세 · 4대보험 신고', desc: '아르바이트·일용직이 많은 업종 특성에 맞춰 원천세와 4대보험을 정확히 처리합니다.' },
]

const EmployeeService: FC = () => (
  <section id="employee" class="py-20 bg-cream-soft">
    <div class="max-w-6xl mx-auto px-5">
      <p class="text-center text-brand font-bold mb-3 tracking-wider">직원관리 서비스</p>
      <h2 class="text-center text-2xl md:text-4xl font-black leading-[1.375] text-navy">
        전문가가 진행하는 직원관리
      </h2>
      <p class="mt-5 text-center text-ink/75">
        임금명세서, 각종 지원금, 세금신고를 도와드립니다.
      </p>

      <div class="mt-12 grid md:grid-cols-3 gap-5">
        {employeeServices.map((s) => (
          <div class="bg-white rounded-2xl p-7 text-center border border-gold/30 shadow-sm hover:shadow-lg transition">
            <div class="w-16 h-16 mx-auto rounded-2xl bg-gold-soft text-gold-dark flex items-center justify-center mb-5 ring-1 ring-gold/40">
              <i class={`fas ${s.icon} text-2xl`}></i>
            </div>
            <h3 class="text-lg font-black text-navy">{s.title}</h3>
            <p class="mt-3 text-sm text-ink/75 leading-relaxed">{s.desc}</p>
          </div>
        ))}
      </div>
    </div>
  </section>
)

// ===== 이용방법 (5단계) =====
const steps = [
  { no: '01', title: '무료 상담신청', desc: '1분 만에 간편하게 상담신청' },
  { no: '02', title: '사업장 분석 상담', desc: '정육 업태·매입처·매출 구조 등 정밀분석' },
  { no: '03', title: '수임유형 협의 및 계약', desc: '사업장 분석 결과에 기반한 수임 계약' },
  { no: '04', title: '세무 서비스', desc: '업종 전문 담당자를 통한 집중 케어' },
  { no: '05', title: '컨설팅 서비스', desc: '정부지원금 및 맞춤 컨설팅 진행' },
]

const Process: FC = () => (
  <section id="process" class="py-20 bg-cream">
    <div class="max-w-6xl mx-auto px-5">
      <p class="text-center text-brand font-bold mb-3 tracking-wider">이용방법</p>
      <h2 class="text-center text-2xl md:text-4xl font-black leading-[1.375] text-navy">
        간편하게 신청하고
        <br />
        꼼꼼하게 상담받아요
      </h2>

      <div class="mt-12 grid md:grid-cols-5 gap-4">
        {steps.map((s, i) => (
          <div class="relative bg-white rounded-2xl p-6 border border-gold/30 shadow-sm">
            {i < steps.length - 1 && (
              <i class="fas fa-chevron-right text-gold absolute -right-3 top-1/2 -translate-y-1/2 hidden md:block"></i>
            )}
            <div class="text-2xl font-black text-brand mb-3">{s.no}</div>
            <h3 class="font-black text-navy">{s.title}</h3>
            <p class="mt-2 text-sm text-ink/70 leading-relaxed">{s.desc}</p>
          </div>
        ))}
      </div>
    </div>
  </section>
)

// ===== 고객후기 =====
const reviews = [
  {
    company: '영웅한우',
    text: '의제매입세액공제를 꼼꼼히 챙겨주셔서 부가세 부담이 확 줄었습니다. 정육점 세무를 정말 잘 아시는 분이라 믿고 맡기고 있어요.',
  },
  {
    company: '으뜸축산',
    text: '식육판매업 전문이셔서 인허가부터 세무까지 막힘없이 상담해주십니다. 담당 매니저님 일처리도 빠르고 정확해서 만족합니다.',
  },
  {
    company: '대성한돈마트',
    text: '도매시장 매입 단가와 부분육 분할 후 매출까지 한 번에 정리해주시니 마진 관리가 훨씬 수월해졌습니다. 정육 전문이라는 말이 진짜였어요.',
  },
  {
    company: '미트하우스 정육식당',
    text: '정육점과 식당을 같이 운영하다 보니 세무가 복잡했는데, 매입·매출을 깔끔하게 분리해 신고해주셔서 가산세 리스크가 사라졌습니다.',
  },
]

const Reviews: FC = () => (
  <section id="review" class="py-20 bg-cream-soft">
    <div class="max-w-6xl mx-auto px-5">
      <p class="text-center text-brand font-bold mb-3 tracking-wider">고객후기</p>
      <h2 class="text-center text-2xl md:text-4xl font-black leading-[1.375] text-navy">
        명륜세무회계를 만나고
        <br />
        이렇게 달라졌어요
      </h2>

      <div class="mt-12 grid md:grid-cols-2 gap-5">
        {reviews.map((r) => (
          <div class="bg-white rounded-2xl p-7 border border-gold/30 shadow-sm hover:shadow-md transition">
            <div class="flex items-center gap-1 text-gold mb-4">
              <i class="fas fa-star"></i>
              <i class="fas fa-star"></i>
              <i class="fas fa-star"></i>
              <i class="fas fa-star"></i>
              <i class="fas fa-star"></i>
            </div>
            <p class="text-ink/85 leading-relaxed">{r.text}</p>
            <div class="mt-5 font-black text-navy">{r.company}</div>
          </div>
        ))}
      </div>
    </div>
  </section>
)

// ===== 가격 / 상담신청 폼 (CTA) =====
const Consult: FC = () => (
  <section id="consult" class="py-20 bg-gradient-to-b from-cream to-cream-soft">
    <div class="max-w-5xl mx-auto px-5">
      <div class="grid md:grid-cols-2 gap-10 items-center bg-white rounded-3xl shadow-2xl border border-gold/30 overflow-hidden">
        {/* 좌측 안내 (네이비 배경 + 골드 포인트) */}
        <div class="relative p-8 md:p-12 bg-navy text-white overflow-hidden">
          <div class="absolute -top-16 -right-16 w-64 h-64 bg-gold/10 rounded-full blur-2xl"></div>
          <div class="absolute -bottom-20 -left-10 w-56 h-56 bg-brand/30 rounded-full blur-2xl"></div>
          <div class="relative">
            <p class="mb-3 text-gold font-bold tracking-wider">정육점 특화 세무서비스를</p>
            <h2 class="text-3xl md:text-4xl font-black leading-[1.25]">
              월 <span class="text-gold-gradient">8만원</span>부터
            </h2>
            <p class="mt-6 leading-relaxed text-white/90">
              지금 상담을 신청하시면 1분 내로
              <br />
              전문 상담사가 연락드립니다.
            </p>
            <ul class="mt-8 space-y-3 text-white/95">
              <li class="flex items-center gap-3"><i class="fas fa-check-circle text-gold"></i> 무료 사업장 분석</li>
              <li class="flex items-center gap-3"><i class="fas fa-check-circle text-gold"></i> 정부지원금 무료 진단</li>
              <li class="flex items-center gap-3"><i class="fas fa-check-circle text-gold"></i> 정육점 전문 세무사 매칭</li>
            </ul>
          </div>
        </div>

        {/* 우측 폼 */}
        <div class="p-8 md:p-12 bg-white">
          <h3 class="text-xl font-black mb-1 text-navy">무료 상담신청</h3>
          <p class="text-sm text-ink/60 mb-6">간단한 정보만 남겨주세요.</p>

          <form id="consult-form" class="space-y-4">
            <div>
              <label class="block text-sm font-bold mb-1.5 text-navy" for="f-name">이름 *</label>
              <input
                id="f-name"
                name="name"
                type="text"
                required
                placeholder="홍길동"
                class="w-full rounded-xl border border-navy/15 bg-cream-soft px-4 py-3 focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand focus:bg-white transition"
              />
            </div>
            <div>
              <label class="block text-sm font-bold mb-1.5 text-navy" for="f-phone">연락처 *</label>
              <input
                id="f-phone"
                name="phone"
                type="tel"
                required
                placeholder="010-1234-5678"
                class="w-full rounded-xl border border-navy/15 bg-cream-soft px-4 py-3 focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand focus:bg-white transition"
              />
            </div>
            <div>
              <label class="block text-sm font-bold mb-1.5 text-navy" for="f-business">업종 / 상호 (선택)</label>
              <input
                id="f-business"
                name="business"
                type="text"
                placeholder="예) 정육점 / 명륜한우정육점"
                class="w-full rounded-xl border border-navy/15 bg-cream-soft px-4 py-3 focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand focus:bg-white transition"
              />
            </div>
            <div>
              <label class="block text-sm font-bold mb-1.5 text-navy" for="f-message">문의 내용 (선택)</label>
              <textarea
                id="f-message"
                name="message"
                rows={3}
                placeholder="궁금하신 내용을 적어주세요."
                class="w-full rounded-xl border border-navy/15 bg-cream-soft px-4 py-3 focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand focus:bg-white transition resize-none"
              ></textarea>
            </div>

            <button
              type="submit"
              id="consult-submit"
              class="flex items-center justify-center w-full bg-brand hover:bg-brand-dark text-white font-bold py-4 rounded-xl transition shadow-lg shadow-brand/30 ring-1 ring-gold/50"
            >
              <i class="fas fa-paper-plane mr-2"></i> 무료 상담 신청하기
            </button>
            <p class="text-xs text-center text-ink/50 mt-2">
              <i class="fas fa-lock mr-1"></i>
              입력하신 정보는 상담 목적으로만 사용되며, 신청 즉시 담당자에게 안전하게 전달됩니다.
            </p>
            <p id="consult-result" class="text-sm text-center hidden"></p>
          </form>
        </div>
      </div>
    </div>
  </section>
)

// ===== Footer =====
const Footer: FC = () => (
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
          <p><i class="fas fa-envelope text-gold mr-2"></i> tg@myrytax.com</p>
          <p><i class="fas fa-clock text-gold mr-2"></i> 평일 09:00 ~ 18:00</p>
        </div>
      </div>
      <div class="mt-8 pt-6 border-t border-white/10 text-xs text-white/40">
        © 2026 명륜세무회계. All rights reserved.
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
