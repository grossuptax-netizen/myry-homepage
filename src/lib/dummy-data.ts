import type { Column } from './columns'

// ===== 더미 칼럼 데이터 (카테고리별 3개 = 총 18개) =====
// 모든 콘텐츠는 정육점·축산물 세무 관련 내용만 다룹니다.
// 발행일은 최신순 정렬을 위해 내림차순으로 설정했습니다.

const DUMMY_CONTENT_INTRO = (title: string, category: string) => `
  <p class="lead">본 칼럼은 <strong>${title}</strong>에 대한 정육점·축산물 세무 전문가의 인사이트를 다룹니다. 명륜세무회계는 200개 이상의 정육·축산 고객사 세무를 처리하며 축적한 실무 노하우를 바탕으로, 사장님들이 놓치기 쉬운 세무 포인트를 알기 쉽게 정리해 드립니다.</p>
  <h2>정육점 세무, 왜 중요할까요?</h2>
  <p>정육점·식육판매업은 일반 소매업과 달리 <strong>면세 농축산물 매입</strong>, <strong>의제매입세액공제</strong>, <strong>축산물이력제</strong> 등 업종 특화된 세무 처리가 필요합니다. 이를 제대로 관리하지 않으면 부가세 부담이 커지거나 가산세 리스크가 발생할 수 있습니다.</p>
  <h3>핵심 체크 포인트</h3>
  <ul>
    <li>면세 농축산물(한우·한돈) 매입 시 의제매입세액공제 적용 여부</li>
    <li>도매시장·도축장 매입증빙(세금계산서) 누락 여부</li>
    <li>축산물이력제 매출 검증과 매입·매출 매칭</li>
    <li>정육 재고·로스율 관리와 원가 계산</li>
  </ul>
  <h2>실무 적용 가이드</h2>
  <p>정육점 사장님이 직접 적용할 수 있는 구체적인 방법을 단계별로 안내해 드립니다. 매입처 관리부터 부가세 신고까지, 식육판매업에 특화된 세무 처리 방법을 확인해 보세요.</p>
  <blockquote>※ 본 칼럼은 더미(예시) 콘텐츠입니다. 실제 정육점 세무 상담은 명륜세무회계 전문 세무사에게 문의해 주세요.</blockquote>
`

export const DUMMY_COLUMNS: Column[] = [
  // ===== 부가가치세 (vat) =====
  {
    id: 1,
    category: 'vat',
    title: '정육점 의제매입세액공제 완벽 가이드: 면세 한우·한돈 매입 절세',
    slug: 'butcher-deemed-vat-credit-guide',
    excerpt: '면세 농축산물 매입 시 의제매입세액공제를 한도까지 적용해 정육점 부가세 부담을 줄이는 핵심 방법을 정리했습니다.',
    content: DUMMY_CONTENT_INTRO('정육점 의제매입세액공제 완벽 가이드', '부가가치세'),
    thumbnail: '/static/columns/vat.svg',
    thumbnailAlt: '정육점 의제매입세액공제 - 면세 한우 한돈 매입 부가세 절세 세무계산서',
    author: '김명륜 세무사',
    publishedAt: '2026-07-05',
    metaTitle: '정육점 의제매입세액공제 완벽 가이드 | 명륜세무회계',
    metaDescription: '면세 농축산물(한우·한돈) 매입 시 의제매입세액공제를 한도까지 적용해 정육점 부가세 부담을 줄이는 방법. 정육점 세무 전문가의 실무 가이드.',
    views: 124,
  },
  {
    id: 2,
    category: 'vat',
    title: '정육점 부가세 신고, 도매시장 매입증빙 누락시 가산세 주의',
    slug: 'butcher-vat-filing-wholesale-invoice',
    excerpt: '도매시장·도축장 매입 시 세금계산서 누락은 부가세 가산세로 이어집니다. 정육점 부가세 신고 체크리스트를 공유합니다.',
    content: DUMMY_CONTENT_INTRO('정육점 부가세 신고와 매입증빙 관리', '부가가치세'),
    thumbnail: '/static/columns/vat.svg',
    thumbnailAlt: '정육점 부가세 신고 - 도매시장 도축장 매입증빙 세금계산서 축산물',
    author: '김명륜 세무사',
    publishedAt: '2026-06-22',
    metaTitle: '정육점 부가세 신고 매입증빙 누락 가산세 | 명륜세무회계',
    metaDescription: '정육점 도매시장·도축장 매입 세금계산서 누락 시 발생하는 부가세 가산세 리스크와 예방 방법. 축산물 매입증빙 관리 실무 팁.',
    views: 89,
  },
  {
    id: 3,
    category: 'vat',
    title: '축산물이력제 매출 검증과 부가세 신고의 상관관계',
    slug: 'livestock-traceability-vat-reporting',
    excerpt: '축산물이력제 데이터를 활용해 정육점 매출을 검증하고 부가세 신고 정확도를 높이는 방법을 설명합니다.',
    content: DUMMY_CONTENT_INTRO('축산물이력제 매출 검증과 부가세', '부가가치세'),
    thumbnail: '/static/columns/vat.svg',
    thumbnailAlt: '축산물이력제 매출 검증 정육점 부가세 신고 한우 이력관리',
    author: '이축산 세무사',
    publishedAt: '2026-05-18',
    metaTitle: '축산물이력제 매출 검증과 부가세 신고 | 명륜세무회계',
    metaDescription: '축산물이력제 데이터로 정육점 매출을 교차 검증해 부가세 신고 정확도를 높이는 방법. 식육판매업 세무 리스크 사전 차단.',
    views: 67,
  },

  // ===== 원가·재고관리 (inventory) =====
  {
    id: 4,
    category: 'inventory',
    title: '한우 부분육 마진 관리: 도매 매입 단가와 소매 매출 매칭',
    slug: 'hanwoo-primal-cut-margin-management',
    excerpt: '한우 부분육 분할 후 매출을 도매 매입 단가와 정확히 매칭해 마진 분석과 세금 신고를 한 번에 해결하는 방법.',
    content: DUMMY_CONTENT_INTRO('한우 부분육 마진 관리', '원가·재고관리'),
    thumbnail: '/static/columns/inventory.svg',
    thumbnailAlt: '한우 부분육 마진 관리 - 정육점 도매 매입 단가 소매 매출 매칭 축산물',
    author: '김명륜 세무사',
    publishedAt: '2026-07-03',
    metaTitle: '한우 부분육 마진 관리 매입매출 매칭 | 명륜세무회계',
    metaDescription: '한우 부분육 분할 후 매출을 도매 매입 단가와 매칭해 정육점 마진 분석과 세금 신고를 동시에 해결하는 노하우. 부분육 원가 관리 실무.',
    views: 156,
  },
  {
    id: 5,
    category: 'inventory',
    title: '정육점 재고·로스율 관리시스템 구축으로 원가 정확도 높이기',
    slug: 'butcher-inventory-loss-rate-cost',
    excerpt: '정육점 특유의 로스(폐기, 손질)를 체계적으로 관리해 원가 계산 정확도를 높이고 세무 리스크를 줄이는 방법.',
    content: DUMMY_CONTENT_INTRO('정육점 재고·로스율 관리', '원가·재고관리'),
    thumbnail: '/static/columns/inventory.svg',
    thumbnailAlt: '정육점 재고 로스율 관리 - 축산물 원가 계산 폐기 손질 관리시스템',
    author: '이축산 세무사',
    publishedAt: '2026-06-15',
    metaTitle: '정육점 재고 로스율 관리 원가 정확도 | 명륜세무회계',
    metaDescription: '정육점 로스(폐기·손질)를 체계적으로 관리해 원가 계산 정확도를 높이고 세무 리스크를 줄이는 관리시스템 구축 가이드.',
    views: 98,
  },
  {
    id: 6,
    category: 'inventory',
    title: '수입육 전문점 원가 관리: 환율·관세사 매입과 부가세 처리',
    slug: 'imported-meat-cost-management-vat',
    excerpt: '수입육 전문점이 관세사·수입업체 매입 시 원가와 부가세를 정확히 처리하는 방법을 정리했습니다.',
    content: DUMMY_CONTENT_INTRO('수입육 전문점 원가 관리', '원가·재고관리'),
    thumbnail: '/static/columns/inventory.svg',
    thumbnailAlt: '수입육 전문점 원가 관리 - 관세사 수입 매입 부가세 축산물 정육점',
    author: '박수입 세무사',
    publishedAt: '2026-05-09',
    metaTitle: '수입육 전문점 원가 관리 관세사 매입 부가세 | 명륜세무회계',
    metaDescription: '수입육 전문점의 관세사·수입업체 매입 원가 처리와 부가세 신고 방법. 수입 축산물 세무 처리 실무 가이드.',
    views: 54,
  },

  // ===== 인건비·노무 (labor) =====
  {
    id: 7,
    category: 'labor',
    title: '정육점 아르바이트·일용직 원천세 신고 실무 가이드',
    slug: 'butcher-part-time-withholding-tax',
    excerpt: '아르바이트·일용직이 많은 정육점 업종 특성에 맞춰 원천세와 4대보험을 정확히 처리하는 방법.',
    content: DUMMY_CONTENT_INTRO('정육점 아르바이트·일용직 원천세', '인건비·노무'),
    thumbnail: '/static/columns/labor.svg',
    thumbnailAlt: '정육점 아르바이트 일용직 원천세 - 4대보험 인건비 노무 축산물',
    author: '최노무 세무사',
    publishedAt: '2026-07-01',
    metaTitle: '정육점 아르바이트 일용직 원천세 4대보험 신고 | 명륜세무회계',
    metaDescription: '아르바이트·일용직이 많은 정육점 업종에 맞춘 원천세와 4대보험 정확한 처리 방법. 인건비 노무 관리 실무 가이드.',
    views: 112,
  },
  {
    id: 8,
    category: 'labor',
    title: '정육점 고용지원금 신청 대행: 받을 수 있는 지원금 총정리',
    slug: 'butcher-employment-subsidy-guide',
    excerpt: '정육점·축산물 사업장이 받을 수 있는 고용지원금을 찾아 대행 신청하는 방법과 지원금 종류를 정리했습니다.',
    content: DUMMY_CONTENT_INTRO('정육점 고용지원금 신청 대행', '인건비·노무'),
    thumbnail: '/static/columns/labor.svg',
    thumbnailAlt: '정육점 고용지원금 신청 - 축산물 사업장 인건비 노무 지원금',
    author: '최노무 세무사',
    publishedAt: '2026-06-10',
    metaTitle: '정육점 고용지원금 신청 대행 지원금 종류 | 명륜세무회계',
    metaDescription: '정육점·축산물 사업장이 받을 수 있는 고용지원금 종류와 신청 방법. 전문가 대행으로 누락 없이 혜택을 받는 노하우.',
    views: 87,
  },
  {
    id: 9,
    category: 'labor',
    title: '임금명세서 의무 발급: 정육점 사장님이 꼭 알아야 할 법정 사항',
    slug: 'butcher-paysheet-legal-requirement',
    excerpt: '법정 의무사항인 임금명세서를 정육점에서 자동 생성하고 발급하는 방법과 주의사항을 설명합니다.',
    content: DUMMY_CONTENT_INTRO('임금명세서 의무 발급', '인건비·노무'),
    thumbnail: '/static/columns/labor.svg',
    thumbnailAlt: '임금명세서 의무 발급 - 정육점 법정 사항 인건비 노무 축산물',
    author: '김명륜 세무사',
    publishedAt: '2026-04-28',
    metaTitle: '임금명세서 의무 발급 정육점 법정사항 | 명륜세무회계',
    metaDescription: '정육점 법정 의무사항인 임금명세서 자동 생성·발급 방법과 주의사항. 인건비 노무 관리 법적 리스크 예방 가이드.',
    views: 63,
  },

  // ===== 사업자유형·법인전환 (business-type) =====
  {
    id: 10,
    category: 'business-type',
    title: '식육판매업 인허가 세무: 정육점 창업 시 필수 인허가 총정리',
    slug: 'meat-retail-license-tax-guide',
    excerpt: '식육판매업 인허가부터 축산물이력제, HACCP까지 정육점 창업 시 필수 인허가와 세무 처리를 정리했습니다.',
    content: DUMMY_CONTENT_INTRO('식육판매업 인허가 세무', '사업자유형·법인전환'),
    thumbnail: '/static/columns/business-type.svg',
    thumbnailAlt: '식육판매업 인허가 - 정육점 창업 축산물이력제 HACCP 세무',
    author: '박인허 세무사',
    publishedAt: '2026-06-28',
    metaTitle: '식육판매업 인허가 정육점 창업 필수 세무 | 명륜세무회계',
    metaDescription: '식육판매업 인허가부터 축산물이력제, HACCP까지 정육점 창업 시 필수 인허가와 세무 처리 총정리. 업종 특화 인허가 가이드.',
    views: 134,
  },
  {
    id: 11,
    category: 'business-type',
    title: '정육점 개인→법인 전환: 절세 타이밍과 법인전환 절차',
    slug: 'butcher-corporate-conversion-timing',
    excerpt: '정육점 매출이 커지면 법인전환으로 절세할 수 있습니다. 법인전환의 최적 타이밍과 절차를 설명합니다.',
    content: DUMMY_CONTENT_INTRO('정육점 개인→법인 전환', '사업자유형·법인전환'),
    thumbnail: '/static/columns/business-type.svg',
    thumbnailAlt: '정육점 법인전환 - 개인 사업자 절세 축산물 식육판매업 세무',
    author: '김명륜 세무사',
    publishedAt: '2026-05-25',
    metaTitle: '정육점 개인 법인전환 절세 타이밍 절차 | 명륜세무회계',
    metaDescription: '정육점 매출 성장 시 법인전환으로 절세하는 최적 타이밍과 절차. 식육판매업 법인전환 컨설팅 전문 팀의 노하우.',
    views: 91,
  },
  {
    id: 12,
    category: 'business-type',
    title: '간이과세자 vs 일반과세자: 정육점 사업자 유형 선택 기준',
    slug: 'butcher-simplified-vs-general-tax',
    excerpt: '정육점 사장님이 간이과세자와 일반과세자 중 선택할 때 고려해야 할 기준과 의제매입세액공제의 관계.',
    content: DUMMY_CONTENT_INTRO('간이과세자 vs 일반과세자', '사업자유형·법인전환'),
    thumbnail: '/static/columns/business-type.svg',
    thumbnailAlt: '간이과세자 일반과세자 - 정육점 사업자 유형 의제매입세액공제 축산물',
    author: '박인허 세무사',
    publishedAt: '2026-04-12',
    metaTitle: '정육점 간이과세자 일반과세자 선택 기준 | 명륜세무회계',
    metaDescription: '정육점 사업자가 간이과세자와 일반과세자 중 선택할 기준. 의제매입세액공제 적용 여부가 사업자 유형 선택의 핵심.',
    views: 78,
  },

  // ===== 정부지원금·정책자금 (subsidy) =====
  {
    id: 13,
    category: 'subsidy',
    title: '소상공인 정책자금: 정육점이 받을 수 있는 대출 총정리',
    slug: 'butcher-small-business-policy-fund',
    excerpt: '정육점·축산물 사업장이 활용할 수 있는 소상공인 정책자금 대출 종류와 신청 방법을 정리했습니다.',
    content: DUMMY_CONTENT_INTRO('소상공인 정책자금', '정부지원금·정책자금'),
    thumbnail: '/static/columns/subsidy.svg',
    thumbnailAlt: '소상공인 정책자금 - 정육점 대출 축산물 정부지원금 정책자금',
    author: '이지원 세무사',
    publishedAt: '2026-06-30',
    metaTitle: '소상공인 정책자금 정육점 대출 종류 신청 | 명륜세무회계',
    metaDescription: '정육점·축산물 사업장이 활용할 수 있는 소상공인 정책자금 대출 종류와 신청 방법 총정리. 전문가 무료 대행 서비스 안내.',
    views: 145,
  },
  {
    id: 14,
    category: 'subsidy',
    title: '축산물 위생·HACCP 지원금: 정육점 품질관리 지원 정책',
    slug: 'livestock-haccp-hygiene-subsidy',
    excerpt: '축산물 위생관리와 HACCP 인증 관련 정육점이 받을 수 있는 정부 지원금과 인증 지원 정책을 정리했습니다.',
    content: DUMMY_CONTENT_INTRO('축산물 위생·HACCP 지원금', '정부지원금·정책자금'),
    thumbnail: '/static/columns/subsidy.svg',
    thumbnailAlt: '축산물 HACCP 위생 지원금 - 정육점 품질관리 정부지원금 식육판매업',
    author: '이지원 세무사',
    publishedAt: '2026-05-20',
    metaTitle: '축산물 HACCP 위생 지원금 정육점 품질관리 | 명륜세무회계',
    metaDescription: '축산물 위생관리·HACCP 인증 관련 정육점이 받을 수 있는 정부 지원금과 인증 지원 정책. 식육판매업 품질관리 지원.',
    views: 76,
  },
  {
    id: 15,
    category: 'subsidy',
    title: '연간 최대 3,200만원 절세: 정육점 정부지원금 무료 진단',
    slug: 'butcher-government-subsidy-diagnosis',
    excerpt: '정육점 사업장이 놓치고 있는 정부지원금을 전문가가 무료로 진단하고 대행 신청하는 서비스를 소개합니다.',
    content: DUMMY_CONTENT_INTRO('정육점 정부지원금 무료 진단', '정부지원금·정책자금'),
    thumbnail: '/static/columns/subsidy.svg',
    thumbnailAlt: '정육점 정부지원금 무료 진단 - 축산물 절세 정책자금 식육판매업',
    author: '김명륜 세무사',
    publishedAt: '2026-04-05',
    metaTitle: '정육점 정부지원금 무료 진단 연간 절세 | 명륜세무회계',
    metaDescription: '정육점이 놓치는 정부지원금을 전문가가 무료로 진단하고 대행 신청. 연간 최대 3,200만원 절세 사례. 축산물 정책자금.',
    views: 108,
  },

  // ===== 세법개정·시사 (tax-news) =====
  {
    id: 16,
    category: 'tax-news',
    title: '2026년 세법 개정이 정육점에 미치는 영향 총정리',
    slug: '2026-tax-revision-butcher-impact',
    excerpt: '2026년 세법 개정안 중 정육점·축산물 사업장에 직접 영향을 미치는 주요 변화를 알기 쉽게 정리했습니다.',
    content: DUMMY_CONTENT_INTRO('2026년 세법 개정과 정육점', '세법개정·시사'),
    thumbnail: '/static/columns/tax-news.svg',
    thumbnailAlt: '2026년 세법 개정 - 정육점 축산물 세무 시사 식육판매업 의제매입세액공제',
    author: '김명륜 세무사',
    publishedAt: '2026-07-06',
    metaTitle: '2026년 세법 개정 정육점 영향 총정리 | 명륜세무회계',
    metaDescription: '2026년 세법 개정안 중 정육점·축산물 사업장에 직접 영향을 미치는 주요 변화. 의제매입세액공제 한도·부가세 신고 변화 등.',
    views: 201,
  },
  {
    id: 17,
    category: 'tax-news',
    title: '정육점 의제매입세액공제 한도 변경, 사장님이 알아야 할 변화',
    slug: 'deemed-vat-credit-limit-change',
    excerpt: '의제매입세액공제 한도 변경이 정육점 부가세 부담에 어떤 영향을 미치는지, 실무적으로 대응 방법을 설명합니다.',
    content: DUMMY_CONTENT_INTRO('의제매입세액공제 한도 변경', '세법개정·시사'),
    thumbnail: '/static/columns/tax-news.svg',
    thumbnailAlt: '의제매입세액공제 한도 변경 - 정육점 부가세 축산물 면세 매입 세무',
    author: '이축산 세무사',
    publishedAt: '2026-06-18',
    metaTitle: '정육점 의제매입세액공제 한도 변경 대응 | 명륜세무회계',
    metaDescription: '의제매입세액공제 한도 변경이 정육점 부가세에 미치는 영향과 실무 대응 방법. 면세 축산물 매입 절세 전략 업데이트.',
    views: 119,
  },
  {
    id: 18,
    category: 'tax-news',
    title: '축산물이력제 강화 정책과 정육점 세무 검증 변화',
    slug: 'livestock-traceability-policy-strengthening',
    excerpt: '축산물이력제 정책 강화에 따라 정육점 매입·매출 검증과 세무 신고가 어떻게 달라지는지 분석했습니다.',
    content: DUMMY_CONTENT_INTRO('축산물이력제 강화와 세무 검증', '세법개정·시사'),
    thumbnail: '/static/columns/tax-news.svg',
    thumbnailAlt: '축산물이력제 강화 - 정육점 세무 검증 매입 매출 한우 한돈 식육판매업',
    author: '박인허 세무사',
    publishedAt: '2026-05-12',
    metaTitle: '축산물이력제 강화 정육점 세무 검증 변화 | 명륜세무회계',
    metaDescription: '축산물이력제 정책 강화에 따른 정육점 매입·매출 검증과 세무 신고 변화. 한우·한돈 이력관리 세무 리스크 대응.',
    views: 72,
  },
]

// 발행일 내림차순(최신순) 정렬
export const SORTED_COLUMNS = [...DUMMY_COLUMNS].sort(
  (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
)

// 카테고리별 필터링
export function getColumnsByCategory(category: string): Column[] {
  return SORTED_COLUMNS.filter((c) => c.category === category)
}

// slug로 단일 칼럼 조회
export function getColumnBySlug(category: string, slug: string): Column | undefined {
  return DUMMY_COLUMNS.find((c) => c.category === category && c.slug === slug)
}

// 같은 카테고리의 관련 칼럼 (본인 제외, 최대 n개)
export function getRelatedColumns(column: Column, count: number = 3): Column[] {
  return SORTED_COLUMNS.filter(
    (c) => c.category === column.category && c.id !== column.id
  ).slice(0, count)
}

// 본문에서 평문 발췌 (메타 설명 자동 생성용)
export function extractExcerptFromContent(html: string, maxLen: number = 160): string {
  // HTML 태그 제거
  const text = html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&[a-z]+;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  return text.length > maxLen ? text.slice(0, maxLen - 1) + '…' : text
}

// 메타 설명이 없으면 본문에서 자동 생성
export function getMetaDescription(column: Column): string {
  if (column.metaDescription && column.metaDescription.trim()) {
    return column.metaDescription.slice(0, 160)
  }
  return extractExcerptFromContent(column.content, 160)
}

// 메타 타이틀이 없으면 제목 사용
export function getMetaTitle(column: Column): string {
  if (column.metaTitle && column.metaTitle.trim()) {
    return column.metaTitle
  }
  return `${column.title} | 명륜세무회계`
}
