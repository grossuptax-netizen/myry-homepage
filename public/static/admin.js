// 관리자 페이지 스크립트
// 서버 사이드 인증 + D1 CRUD API 연동
// - 로그인: POST /api/admin/login → 토큰 발급
// - 칼럼 저장: POST /api/admin/column (신규) / PUT /api/admin/column/:id (수정)
// - 칼럼 삭제: DELETE /api/admin/column/:id
// - 시드: POST /api/admin/seed

document.addEventListener('DOMContentLoaded', () => {
  /* ===== 관리자 세션 관리 (서버 발급 토큰 기반) ===== */
  const SESSION_KEY = 'admin_token'
  const SESSION_TS_KEY = 'admin_token_ts'
  const SESSION_DURATION = 4 * 60 * 60 * 1000 // 4시간

  function getToken() {
    const token = sessionStorage.getItem(SESSION_KEY)
    const ts = parseInt(sessionStorage.getItem(SESSION_TS_KEY) || '0', 10)
    if (!token || !ts) return null
    // 4시간 경과 시 토큰 만료
    if (Date.now() - ts > SESSION_DURATION) {
      clearAuth()
      return null
    }
    return token
  }

  function setToken(token) {
    sessionStorage.setItem(SESSION_KEY, token)
    sessionStorage.setItem(SESSION_TS_KEY, String(Date.now()))
  }

  function isAuthed() {
    return getToken() !== null
  }

  function clearAuth() {
    sessionStorage.removeItem(SESSION_KEY)
    sessionStorage.removeItem(SESSION_TS_KEY)
  }

  // 인증 헤더 객체 생성
  function authHeaders(extra = {}) {
    const token = getToken()
    const headers = { 'Content-Type': 'application/json', ...extra }
    if (token) headers['Authorization'] = 'Bearer ' + token
    return headers
  }

  /* ===== 로그인 페이지 ===== */
  const loginForm = document.getElementById('admin-login-form')
  if (loginForm) {
    // 이미 인증된 경우 관리자 목록으로 리다이렉트
    if (isAuthed()) {
      window.location.href = '/admin/column'
      return
    }

    // 비밀번호 표시/숨기기 토글
    const togglePw = document.getElementById('toggle-pw')
    const pwInput = document.getElementById('admin-pw')
    if (togglePw && pwInput) {
      togglePw.addEventListener('click', () => {
        const isPassword = pwInput.type === 'password'
        pwInput.type = isPassword ? 'text' : 'password'
        togglePw.innerHTML = isPassword
          ? '<i class="fas fa-eye-slash"></i>'
          : '<i class="fas fa-eye"></i>'
      })
    }

    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault()
      const errorEl = document.getElementById('login-error')
      const errorMsg = document.getElementById('login-error-msg')
      const btn = document.getElementById('admin-login-btn')

      const password = pwInput ? pwInput.value : ''

      btn.disabled = true
      btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> 확인 중...'

      try {
        const res = await fetch('/api/admin/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ password }),
        })
        const data = await res.json()

        if (res.ok && data.ok && data.token) {
          setToken(data.token)
          errorEl.classList.add('hidden')
          btn.innerHTML = '<i class="fas fa-check mr-2"></i> 로그인 성공'
          setTimeout(() => {
            window.location.href = '/admin/column'
          }, 500)
        } else {
          errorEl.classList.remove('hidden')
          if (errorMsg) errorMsg.textContent = data.error || '비밀번호가 올바르지 않습니다.'
          btn.disabled = false
          btn.innerHTML = '<i class="fas fa-sign-in-alt mr-2"></i> 로그인'
          pwInput.value = ''
          pwInput.focus()
        }
      } catch (err) {
        errorEl.classList.remove('hidden')
        if (errorMsg) errorMsg.textContent = '서버 연결에 실패했습니다. 잠시 후 다시 시도해 주세요.'
        btn.disabled = false
        btn.innerHTML = '<i class="fas fa-sign-in-alt mr-2"></i> 로그인'
      }
    })
    return
  }

  /* ===== 관리자 페이지 접근 제어 ===== */
  const isAdminPage =
    document.getElementById('column-form') ||
    document.querySelector('table') ||
    document.getElementById('admin-logout')

  if (isAdminPage && !isAuthed()) {
    window.location.href = '/admin/column/login'
    return
  }

  /* ===== 로그아웃 ===== */
  const logoutBtn = document.getElementById('admin-logout')
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      clearAuth()
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
          headers: authHeaders(),
        })
        const data = await res.json()
        if (res.ok && data.ok) {
          alert(data.message)
          window.location.reload()
        } else {
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
          headers: authHeaders(),
        })
        const data = await res.json()
        if (res.ok && data.ok) {
          alert('칼럼이 삭제되었습니다.')
          window.location.reload()
        } else {
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

    // 이미지 삽입
    const insertImageBtn = document.getElementById('insert-image-btn')
    const imageInput = document.getElementById('content-image-input')
    if (insertImageBtn && imageInput) {
      insertImageBtn.addEventListener('click', () => imageInput.click())
      imageInput.addEventListener('change', (e) => {
        const file = e.target.files[0]
        if (!file) return
        const reader = new FileReader()
        reader.onload = (ev) => {
          editor.focus()
          // 정육점 키워드가 포함된 alt 텍스트 자동 생성
          const altText = `정육점 세무 관련 이미지 - ${file.name.replace(/\.[^.]+$/, '')}`
          document.execCommand(
            'insertHTML',
            false,
            `<img src="${ev.target.result}" alt="${altText}" style="max-width:100%;border-radius:0.75rem;margin:1.5rem 0;" />`
          )
        }
        reader.readAsDataURL(file)
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

    // 편집 내용을 hidden input에 동기화
    const syncContent = () => {
      if (hiddenContent) hiddenContent.value = editor.innerHTML
    }
    editor.addEventListener('input', syncContent)
    editor.addEventListener('blur', syncContent)
  }

  /* ===== 썸네일 이미지 미리보기 + dataURL 변환 ===== */
  const thumbInput = document.getElementById('f-thumbnail')
  const thumbPreview = document.getElementById('thumbnail-preview')
  let thumbnailDataUrl = '' // 새로 선택한 썸네일의 dataURL
  if (thumbInput && thumbPreview) {
    thumbInput.addEventListener('change', (e) => {
      const file = e.target.files[0]
      if (!file) return
      const reader = new FileReader()
      reader.onload = (ev) => {
        thumbnailDataUrl = ev.target.result
        thumbPreview.innerHTML = `<img src="${ev.target.result}" alt="썸네일 미리보기" style="width:100%;height:100%;object-fit:cover;" />`
      }
      reader.readAsDataURL(file)
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

  /* ===== 폼 제출 (D1 CRUD API 호출) ===== */
  const columnForm = document.getElementById('column-form')
  if (columnForm) {
    columnForm.addEventListener('submit', async (e) => {
      e.preventDefault()
      // 본문 내용 동기화
      if (editor && hiddenContent) {
        hiddenContent.value = editor.innerHTML
      }

      const btn = document.getElementById('column-submit-btn')
      const originalBtnHtml = btn ? btn.innerHTML : ''

      // 폼 데이터 수집 → ColumnInput 객체 생성
      const idInput = columnForm.querySelector('[name="id"]')
      const editId = idInput ? idInput.value.trim() : ''
      const isEdit = editId !== ''

      // 썸네일: 새 파일 선택 시 dataURL, 아니면 기존 thumbnail_existing 값
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
          headers: authHeaders(),
          body: JSON.stringify(payload),
        })
        const data = await res.json()

        if (res.ok && data.ok) {
          alert(data.message || (isEdit ? '칼럼이 수정되었습니다.' : '칼럼이 저장되었습니다.'))
          // 관리자 칼럼 목록으로 이동
          window.location.href = '/admin/column'
        } else {
          // 인증 만료 시 로그인 페이지로
          if (res.status === 401) {
            alert('로그인이 만료되었습니다. 다시 로그인해 주세요.')
            clearAuth()
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
})
