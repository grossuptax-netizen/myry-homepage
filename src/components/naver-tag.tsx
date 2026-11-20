// ===== 네이버 광고 전환추적 공통 스크립트 =====
// - renderer.tsx 에서 </body> 바로 앞에 한 번 넣음 (구글 태그와 같은 조건: 실제 주소의 공개 페이지만)
// - 전환 'lead'(상담신청)는 상담신청 폼이 실제로 접수됐을 때 public/static/app.js 에서 보냄
export const NAVER_WA_ID = 's_2ae8d63aea30'

const NAVER_SCRIPT = `
if (!wcs_add) var wcs_add={};
wcs_add["wa"] = "${NAVER_WA_ID}";
if (!_nasa) var _nasa={};
if(window.wcs){
wcs.inflow("jung6tax.com");
wcs_do();
}
`

export const NaverCommonScript = () => (
  <>
    {/* NAVER 공통 SCRIPT */}
    <script type="text/javascript" src="//wcs.naver.net/wcslog.js"></script>
    <script type="text/javascript" dangerouslySetInnerHTML={{ __html: NAVER_SCRIPT }} />
  </>
)
