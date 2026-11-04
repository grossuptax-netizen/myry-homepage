// 관리자 페이지 스크립트
// Google OAuth 세션 (쿠키 기반) + D1 CRUD API 연동 + Cloudinary 이미지 업로드
// - 로그인: Google OAuth → /api/auth/google → 콜백 → 쿠키 설정
// - 칼럼 저장: POST /api/admin/column (신규) / PUT /api/admin/column/:id (수정)
// - 칼럼 삭제: DELETE /api/admin/column/:id
// - 로그아웃: POST /api/auth/logout
// - 이미지 업로드: Cloudinary (썸네일 + 본문 삽입 이미지)
//   서버가 관리자에게만 업로드 서명을 발급 → 서명 업로드
//   (서버에 CLOUDINARY_API_KEY/SECRET 미설정 시 unsigned preset 으로 동작)
//
// 인증은 서버 쿠키(admin_session)로 처리되므로,
// 모든 fetch 요청에 credentials: 'same-origin'을 포함하여 쿠키 자동 전송.

/* ============================================================================
 * Cloudinary 설정 (unsigned upload - 공개 preset 사용)
 * ============================================================================
 * - Cloud name: vxqu6qlr
 * - Upload preset: jung6tax_upload (unsigned, 관리자 전용 폼에서만 호출)
 * - 업로드 후 반환되는 secure_url 만 D1 columns 테이블에 저장
 *   → DB 용량 절감, CDN 가속, 리사이즈/최적화 자동
 */
const CLOUDINARY_CLOUD_NAME = 'vxqu6qlr'
const CLOUDINARY_UPLOAD_PRESET = 'jung6tax_upload'
const CLOUDINARY_UPLOAD_URL = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`

/**
 * 이미지를 Cloudinary에 업로드하고 secure_url 반환
 * @param {File|string} file - 이미지 파일, 또는 이미지 주소(https://... / data:image/...)
 *   주소를 넘기면 Cloudinary 서버가 그 주소에서 직접 이미지를 가져옴 (붙여넣은 외부 이미지 옮기기용)
 * @returns {Promise<string>} secure_url
 * @throws {Error} 업로드 실패 시
 */
async function uploadToCloudinary(file) {
  if (!file) throw new Error('파일이 없습니다.')
  if (typeof file !== 'string' && (!file.type || !file.type.startsWith('image/'))) {
    throw new Error('이미지 파일만 업로드 가능합니다.')
  }

  // 서버에서 업로드 서명 발급 (관리자 세션 필요)
  // 서명 키가 서버에 설정돼 있으면 서명 업로드, 아니면 기존 unsigned preset 업로드
  const signRes = await fetch('/api/admin/cloudinary-signature', {
    method: 'POST',
    credentials: 'same-origin',
  })
  if (signRes.status === 401) {
    throw new Error('로그인이 만료되었습니다. 다시 로그인해 주세요.')
  }
  const sign = await signRes.json().catch(() => ({}))
  if (!signRes.ok || !sign.ok) {
    throw new Error(sign.error || '업로드 서명을 받지 못했습니다.')
  }

  const formData = new FormData()
  formData.append('file', file)
  formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET)
  if (sign.signed) {
    formData.append('api_key', sign.apiKey)
    formData.append('timestamp', sign.timestamp)
    formData.append('signature', sign.signature)
    if (sign.folder) formData.append('folder', sign.folder) // 정육점 폴더 (서명에 포함됨)
  }

  const uploadUrl = sign.cloudName
    ? `https://api.cloudinary.com/v1_1/${sign.cloudName}/image/upload`
    : CLOUDINARY_UPLOAD_URL
  const res = await fetch(uploadUrl, {
    method: 'POST',
    body: formData,
  })

  if (!res.ok) {
    let msg = `업로드 실패 (HTTP ${res.status})`
    try {
      const err = await res.json()
      if (err && err.error && err.error.message) {
        msg = err.error.message
      }
    } catch (_) {}
    throw new Error(msg)
  }

  const data = await res.json()
  if (!data.secure_url) {
    throw new Error('업로드 응답에 URL이 없습니다.')
  }
  return data.secure_url
}

/**
 * 외부 사진 주소(네이버 등)를 서버를 거쳐 Cloudinary 로 옮김
 * 서버가 Referer 없이 큰 판부터 받아 정육점 폴더로 서명 업로드 (POST /api/admin/cloudinary/import)
 * @returns {Promise<string|null>} Cloudinary 주소, 서버에 Cloudinary 키가 없으면 null (→ 기존 방식으로 업로드)
 */
async function importImageViaServer(url) {
  const res = await fetch('/api/admin/cloudinary/import', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    body: JSON.stringify({ url }),
  })
  if (res.status === 503) return null
  if (res.status === 401) throw new Error('로그인이 만료되었습니다. 다시 로그인해 주세요.')
  const data = await res.json().catch(() => ({}))
  if (res.ok && data.ok && data.url) return data.url
  throw new Error(data.error || `사진 옮기기 실패 (HTTP ${res.status})`)
}

/* ============================================================================
 * 한글 → 로마자 (국어의 로마자 표기법 기본 대응, 소리 바뀜 규칙은 생략)
 * 글 주소(슬러그)용: '해고예고수당' → 'haegoyegosudang', 낱말 사이는 하이픈
 * ============================================================================ */
const RR_INITIAL = ['g', 'kk', 'n', 'd', 'tt', 'r', 'm', 'b', 'pp', 's', 'ss', '', 'j', 'jj', 'ch', 'k', 't', 'p', 'h']
const RR_MEDIAL = ['a', 'ae', 'ya', 'yae', 'eo', 'e', 'yeo', 'ye', 'o', 'wa', 'wae', 'oe', 'yo', 'u', 'wo', 'we', 'wi', 'yu', 'eu', 'ui', 'i']
const RR_FINAL = ['', 'k', 'k', 'k', 'n', 'n', 'n', 't', 'l', 'k', 'm', 'l', 'l', 'l', 'p', 'l', 'm', 'p', 'p', 't', 't', 'ng', 't', 't', 'k', 't', 'p', 't']

function romanizeHangul(text) {
  const words = String(text || '')
    .split(/[\s\-_/·,.!?:'"“”‘’()\[\]|]+/)
    .map((word) =>
      Array.from(word)
        .map((ch) => {
          const code = ch.charCodeAt(0) - 0xac00
          if (code >= 0 && code < 11172) {
            const ini = Math.floor(code / 588)
            const med = Math.floor((code % 588) / 28)
            const fin = code % 28
            return RR_INITIAL[ini] + RR_MEDIAL[med] + RR_FINAL[fin]
          }
          return /[a-z0-9]/i.test(ch) ? ch.toLowerCase() : ''
        })
        .join('')
    )
    .filter(Boolean)
  let slug = ''
  for (const w of words) {
    const next = slug ? `${slug}-${w}` : w
    if (next.length > 60) break
    slug = next
  }
  return slug
}

/* ============================================================================
 * 네이버 원본 주소 모양 맞추기 (전송 규격 4-7 canonicalNaverUrl)
 * 예전 버튼이 보낸 source 등을 sourceUrl 과 같은 모양으로
 * ============================================================================ */
function canonicalNaverUrl(raw) {
  let u
  try {
    u = new URL(String(raw || ''))
  } catch (e) {
    return null
  }
  const host = u.hostname.toLowerCase().replace(/^m\./, '')
  if (host === 'cafe.naver.com') {
    let m = u.pathname.match(/\/cafes\/(\d+)\/articles\/(\d+)/)
    if (m) return `https://cafe.naver.com/ca-fe/cafes/${m[1]}/articles/${m[2]}`
    const inner =
      decodeURIComponent(u.searchParams.get('iframe_url_utf8') || u.searchParams.get('iframe_url') || '') + '&' + u.search
    const club = inner.match(/clubid=(\d+)/i)
    const art = inner.match(/articleid=(\d+)/i)
    if (club && art) return `https://cafe.naver.com/ca-fe/cafes/${club[1]}/articles/${art[1]}`
    m = u.pathname.match(/^\/([A-Za-z0-9_-]+)\/(\d+)\/?$/)
    return m ? `https://cafe.naver.com/${m[1]}/${m[2]}` : null // 이름 주소는 카페 번호를 몰라 그대로
  }
  if (host === 'blog.naver.com') {
    const blogId = u.searchParams.get('blogId')
    const logNo = u.searchParams.get('logNo')
    if (blogId && /^\d+$/.test(logNo || '')) return `https://blog.naver.com/${blogId}/${logNo}`
    const m = u.pathname.match(/^\/([A-Za-z0-9_-]+)\/(\d+)\/?$/)
    return m ? `https://blog.naver.com/${m[1]}/${m[2]}` : null
  }
  return null
}

/* ============================================================================
 * 정육점 카페 꼬리말 빼기 (전송 규격 12번 — 받는 쪽 일)
 * - 맨 앞 인사말: "○○ 협력업체" / "<명륜세무회계> 입니다."
 * - 마지막 구분선 아래 홍보 영역: 무료기장·이벤트 안내, 신청 링크, 연락처, 카카오톡 채널·홈페이지 링크 카드
 *   (구분선 아래에 홍보 문구가 2가지 이상 있을 때만 빼서, 일반 구분선 아래 본문은 지우지 않음)
 * 뺀 부분은 되돌리기용으로 함께 돌려줌
 * ============================================================================ */
const CLIP_HEAD_PATTERNS = [/협력업체/, /^[<〈《(]?\s*명륜\s*세무\s*회계\s*[>〉》)]?\s*입니다\.?$/]
const CLIP_TAIL_KEYWORDS = [
  '무료기장', '무료 기장', '무료세무', '기장료', '이벤트', '카카오톡', 'pf.kakao.com',
  'jung6tax', '명륜세무회계', '031-8027', '상담', '신청',
]

function splitNaverBoilerplate(html) {
  const doc = new DOMParser().parseFromString(html, 'text/html')
  const body = doc.body
  const cleanText = (el) => (el.textContent || '').replace(/[​﻿\s]+/g, ' ').trim()
  let head = ''
  let tail = ''

  // 1) 맨 앞 인사말 (앞쪽 문단 4개 안에서, 첫 '진짜' 문단이 나오기 전까지)
  const paragraphs = Array.from(body.querySelectorAll('p, .se-text-paragraph'))
  const removedHead = []
  let checked = 0
  for (const p of paragraphs) {
    const text = cleanText(p)
    if (!text) continue
    if (++checked > 4) break
    if (CLIP_HEAD_PATTERNS.some((re) => re.test(text))) removedHead.push(p)
    else break
  }
  removedHead.forEach((p) => {
    head += p.outerHTML
    p.remove()
  })

  // 2) 마지막 구분선 아래 홍보 영역
  const lines = Array.from(body.querySelectorAll('.se-horizontalLine, hr'))
  const lastLine = lines[lines.length - 1]
  if (lastLine) {
    const block = lastLine.closest('.se-component') || lastLine
    const following = []
    for (let n = block.nextElementSibling; n; n = n.nextElementSibling) following.push(n)
    const tailText = following
      .map((n) => cleanText(n) + ' ' + Array.from(n.querySelectorAll('a[href]')).map((a) => a.getAttribute('href')).join(' '))
      .join(' ')
    const hits = CLIP_TAIL_KEYWORDS.filter((k) => tailText.includes(k)).length
    if (following.length && hits >= 2) {
      tail = block.outerHTML + following.map((n) => n.outerHTML).join('')
      block.remove()
      following.forEach((n) => n.remove())
    }
  }
  return { main: body.innerHTML, head, tail }
}

/* ============================================================================
 * 붙여넣기 정리 (네이버 카페·블로그, 워드 등에서 복사한 글)
 * ============================================================================
 * - 글꼴·색·크기·배경 같은 외부 서식과 숨은 코드를 모두 걷어내고
 *   문단 / 소제목(H2·H3) / 굵게·기울임·밑줄 / 목록 / 인용구 / 표 / 이미지 / 링크 만 남김
 * - 네이버 스마트에디터의 '소제목' 컴포넌트 → H2, '인용구' 컴포넌트 → blockquote
 * - 네이버가 복사 시 덧붙이는 '[출처] ...' 줄 제거
 * - 이미지는 주소만 남기고, 실제 Cloudinary 이동은 에디터의 reuploadExternalImages 가 처리
 */
const PASTE_BLOCK_TAGS = {
  P: 'p', H1: 'h2', H2: 'h2', H3: 'h3', H4: 'h3', H5: 'h3', H6: 'h3',
  BLOCKQUOTE: 'blockquote', UL: 'ul', OL: 'ol', LI: 'li', HR: 'hr',
  TABLE: 'table', THEAD: 'thead', TBODY: 'tbody', TFOOT: 'tbody', TR: 'tr', TH: 'th', TD: 'td',
}
const PASTE_INLINE_TAGS = { STRONG: 'strong', B: 'strong', EM: 'em', I: 'em', U: 'u' }
const PASTE_DROP_TAGS = new Set([
  'SCRIPT', 'STYLE', 'META', 'LINK', 'TITLE', 'HEAD', 'NOSCRIPT', 'TEMPLATE',
  'IFRAME', 'OBJECT', 'EMBED', 'VIDEO', 'AUDIO', 'CANVAS', 'SVG',
  'BUTTON', 'INPUT', 'SELECT', 'TEXTAREA', 'FORM', 'LABEL',
])
const PASTE_HAS_BLOCK_CHILD = 'p,div,h1,h2,h3,h4,h5,h6,ul,ol,li,table,blockquote,section,article'
// 네이버 스마트에디터 '글쓰기/수정 화면'에서 복사할 때 딸려오는 편집기 UI
// (AI 활용 설정 버튼, '사진 설명을 입력하세요' 안내 문구, 삭제 버튼, 표 편집 메뉴, 숨은 툴바 등)
const PASTE_EDITOR_UI_CLASS =
  /(^|\s)(se-placeholder|__se_placeholder|se-blind|__se-toolbar-slot|se-set-ai-mark-button[\w-]*|se-image-delete-button|se-component-edge-button[\w-]*|se-cell-(controlbar|select|add|context)[\w-]*|se-oglink-thumbnail-delete)(\s|$)/
// 아직 화면에 불러오지 않은 사진 자리에 들어가는 빈 그림 (실제 사진 주소가 복사되지 않음)
const PASTE_PLACEHOLDER_IMG = /^data:image\/(svg\+xml|gif)/i

function sanitizePastedHtml(html) {
  const src = new DOMParser().parseFromString(html, 'text/html').body
  const out = document.createElement('div')

  const cleanText = (t) => (t || '').replace(/[​﻿]/g, '')
  const classOf = (el) => (typeof el.className === 'string' ? el.className : '')
  const isBoldStyle = (el) => {
    const w = (el.style && el.style.fontWeight) || ''
    return w === 'bold' || w === 'bolder' || parseInt(w, 10) >= 600
  }

  /* --- 네이버 서식 살리기: 글자 크기 · 형광펜 · 정렬 --- */
  // 글자 크기: 스마트에디터 클래스(se-fs-fs19, se-fs19) 또는 style font-size(px/pt)
  const declaredSize = (el) => {
    const m = classOf(el).match(/\bse-fs(?:-fs)?(\d{1,2})\b/)
    if (m) return Number(m[1])
    const fs = (el.style && el.style.fontSize) || ''
    const n = parseFloat(fs)
    if (!n) return null
    if (/pt$/i.test(fs)) return Math.round(n * 4 / 3)
    return /px$/i.test(fs) ? n : null
  }
  // 이 글에서 가장 많이 쓰인 크기를 '보통'으로 보고, 그보다 작거나 큰 부분만 작게/크게/아주 크게로
  const sizeChars = {}
  ;(function countSizes(node, inherited) {
    for (const c of Array.from(node.childNodes)) {
      if (c.nodeType === Node.TEXT_NODE) {
        const len = cleanText(c.textContent).trim().length
        if (inherited && len) sizeChars[inherited] = (sizeChars[inherited] || 0) + len
      } else if (c.nodeType === Node.ELEMENT_NODE) {
        countSizes(c, declaredSize(c) || inherited)
      }
    }
  })(src, null)
  const baseSize = Number(Object.keys(sizeChars).sort((a, b) => sizeChars[b] - sizeChars[a])[0]) || 0
  // 이 글의 기본 크기를 툴바 기본 크기 15 로 보고, 비율에 가장 가까운 툴바 크기(11~38)로 바꿈
  const TOOLBAR_SIZES = [11, 13, 15, 16, 19, 24, 28, 30, 34, 38]
  const sizeClass = (px) => {
    if (!baseSize || !px) return 'normal'
    const target = (px / baseSize) * 15
    const nearest = TOOLBAR_SIZES.reduce((a, b) => (Math.abs(b - target) < Math.abs(a - target) ? b : a))
    return nearest === 15 ? 'normal' : String(nearest)
  }
  // 형광펜: 흰색·투명이 아닌 배경색 (네이버는 형광펜이 없는 글자에도 흰 배경을 넣음)
  const isHighlight = (el) => {
    const bg = ((el.style && el.style.backgroundColor) || '').trim()
    if (!bg || /^(transparent|initial|inherit|none)$/i.test(bg)) return false
    const rgb = bg.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?/)
    if (rgb) {
      if (rgb[4] !== undefined && Number(rgb[4]) === 0) return false
      return !(Number(rgb[1]) > 245 && Number(rgb[2]) > 245 && Number(rgb[3]) > 245)
    }
    return !/^(#fff(fff)?|white)$/i.test(bg)
  }
  // 정렬: 스마트에디터 se-text-paragraph-align-center/right 또는 style text-align
  const alignOf = (el) => {
    const m = classOf(el).match(/\bse-text-paragraph-align-(center|right)\b/)
    if (m) return m[1]
    const ta = (el.style && el.style.textAlign) || ''
    return ta === 'center' || ta === 'right' ? ta : null
  }
  // 글자색: 빨강·파랑 같은 강조색만 남기고, 검정·회색·흰색(기본 글자색)은 버림
  // (브라우저가 #ff0000 같은 값도 rgb(…) 로 바꿔 주므로 rgb 형식만 받아 그대로 다시 씀)
  const textColor = (el) => {
    const m = ((el.style && el.style.color) || '').match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)/)
    if (!m) return null
    const [r, g, b] = [m[1], m[2], m[3]].map(Number)
    if (Math.max(r, g, b) - Math.min(r, g, b) < 24) return null
    return `rgb(${r}, ${g}, ${b})`
  }
  // 글자 크기·형광펜·글자색을 <span class="fs-…"> / <mark> / <span style="color"> 로 감싸기
  // (블록을 품은 요소는 감싸지 않음)
  const wrapFormatting = (container, el, ctx) => {
    let inner = container
    let next = ctx
    const color = textColor(el)
    if (color && color !== ctx.color) {
      const span = document.createElement('span')
      span.style.color = color
      inner.appendChild(span)
      inner = span
      next = { ...next, color }
    }
    const px = declaredSize(el)
    if (px) {
      const sc = sizeClass(px)
      if (sc !== ctx.size) {
        const span = document.createElement('span')
        span.className = 'fs-' + sc
        inner.appendChild(span)
        inner = span
      }
      next = { ...next, size: sc }
    }
    if (!next.hl && isHighlight(el)) {
      const mark = document.createElement('mark')
      inner.appendChild(mark)
      inner = mark
      next = { ...next, hl: true }
    }
    return [inner, next]
  }
  const ROOT_CTX = { size: 'normal', hl: false, color: null }

  // 네이버는 한 줄 = 한 문단(p), 빈 줄 = 빈 문단이라 그대로 옮기면 모든 줄 사이가 벌어짐
  // → 빈 줄 사이의 연속된 줄(정렬이 같은 줄)을 한 문단으로 묶고 줄바꿈(<br>)으로 이어 원래 간격을 살림
  src.querySelectorAll('.se-module-text').forEach((mod) => {
    let group = null
    let groupAlign = null
    Array.from(mod.children)
      .filter((c) => c.matches('p.se-text-paragraph'))
      .forEach((p) => {
        const empty = !cleanText(p.textContent).replace(/ /g, ' ').trim() && !p.querySelector('img')
        if (empty) {
          group = null
          p.remove()
          return
        }
        const align = alignOf(p) || 'left'
        if (group && groupAlign === align) {
          group.appendChild(p.ownerDocument.createElement('br'))
          while (p.firstChild) group.appendChild(p.firstChild)
          p.remove()
        } else {
          group = p
          groupAlign = align
        }
      })
  })

  function walk(node, parent, ctx = ROOT_CTX) {
    for (const child of Array.from(node.childNodes)) {
      if (child.nodeType === Node.TEXT_NODE) {
        const text = cleanText(child.textContent)
        if (text) parent.appendChild(document.createTextNode(text))
        continue
      }
      if (child.nodeType !== Node.ELEMENT_NODE) continue // 주석 등 제거
      const tag = child.tagName.toUpperCase()
      if (PASTE_DROP_TAGS.has(tag)) continue
      const cls = classOf(child)
      if (PASTE_EDITOR_UI_CLASS.test(cls)) continue
      if (child.style && child.style.display === 'none') continue // 숨겨진 요소

      // 네이버 스마트에디터: 링크 미리보기 카드 → 제목만 링크로 (링크가 없으면 카드 제거)
      if (/\bse-oglink\b/.test(cls)) {
        const link = child.querySelector('a[href^="http"]')
        const title = child.querySelector('.se-oglink-title')
        if (link) {
          const p = document.createElement('p')
          const a = document.createElement('a')
          a.setAttribute('href', link.getAttribute('href'))
          a.textContent = cleanText((title || link).textContent).replace(/\s+/g, ' ').trim()
          p.appendChild(a)
          parent.appendChild(p)
        }
        continue
      }

      // 네이버 스마트에디터: 소제목 / 인용구 컴포넌트
      if (/\bse-sectionTitle\b/.test(cls)) {
        const h2 = document.createElement('h2')
        h2.textContent = cleanText(child.textContent).replace(/\s+/g, ' ').trim()
        const alignedP = child.querySelector('[class*="se-text-paragraph-align-"]')
        const titleAlign = alignedP && alignOf(alignedP)
        if (titleAlign) h2.className = 'align-' + titleAlign
        parent.appendChild(h2)
        continue
      }
      if (/\bse-quotation\b/.test(cls)) {
        const quote = child.querySelector('.se-quote') || child
        const bq = document.createElement('blockquote')
        bq.textContent = cleanText(quote.textContent).replace(/\s+/g, ' ').trim()
        parent.appendChild(bq)
        continue
      }

      if (tag === 'BR') {
        parent.appendChild(document.createElement('br'))
        continue
      }
      if (tag === 'IMG') {
        // 네이버는 지연 로딩용으로 실제 주소를 data-lazy-src 에 두는 경우가 있음
        const url =
          child.getAttribute('data-lazy-src') || child.getAttribute('data-src') || child.getAttribute('src') || ''
        if (!/^(https?:|data:image\/)/i.test(url)) continue
        const img = document.createElement('img')
        img.setAttribute('src', url)
        img.setAttribute('alt', cleanText(child.getAttribute('alt') || '').trim())
        if (PASTE_PLACEHOLDER_IMG.test(url)) {
          // 사진 주소가 복사되지 않은 자리 → 업로드하지 않고 '불러오지 못함'으로 표시
          img.setAttribute('data-upload-state', 'failed')
          img.setAttribute('data-paste-issue', 'not-loaded')
        }
        parent.appendChild(img)
        continue
      }
      // 네이버 글쓰기 화면의 링크는 <span class="se-link" data-href="..."> 형태
      if (tag === 'A' || (tag === 'SPAN' && /^https?:\/\//i.test(child.getAttribute('data-href') || ''))) {
        const href = child.getAttribute('href') || child.getAttribute('data-href') || ''
        if (!/^https?:\/\//i.test(href)) {
          walk(child, parent, ctx) // 링크가 아닌 것은 글자만 남김
          continue
        }
        const a = document.createElement('a')
        a.setAttribute('href', href)
        const [linkInner, linkCtx] = wrapFormatting(a, child, ctx)
        walk(child, linkInner, linkCtx)
        parent.appendChild(a)
        continue
      }

      let mapped = PASTE_BLOCK_TAGS[tag] || PASTE_INLINE_TAGS[tag] || null
      // div 는 안에 다른 블록이 있으면 껍데기만 벗기고, 글자만 있으면 문단으로
      if (!mapped && (tag === 'DIV' || tag === 'SECTION' || tag === 'ARTICLE')) {
        mapped = child.querySelector(PASTE_HAS_BLOCK_CHILD) ? null : 'p'
      }
      // span 등에 굵게 스타일만 걸린 경우 → strong
      if (!mapped && tag === 'SPAN' && isBoldStyle(child)) mapped = 'strong'

      if (!mapped) {
        // span, font 등은 껍데기만 벗기되, 글자 크기·형광펜은 우리 형식으로 남김
        // (안에 문단 같은 블록을 품은 요소는 감싸면 구조가 깨지므로 그대로 벗김)
        if (child.querySelector(PASTE_HAS_BLOCK_CHILD)) {
          walk(child, parent, ctx)
        } else {
          const [inner, nextCtx] = wrapFormatting(parent, child, ctx)
          walk(child, inner, nextCtx)
        }
        continue
      }
      const el = document.createElement(mapped)
      if ((mapped === 'td' || mapped === 'th') && child.getAttribute('colspan')) {
        el.setAttribute('colspan', child.getAttribute('colspan'))
      }
      if ((mapped === 'td' || mapped === 'th') && child.getAttribute('rowspan')) {
        el.setAttribute('rowspan', child.getAttribute('rowspan'))
      }
      // 문단·소제목 정렬 (가운데·오른쪽)
      const align = /^(p|h2|h3|li|blockquote)$/.test(mapped) ? alignOf(child) : null
      if (align) el.className = 'align-' + align
      // 블록 안 글자 크기·형광펜은 블록 안쪽에서 감쌈
      const isBlock = !PASTE_INLINE_TAGS[tag] && mapped !== 'strong'
      const [inner, nextCtx] =
        isBlock && child.querySelector(PASTE_HAS_BLOCK_CHILD) ? [el, ctx] : wrapFormatting(el, child, ctx)
      walk(child, inner, nextCtx)
      parent.appendChild(el)
    }
  }
  walk(src, out)

  // 빈 문단·빈 소제목·빈 서식 제거 (네이버는 빈 줄을 빈 문단으로 넣음), 단 이미지가 든 문단은 유지
  out.querySelectorAll('span, mark').forEach((el) => {
    if (!el.textContent.trim() && !el.querySelector('img, br')) el.remove()
  })
  out.querySelectorAll('p, h2, h3, blockquote, strong, em, u').forEach((el) => {
    if (!el.textContent.trim() && !el.querySelector('img')) el.remove()
  })
  // 네이버 복사 시 자동으로 붙는 '[출처] 글제목 (카페명) |작성자 닉네임' 줄 제거
  out.querySelectorAll('p').forEach((p) => {
    if (/^\s*\[출처\]/.test(p.textContent)) p.remove()
  })
  return out.innerHTML
}

/* ============================================================================
 * '네이버 글 담기' 즐겨찾기 버튼(북마클릿) — 보내는 쪽
 * ============================================================================
 * 호텔 홈페이지(myry_homepage_hotel public/index.html)의 북마클릿과 같은 코드·같은 전송 규격.
 * 다른 점은 보낼 곳뿐: 정육점 = 이 버튼을 설치한 홈페이지(SITE), 호텔 = https://myhoteltax.com
 * 아래 함수 전체가 즐겨찾기 주소(javascript:…)가 되어 네이버 화면에서 실행됨 → 함수 밖의 것을 쓰면 안 됨
 */
/* 네이버 원본 날짜 → ISO 시각
 * 카페는 밀리초 숫자, 블로그는 화면의 글자('2026. 8. 7. 16:30', '23시간 전', '5분 전', '방금 전')
 * 못 읽거나 하루 넘게 미래면 null */
function naverDateIso(value) {
  const s = String(value == null ? '' : value).trim();
  const now = Date.now();
  const full = s.match(/(\d{4})\.\s*(\d{1,2})\.\s*(\d{1,2})\.?\s*(?:(\d{1,2}):(\d{2}))?/);
  const ago = s.match(/(\d+)\s*(분|시간)\s*전/);
  let t = NaN;
  if (/^\d{12,}$/.test(s)) t = Number(s);
  else if (full) t = new Date(+full[1], full[2] - 1, +full[3], +(full[4] || 0), +(full[5] || 0)).getTime();
  else if (ago) t = now - ago[1] * (ago[2] === '분' ? 60000 : 3600000);
  else if (/방금/.test(s)) t = now;
  return t > 0 && t <= now + 86400000 ? new Date(t).toISOString() : null;
}

// 브라우저 시간 기준 'YYYY-MM-DD' (toISOString 은 UTC 라 오전에 하루 전 날짜가 됨)
function localDateString(date) {
  const p = (n) => String(n).padStart(2, '0');
  return date.getFullYear() + '-' + p(date.getMonth() + 1) + '-' + p(date.getDate());
}

/* --- 발행일 칸: 언제나 날짜가 보임 ---
 * today  : 오늘 날짜 그대로 (저장할 때 값을 보내지 않음 → 처음 저장한 날로 올라감)
 * naver  : 네이버 원본 날짜 / manual : 직접 고른 날짜 (둘 다 저장할 때 보냄)
 * saved  : 저장된 날짜 (보내지 않음 → 그대로 유지)
 * 네이버 날짜는 today 일 때만 채움 → 직접 고른·저장된·먼저 가져온 날짜는 바꾸지 않음 */
function createPublishDate() {
  const field = document.getElementById('f-date');
  const hint = document.getElementById('date-hint');
  if (!field) return null;
  let state = field.dataset.state === 'saved' ? 'saved' : 'today';
  if (state === 'today') field.value = localDateString(new Date());
  let lastValue = field.value;
  const show = (text, isError) => {
    if (!hint) return;
    hint.textContent = text;
    hint.style.color = isError ? '#dc2626' : '';
    hint.style.fontWeight = isError ? '700' : '';
  };
  field.addEventListener('change', () => {
    if (!field.value) return; // 입력 도중이면 칸을 벗어날 때 처리
    state = 'manual';
    lastValue = field.value;
    show('직접 고른 날짜입니다.');
  });
  field.addEventListener('blur', () => {
    if (!field.value) field.value = lastValue; // 칸을 비운 채로 두지 않음
  });
  return {
    applyNaver(raw) {
      if (state !== 'today') return;
      const iso = naverDateIso(raw);
      if (!iso) {
        show('네이버 날짜를 읽지 못했습니다. 날짜를 직접 골라 주세요.', true);
        return;
      }
      state = 'naver';
      field.value = localDateString(new Date(iso));
      lastValue = field.value;
      show('네이버에 올라간 날짜입니다.');
      field.dispatchEvent(new Event('input', { bubbles: true })); // 저장 안 하고 나가기 경고용
    },
    forSave() {
      return state === 'naver' || state === 'manual' ? field.value || lastValue : '';
    },
    markSaved(date) {
      state = 'saved';
      if (date) {
        field.value = date;
        lastValue = date;
      }
      show('저장된 발행일입니다.');
    },
  };
}

function naverClipBookmarklet(SITE) {
  const old = document.getElementById('myry-naver-clip');
  if (old) old.remove();
  const host = document.createElement('div');
  host.id = 'myry-naver-clip';
  host.style.cssText = 'position:fixed;top:16px;right:16px;z-index:2147483647;';
  const root = host.attachShadow({ mode: 'open' });
  root.innerHTML = '<style>' +
    '.box{width:330px;font:14px/1.6 "Malgun Gothic",sans-serif;color:#2c1e40;background:#fff;border:2px solid #3d2b56;border-radius:14px;box-shadow:0 12px 32px rgba(0,0,0,.25);overflow:hidden}' +
    '.top{display:flex;justify-content:space-between;align-items:center;padding:10px 14px;background:#3d2b56;color:#fff;font-weight:700}' +
    '.top button{background:none;border:0;color:#fff;font-size:22px;cursor:pointer;line-height:1}' +
    '.body{padding:12px 14px}.msg{word-break:keep-all}.msg b{display:block;margin-bottom:2px}.err{color:#b3261e}' +
    '.btn{display:block;width:100%;margin-top:8px;padding:9px;border-radius:8px;border:1.5px solid #3d2b56;font:700 14px "Malgun Gothic",sans-serif;cursor:pointer}' +
    '.send{background:#3d2b56;color:#fff}.btn:disabled{opacity:.5;cursor:default}' +
    '.send[data-to="hotel"]{background:#3d2b56;border-color:#3d2b56}' +
    '.send[data-to="meat"]{background:#9A2A2A;border-color:#9A2A2A}' +
    '.hint{margin:10px 0 0;font-size:12px;color:#6b5a85;word-break:keep-all}' +
    '</style><div class="box"><div class="top"><span>명륜세무회계 · 네이버 글 담기</span><button type="button" class="x" aria-label="닫기">×</button></div>' +
    '<div class="body"><div class="msg">글을 읽는 중…</div><div class="act" hidden>' +
    '<button type="button" class="btn send" data-to="meat">정육점 홈페이지로 보내기</button>' +
    '<button type="button" class="btn send" data-to="hotel">호텔 홈페이지로 보내기</button>' +
    '<p class="hint">누르면 그 홈페이지 글쓰기가 새 탭으로 열리고 글이 자동으로 들어갑니다. 구분선 아래 홍보 영역은 빠지고, 사진은 Cloudinary 로 옮겨집니다.</p>' +
    '</div></div></div>';
  // 보낼 곳: 정육점 = 이 버튼을 설치한 홈페이지(실제 사이트에서 설치하면 https://jung6tax.com), 호텔 = https://myhoteltax.com
  const TARGETS = { meat: { url: SITE, name: '정육점 홈페이지' }, hotel: { url: 'https://myhoteltax.com', name: '호텔 홈페이지' } };
  document.body.appendChild(host);
  const $ = (s) => root.querySelector(s);
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const say = (html, isErr) => { $('.msg').innerHTML = html; $('.msg').classList.toggle('err', !!isErr); };
  $('.x').onclick = () => host.remove();
  const frame = (sel) => { try { const f = document.querySelector(sel); return f && f.contentWindow && f.contentWindow.location.href ? f : null; } catch (e) { return null; } };

  // 카페: 글 번호를 찾아 카페 글 API 를 내 로그인으로 호출 (화면에 안 띄운 사진도 실제 주소가 들어 있음)
  async function readCafe() {
    let p = null;
    const f = frame('iframe#cafe_main');
    for (const raw of [f ? f.contentWindow.location.href : '', location.href]) {
      if (!raw || p) continue;
      const u = new URL(raw);
      const inner = decodeURIComponent(u.searchParams.get('iframe_url_utf8') || u.searchParams.get('iframe_url') || '') + '&' + u.search;
      const club = inner.match(/clubid=(\d+)/i), art = inner.match(/articleid=(\d+)/i);
      let m = u.pathname.match(/\/cafes\/([A-Za-z0-9_-]+)\/articles\/(\d+)/);
      if (m) p = { cafe: m[1], byId: /^\d+$/.test(m[1]), id: m[2] };
      else if (club && art) p = { cafe: club[1], byId: true, id: art[1] };
      else if ((m = u.pathname.match(/^\/([A-Za-z0-9_-]+)\/(\d+)\/?$/))) p = { cafe: m[1], byId: false, id: m[2] };
    }
    if (!p) throw new Error('카페 글 번호를 찾지 못했습니다. 글을 열어 둔 화면에서 눌러 주세요.');
    const res = await fetch('https://apis.naver.com/cafe-web/cafe-articleapi/v2.1/cafes/' + encodeURIComponent(p.cafe) +
      '/articles/' + p.id + '?useCafeId=' + p.byId, { credentials: 'include' });
    const json = await res.json().catch(() => null);
    const a = json && json.result && json.result.article;
    if (!a || !a.contentHtml) {
      const why = (json && json.result && (json.result.reason || json.result.message)) || 'HTTP ' + res.status;
      throw new Error('카페 글을 읽지 못했습니다 (' + why + '). 네이버에 로그인했는지, 이 카페 회원인지 확인해 주세요.');
    }
    const t = document.createElement('textarea');
    t.innerHTML = a.subject || '';
    // 원본 주소는 늘 같은 모양으로 (홈페이지가 중복 글을 찾을 때 씀)
    const src = 'https://cafe.naver.com/ca-fe/cafes/' + (json.result.cafeId || p.cafe) + '/articles/' + (json.result.articleId || p.id);
    return { title: t.value, html: a.contentHtml, sourceUrl: src, sourceDate: a.writeDate || '' };
  }
  // 블로그: 열린 화면(또는 안쪽 글 창)의 본문, 없으면 같은 블로그 주소에서 글을 다시 읽음
  async function readBlog() {
    let blogId = '', logNo = '';
    const f = frame('iframe#mainFrame');
    for (const raw of [f ? f.contentWindow.location.href : '', location.href]) {
      if (!raw || logNo) continue;
      const u = new URL(raw);
      const m = u.pathname.match(/^\/([A-Za-z0-9_-]+)\/(\d+)\/?$/);
      blogId = u.searchParams.get('blogId') || (m ? m[1] : '');
      logNo = u.searchParams.get('logNo') || (m ? m[2] : '');
    }
    const pick = (d) => {
      if (!d) return null;
      const scope = (logNo && d.getElementById('post-view' + logNo)) || d;
      const main = scope.querySelector('.se-main-container') || scope.querySelector('#postViewArea');
      if (!main) return null;
      const te = scope.querySelector('.se-title-text, .se_title .se_textarea, .pcol1, .tit_h3');
      const og = d.querySelector('meta[property="og:title"]');
      const dateSel = '[class^="se_publishDate"], [class*=" se_publishDate"]';
      const de = scope.querySelector(dateSel) || d.querySelector(dateSel);
      return { title: ((te && te.textContent) || (og && og.content) || '').replace(/\s+/g, ' ').trim(), html: main.outerHTML,
               sourceDate: ((de && de.textContent) || '').trim() };
    };
    let r = pick(f && f.contentDocument) || pick(document);
    if (!r && blogId && logNo) {
      const res = await fetch(location.origin + '/PostView.naver?blogId=' + encodeURIComponent(blogId) + '&logNo=' + logNo +
        '&redirect=Dlog&widgetTypeCall=true&directAccess=false', { credentials: 'include' });
      r = pick(new DOMParser().parseFromString(await res.text(), 'text/html'));
    }
    if (!r) throw new Error('블로그 글 본문을 찾지 못했습니다. 글을 열어 둔 화면에서 눌러 주세요.');
    r.sourceUrl = blogId && logNo ? 'https://blog.naver.com/' + blogId + '/' + logNo : '';
    return r;
  }

  // target = 보낼 홈페이지 주소(origin), name = 안내용 이름. 받는 쪽이 답(ack)할 때까지 0.4초마다 보냄 (최대 60초)
  function send(clip, target, name) {
    const w = window.open(target + '/#naver-clip', '_blank');
    if (!w) { say('새 탭이 막혔습니다. 주소창 오른쪽의 팝업 차단 표시를 눌러 허용한 뒤 다시 눌러 주세요.', true); return; }
    const buttons = root.querySelectorAll('.send');
    buttons.forEach((b) => { b.disabled = true; });
    say(name + '로 보내는 중… (새 탭)');
    let done = false;
    const started = Date.now();
    const onAck = (e) => {
      if (e.origin !== target || !e.data || e.data.type !== 'myry-naver-clip-ack' || e.data.id !== clip.id) return;
      done = true;
      window.removeEventListener('message', onAck);
      buttons.forEach((b) => { b.disabled = false; });
      say('<b>' + name + '로 보냈습니다.</b>새 탭의 글쓰기를 확인해 주세요. 관리자 로그인이 안 돼 있으면 로그인하는 즉시 들어갑니다.');
    };
    window.addEventListener('message', onAck);
    const timer = setInterval(() => {
      if (done) { clearInterval(timer); return; }
      if (w.closed || Date.now() - started > 60000) {
        clearInterval(timer);
        window.removeEventListener('message', onAck);
        buttons.forEach((b) => { b.disabled = false; });
        say(name + '에 전달하지 못했습니다. 새 탭에 홈페이지 글쓰기가 열렸는지 확인한 뒤 다시 눌러 주세요.', true);
        return;
      }
      try { w.postMessage(clip, target); } catch (e) {}
    }, 400);
  }

  const isCafe = /(^|\.)cafe\.naver\.com$/.test(location.hostname);
  const isBlog = /(^|\.)blog\.naver\.com$/.test(location.hostname);
  if (!isCafe && !isBlog) { say('네이버 카페·블로그 글을 연 화면에서 눌러 주세요.', true); return; }
  (isCafe ? readCafe() : readBlog()).then((r) => {
    const d = new DOMParser().parseFromString(r.html, 'text/html');
    d.querySelectorAll('img').forEach((img) => {
      const real = img.getAttribute('data-lazy-src') || img.getAttribute('data-src') || '';
      if (/^https?:\/\//.test(real)) img.setAttribute('src', real);
    });
    const photos = [...d.querySelectorAll('img')].filter((img) =>
      !img.closest('.se-module-oglink, .se-sticker, .se-module-sticker') && /^https?:/.test(img.getAttribute('src') || '')).length;
    const clip = { type: 'myry-naver-clip', id: Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
                   title: r.title, html: d.body.innerHTML, source: location.href, sourceUrl: r.sourceUrl || '', sourceDate: r.sourceDate || '' };
    say('<b>' + esc(r.title || '(제목 없음)') + '</b>사진 ' + photos + '장을 포함해 글을 담았습니다. 보낼 홈페이지를 고르세요.');
    $('.act').hidden = false;
    root.querySelectorAll('.send').forEach((b) => {
      const t = TARGETS[b.dataset.to];
      b.onclick = () => send(clip, t.url, t.name);
    });
  }).catch((e) => say(esc((e && e.message) || e), true));
}

// 즐겨찾기 주소로 만들기 (줄 주석·들여쓰기를 빼서 짧게). SITE = 지금 이 홈페이지
function naverClipHref() {
  const src = naverClipBookmarklet.toString().replace(/^\s*\/\/.*$/gm, '').replace(/\n\s*/g, '\n');
  return 'javascript:' + encodeURIComponent('(' + src + ')(' + JSON.stringify(window.location.origin) + ');void 0');
}

document.addEventListener('DOMContentLoaded', () => {
  /* ===== '네이버 글 담기' 버튼 설치 안내 (글쓰기 화면) ===== */
  const clipBookmarklet = document.getElementById('clipBookmarklet')
  if (clipBookmarklet) {
    clipBookmarklet.href = naverClipHref()
    clipBookmarklet.addEventListener('click', (e) => {
      e.preventDefault()
      alert('이 버튼은 누르는 게 아니라 즐겨찾기 막대로 끌어다 놓는 버튼이에요.\n(Ctrl + Shift + B 로 즐겨찾기 막대를 먼저 보이게 하세요.)')
    })
    const clipSite = document.getElementById('clipSite')
    if (clipSite) clipSite.textContent = window.location.origin
    const copyBtn = document.getElementById('clipCopyCode')
    if (copyBtn) {
      copyBtn.addEventListener('click', async () => {
        try {
          await navigator.clipboard.writeText(clipBookmarklet.href)
          alert('버튼 코드를 복사했습니다. 즐겨찾기 막대 빈 곳을 오른쪽 클릭 → ‘페이지 추가’ → 이름에 ‘네이버 글 담기’, URL 칸에 Ctrl+V 하세요.')
        } catch (err) {
          alert('복사하지 못했습니다. 위의 초록색 버튼을 즐겨찾기 막대로 끌어다 놓아 주세요.')
        }
      })
    }
  }

  /* ===== 로그인 페이지 ===== */
  const loginPage = document.getElementById('google-login-btn')

  // 로그인 에러 메시지 처리 (콜백 리다이렉트 시 ?error= 파라미터)
  const urlParams = new URLSearchParams(window.location.search)
  const errorParam = urlParams.get('error')
  if (errorParam) {
    const errorEl = document.getElementById('login-error')
    const errorMsg = document.getElementById('login-error-msg')
    if (errorEl) errorEl.classList.remove('hidden')
    if (errorMsg) {
      const messages = {
        google_denied: 'Google 로그인이 취소되었습니다.',
        no_code: '인증 코드를 받지 못했습니다. 다시 시도해 주세요.',
      }
      errorMsg.textContent = messages[errorParam] || decodeURIComponent(errorParam)
    }
  }

  // Google 로그인 버튼은 <a href="/api/auth/google"> 링크이므로 별도 처리 불필요
  // (클릭 시 서버에서 Google 인증 페이지로 리다이렉트)

  /* ===== 네이버 글 담기: 로그인 전에 받은 글 이어 받기 =====
   * 로그인 화면: "로그인하면 자동으로 채워집니다" 안내
   * 로그인 후 도착하는 칼럼 관리 목록: 바로 새 글 작성 화면으로
   */
  let hasPendingClip = false
  try {
    hasPendingClip = !!sessionStorage.getItem('myryNaverClip')
  } catch (e) {}
  if (hasPendingClip && loginPage) {
    const notice = document.createElement('div')
    notice.className = 'mb-4 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800 text-left'
    notice.innerHTML =
      '<i class="fas fa-paper-plane mr-1"></i> <b>네이버에서 보낸 글이 기다리고 있습니다.</b><br>' +
      '관리자로 로그인하면 글쓰기 화면에 자동으로 채워집니다.'
    loginPage.parentNode.insertBefore(notice, loginPage)
  } else if (hasPendingClip && /^\/admin\/column\/?$/.test(location.pathname)) {
    location.replace('/admin/column/new#naver-clip')
    return
  }

  /* ===== 관리자 페이지 접근 제어 ===== */
  // 서버에서 쿠키 인증을 처리하므로, 클라이언트에서는 별도 토큰 관리 불필요
  // 401 응답 시 자동으로 로그인 페이지로 리다이렉트

  /* ===== 로그아웃 ===== */
  const logoutBtn = document.getElementById('admin-logout')
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      try {
        await fetch('/api/auth/logout', {
          method: 'POST',
          credentials: 'same-origin',
        })
      } catch (e) {
        // 에러가 나도 로그인 페이지로 이동
      }
      window.location.href = '/admin/column/login'
    })
  }


  /* ===== 칼럼 삭제 ===== */
  const deleteBtns = document.querySelectorAll('.admin-delete-btn')
  deleteBtns.forEach((btn) => {
    btn.addEventListener('click', async () => {
      const id = btn.getAttribute('data-id')
      const title = btn.getAttribute('data-title')
      if (!confirm(`정말로 이 칼럼을 삭제하시겠습니까?\n\n제목: ${title}`)) return

      const originalHtml = btn.innerHTML
      btn.disabled = true
      btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 삭제 중...'

      try {
        const res = await fetch('/api/admin/column/' + id, {
          method: 'DELETE',
          credentials: 'same-origin',
        })
        const data = await res.json()
        if (res.ok && data.ok) {
          alert('칼럼이 삭제되었습니다.')
          window.location.reload()
        } else {
          if (res.status === 401) {
            window.location.href = '/admin/column/login'
            return
          }
          alert(data.error || '삭제에 실패했습니다.')
          btn.disabled = false
          btn.innerHTML = originalHtml
        }
      } catch (err) {
        alert('서버 연결에 실패했습니다.')
        btn.disabled = false
        btn.innerHTML = originalHtml
      }
    })
  })

  /* ===== 리치 텍스트 에디터 ===== */
  const publishDate = createPublishDate()
  const editor = document.getElementById('f-content')
  const hiddenContent = document.getElementById('f-content-hidden')
  let getEditorHtmlForSave = () => (editor ? editor.innerHTML : '')

  if (editor) {
    /* ===== 글쓰기 툴바 (네이버 스마트에디터처럼) =====
     * [본문▾][기본서체▾][15▾] | B I U S | 글자색 배경색 | 정렬▾ 줄간격▾ | ※ 링크 | 목록 사진 표
     * 툴바 버튼을 누를 때 본문의 선택 영역이 풀리지 않도록 mousedown 기본 동작을 막음
     */
    const toolbar = document.getElementById('editor-toolbar')
    const SIZE_SPAN_SELECTOR = 'span[class^="fs-"], span[class*=" fs-"]'
    const unwrapEl = (el) => {
      while (el.firstChild) el.parentNode.insertBefore(el.firstChild, el)
      el.remove()
    }
    const changed = () => editor.dispatchEvent(new Event('input', { bubbles: true }))
    const selectionInEditor = () => {
      const sel = window.getSelection()
      return sel && sel.rangeCount > 0 && editor.contains(sel.anchorNode) ? sel : null
    }
    const ensureEditorSelection = () => {
      if (!selectionInEditor()) editor.focus()
      return selectionInEditor()
    }
    const exec = (cmd, value, css = true) => {
      ensureEditorSelection()
      document.execCommand('styleWithCSS', false, css)
      document.execCommand(cmd, false, value == null ? null : value)
    }

    // 글자 크기: execCommand('fontSize') 로 선택 범위를 <font size="7"> 로 표시한 뒤 <span class="fs-숫자"> 로 바꿈
    // (선택 없이 누르면 이어서 입력하는 글자에 적용)
    let pendingSize = null
    const convertSizeMarkers = (size) => {
      editor.querySelectorAll('font[size="7"]').forEach((font) => {
        font.querySelectorAll(SIZE_SPAN_SELECTOR).forEach(unwrapEl) // 안쪽 크기는 지움 (겹쳐 커지지 않게)
        const span = document.createElement('span')
        span.className = 'fs-' + size
        while (font.firstChild) span.appendChild(font.firstChild)
        font.replaceWith(span)
      })
      // 기본 크기(15)는 다른 크기 안에 있을 때만 표시가 필요
      editor.querySelectorAll('span.fs-15, span.fs-normal').forEach((span) => {
        if (!span.parentElement.closest('[class*="fs-"]')) unwrapEl(span)
      })
      editor.querySelectorAll(SIZE_SPAN_SELECTOR).forEach((span) => {
        if (!span.textContent && !span.querySelector('img')) span.remove()
      })
    }
    const applySize = (size) => {
      const sel = ensureEditorSelection()
      document.execCommand('styleWithCSS', false, false)
      document.execCommand('fontSize', false, '7')
      if (sel && sel.isCollapsed) pendingSize = size
      else convertSizeMarkers(size)
    }
    editor.addEventListener('input', () => {
      if (pendingSize && editor.querySelector('font[size="7"]')) {
        convertSizeMarkers(pendingSize)
        pendingSize = null
      }
    })

    // 선택한 문단들 (줄간격용)
    const BLOCK_SELECTOR = 'p, h2, h3, li, blockquote'
    const selectedBlocks = () => {
      const sel = selectionInEditor()
      if (!sel) return []
      const range = sel.getRangeAt(0)
      let blocks = Array.from(editor.querySelectorAll(BLOCK_SELECTOR)).filter(
        (b) => range.intersectsNode(b) && !b.querySelector(BLOCK_SELECTOR)
      )
      if (!blocks.length) {
        const node = sel.anchorNode.nodeType === 1 ? sel.anchorNode : sel.anchorNode.parentElement
        const b = node && node.closest(BLOCK_SELECTOR)
        if (b && editor.contains(b)) blocks = [b]
      }
      return blocks
    }

    const runToolbarAction = (action, value) => {
      switch (action) {
        case 'para':
          exec('formatBlock', value, false)
          break
        case 'font':
          exec('fontName', value || '"Noto Sans KR", sans-serif')
          break
        case 'size':
          applySize(value)
          break
        case 'color': {
          exec('foreColor', value || '#3d3d3d')
          const bar = document.getElementById('tb-color-bar')
          if (bar && value) bar.style.background = value
          break
        }
        case 'bg':
          exec('hiliteColor', value || 'transparent')
          if (!value) {
            // 네이버에서 가져온 형광펜(<mark>)도 함께 지움
            const sel = selectionInEditor()
            if (sel) {
              const range = sel.getRangeAt(0)
              editor.querySelectorAll('mark').forEach((m) => {
                if (range.intersectsNode(m)) unwrapEl(m)
              })
            }
          }
          break
        case 'align':
          exec(value)
          selectedBlocks().forEach((b) => b.classList.remove('align-center', 'align-right'))
          break
        case 'lh': {
          let blocks = selectedBlocks()
          if (!blocks.length) {
            exec('formatBlock', 'p', false)
            blocks = selectedBlocks()
          }
          blocks.forEach((b) => {
            b.style.lineHeight = value
          })
          break
        }
        case 'symbol':
          exec('insertText', value)
          break
      }
      changed()
      updateToolbarState()
    }

    // 툴바 상태 표시 (지금 커서가 있는 곳의 문단 스타일·서체·크기·정렬, 굵게 등 켜짐 여부)
    const FONT_LABELS = [
      ['nanum gothic', '나눔고딕'],
      ['nanum myeongjo', '나눔명조'],
      ['gowun dodum', '고운돋움'],
      ['gowun batang', '고운바탕'],
      ['nanum pen script', '나눔손글씨 펜'],
    ]
    const OLD_SIZE_CLASSES = { sm: 13, normal: 15, lg: 19, xl: 24 }
    const updateToolbarState = () => {
      if (!toolbar) return
      const sel = selectionInEditor()
      if (!sel) return
      toolbar.querySelectorAll('.tb-btn[data-cmd]').forEach((b) => {
        let on = false
        try {
          on = document.queryCommandState(b.dataset.cmd)
        } catch (e) {}
        b.classList.toggle('is-active', on)
      })
      const el = sel.anchorNode.nodeType === 1 ? sel.anchorNode : sel.anchorNode.parentElement
      if (!el) return
      const block = el.closest('h2, h3, blockquote, p, li')
      const tag = block && editor.contains(block) ? block.tagName : 'P'
      const para = { H2: '소제목', H3: '작은 소제목', BLOCKQUOTE: '인용구' }[tag] || '본문'
      const paraLabel = document.getElementById('tb-para-label')
      if (paraLabel) paraLabel.textContent = para

      const sizeEl = el.closest('[class*="fs-"]')
      let size = 15
      if (sizeEl && editor.contains(sizeEl)) {
        const m = sizeEl.className.match(/\bfs-(\d+|sm|normal|lg|xl)\b/)
        if (m) size = /^\d+$/.test(m[1]) ? Number(m[1]) : OLD_SIZE_CLASSES[m[1]]
      }
      const sizeLabel = document.getElementById('tb-size-label')
      if (sizeLabel) sizeLabel.textContent = String(size)

      const family = getComputedStyle(el).fontFamily.toLowerCase()
      const font = FONT_LABELS.find(([key]) => family.includes(key))
      const fontLabel = document.getElementById('tb-font-label')
      if (fontLabel) fontLabel.textContent = font ? font[1] : '기본서체'

      const align = block ? getComputedStyle(block).textAlign : 'left'
      const alignIcon = document.getElementById('tb-align-icon')
      if (alignIcon) {
        alignIcon.className =
          'fas ' + ({ center: 'fa-align-center', right: 'fa-align-right', justify: 'fa-align-justify' }[align] || 'fa-align-left')
      }
    }

    if (toolbar) {
      const closeMenus = () => toolbar.querySelectorAll('.tb-menu').forEach((m) => m.classList.add('hidden'))
      // 툴바를 눌러도 본문 선택 영역이 유지되도록
      toolbar.addEventListener('mousedown', (e) => {
        if (e.target.closest('button')) e.preventDefault()
      })
      // 드롭다운 열기/닫기
      toolbar.querySelectorAll('[data-menu]').forEach((btn) => {
        btn.addEventListener('click', (e) => {
          e.preventDefault()
          const menu = document.getElementById(btn.dataset.menu)
          const willOpen = menu && menu.classList.contains('hidden')
          closeMenus()
          if (willOpen) menu.classList.remove('hidden')
        })
      })
      document.addEventListener('click', (e) => {
        if (!e.target.closest('#editor-toolbar')) closeMenus()
      })
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeMenus()
      })
      // 메뉴 항목 (문단·서체·크기·색·정렬·줄간격·특수문자)
      toolbar.querySelectorAll('[data-action]').forEach((item) => {
        item.addEventListener('click', (e) => {
          e.preventDefault()
          runToolbarAction(item.dataset.action, item.dataset.value)
          closeMenus()
        })
      })
      // 굵게·기울임·밑줄·취소선·목록
      toolbar.querySelectorAll('.tb-btn[data-cmd]').forEach((btn) => {
        btn.addEventListener('click', (e) => {
          e.preventDefault()
          exec(btn.dataset.cmd, null, false)
          changed()
          updateToolbarState()
        })
      })
      // 링크
      const linkBtn = document.getElementById('tb-link')
      if (linkBtn) {
        linkBtn.addEventListener('click', (e) => {
          e.preventDefault()
          const sel = ensureEditorSelection()
          const range = sel && sel.rangeCount ? sel.getRangeAt(0).cloneRange() : null
          const url = (prompt('링크 주소를 입력하세요', 'https://') || '').trim()
          if (!url || url === 'https://') return
          if (!/^https?:\/\//i.test(url)) {
            alert('http:// 또는 https:// 로 시작하는 주소만 넣을 수 있습니다.')
            return
          }
          editor.focus()
          if (range) {
            const s = window.getSelection()
            s.removeAllRanges()
            s.addRange(range)
          }
          if (!range || range.collapsed) {
            // 선택한 글자가 없으면 주소를 그대로 링크 글자로 넣음 (insertHTML 은 불필요한 글자 크기를 붙이므로 직접 삽입)
            const a = document.createElement('a')
            a.href = url
            a.textContent = url
            const at = range || document.createRange()
            if (!range) {
              at.selectNodeContents(editor)
              at.collapse(false)
            }
            at.insertNode(a)
            const after = document.createRange()
            after.setStartAfter(a)
            after.collapse(true)
            const s = window.getSelection()
            s.removeAllRanges()
            s.addRange(after)
          } else {
            exec('createLink', url, false)
          }
          changed()
        })
      }
      document.addEventListener('selectionchange', updateToolbarState)
    }

    // 이미지 삽입 (Cloudinary 업로드)
    const insertImageBtn = document.getElementById('insert-image-btn')
    const imageInput = document.getElementById('content-image-input')
    if (insertImageBtn && imageInput) {
      insertImageBtn.addEventListener('click', () => imageInput.click())
      imageInput.addEventListener('change', async (e) => {
        const file = e.target.files[0]
        if (!file) return
        // 파일 크기 사전 검증 (10MB 제한)
        if (file.size > 10 * 1024 * 1024) {
          alert('이미지 크기는 10MB 이하여야 합니다.')
          e.target.value = ''
          return
        }
        // 업로드 중 UI
        const originalHtml = insertImageBtn.innerHTML
        insertImageBtn.disabled = true
        insertImageBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>'
        try {
          const url = await uploadToCloudinary(file)
          editor.focus()
          const altText = `정육점 세무 관련 이미지 - ${file.name.replace(/\.[^.]+$/, '')}`
          document.execCommand(
            'insertHTML',
            false,
            `<img src="${url}" alt="${altText}" style="max-width:100%;border-radius:0.75rem;margin:1.5rem 0;" />`
          )
        } catch (err) {
          alert('이미지 업로드에 실패했습니다: ' + (err.message || '서버 오류'))
        } finally {
          insertImageBtn.disabled = false
          insertImageBtn.innerHTML = originalHtml
          e.target.value = '' // 같은 파일 재선택 가능하도록 초기화
        }
      })
    }

    // 표 삽입
    const insertTableBtn = document.getElementById('insert-table-btn')
    if (insertTableBtn) {
      insertTableBtn.addEventListener('click', () => {
        editor.focus()
        const rows = 3
        const cols = 3
        let html = '<table><thead><tr>'
        for (let c = 0; c < cols; c++) html += `<th>헤더 ${c + 1}</th>`
        html += '</tr></thead><tbody>'
        for (let r = 0; r < rows; r++) {
          html += '<tr>'
          for (let c = 0; c < cols; c++) html += '<td>내용</td>'
          html += '</tr>'
        }
        html += '</tbody></table>'
        document.execCommand('insertHTML', false, html)
      })
    }

    /* ===== 붙여넣기: 서식 정리 + 외부 이미지 Cloudinary 이동 ===== */
    const pasteStatus = document.getElementById('paste-status')
    const pastedFiles = new Map() // 붙여넣은 이미지 파일 (blob: 주소 → File)

    const showPasteStatus = (type, text) => {
      if (!pasteStatus) return
      if (!text) {
        pasteStatus.classList.add('hidden')
        return
      }
      pasteStatus.className =
        'mb-3 text-xs rounded-lg px-3 py-2 ' +
        (type === 'error' ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-gold-soft text-navy border border-gold/40')
      pasteStatus.innerHTML = text
    }

    const updatePasteStatus = () => {
      const uploading = editor.querySelectorAll('img[data-upload-state="uploading"]').length
      const failed = editor.querySelectorAll('img[data-upload-state="failed"]').length
      const notLoaded = editor.querySelectorAll('img[data-paste-issue="not-loaded"]').length
      if (uploading) {
        showPasteStatus('info', `<i class="fas fa-spinner fa-spin mr-1"></i> 붙여넣은 이미지 ${uploading}개를 Cloudinary로 옮기는 중입니다. 완료될 때까지 저장을 기다려 주세요.`)
      } else if (notLoaded) {
        showPasteStatus(
          'error',
          `<i class="fas fa-triangle-exclamation mr-1"></i> 사진 ${notLoaded}개는 주소가 복사되지 않았습니다 (빨간 테두리).` +
            `<br>네이버 <b>글쓰기·수정 화면</b>에서는 아직 화면에 나오지 않은 사진이 복사되지 않습니다.` +
            `<br>카페의 <b>게시글 보기 화면</b>에서 <b>맨 아래까지 천천히 스크롤</b>해 사진을 모두 띄운 뒤 다시 복사해 주세요.` +
            (failed > notLoaded ? `<br>그 밖에 ${failed - notLoaded}개는 옮기지 못했습니다. 원본을 저장한 뒤 이미지 버튼으로 다시 넣어 주세요.` : '')
        )
      } else if (failed) {
        showPasteStatus('error', `<i class="fas fa-triangle-exclamation mr-1"></i> 이미지 ${failed}개를 옮기지 못했습니다 (빨간 테두리). 원본 이미지를 PC에 저장한 뒤, 해당 이미지를 지우고 툴바의 이미지 버튼으로 다시 넣어 주세요.`)
      } else {
        showPasteStatus('', '')
      }
    }

    // 에디터 안의 외부 이미지(네이버 등)·붙여넣은 이미지 파일을 Cloudinary로 옮기고 주소 교체
    const isCloudinaryUrl = (url) => /^https:\/\/res\.cloudinary\.com\//.test(url)
    const reuploadExternalImages = async () => {
      const targets = Array.from(editor.querySelectorAll('img')).filter((img) => {
        const src = img.getAttribute('src') || ''
        return !isCloudinaryUrl(src) && !img.hasAttribute('data-upload-state')
      })
      if (!targets.length) return
      targets.forEach((img) => img.setAttribute('data-upload-state', 'uploading'))
      updatePasteStatus()

      const uploadOne = async (img) => {
        const src = img.getAttribute('src') || ''
        try {
          const source = src.startsWith('blob:') ? pastedFiles.get(src) : src
          if (!source) throw new Error('이미지를 읽을 수 없습니다.')
          if (typeof source !== 'string' && source.size > 10 * 1024 * 1024) {
            throw new Error('10MB를 넘는 이미지입니다.')
          }
          // 인터넷 주소 사진은 서버를 거쳐 정육점 폴더로 (서버에 키가 없으면 기존 방식)
          let url = /^https?:\/\//i.test(String(source)) ? await importImageViaServer(source) : null
          if (!url) url = await uploadToCloudinary(source)
          img.setAttribute('src', url)
          img.removeAttribute('data-upload-state')
          if (src.startsWith('blob:')) {
            URL.revokeObjectURL(src)
            pastedFiles.delete(src)
          }
        } catch (err) {
          console.warn('pasted image upload failed:', src.slice(0, 120), err)
          img.setAttribute('data-upload-state', 'failed')
        }
        updatePasteStatus()
      }

      // 동시에 3개씩 업로드
      const queue = targets.slice()
      const workers = Array.from({ length: Math.min(3, queue.length) }, async () => {
        while (queue.length) await uploadOne(queue.shift())
      })
      await Promise.all(workers)
      syncContent()
    }

    editor.addEventListener('paste', (e) => {
      const cd = e.clipboardData
      if (!cd) return
      const html = cd.getData('text/html')
      const imageFiles = Array.from(cd.files || []).filter((f) => f.type.startsWith('image/'))
      if (!html && !imageFiles.length) return // 순수 텍스트는 브라우저 기본 붙여넣기 (서식 없음)

      e.preventDefault()
      editor.focus()
      if (html) {
        document.execCommand('insertHTML', false, sanitizePastedHtml(html))
      } else {
        // 캡처 화면 등 이미지 파일만 붙여넣은 경우
        const imgs = imageFiles
          .map((file) => {
            const blobUrl = URL.createObjectURL(file)
            pastedFiles.set(blobUrl, file)
            return `<img src="${blobUrl}" alt="">`
          })
          .join('')
        document.execCommand('insertHTML', false, imgs)
      }
      syncContent()
      reuploadExternalImages()
    })

    /* ===== 네이버 글 담기로 받은 글 채우기 =====
     * naver-clip.js 가 sessionStorage('myryNaverClip')에 보관한 글을 꺼내
     * 원본 주소 중복 확인 → 제목(비어 있을 때만) → 꼬리말 빼기 → 본문 정리 후 넣기 → 사진 옮기기
     */
    const clipStatus = document.getElementById('clip-status')
    const showClipStatus = (html) => {
      if (!clipStatus) return
      clipStatus.className = 'mb-3 text-xs rounded-lg px-3 py-2 bg-green-50 text-green-800 border border-green-200'
      clipStatus.innerHTML = html
    }
    const editorIsEmpty = () => !editor.textContent.trim() && !editor.querySelector('img, table')

    window.applyNaverClip = async () => {
      let clip = null
      try {
        clip = JSON.parse(sessionStorage.getItem('myryNaverClip') || 'null')
      } catch (e) {}
      if (!clip || typeof clip.html !== 'string') return
      try {
        sessionStorage.removeItem('myryNaverClip')
      } catch (e) {}

      const form = document.getElementById('column-form')
      const idField = form && form.querySelector('[name="id"]')
      const sourceField = form && form.querySelector('[name="source_url"]')
      const titleField = document.getElementById('f-title')

      // 1) 원본 주소 (예전 버튼은 source 만 보냄) → 이미 등록된 글인지 확인
      const sourceUrl = canonicalNaverUrl(clip.sourceUrl) || canonicalNaverUrl(clip.source) || ''
      if (sourceUrl) {
        try {
          const exclude = idField && idField.value ? '&exclude=' + encodeURIComponent(idField.value) : ''
          const res = await fetch('/api/admin/columns/by-source?url=' + encodeURIComponent(sourceUrl) + exclude, {
            credentials: 'same-origin',
          })
          const data = await res.json()
          const matches = (data && data.matches) || []
          if (matches.length) {
            const list = matches.map((m) => `· ${m.title} (${m.isPublished ? '발행됨' : '임시저장'})`).join('\n')
            const go = confirm(
              `이 글은 이미 홈페이지에 등록돼 있습니다.\n\n${list}\n\n그래도 이어서 가져오시겠습니까?\n(취소하면 가져오지 않습니다)`
            )
            if (!go) {
              showClipStatus('<i class="fas fa-circle-info mr-1"></i> 이미 등록된 글이라 가져오지 않았습니다.')
              return
            }
          }
        } catch (e) {}
        if (sourceField) sourceField.value = sourceUrl
      }

      // 2) 제목은 비어 있을 때만
      if (clip.title && titleField && !titleField.value.trim()) {
        titleField.value = clip.title
        titleField.dispatchEvent(new Event('input', { bubbles: true })) // 슬러그·검색 미리보기 갱신
      }

      // 3) 꼬리말 빼고 → 본문 정리(외부 HTML 이므로 반드시 정리기 통과) → 본문 끝에 넣기
      const parts = splitNaverBoilerplate(clip.html)
      const cleaned = sanitizePastedHtml(parts.main)
      if (editorIsEmpty()) editor.innerHTML = cleaned
      else editor.insertAdjacentHTML('beforeend', cleaned)
      editor.dispatchEvent(new Event('input', { bubbles: true }))
      if (publishDate) publishDate.applyNaver(clip.sourceDate)

      // 4) 안내 + 꼬리말 되돌리기
      const where = /cafe\.naver\.com/.test(sourceUrl) ? '네이버 카페' : /blog\.naver\.com/.test(sourceUrl) ? '네이버 블로그' : '네이버'
      const removed = !!(parts.head || parts.tail)
      showClipStatus(
        `<i class="fas fa-circle-check mr-1"></i> ${where} 글을 가져왔습니다.` +
          (sourceUrl ? ` <a href="${sourceUrl}" target="_blank" rel="noopener" class="underline">원본 보기</a>` : '') +
          (removed
            ? ` · 꼬리말(${[parts.head && '맨 앞 인사말', parts.tail && '구분선 아래 홍보 영역'].filter(Boolean).join(', ')})을 뺐습니다. ` +
              `<button type="button" id="clip-undo-boilerplate" class="font-bold underline">되돌리기</button>`
            : '')
      )
      const undoBtn = document.getElementById('clip-undo-boilerplate')
      if (undoBtn) {
        undoBtn.addEventListener('click', () => {
          if (parts.head) editor.insertAdjacentHTML('afterbegin', sanitizePastedHtml(parts.head))
          if (parts.tail) editor.insertAdjacentHTML('beforeend', sanitizePastedHtml(parts.tail))
          editor.dispatchEvent(new Event('input', { bubbles: true }))
          undoBtn.replaceWith(document.createTextNode('꼬리말을 되돌렸습니다.'))
          syncContent()
          reuploadExternalImages()
        })
      }

      // 5) 사진을 정육점 Cloudinary 폴더로
      syncContent()
      reuploadExternalImages()
    }

    // 저장용 본문 HTML: 업로드 상태 표시용 속성 제거,
    // 옮기지 못한 임시(blob:) 이미지와 주소가 복사되지 않은 빈 사진 자리는 제외
    getEditorHtmlForSave = () => {
      const clone = editor.cloneNode(true)
      clone.querySelectorAll('img').forEach((img) => {
        const src = img.getAttribute('src') || ''
        if (src.startsWith('blob:') || img.getAttribute('data-paste-issue') === 'not-loaded') {
          img.remove()
          return
        }
        img.removeAttribute('data-upload-state')
      })
      clone.querySelectorAll('p').forEach((p) => {
        if (!p.textContent.trim() && !p.querySelector('img, br')) p.remove()
      })
      // 설명(alt)이 빠진 사진은 제목으로 채움 (검색엔진·시각장애인 화면낭독기용, 네이버 사진은 대부분 비어 있음)
      const titleText = ((document.getElementById('f-title') || {}).value || '').trim() || '정육점 세무 칼럼'
      const noAlt = Array.from(clone.querySelectorAll('img')).filter((img) => !(img.getAttribute('alt') || '').trim())
      noAlt.forEach((img, i) => img.setAttribute('alt', noAlt.length > 1 ? `${titleText} 이미지 ${i + 1}` : `${titleText} 이미지`))
      return clone.innerHTML
    }

    // 편집 내용을 hidden input에 동기화
    const syncContent = () => {
      if (hiddenContent) hiddenContent.value = editor.innerHTML
    }
    editor.addEventListener('input', syncContent)
    editor.addEventListener('blur', syncContent)
  }

  /* ===== 썸네일 이미지 — Cloudinary 업로드 ===== */
  // 변경 전: Base64 dataURL로 변환하여 D1에 직접 저장 (DB 용량 과다 소비)
  // 변경 후: Cloudinary에 업로드 후 secure_url만 D1에 저장 (DB 효율 ↑)
  const thumbInput = document.getElementById('f-thumbnail')
  const thumbPreview = document.getElementById('thumbnail-preview')
  let thumbnailDataUrl = '' // 업로드 완료 후 Cloudinary secure_url 저장
  if (thumbInput && thumbPreview) {
    thumbInput.addEventListener('change', async (e) => {
      const file = e.target.files[0]
      if (!file) return
      // 파일 크기 사전 검증 (10MB 제한)
      if (file.size > 10 * 1024 * 1024) {
        alert('이미지 크기는 10MB 이하여야 합니다.')
        e.target.value = ''
        return
      }

      // 1) 로컬 미리보기 즉시 표시 (업로드 중 사용자 피드백)
      const reader = new FileReader()
      reader.onload = (ev) => {
        thumbPreview.innerHTML =
          `<div style="position:relative;width:100%;height:100%;">` +
          `<img src="${ev.target.result}" alt="썸네일 미리보기" style="width:100%;height:100%;object-fit:cover;opacity:0.5;" />` +
          `<div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;color:#8B1A1A;font-weight:bold;font-size:0.75rem;background:rgba(245,240,235,0.4);">` +
          `<i class="fas fa-cloud-arrow-up fa-spin mr-1"></i> 업로드 중...` +
          `</div></div>`
      }
      reader.readAsDataURL(file)

      // 2) Cloudinary 업로드
      try {
        const url = await uploadToCloudinary(file)
        thumbnailDataUrl = url // Cloudinary secure_url
        thumbPreview.innerHTML = `<img src="${url}" alt="썸네일 미리보기" style="width:100%;height:100%;object-fit:cover;" />`
      } catch (err) {
        alert('썸네일 업로드에 실패했습니다: ' + (err.message || '서버 오류'))
        thumbPreview.innerHTML = `<i class="fas fa-image text-3xl text-gold/40"></i>`
        thumbnailDataUrl = ''
        e.target.value = ''
      }
    })
  }

  /* ===== 제목 → URL 슬러그 자동 생성 ===== */
  const titleInput = document.getElementById('f-title')
  const slugInput = document.getElementById('f-slug')
  if (titleInput && slugInput) {
    let slugManuallyEdited = slugInput.value.trim() !== ''
    // 슬러그가 수동으로 수정되었는지 추적
    slugInput.addEventListener('input', () => {
      slugManuallyEdited = slugInput.value.trim() !== ''
    })
    // 제목 변경 시 자동 생성 (수동 수정이 없는 경우만)
    titleInput.addEventListener('input', () => {
      if (slugManuallyEdited) return
      const slug = titleInput.value
        .toLowerCase()
        .replace(/[àáâãäåæçèéêëìíîïðñòóôõöøùúûüýþÿ]/g, '')
        .replace(/[^a-z0-9가-힣\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')
      slugInput.value = slug
    })
  }

  /* ===== 메타 설명 글자수 카운트 ===== */
  const metaDesc = document.getElementById('f-meta-desc')
  const metaCount = document.getElementById('meta-desc-count')
  if (metaDesc && metaCount) {
    metaDesc.addEventListener('input', () => {
      metaCount.textContent = metaDesc.value.length
    })
  }

  /* ===== SEO 검색 결과 미리보기 =====
   * 서버(getMetaTitle / getMetaDescription)와 같은 규칙으로 자동 채움 값을 보여줌
   * - 타이틀: 메타 타이틀 → '제목 | 명륜세무회계'
   * - 설명: 메타 설명 → 한 줄 요약 → 본문 앞부분 (160자)
   */
  const seoTitleEl = document.getElementById('seo-preview-title')
  if (seoTitleEl) {
    const metaTitle = document.getElementById('f-meta-title')
    const metaTitleCount = document.getElementById('meta-title-count')
    const excerptInput = document.getElementById('f-excerpt')
    const categorySelect = document.getElementById('f-category')
    const contentEl = document.getElementById('f-content')
    const seoUrlEl = document.getElementById('seo-preview-url')
    const seoDescEl = document.getElementById('seo-preview-desc')
    const seoWarnEl = document.getElementById('seo-preview-warn')

    const toPlain = (html) => {
      const div = document.createElement('div')
      div.innerHTML = html || ''
      return (div.textContent || '').replace(/\s+/g, ' ').trim()
    }
    const clip = (text, max) => (text.length > max ? text.slice(0, max - 1) + '…' : text)

    const updateSeoPreview = () => {
      const title = (titleInput && titleInput.value.trim()) || '제목'
      const finalTitle = (metaTitle && metaTitle.value.trim()) || `${title} | 명륜세무회계`

      let desc = metaDesc && metaDesc.value.trim()
      let descSource = '메타 설명'
      if (!desc && excerptInput && excerptInput.value.trim()) {
        desc = toPlain(excerptInput.value)
        descSource = '한 줄 요약'
      }
      if (!desc) {
        desc = toPlain(contentEl ? contentEl.innerHTML : '')
        descSource = '본문 앞부분'
      }
      desc = clip(desc, 160)

      const category = categorySelect ? categorySelect.value : ''
      const slug = slugInput ? slugInput.value.trim() : ''
      if (seoUrlEl) {
        seoUrlEl.textContent = ['jung6tax.com', 'column', category, slug].filter(Boolean).join(' › ')
      }
      seoTitleEl.textContent = finalTitle
      if (seoDescEl) seoDescEl.textContent = desc || '본문을 입력하면 설명이 표시됩니다.'
      if (metaTitleCount) metaTitleCount.textContent = finalTitle.length

      const warnings = []
      if (finalTitle.length > 40) warnings.push(`타이틀이 ${finalTitle.length}자로 길어 검색 결과에서 잘릴 수 있습니다.`)
      if (descSource === '본문 앞부분') warnings.push('설명이 본문 앞부분에서 자동으로 채워지고 있습니다. 한 줄 요약이나 메타 설명을 쓰면 더 좋습니다.')
      if (seoWarnEl) {
        seoWarnEl.textContent = warnings.join(' ')
        seoWarnEl.classList.toggle('hidden', warnings.length === 0)
      }
      updateSeoChecklist({ finalTitle, desc, descSource })
    }

    /* ===== SEO 점검 (핵심 검색어 기준 + 기본 항목) =====
     * 각 항목을 좋음(✓) / 보통(!) / 부족(✕)으로 보여주고 점수를 매김. 저장·발행을 막지는 않음
     */
    const focusInput = document.getElementById('f-focus-keyword')
    const checklistEl = document.getElementById('seo-checklist')
    const scoreEl = document.getElementById('seo-score')
    // 띄어쓰기·대소문자 차이는 무시하고 비교 ('해고 예고수당' = '해고예고수당')
    const squash = (s) => String(s || '').toLowerCase().replace(/\s+/g, '')
    const countIn = (text, kw) => (kw ? squash(text).split(kw).length - 1 : 0)
    // 검색어가 들어 있는지: 붙여서 그대로 있거나, 여러 낱말이면 낱말이 모두 들어 있으면 포함으로 봄
    // ('정육점 의무교육' → '정육점 사장님 필수! 의무교육…' 도 포함)
    const keywordWords = (kwRaw) => String(kwRaw || '').split(/\s+/).map(squash).filter(Boolean)
    const hasKeyword = (text, kwRaw) => {
      const t = squash(text)
      const words = keywordWords(kwRaw)
      return words.length > 0 && (t.includes(words.join('')) || words.every((w) => t.includes(w)))
    }
    // 검색어(첫 낱말)가 나오는 위치 (앞쪽일수록 좋음), 없으면 -1
    const keywordPos = (text, kwRaw) => {
      if (!hasKeyword(text, kwRaw)) return -1
      return squash(text).indexOf(keywordWords(kwRaw)[0])
    }

    const updateSeoChecklist = ({ finalTitle, desc, descSource }) => {
      if (!checklistEl || !contentEl) return
      const items = []
      const add = (status, text) => items.push({ status, text })
      const kwRaw = focusInput ? focusInput.value.trim() : ''
      const kw = squash(kwRaw)
      const title = titleInput ? titleInput.value.trim() : ''
      const bodyText = (contentEl.innerText || '').replace(/\s+/g, ' ').trim()
      const bodyChars = bodyText.replace(/\s/g, '').length
      const headings = Array.from(contentEl.querySelectorAll('h2, h3'))
      const h2Count = contentEl.querySelectorAll('h2').length
      const imgs = Array.from(contentEl.querySelectorAll('img'))
      const noAlt = imgs.filter((img) => !(img.getAttribute('alt') || '').trim()).length

      // 1) 핵심 검색어
      if (!kw) {
        add('warn', '핵심 검색어를 입력하면 제목·설명·본문에 잘 들어갔는지 함께 점검합니다.')
      } else {
        add(hasKeyword(title, kwRaw) ? 'good' : 'bad', `제목에 검색어 '${kwRaw}' 포함`)
        const inMeta = keywordPos(finalTitle, kwRaw)
        add(inMeta === -1 ? 'bad' : inMeta <= 10 ? 'good' : 'warn', '메타 타이틀에 검색어 포함 (앞쪽에 있을수록 좋음)')
        add(hasKeyword(desc, kwRaw) ? 'good' : 'bad', '메타 설명(검색 결과 설명문)에 검색어 포함')
        add(hasKeyword(bodyText.slice(0, 200), kwRaw) ? 'good' : 'warn', '본문 첫 부분(첫 문단)에 검색어 포함')
        const words = keywordWords(kwRaw)
        add(
          headings.some((h) => words.some((w) => squash(h.textContent).includes(w))) ? 'good' : 'warn',
          '소제목(H2·H3) 중 하나에 검색어 포함'
        )
        // 본문 사용 횟수: 여러 낱말이면 그중 가장 적게 나온 낱말 기준
        const n = Math.min(...words.map((w) => countIn(bodyText, w)))
        add(
          n === 0 ? 'bad' : n === 1 ? 'warn' : n > 15 ? 'warn' : 'good',
          `본문에 검색어 ${n}번 사용 (2~15번 권장${n > 15 ? ', 너무 많으면 오히려 불리' : ''})`
        )
      }

      // 2) 본문 구성
      add(
        bodyChars >= 1500 ? 'good' : bodyChars >= 600 ? 'warn' : 'bad',
        `본문 길이 ${bodyChars.toLocaleString()}자 (공백 제외, 1,500자 이상 권장)`
      )
      add(h2Count >= 2 ? 'good' : h2Count === 1 ? 'warn' : 'bad', `소제목(H2) ${h2Count}개 (2개 이상 권장 — 툴바 '본문▾ → 소제목')`)
      if (!imgs.length) add('warn', '본문에 사진이 없습니다 (사진이 있으면 검색·공유에 유리)')
      else add(noAlt ? 'warn' : 'good', noAlt ? `설명(alt)이 없는 사진 ${noAlt}장 — 아래 버튼으로 채우거나 저장 시 자동으로 채워짐` : `사진 ${imgs.length}장 모두 설명(alt) 있음`)
      const hasThumb = !!document.querySelector('#thumbnail-preview img') || imgs.length > 0
      add(hasThumb ? 'good' : 'warn', '대표 사진 (목록 카드·카카오톡 공유 이미지)')
      const links = Array.from(contentEl.querySelectorAll('a[href]')).map((a) => a.getAttribute('href') || '')
      add(
        links.some((h) => /jung6tax|^\/column/i.test(h)) ? 'good' : 'warn',
        '다른 칼럼·홈페이지 링크 (관련 칼럼을 링크하면 체류 시간·검색에 유리)'
      )

      // 3) 검색 결과 표시
      add(finalTitle.length <= 40 ? 'good' : 'warn', `메타 타이틀 ${finalTitle.length}자 (40자 이내 권장)`)
      if (descSource === '메타 설명') {
        add(desc.length >= 60 ? 'good' : 'warn', `메타 설명 ${desc.length}자 (80~120자 권장)`)
      } else {
        add(descSource === '한 줄 요약' ? 'warn' : 'bad', `메타 설명이 비어 있어 ${descSource}이(가) 대신 쓰입니다`)
      }
      const slug = slugInput ? slugInput.value.trim() : ''
      add(/^[a-z0-9-]+$/.test(slug) ? 'good' : 'warn', '글 주소(슬러그)를 짧은 영어로 (공유할 때 주소가 깔끔함)')

      // 점수: 좋음 1, 보통 0.5, 부족 0
      const point = { good: 1, warn: 0.5, bad: 0 }
      const score = Math.round((items.reduce((s, it) => s + point[it.status], 0) / items.length) * 100)
      if (scoreEl) {
        const grade = score >= 80 ? ['좋음', 'bg-green-500'] : score >= 55 ? ['보통', 'bg-amber-500'] : ['개선 필요', 'bg-red-500']
        scoreEl.className = `inline-flex items-center rounded-full px-3 py-0.5 font-black text-white ${grade[1]}`
        scoreEl.textContent = `${score}점 · ${grade[0]}`
      }
      const icon = {
        good: '<i class="fas fa-circle-check text-green-400"></i>',
        warn: '<i class="fas fa-circle-exclamation text-amber-400"></i>',
        bad: '<i class="fas fa-circle-xmark text-red-400"></i>',
      }
      checklistEl.innerHTML = ''
      items.forEach((it) => {
        const li = document.createElement('li')
        li.className = 'flex items-start gap-2 ' + (it.status === 'good' ? 'text-white/70' : 'text-white')
        li.innerHTML = `<span class="shrink-0 mt-0.5">${icon[it.status]}</span>`
        const span = document.createElement('span')
        span.textContent = it.text
        li.appendChild(span)
        checklistEl.appendChild(li)
      })
    }

    // 바로 고치기: 사진 설명(alt) 채우기 / 요약으로 메타 설명 채우기
    const fixAltBtn = document.getElementById('seo-fix-alt')
    if (fixAltBtn) {
      fixAltBtn.addEventListener('click', () => {
        const base = [focusInput && focusInput.value.trim(), titleInput && titleInput.value.trim()].filter(Boolean).join(' - ') || '정육점 세무 칼럼'
        const targets = Array.from(contentEl.querySelectorAll('img')).filter((img) => !(img.getAttribute('alt') || '').trim())
        targets.forEach((img, i) => img.setAttribute('alt', targets.length > 1 ? `${base} 이미지 ${i + 1}` : `${base} 이미지`))
        contentEl.dispatchEvent(new Event('input', { bubbles: true }))
        alert(targets.length ? `사진 ${targets.length}장에 설명을 채웠습니다.` : '설명이 빠진 사진이 없습니다.')
      })
    }
    const fixDescBtn = document.getElementById('seo-fix-desc')
    if (fixDescBtn) {
      fixDescBtn.addEventListener('click', () => {
        const source = (excerptInput && toPlain(excerptInput.value)) || toPlain(contentEl.innerHTML)
        if (!source) {
          alert('한 줄 요약이나 본문을 먼저 입력해 주세요.')
          return
        }
        if (metaDesc.value.trim() && !confirm('지금 메타 설명을 한 줄 요약(없으면 본문 앞부분)으로 바꿀까요?')) return
        metaDesc.value = clip(source, 150)
        metaDesc.dispatchEvent(new Event('input', { bubbles: true }))
      })
    }

    /* ===== SEO 최적화 적용 (붙여넣은 기존 글을 규칙으로 한 번에 최적화) =====
     * 본문 문장은 바꾸지 않고: 제목처럼 생긴 줄 → 소제목, 핵심 검색어 추천, 메타 타이틀·설명·한 줄 요약,
     * 영문 주소(새 글·임시저장 글만), 사진 설명(alt). 적용 전 상태를 기억해 '되돌리기' 가능
     */
    const optimizeBtn = document.getElementById('seo-optimize-btn')
    const optimizeResult = document.getElementById('seo-optimize-result')
    const KO_STOPWORDS = new Set([
      '사장님', '사장님들', '정리', '총정리', '필수', '한', '번에', '꼭', '알아야', '할', '것', '방법', '이유', '기준',
      '안내', '관련', '대한', '위한', '모든', '가지', '완벽', '가이드', '이렇게', '무엇', '어떻게', '왜', '정말', '바로',
      '오늘', '우리', '내', '지금', '하나요', '되나요', '줘야', '해야', '하나', '있나요', '없나요', '될까', '할까', '까지',
      '명륜세무회계', '세무사', '칼럼', '알아보기', '알아보자', '확인', '체크', '포인트', '이것', '그것',
    ])
    const stripJosa = (w) => {
      const m = w.match(/^(.{2,}?)(으로|에서|까지|부터|에게|처럼|보다|이라|이란|라는|이다|입니다|은|는|이|가|을|를|의|에|도|로|과|와|만|께)$/)
      return m ? m[1] : w
    }
    // 모든 칼럼에 나오는 업종 낱말: 혼자서는 검색어로 너무 넓으므로 글의 핵심 낱말과 묶음 ('정육점 의무교육')
    const THEME_WORDS = ['정육점', '축산물', '식육', '정육', '숙박업']
    const suggestKeyword = (title, bodyText) => {
      const theme = THEME_WORDS.find((t) => title.includes(t))
      const core = pickKeyword(title.split(theme || '\u0000').join(' '), bodyText)
      if (theme && core && !THEME_WORDS.includes(core)) return `${theme} ${core}`
      return core || theme || ''
    }
    const pickKeyword = (title, bodyText) => {
      const words = title
        .replace(/[!?:,.·'"“”‘’()\[\]{}<>|~…\-–—]/g, ' ')
        .split(/\s+/)
        .map((w) => stripJosa(w.trim()))
        .filter((w) => w.length >= 2 && !KO_STOPWORDS.has(w) && !/^\d+$/.test(w))
      const candidates = []
      words.forEach((w, i) => {
        candidates.push({ text: w, bonus: 1 })
        if (words[i + 1]) candidates.push({ text: w + ' ' + words[i + 1], bonus: 1.6 })
      })
      let best = null
      candidates.forEach((c) => {
        const n = countIn(bodyText, squash(c.text))
        const score = n * c.bonus * Math.min(squash(c.text).length, 8)
        if (n >= 1 && (!best || score > best.score)) best = { text: c.text, score, n }
      })
      return best ? best.text : words[0] || ''
    }

    // 문장 나누기 + 인사말·자기소개·예고 문장 거르기 ("안녕하세요. ○○ 세무사입니다." 등)
    const GREETING = /안녕하세요|세무사입니다|협력업체/
    const sentencesOf = (text) =>
      text
        .split(/(?<=[.!?])\s+|\n+/)
        .map((s) => s.replace(/\s+/g, ' ').trim())
        .filter((s) => s.length >= 8 && !GREETING.test(s))
    // 검색어가 (없으면 검색어 낱말 하나라도) 들어간 첫 문장부터 min~max 자로 이어 붙임
    const buildSummary = (sentences, kwRaw, min, max) => {
      const words = keywordWords(kwRaw)
      let startIdx = kwRaw ? sentences.findIndex((s) => hasKeyword(s, kwRaw)) : 0
      if (startIdx < 0) startIdx = sentences.findIndex((s) => words.some((w) => squash(s).includes(w)))
      if (startIdx < 0) startIdx = 0
      let out = ''
      for (let i = startIdx; i < sentences.length; i++) {
        const next = out ? out + ' ' + sentences[i] : sentences[i]
        if (next.length > max) break
        out = next
        if (out.length >= min) break
      }
      if (!out && sentences[startIdx]) out = clip(sentences[startIdx], max)
      return out
    }

    // 제목처럼 생긴 줄 → 소제목 (H2: 이모지·①·숫자 머리말, H3: 'Q.' 질문, 짧은 굵은 줄)
    const SENTENCE_END = /([다요죠]\.?|[.!])$/
    const makeHeadings = () => {
      let h2 = 0
      let h3 = 0
      const made = []
      Array.from(contentEl.querySelectorAll('p')).forEach((p) => {
        if (p.closest('table, li, blockquote')) return // 표 칸·목록·인용구 안은 제외
        if (p.querySelector('img, br, table')) return
        const text = (p.textContent || '').replace(/\s+/g, ' ').trim()
        if (text.length < 2) return
        const boldText = Array.from(p.querySelectorAll('strong, b')).map((b) => b.textContent).join('').replace(/\s+/g, ' ').trim()
        const allBold = boldText.length > 0 && boldText === text
        let tag = null
        if (/^Q[.:]\s?/.test(text) && text.length <= 80) tag = 'h3'
        else if (text.length <= 45 && !SENTENCE_END.test(text) && !text.includes('→')) {
          if (/^\p{Extended_Pictographic}/u.test(text) || /^[①-⑳]/.test(text) || (/^\d{1,2}[.)]\s/.test(text) && allBold)) tag = 'h2'
          else if (allBold && text.length <= 35) tag = 'h3'
        }
        if (!tag) return
        const h = document.createElement(tag)
        h.textContent = text
        if (p.className) h.className = p.className
        p.replaceWith(h)
        made.push(h)
        tag === 'h2' ? h2++ : h3++
      })
      return { h2, h3, made }
    }

    let seoUndo = null
    const setField = (el, value) => {
      if (!el) return
      el.value = value
      el.dispatchEvent(new Event('input', { bubbles: true }))
    }

    if (optimizeBtn && optimizeResult) {
      optimizeBtn.addEventListener('click', () => {
        const bodyText = (contentEl.innerText || '').trim()
        const title = titleInput ? titleInput.value.trim() : ''
        if (!title || bodyText.length < 50) {
          alert('제목과 본문을 먼저 넣어 주세요. (기존 글을 본문에 붙여넣은 뒤 누르면 됩니다)')
          return
        }
        // 되돌리기용으로 지금 상태 기억
        seoUndo = {
          html: contentEl.innerHTML,
          focus: focusInput ? focusInput.value : '',
          metaTitle: metaTitle ? metaTitle.value : '',
          metaDesc: metaDesc ? metaDesc.value : '',
          excerpt: excerptInput ? excerptInput.value : '',
          slug: slugInput ? slugInput.value : '',
        }
        const done = [] // { label, before, after } — 결과에 '전 → 후'로 보여줌
        const skipped = []
        const scoreBefore = scoreEl ? scoreEl.textContent : ''
        const flash = [] // 잠깐 노랗게 강조할 칸·소제목

        // 1) 소제목
        const hs = makeHeadings()
        if (hs.h2 || hs.h3) {
          const list = hs.made.map((h) => `${h.tagName === 'H2' ? '소제목' : '작은 소제목'} · ${h.textContent}`)
          done.push({
            label: `소제목 ${hs.h2}개${hs.h3 ? `, 작은 소제목 ${hs.h3}개` : ''} 만듦`,
            before: '일반 문단(굵은 글씨)',
            after: list.slice(0, 6).join('\n') + (list.length > 6 ? `\n… 외 ${list.length - 6}개` : ''),
          })
          flash.push(...hs.made)
        } else skipped.push('소제목으로 바꿀 줄을 찾지 못했어요 — 툴바 [본문▾ → 소제목]으로 직접 지정해 주세요')

        // 2) 핵심 검색어
        let keyword = focusInput ? focusInput.value.trim() : ''
        if (!keyword) {
          keyword = suggestKeyword(title, bodyText)
          if (keyword) {
            setField(focusInput, keyword)
            done.push({ label: '핵심 검색어 추천 (바꿔도 됩니다)', before: '', after: keyword })
            flash.push(focusInput)
          }
        }
        // 3) 메타 타이틀: 제목에 검색어가 있으면 '제목 | 명륜세무회계', 없으면 '검색어: 제목' (40자 이내)
        const SUFFIX = ' | 명륜세무회계'
        if (!metaTitle.value.trim() || (keyword && !hasKeyword(metaTitle.value, keyword))) {
          let mt
          if (!keyword || hasKeyword(title, keyword)) mt = title.length + SUFFIX.length <= 40 ? title + SUFFIX : title
          else mt = `${keyword}: ${title}`
          if (mt.length > 40) mt = mt.slice(0, 39).replace(/\s+\S*$/, '') + '…'
          done.push({ label: '메타 타이틀 (검색 결과 파란 제목)', before: metaTitle.value.trim(), after: mt })
          setField(metaTitle, mt)
          flash.push(metaTitle)
        }

        // 4) 메타 설명 · 한 줄 요약: 본문 문단(소제목·표 제외)에서 인사말을 빼고, 검색어가 들어간 문장부터
        const paraText = Array.from(contentEl.querySelectorAll('p'))
          .filter((p) => !p.closest('table'))
          .map((p) => (p.innerText || '').trim())
          .filter(Boolean)
          .join('\n')
        const sentences = sentencesOf(paraText)
        if (!metaDesc.value.trim() || metaDesc.value.trim().length < 60 || (keyword && !hasKeyword(metaDesc.value, keyword))) {
          let md = buildSummary(sentences, keyword, 80, 150)
          if (keyword && md && !hasKeyword(md, keyword)) md = clip(`${keyword}: ${md}`, 150)
          if (md) {
            done.push({ label: `메타 설명 (검색 결과 설명문, ${md.length}자)`, before: metaDesc.value.trim(), after: md })
            setField(metaDesc, md)
            flash.push(metaDesc)
          }
        }
        if (excerptInput && !excerptInput.value.trim()) {
          const ex = buildSummary(sentences, keyword, 40, 90)
          if (ex) {
            setField(excerptInput, ex)
            done.push({ label: '한 줄 요약 (목록 카드 소개글)', before: '', after: ex })
            flash.push(excerptInput)
          }
        }

        // 5) 영문 주소 (발행된 글은 주소가 바뀌면 기존 링크가 깨지므로 건드리지 않음)
        const formEl = document.getElementById('column-form')
        const isPublished = !!formEl && formEl.dataset.published === '1'
        const slugNow = slugInput ? slugInput.value.trim() : ''
        if (slugInput && !/^[a-z0-9-]+$/.test(slugNow)) {
          if (isPublished) {
            skipped.push('이미 발행된 글이라 글 주소는 바꾸지 않았어요 (바꾸면 기존 링크가 깨짐)')
          } else {
            const romanized = romanizeHangul(keyword || title)
            if (romanized) {
              done.push({ label: '글 주소', before: slugNow, after: romanized })
              setField(slugInput, romanized)
              flash.push(slugInput)
            }
          }
        }

        // 6) 사진 설명(alt)
        const base = [keyword, title].filter(Boolean).join(' - ')
        const noAlt = Array.from(contentEl.querySelectorAll('img')).filter((img) => !(img.getAttribute('alt') || '').trim())
        noAlt.forEach((img, i) => img.setAttribute('alt', noAlt.length > 1 ? `${base} 이미지 ${i + 1}` : `${base} 이미지`))
        if (noAlt.length) {
          done.push({ label: `사진 설명(alt) ${noAlt.length}장 (화면엔 안 보이고 검색엔진이 읽음)`, before: '', after: noAlt[0].getAttribute('alt') + (noAlt.length > 1 ? ' …' : '') })
          flash.push(...noAlt)
        }

        contentEl.dispatchEvent(new Event('input', { bubbles: true }))
        updateSeoPreview()

        // 남은 할 일 (본문을 직접 고쳐야 하는 것)
        if (keyword && !hasKeyword(bodyText.slice(0, 200), keyword)) {
          skipped.push(`본문 첫 문단에 '${keyword}'를 한 번 넣어 주면 더 좋아요`)
        }
        if (bodyText.replace(/\s/g, '').length < 1500) skipped.push('본문이 1,500자보다 짧아요 — 내용을 조금 더 보태면 검색에 유리해요')
        if (!Array.from(contentEl.querySelectorAll('a[href]')).some((a) => /jung6tax|^\/column/i.test(a.getAttribute('href') || ''))) {
          skipped.push('관련 칼럼 링크를 하나 넣으면 좋아요 (툴바 🔗)')
        }

        const esc = (t) => String(t).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]))
        const li = (t) => `<li>${esc(t)}</li>`
        const changeRow = (c) =>
          `<li class="rounded-lg bg-white/5 px-3 py-2"><p class="font-bold text-white">${esc(c.label)}</p>` +
          `<p class="mt-1 text-xs text-white/50">전: ${c.before ? esc(c.before) : '(비어 있음)'}</p>` +
          `<p class="mt-0.5 text-xs text-gold whitespace-pre-line">후: ${esc(c.after)}</p></li>`
        optimizeResult.innerHTML =
          `<p class="font-bold text-gold mb-2"><i class="fas fa-circle-check mr-1"></i> ${done.length}가지를 바꿨습니다 · SEO 점수 ${esc(scoreBefore)} → ${esc(scoreEl ? scoreEl.textContent : '')}` +
          ` <button type="button" id="seo-optimize-undo" class="ml-2 font-bold underline text-white/80 hover:text-white">되돌리기</button></p>` +
          `<p class="mb-2 text-xs text-white/60">노랗게 반짝인 곳이 바뀐 곳입니다. 확인한 뒤 발행(또는 임시저장)해야 실제 글에 반영됩니다.</p>` +
          `<ul class="space-y-1.5">${done.map(changeRow).join('') || li('바꿀 것이 없었어요 (이미 최적화된 글입니다)')}</ul>` +
          (skipped.length ? `<p class="mt-2 font-bold text-white/80">직접 해 주시면 좋은 것</p><ul class="list-disc ml-5 space-y-0.5 text-white/70">${skipped.map(li).join('')}</ul>` : '')
        optimizeResult.classList.remove('hidden')
        // 바뀐 곳을 잠깐 노랗게 강조
        flash.forEach((el) => el.classList.add('seo-flash'))
        setTimeout(() => flash.forEach((el) => el.classList.remove('seo-flash')), 4000)
        const undoBtn = document.getElementById('seo-optimize-undo')
        if (undoBtn) {
          undoBtn.addEventListener('click', () => {
            if (!seoUndo) return
            contentEl.innerHTML = seoUndo.html
            setField(focusInput, seoUndo.focus)
            setField(metaTitle, seoUndo.metaTitle)
            setField(metaDesc, seoUndo.metaDesc)
            setField(excerptInput, seoUndo.excerpt)
            setField(slugInput, seoUndo.slug)
            contentEl.dispatchEvent(new Event('input', { bubbles: true }))
            seoUndo = null
            optimizeResult.innerHTML = '<p class="text-white/80"><i class="fas fa-rotate-left mr-1"></i> 최적화 전으로 되돌렸습니다.</p>'
          })
        }
      })
    }

    ;[titleInput, metaTitle, metaDesc, excerptInput, slugInput, contentEl, focusInput].forEach((el) => {
      if (el) el.addEventListener('input', updateSeoPreview)
    })
    if (categorySelect) categorySelect.addEventListener('change', updateSeoPreview)
    const thumbInputEl = document.getElementById('f-thumbnail')
    if (thumbInputEl) thumbInputEl.addEventListener('change', () => setTimeout(updateSeoPreview, 300))
    updateSeoPreview()
  }

  /* ===== 폼 제출 (D1 CRUD API 호출) =====
   * - 발행하기(submit): 필수 항목 확인 후 공개 저장 → 게시된 글 화면으로 이동
   * - 임시저장(#column-draft-btn): 제목만 있으면 비공개로 저장하고 작성 화면에 그대로 머묾
   */
  const columnForm = document.getElementById('column-form')
  if (columnForm) {
    const draftBtn = document.getElementById('column-draft-btn')
    const draftStatus = document.getElementById('draft-status')
    const backLink = document.getElementById('column-back-link')

    /* --- 마지막 임시저장 시각 표시 (본문 위 임시저장 버튼 옆) --- */
    const formatSavedAt = (date) => {
      const sameDay = date.toDateString() === new Date().toDateString()
      const time = date.toLocaleTimeString('ko-KR', { hour: 'numeric', minute: '2-digit' })
      return sameDay ? time : `${date.getMonth() + 1}월 ${date.getDate()}일 ${time}`
    }
    const showDraftStatus = (date, previewUrl) => {
      const html =
        `<i class="fas fa-clock text-gold mr-1"></i> 마지막 임시저장 <b class="text-navy">${formatSavedAt(date)}</b>` +
        (previewUrl
          ? ` · <a href="${previewUrl}" target="_blank" rel="noopener" class="font-bold text-brand hover:underline">미리보기</a>`
          : '')
      if (draftStatus) draftStatus.innerHTML = html
    }
    // 이전에 임시저장해 둔 글을 다시 열었으면 그때 저장 시각 표시
    if (draftStatus && draftStatus.dataset.savedAt) {
      const saved = new Date(draftStatus.dataset.savedAt)
      if (!isNaN(saved.getTime())) showDraftStatus(saved, draftStatus.dataset.previewUrl)
    }

    /* --- '목록으로' 버튼으로 나갈 때 확인 ---
     * - 저장하지 않은 변경사항이 있을 때
     * - 임시저장만 하고 아직 발행하지 않았을 때
     * (브라우저 뒤로가기·탭 닫기·다른 메뉴 이동은 확인하지 않음)
     */
    let isDirty = false
    let draftPending = false
    columnForm.addEventListener('input', () => {
      isDirty = true
    })
    if (editor) editor.addEventListener('input', () => {
      isDirty = true
    })
    if (backLink) {
      backLink.addEventListener('click', (e) => {
        let message = ''
        if (isDirty) {
          message = '저장하지 않은 변경사항이 있습니다.\n지금 나가면 작성한 내용이 사라집니다.\n\n목록으로 나가시겠습니까?'
        } else if (draftPending) {
          message =
            '임시저장만 하고 아직 발행하지 않은 글입니다.\n방문자에게는 보이지 않으며, 칼럼 관리 목록에서 이어서 쓸 수 있습니다.\n\n목록으로 나가시겠습니까?'
        }
        if (message && !confirm(message)) e.preventDefault()
      })
    }

    /* --- 임시저장 글 목록 ('임시저장 | N' 버튼의 숫자 → 목록 창 → 글을 누르면 불러오기) --- */
    const draftCountEl = document.getElementById('draft-count')
    const draftListBtn = document.getElementById('draft-list-btn')
    const draftModal = document.getElementById('draft-modal')
    const draftModalList = document.getElementById('draft-modal-list')
    const draftModalCount = document.getElementById('draft-modal-count')
    const draftEditToggle = document.getElementById('draft-edit-toggle')
    let drafts = []
    let draftEditMode = false

    const pad2 = (n) => String(n).padStart(2, '0')
    const formatListDate = (iso) => {
      const d = new Date(iso)
      if (isNaN(d.getTime())) return ''
      return `${d.getFullYear()}.${pad2(d.getMonth() + 1)}.${pad2(d.getDate())} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`
    }
    const currentColumnId = () => (columnForm.querySelector('[name="id"]') || {}).value || ''

    const renderDraftList = () => {
      if (draftCountEl) draftCountEl.textContent = String(drafts.length)
      if (!draftModalList) return
      if (draftModalCount) draftModalCount.textContent = String(drafts.length)
      if (draftEditToggle) draftEditToggle.textContent = draftEditMode ? '완료' : '편집'
      draftModalList.innerHTML = ''
      if (!drafts.length) {
        const empty = document.createElement('li')
        empty.className = 'px-6 py-10 text-center text-sm text-ink/50'
        empty.textContent = '임시저장한 글이 없습니다.'
        draftModalList.appendChild(empty)
        return
      }
      drafts.forEach((d) => {
        const li = document.createElement('li')
        li.className = 'flex items-center gap-3 px-6 py-5 hover:bg-cream-soft transition'

        const open = document.createElement('button')
        open.type = 'button'
        open.className = 'flex-1 min-w-0 text-left'
        const title = document.createElement('p')
        title.className = 'text-[15px] text-ink truncate'
        title.textContent = d.title || '(제목 없음)'
        if (String(d.id) === currentColumnId()) {
          const badge = document.createElement('span')
          badge.className = 'ml-2 align-middle text-[11px] font-bold text-green-600 border border-green-600/40 rounded px-1.5 py-0.5'
          badge.textContent = '작성 중'
          title.appendChild(badge)
        }
        const date = document.createElement('p')
        date.className = 'mt-1 text-xs text-ink/40'
        date.textContent = formatListDate(d.savedAt)
        open.append(title, date)
        open.addEventListener('click', () => loadDraft(d))
        li.appendChild(open)

        if (draftEditMode) {
          const del = document.createElement('button')
          del.type = 'button'
          del.className = 'shrink-0 text-red-500 hover:text-red-700 px-2 py-1 transition'
          del.title = '삭제'
          del.innerHTML = '<i class="fas fa-trash"></i>'
          del.addEventListener('click', () => deleteDraft(d))
          li.appendChild(del)
        }
        draftModalList.appendChild(li)
      })
    }

    const refreshDrafts = async () => {
      try {
        const res = await fetch('/api/admin/drafts', { credentials: 'same-origin' })
        const data = await res.json()
        if (res.ok && data.ok) {
          drafts = data.drafts || []
          renderDraftList()
        }
      } catch (_) {}
    }

    const openDraftModal = () => {
      if (!draftModal) return
      draftEditMode = false
      renderDraftList()
      draftModal.classList.remove('hidden')
      draftModal.classList.add('flex')
      refreshDrafts()
    }
    const closeDraftModal = () => {
      if (!draftModal) return
      draftModal.classList.add('hidden')
      draftModal.classList.remove('flex')
    }

    // 임시저장 글 불러오기: 그 글의 작성 화면으로 이동 (저장 안 한 변경사항이 있으면 확인)
    const loadDraft = (d) => {
      if (String(d.id) === currentColumnId()) {
        closeDraftModal()
        return
      }
      if (
        isDirty &&
        !confirm('저장하지 않은 변경사항이 있습니다.\n다른 글을 불러오면 지금 작성한 내용은 사라집니다.\n\n불러오시겠습니까?')
      ) {
        return
      }
      window.location.href = '/admin/column/edit/' + d.id
    }

    const deleteDraft = async (d) => {
      if (!confirm(`이 임시저장 글을 삭제하시겠습니까?\n\n${d.title || '(제목 없음)'}`)) return
      try {
        const res = await fetch('/api/admin/column/' + d.id, { method: 'DELETE', credentials: 'same-origin' })
        if (!res.ok) throw new Error()
      } catch (_) {
        alert('삭제에 실패했습니다.')
        return
      }
      if (String(d.id) === currentColumnId()) {
        // 지금 작성 중인 글을 지웠으면 새 글 작성 화면으로
        window.location.href = '/admin/column/new'
        return
      }
      drafts = drafts.filter((x) => x.id !== d.id)
      renderDraftList()
    }

    if (draftListBtn) draftListBtn.addEventListener('click', openDraftModal)
    const draftModalCloseBtn = document.getElementById('draft-modal-close')
    if (draftModalCloseBtn) draftModalCloseBtn.addEventListener('click', closeDraftModal)
    if (draftModal) {
      draftModal.addEventListener('click', (e) => {
        if (e.target === draftModal) closeDraftModal() // 바깥 어두운 영역 클릭 시 닫기
      })
    }
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeDraftModal()
    })
    if (draftEditToggle) {
      draftEditToggle.addEventListener('click', () => {
        draftEditMode = !draftEditMode
        renderDraftList()
      })
    }
    if (draftCountEl) refreshDrafts() // 처음 열 때 임시저장 글 개수 표시

    const saveColumn = async (isDraft) => {
      // 붙여넣은 이미지가 아직 업로드 중이면 저장 보류
      if (editor && editor.querySelector('img[data-upload-state="uploading"]')) {
        alert('붙여넣은 이미지를 옮기는 중입니다. 잠시 후 다시 저장해 주세요.')
        return
      }
      const failedImgs = editor ? editor.querySelectorAll('img[data-upload-state="failed"]').length : 0
      const notLoadedImgs = editor ? editor.querySelectorAll('img[data-paste-issue="not-loaded"]').length : 0
      if (
        failedImgs &&
        !confirm(
          `옮기지 못한 이미지가 ${failedImgs}개 있습니다 (빨간 테두리).\n` +
            (notLoadedImgs ? `이 중 주소가 복사되지 않은 사진 ${notLoadedImgs}개는 빼고 저장됩니다.\n` : '') +
            (failedImgs > notLoadedImgs ? '나머지는 홈페이지에서 깨져 보일 수 있습니다.\n' : '') +
            '\n그래도 저장하시겠습니까?'
        )
      ) {
        return
      }

      // 본문 내용 동기화
      if (editor && hiddenContent) {
        hiddenContent.value = getEditorHtmlForSave()
      }

      const btn = isDraft ? draftBtn : document.getElementById('column-submit-btn')
      const originalBtnHtml = btn ? btn.innerHTML : ''

      // 폼 데이터 수집 → ColumnInput 객체 생성
      const idInput = columnForm.querySelector('[name="id"]')
      const editId = idInput ? idInput.value.trim() : ''
      const isEdit = editId !== ''

      // 썸네일: 새 파일 업로드 시 Cloudinary secure_url, 아니면 기존 thumbnail_existing 값(이미 Cloudinary URL)
      let thumbnail = thumbnailDataUrl
      if (!thumbnail) {
        const existingInput = columnForm.querySelector('[name="thumbnail_existing"]')
        thumbnail = existingInput ? existingInput.value : ''
      }

      const payload = {
        category: (columnForm.querySelector('[name="category"]') || {}).value || '',
        title: (columnForm.querySelector('[name="title"]') || {}).value || '',
        slug: (columnForm.querySelector('[name="slug"]') || {}).value || '',
        excerpt: (columnForm.querySelector('[name="excerpt"]') || {}).value || '',
        content: (hiddenContent || {}).value || '',
        thumbnail: thumbnail,
        thumbnail_alt: (columnForm.querySelector('[name="thumbnail_alt"]') || {}).value || '',
        author: (columnForm.querySelector('[name="author"]') || {}).value || '',
        meta_title: (columnForm.querySelector('[name="meta_title"]') || {}).value || '',
        meta_description: (columnForm.querySelector('[name="meta_description"]') || {}).value || '',
        source_url: (columnForm.querySelector('[name="source_url"]') || {}).value || '',
        focus_keyword: (columnForm.querySelector('[name="focus_keyword"]') || {}).value || '',
        is_published: isDraft ? 0 : 1,
      }
      // 발행일은 직접 고르거나 네이버에서 가져왔을 때만 보냄 (새 글은 처음 저장한 날, 기존 글은 그대로)
      const chosenDate = publishDate ? publishDate.forSave() : ''
      if (chosenDate) payload.published_at = chosenDate

      // 클라이언트 사이드 기본 검증 (임시저장은 제목만)
      if (!payload.title.trim()) {
        alert('제목을 입력해 주세요.')
        return
      }
      if (!isDraft) {
        if (!payload.slug.trim()) {
          alert('URL 슬러그를 입력해 주세요.')
          return
        }
        if (!payload.content.trim() || payload.content === '<br>' || payload.content === '<div><br></div>') {
          alert('본문을 입력해 주세요.')
          return
        }
      }

      if (btn) {
        btn.disabled = true
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 저장 중...'
      }

      const url = isEdit ? '/api/admin/column/' + encodeURIComponent(editId) : '/api/admin/column'
      const method = isEdit ? 'PUT' : 'POST'

      try {
        const res = await fetch(url, {
          method: method,
          headers: { 'Content-Type': 'application/json' },
          credentials: 'same-origin', // 쿠키 자동 전송 (인증)
          body: JSON.stringify(payload),
        })
        const data = await res.json()

        if (res.ok && data.ok) {
          isDirty = false
          const postUrl =
            '/column/' + encodeURIComponent(data.category || payload.category) + '/' +
            encodeURIComponent(data.slug || payload.slug)
          if (isDraft) {
            // 새 글을 처음 임시저장했으면 이후 저장은 같은 글을 수정하도록 전환
            if (!isEdit && data.id && idInput) {
              idInput.value = String(data.id)
              history.replaceState(null, '', '/admin/column/edit/' + data.id)
            }
            draftPending = true
            if (publishDate) publishDate.markSaved(data.publishedAt)
            showDraftStatus(new Date(), postUrl)
            refreshDrafts() // 임시저장 글 개수 갱신
            if (btn) {
              btn.disabled = false
              btn.innerHTML = '<i class="fas fa-check"></i> 저장됨'
              setTimeout(() => {
                btn.innerHTML = originalBtnHtml
              }, 1500)
            }
            return
          }
          draftPending = false
          alert(data.message || (isEdit ? '칼럼이 수정되었습니다.' : '칼럼이 저장되었습니다.'))
          // 게시된 칼럼 화면으로 이동 (게시판에서 바로 결과 확인)
          window.location.href = postUrl
        } else {
          // 인증 만료 시 로그인 페이지로
          if (res.status === 401) {
            alert('로그인이 만료되었습니다. 다시 로그인해 주세요.')
            window.location.href = '/admin/column/login'
            return
          }
          alert(data.error || '저장에 실패했습니다.')
          if (btn) {
            btn.disabled = false
            btn.innerHTML = originalBtnHtml
          }
        }
      } catch (err) {
        alert('서버 연결에 실패했습니다. 잠시 후 다시 시도해 주세요.')
        if (btn) {
          btn.disabled = false
          btn.innerHTML = originalBtnHtml
        }
      }
    }

    columnForm.addEventListener('submit', (e) => {
      e.preventDefault()
      saveColumn(false)
    })
    if (draftBtn) draftBtn.addEventListener('click', () => saveColumn(true))
  }

  /* ===== 관리자 계정 설정 페이지 ===== */

  // 공통: 메시지 표시 유틸
  function showSettingsMsg(el, type, text) {
    if (!el) return
    el.textContent = text
    el.className =
      'mt-3 text-sm ' +
      (type === 'error'
        ? 'text-red-600'
        : type === 'success'
        ? 'text-green-700'
        : 'text-ink/70')
    el.classList.remove('hidden')
  }

  // 1. 관리자 추가 폼
  const addForm = document.getElementById('admin-email-add-form')
  if (addForm) {
    const addMsg = document.getElementById('admin-email-add-msg')
    const addBtn = document.getElementById('admin-email-add-btn')

    addForm.addEventListener('submit', async (e) => {
      e.preventDefault()
      const payload = {
        email: (addForm.querySelector('[name="email"]') || {}).value || '',
        displayName: (addForm.querySelector('[name="displayName"]') || {}).value || '',
        note: (addForm.querySelector('[name="note"]') || {}).value || '',
      }
      if (!payload.email.trim()) {
        showSettingsMsg(addMsg, 'error', '이메일을 입력하세요.')
        return
      }

      const originalHtml = addBtn ? addBtn.innerHTML : ''
      if (addBtn) {
        addBtn.disabled = true
        addBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 추가 중...'
      }

      try {
        const res = await fetch('/api/admin/admins', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'same-origin',
          body: JSON.stringify(payload),
        })
        const data = await res.json()
        if (res.ok && data.ok) {
          showSettingsMsg(addMsg, 'success', data.message || '추가되었습니다.')
          // 1초 후 새로고침하여 목록 반영
          setTimeout(() => window.location.reload(), 600)
        } else {
          if (res.status === 401) {
            window.location.href = '/admin/column/login'
            return
          }
          showSettingsMsg(addMsg, 'error', data.error || '추가에 실패했습니다.')
          if (addBtn) {
            addBtn.disabled = false
            addBtn.innerHTML = originalHtml
          }
        }
      } catch (err) {
        showSettingsMsg(addMsg, 'error', '서버 연결에 실패했습니다.')
        if (addBtn) {
          addBtn.disabled = false
          addBtn.innerHTML = originalHtml
        }
      }
    })
  }

  // 2. 활성 상태 토글
  const activeToggles = document.querySelectorAll('.admin-active-toggle')
  activeToggles.forEach((toggle) => {
    toggle.addEventListener('change', async () => {
      const id = toggle.getAttribute('data-id')
      const isActive = toggle.checked
      try {
        const res = await fetch('/api/admin/admins/' + id, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'same-origin',
          body: JSON.stringify({ isActive }),
        })
        const data = await res.json()
        if (res.ok && data.ok) {
          // 성공: 라벨만 업데이트
          const row = toggle.closest('tr')
          const label = row ? row.querySelector('label span:last-child') : null
          if (label) {
            label.textContent = isActive ? '활성' : '중지'
            label.className = 'text-xs font-bold ' + (isActive ? 'text-brand' : 'text-ink/40')
          }
        } else {
          // 실패 시 토글 롤백
          toggle.checked = !isActive
          if (res.status === 401) {
            window.location.href = '/admin/column/login'
            return
          }
          alert(data.error || '상태 변경에 실패했습니다.')
        }
      } catch (err) {
        toggle.checked = !isActive
        alert('서버 연결에 실패했습니다.')
      }
    })
  })

  // 3. 관리자 삭제
  const deleteAdminBtns = document.querySelectorAll('.admin-email-delete-btn')
  deleteAdminBtns.forEach((btn) => {
    btn.addEventListener('click', async () => {
      if (btn.disabled) return
      const id = btn.getAttribute('data-id')
      const email = btn.getAttribute('data-email')
      if (!confirm('정말로 이 관리자를 삭제하시겠습니까?\n\n이메일: ' + email))
        return

      const originalHtml = btn.innerHTML
      btn.disabled = true
      btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 삭제 중...'

      try {
        const res = await fetch('/api/admin/admins/' + id, {
          method: 'DELETE',
          credentials: 'same-origin',
        })
        const data = await res.json()
        if (res.ok && data.ok) {
          // 해당 행 제거 후 새로고침(fallback 상태 재계산 위해)
          window.location.reload()
        } else {
          if (res.status === 401) {
            window.location.href = '/admin/column/login'
            return
          }
          alert(data.error || '삭제에 실패했습니다.')
          btn.disabled = false
          btn.innerHTML = originalHtml
        }
      } catch (err) {
        alert('서버 연결에 실패했습니다.')
        btn.disabled = false
        btn.innerHTML = originalHtml
      }
    })
  })

  /* ===== 네이버 글 담기: 글쓰기 화면이 열리면 보관해 둔 글 채우기 ===== */
  if (hasPendingClip && typeof window.applyNaverClip === 'function') {
    window.applyNaverClip()
  }
})
