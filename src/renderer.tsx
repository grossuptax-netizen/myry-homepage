import { jsxRenderer } from 'hono/jsx-renderer'

export const renderer = jsxRenderer(({ children }) => {
  return (
    <html lang="ko">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>명륜세무회계 | 정육점 전문 세무의 시작</title>
        <link rel="icon" type="image/png" sizes="32x32" href="/static/favicon-32.png" />
        <link rel="apple-touch-icon" href="/static/favicon-192.png" />
        <meta property="og:image" content="/static/favicon-192.png" />
        <meta
          name="description"
          content="명륜세무회계 - 정육점 · 축산물 전문 세무. 의제매입세액공제, 한우·한돈 매입 관리, 축산물이력제까지 정육 사업장에 특화된 스마트 세무 서비스. 월 8만원부터 시작하세요."
        />
        <meta property="og:title" content="명륜세무회계 | 정육점 전문 세무의 시작" />
        <meta
          property="og:description"
          content="비용은 더 낮게, 절세는 더 크게. 정육점·축산물 전문 세무사가 함께하는 스마트 세무 서비스."
        />
        <script src="https://cdn.tailwindcss.com"></script>
        <link
          href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css"
          rel="stylesheet"
        />
        <link
          rel="preconnect"
          href="https://fonts.googleapis.com"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;700;900&display=swap"
          rel="stylesheet"
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `
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
            `,
          }}
        />
        <link href="/static/style.css" rel="stylesheet" />
      </head>
      <body class="font-sans text-ink bg-cream antialiased">{children}</body>
    </html>
  )
})
