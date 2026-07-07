import { jsxRenderer, useRequestContext } from 'hono/jsx-renderer'
import type { FC, Child } from 'hono/jsx'

// ===== 동적 head 데이터 타입 =====
// 각 페이지에서 c.set('head', {...}) 로 전달하면 renderer가 <head>에 반영
export interface HeadData {
  title?: string
  description?: string
  ogTitle?: string
  ogDescription?: string
  ogImage?: string
  ogType?: string // og:type (기본값: website, 칼럼 상세: article)
  canonical?: string
  robots?: string
  // 추가 <head> 자식 요소 (JSON-LD 구조화 데이터, 추가 meta 등)
  extraHead?: Child
}

const TAILWIND_CONFIG = `
  tailwind.config = {
    theme: {
      extend: {
        colors: {
          /* 메인: 버건디 레드 (CTA·로고·강조) */
          brand: {
            DEFAULT: '#8B1A1A',
            light: '#e9c9c9',
            soft: '#f6e9e9',
            dark: '#6e1414'
          },
          /* 서브: 네이비 블루 (신뢰 섹션·푸터) */
          navy: {
            DEFAULT: '#1A2A4A',
            light: '#2c4172',
            soft: '#e3e7ef',
            dark: '#101a30'
          },
          /* 포인트: 골드 (아이콘·인포그래픽) */
          gold: {
            DEFAULT: '#C9A84C',
            light: '#e6d39a',
            soft: '#f7f0d8',
            dark: '#a88a35'
          },
          /* 배경: 크림 화이트 */
          cream: {
            DEFAULT: '#F5F0EB',
            soft: '#fbf8f4'
          },
          /* 본문 텍스트: 다크 그레이 */
          ink: '#3D3D3D'
        },
        fontFamily: {
          sans: ['"Noto Sans KR"', 'sans-serif']
        }
      }
    }
  }
`

// 기본 메타 정보
const DEFAULT_TITLE = '명륜세무회계 | 정육점 전문 세무의 시작'
const DEFAULT_DESCRIPTION =
  '명륜세무회계 - 정육점 · 축산물 전문 세무. 의제매입세액공제, 한우·한돈 매입 관리, 축산물이력제까지 정육 사업장에 특화된 스마트 세무 서비스. 월 8만원부터 시작하세요.'
const DEFAULT_OG_TITLE = '명륜세무회계 | 정육점 전문 세무의 시작'
const DEFAULT_OG_DESCRIPTION =
  '비용은 더 낮게, 절세는 더 크게. 정육점·축산물 전문 세무사가 함께하는 스마트 세무 서비스.'

export const renderer = jsxRenderer(({ children }) => {
  // 라우트에서 c.set('head', {...}) 로 전달된 동적 head 데이터 읽기
  const c = useRequestContext()
  const head = (c.get('head') as HeadData) ?? {}

  const title = head.title ?? DEFAULT_TITLE
  const description = head.description ?? DEFAULT_DESCRIPTION
  const ogTitle = head.ogTitle ?? title
  const ogDescription = head.ogDescription ?? description
  const ogImage = head.ogImage ?? '/static/favicon-192.png'
  const ogType = head.ogType ?? 'website'

  return (
    <html lang="ko">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>{title}</title>
        <link rel="icon" type="image/png" sizes="32x32" href="/static/favicon-32.png" />
        <link rel="apple-touch-icon" href="/static/favicon-192.png" />
        <meta name="description" content={description} />
        {/* Open Graph 태그 (카카오톡, 페이스북 공유용) */}
        <meta property="og:type" content={ogType} />
        <meta property="og:title" content={ogTitle} />
        <meta property="og:description" content={ogDescription} />
        <meta property="og:image" content={ogImage} />
        <meta property="og:locale" content="ko_KR" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={ogTitle} />
        <meta name="twitter:description" content={ogDescription} />
        <meta name="twitter:image" content={ogImage} />
        {head.canonical && <link rel="canonical" href={head.canonical} />}
        {head.robots && <meta name="robots" content={head.robots} />}
        {head.extraHead}
        <script src="https://cdn.tailwindcss.com"></script>
        <link
          href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css"
          rel="stylesheet"
        />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;700;900&display=swap"
          rel="stylesheet"
        />
        <script dangerouslySetInnerHTML={{ __html: TAILWIND_CONFIG }} />
        <link href="/static/style.css" rel="stylesheet" />
      </head>
      <body class="font-sans text-ink bg-cream antialiased">{children}</body>
    </html>
  )
})
