// ===== 구글 태그 (Google 태그 관리자 + Google Ads 전환추적) =====
// - 모든 공개 페이지의 <head> 에 들어감 (renderer.tsx)
// - 관리자 화면과 시연용 사이트(SITE_NOINDEX=1)에는 넣지 않음 → 내부 방문이 광고 통계에 섞이지 않도록
// - 전환 '상담신청완료'는 상담신청 폼이 실제로 접수됐을 때 public/static/app.js 에서 보냄
export const GTM_ID = 'GTM-MF5G54Z5'
export const GOOGLE_ADS_ID = 'AW-17927385270'

const HEAD_SCRIPT = `
(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${GTM_ID}');
window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${GOOGLE_ADS_ID}');
`

export const GoogleTagHead = () => (
  <>
    <script async src={`https://www.googletagmanager.com/gtag/js?id=${GOOGLE_ADS_ID}`}></script>
    <script dangerouslySetInnerHTML={{ __html: HEAD_SCRIPT }} />
  </>
)

// 자바스크립트를 끈 브라우저용 (태그 관리자 안내대로 <body> 바로 뒤)
export const GoogleTagBody = () => (
  <noscript>
    <iframe
      src={`https://www.googletagmanager.com/ns.html?id=${GTM_ID}`}
      height="0"
      width="0"
      style="display:none;visibility:hidden"
    ></iframe>
  </noscript>
)
