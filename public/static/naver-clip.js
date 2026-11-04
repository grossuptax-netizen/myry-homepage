// '네이버 글 담기' 북마클릿이 보낸 글 받기 (전송 규격: window.open + postMessage)
// - 모든 페이지 <head> 에서 바로 실행: 북마클릿은 SITE + '/#naver-clip' 을 열고
//   400ms 마다 60초 동안 보내므로, 페이지가 열리자마자 들어야 함
// - 받으면 바로 ack → id 로 중복 거르기 → sessionStorage 보관 → 글쓰기 화면으로
//   (로그인 전이면 서버가 로그인 화면으로 보내고, 로그인 후 admin.js 가 이어서 채움)
;(function () {
  var NAVER_CLIP_ORIGIN = /^https:\/\/(m\.)?(cafe|blog)\.naver\.com$/
  var NAVER_CLIP_KEY = 'myryNaverClip'
  var SEEN_KEY = 'myryNaverClipSeen'
  var EDITOR_PATH = /^\/admin\/column\/(new|edit\/\d+)\/?$/

  // 같은 글이 여러 번 도착하므로 한 번만 처리 (화면 이동 후에도 기억하도록 sessionStorage 에도 기록)
  var seen = {}
  try {
    JSON.parse(sessionStorage.getItem(SEEN_KEY) || '[]').forEach(function (id) {
      seen[id] = true
    })
  } catch (e) {}

  window.addEventListener('message', function (e) {
    var d = e.data
    if (!NAVER_CLIP_ORIGIN.test(e.origin) || !d || d.type !== 'myry-naver-clip' || typeof d.html !== 'string') return
    // 받자마자 답부터 (규격과 같은 모양이어야 보내는 쪽이 멈춤)
    try {
      e.source.postMessage({ type: 'myry-naver-clip-ack', id: d.id }, e.origin)
    } catch (err) {}

    var id = String(d.id || '')
    if (seen[id]) return
    seen[id] = true
    try {
      sessionStorage.setItem(SEEN_KEY, JSON.stringify(Object.keys(seen).slice(-50)))
    } catch (err) {}

    var clip = {
      id: id,
      title: String(d.title || ''),
      html: d.html,
      sourceUrl: String(d.sourceUrl || ''),
      source: String(d.source || ''),
      sourceDate: d.sourceDate == null ? '' : String(d.sourceDate), // 카페: 밀리초 숫자 / 블로그: 화면의 날짜 글자
    }
    try {
      sessionStorage.setItem(NAVER_CLIP_KEY, JSON.stringify(clip))
    } catch (err) {}

    // 이미 글쓰기 화면이면 그 자리에서 채우고, 아니면 새 글 작성 화면으로
    if (EDITOR_PATH.test(location.pathname) && typeof window.applyNaverClip === 'function') {
      window.applyNaverClip()
    } else {
      location.replace('/admin/column/new#naver-clip')
    }
  })
})()
