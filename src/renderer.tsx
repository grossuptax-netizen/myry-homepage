import { jsxRenderer } from 'hono/jsx-renderer'

export const renderer = jsxRenderer(({ children }) => {
  return (
    <html lang="ko">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>명륜세무회계 | 정육점 전문 세무의 시작</title>
        <link rel="icon" type="image/svg+xml" href="/static/favicon.svg" />
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
                      brand: {
                        DEFAULT: '#0c5ab9',
                        light: '#cfe0f5',
                        soft: '#eef4fc',
                        dark: '#084a99'
                      }
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
      <body class="font-sans text-gray-900 bg-white antialiased">{children}</body>
    </html>
  )
})
