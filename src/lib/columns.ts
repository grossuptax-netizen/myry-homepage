// ===== 칼럼 카테고리 정의 =====
// slug: URL에 사용되는 영문 슬러그
// label: 화면에 표시되는 한글 카테고리명
// icon: FontAwesome 아이콘 클래스
// desc: 카테고리 설명 (SEO용)

export type CategorySlug =
  | 'vat'
  | 'inventory'
  | 'labor'
  | 'business-type'
  | 'subsidy'
  | 'tax-news'

export interface Category {
  slug: CategorySlug
  label: string
  icon: string
  desc: string
}

export const CATEGORIES: Category[] = [
  {
    slug: 'vat',
    label: '부가가치세',
    icon: 'fa-receipt',
    desc: '정육점 의제매입세액공제, 면세 농축산물 매입, 부가세 신고 등 부가가치세 관련 세무 칼럼',
  },
  {
    slug: 'inventory',
    label: '원가·재고관리',
    icon: 'fa-boxes-stacked',
    desc: '한우·한돈 매입 단가, 부분육 마진, 정육 재고·로스율 관리 등 원가 및 재고 관리 세무 칼럼',
  },
  {
    slug: 'labor',
    label: '인건비·노무',
    icon: 'fa-users',
    desc: '정육점 아르바이트·일용직 원천세, 4대보험, 고용지원금, 임금명세서 등 인건비·노무 칼럼',
  },
  {
    slug: 'business-type',
    label: '사업자유형·법인전환',
    icon: 'fa-building',
    desc: '식육판매업 인허가, 개인→법인 전환, 사업자 유형 선택 등 사업자 형태 관련 세무 칼럼',
  },
  {
    slug: 'subsidy',
    label: '정부지원금·정책자금',
    icon: 'fa-hand-holding-dollar',
    desc: '소상공인 정책자금, 고용지원금, 축산물 위생·HACCP 지원금 등 정육점 정부지원금 칼럼',
  },
  {
    slug: 'tax-news',
    label: '세법개정·시사',
    icon: 'fa-newspaper',
    desc: '세법 개정안, 정육점·축산물 관련 세무 시사, 최신 세무 동향 칼럼',
  },
]

export const CATEGORY_MAP: Record<string, Category> = Object.fromEntries(
  CATEGORIES.map((c) => [c.slug, c])
)

export function getCategory(slug: string): Category | undefined {
  return CATEGORY_MAP[slug]
}

export function getCategoryLabel(slug: string): string {
  return CATEGORY_MAP[slug]?.label ?? slug
}

// ===== 칼럼 데이터 타입 =====
export interface Column {
  id: number
  category: CategorySlug
  title: string
  slug: string // URL 슬러그 (영문)
  excerpt: string // 한 줄 요약 (목록용, 2줄 이내)
  content: string // 본문 (HTML)
  thumbnail: string // 썸네일 이미지 경로
  thumbnailAlt: string // 썸네일 alt 텍스트 (정육점 키워드 포함)
  author: string // 작성자 (세무사명)
  publishedAt: string // 발행일 (ISO 날짜)
  metaTitle: string // SEO 메타 타이틀
  metaDescription: string // SEO 메타 설명 (최대 160자)
  views: number // 조회수
}

// ===== 정육점 세무 키워드 (alt 텍스트 자동 보정용) =====
export const BUTCHER_SEO_KEYWORDS = [
  '정육점',
  '축산물',
  '의제매입세액공제',
  '한우',
  '한돈',
  '축산물이력제',
  '식육판매업',
  'HACCP',
]

// alt 텍스트에 정육점 키워드가 없으면 자동으로 보정
export function ensureButcherAlt(alt: string, category: string): string {
  const hasKeyword = BUTCHER_SEO_KEYWORDS.some((k) => alt.includes(k))
  if (hasKeyword) return alt
  const catLabel = getCategoryLabel(category)
  return `${alt} - ${catLabel} 정육점 세무 관련 이미지`
}
