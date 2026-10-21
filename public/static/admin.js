// 관리자 페이지 스크립트
// Google OAuth 세션 (쿠키 기반) + D1 CRUD API 연동 + Cloudinary 이미지 업로드
// - 로그인: Google OAuth → /api/auth/google → 콜백 → 쿠키 설정
// - 칼럼 저장: POST /api/admin/column (신규) / PUT /api/admin/column/:id (수정)
// - 칼럼 삭제: DELETE /api/admin/column/:id
// - 시드: POST /api/admin/seed
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
  }

  const res = await fetch(CLOUDINARY_UPLOAD_URL, {
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
  BLOCKQUOTE: 'blockquote', UL: 'ul', OL: 'ol', LI: 'li',
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

  function walk(node, parent) {
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
          walk(child, parent) // 링크가 아닌 것은 글자만 남김
          continue
        }
        const a = document.createElement('a')
        a.setAttribute('href', href)
        walk(child, a)
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
        walk(child, parent) // span, font 등은 껍데기만 벗김
        continue
      }
      const el = document.createElement(mapped)
      if ((mapped === 'td' || mapped === 'th') && child.getAttribute('colspan')) {
        el.setAttribute('colspan', child.getAttribute('colspan'))
      }
      if ((mapped === 'td' || mapped === 'th') && child.getAttribute('rowspan')) {
        el.setAttribute('rowspan', child.getAttribute('rowspan'))
      }
      walk(child, el)
      parent.appendChild(el)
    }
  }
  walk(src, out)

  // 빈 문단·빈 소제목 제거 (네이버는 빈 줄을 빈 문단으로 넣음), 단 이미지가 든 문단은 유지
  out.querySelectorAll('p, h2, h3, blockquote, strong, em, u').forEach((el) => {
    if (!el.textContent.trim() && !el.querySelector('img')) el.remove()
  })
  // 네이버 복사 시 자동으로 붙는 '[출처] 글제목 (카페명) |작성자 닉네임' 줄 제거
  out.querySelectorAll('p').forEach((p) => {
    if (/^\s*\[출처\]/.test(p.textContent)) p.remove()
  })
  return out.innerHTML
}

document.addEventListener('DOMContentLoaded', () => {
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

  /* ===== 시드 버튼 (더미 데이터 18개 삽입) ===== */
  const seedBtn = document.getElementById('admin-seed-btn')
  if (seedBtn) {
    seedBtn.addEventListener('click', async () => {
      if (!confirm('더미 칼럼 18개를 데이터베이스에 삽입하시겠습니까?\n(이미 데이터가 있으면 건너뜁니다)')) return
      const originalHtml = seedBtn.innerHTML
      seedBtn.disabled = true
      seedBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> 삽입 중...'
      try {
        const res = await fetch('/api/admin/seed', {
          method: 'POST',
          credentials: 'same-origin',
        })
        const data = await res.json()
        if (res.ok && data.ok) {
          alert(data.message)
          window.location.reload()
        } else {
          if (res.status === 401) {
            window.location.href = '/admin/column/login'
            return
          }
          alert(data.error || '시드에 실패했습니다.')
          seedBtn.disabled = false
          seedBtn.innerHTML = originalHtml
        }
      } catch (err) {
        alert('서버 연결에 실패했습니다.')
        seedBtn.disabled = false
        seedBtn.innerHTML = originalHtml
      }
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
  const editor = document.getElementById('f-content')
  const hiddenContent = document.getElementById('f-content-hidden')
  let getEditorHtmlForSave = () => (editor ? editor.innerHTML : '')

  if (editor) {
    // 포맷 버튼
    const formatBtns = document.querySelectorAll('.format-btn')
    formatBtns.forEach((btn) => {
      if (btn.id === 'insert-image-btn' || btn.id === 'insert-table-btn') return
      btn.addEventListener('click', (e) => {
        e.preventDefault()
        const cmd = btn.getAttribute('data-cmd')
        const val = btn.getAttribute('data-val')
        editor.focus()
        document.execCommand(cmd, false, val || null)
      })
    })

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
          const url = await uploadToCloudinary(source)
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
    }

    ;[titleInput, metaTitle, metaDesc, excerptInput, slugInput, contentEl].forEach((el) => {
      if (el) el.addEventListener('input', updateSeoPreview)
    })
    if (categorySelect) categorySelect.addEventListener('change', updateSeoPreview)
    updateSeoPreview()
  }

  /* ===== 폼 제출 (D1 CRUD API 호출) ===== */
  const columnForm = document.getElementById('column-form')
  if (columnForm) {
    columnForm.addEventListener('submit', async (e) => {
      e.preventDefault()
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

      const btn = document.getElementById('column-submit-btn')
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
        published_at: (columnForm.querySelector('[name="published_at"]') || {}).value || '',
        meta_title: (columnForm.querySelector('[name="meta_title"]') || {}).value || '',
        meta_description: (columnForm.querySelector('[name="meta_description"]') || {}).value || '',
        is_published: 1,
      }

      // 클라이언트 사이드 기본 검증
      if (!payload.title.trim()) {
        alert('제목을 입력해 주세요.')
        return
      }
      if (!payload.slug.trim()) {
        alert('URL 슬러그를 입력해 주세요.')
        return
      }
      if (!payload.content.trim() || payload.content === '<br>' || payload.content === '<div><br></div>') {
        alert('본문을 입력해 주세요.')
        return
      }
      if (!payload.published_at) {
        alert('발행일을 선택해 주세요.')
        return
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
          alert(data.message || (isEdit ? '칼럼이 수정되었습니다.' : '칼럼이 저장되었습니다.'))
          // 게시된 칼럼 화면으로 이동 (게시판에서 바로 결과 확인)
          window.location.href =
            '/column/' + encodeURIComponent(payload.category) + '/' + encodeURIComponent(payload.slug)
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
    })
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
})
