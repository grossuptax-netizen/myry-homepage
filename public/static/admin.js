// 관리자 페이지 스크립트
// 로그인 인증, 리치 텍스트 에디터, 폼 제출, 이미지 업로드 미리보기

document.addEventListener('DOMContentLoaded', () => {
  /* ===== 관리자 세션 관리 (간단한 클라이언트 사이드 인증) ===== */
  // 실제 운영에서는 서버 사이드 인증(JWT/세션) 사용 권장
  // 현재는 데모용 클라이언트 사이드 비밀번호 검증
  const ADMIN_PASSWORD = 'myungryun2026' // 데모용 비밀번호 (운영 시 환경변수로 이동)
  const SESSION_KEY = 'admin_authed'
  const SESSION_DURATION = 4 * 60 * 60 * 1000 // 4시간

  function isAuthed() {
    const data = sessionStorage.getItem(SESSION_KEY)
    if (!data) return false
    try {
      const { ts } = JSON.parse(data)
      return Date.now() - ts < SESSION_DURATION
    } catch {
      return false
    }
  }

  function setAuthed() {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify({ ts: Date.now() }))
  }

  function clearAuth() {
    sessionStorage.removeItem(SESSION_KEY)
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

    loginForm.addEventListener('submit', (e) => {
      e.preventDefault()
      const errorEl = document.getElementById('login-error')
      const errorMsg = document.getElementById('login-error-msg')
      const btn = document.getElementById('admin-login-btn')

      const password = pwInput ? pwInput.value : ''

      btn.disabled = true
      btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> 확인 중...'

      // 데모용 비밀번호 검증 (운영 시 서버 API 호출로 변경)
      setTimeout(() => {
        if (password === ADMIN_PASSWORD) {
          setAuthed()
          errorEl.classList.add('hidden')
          btn.innerHTML = '<i class="fas fa-check mr-2"></i> 로그인 성공'
          setTimeout(() => {
            window.location.href = '/admin/column'
          }, 500)
        } else {
          errorEl.classList.remove('hidden')
          if (errorMsg) errorMsg.textContent = '비밀번호가 올바르지 않습니다.'
          btn.disabled = false
          btn.innerHTML = '<i class="fas fa-sign-in-alt mr-2"></i> 로그인'
          pwInput.value = ''
          pwInput.focus()
        }
      }, 600)
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

  /* ===== 칼럼 삭제 ===== */
  const deleteBtns = document.querySelectorAll('.admin-delete-btn')
  deleteBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-id')
      const title = btn.getAttribute('data-title')
      if (confirm(`정말로 이 칼럼을 삭제하시겠습니까?\n\n제목: ${title}`)) {
        // 데모: 실제 구현에서는 fetch('/api/admin/column/delete', { method: 'POST', body: ... })
        alert('데모 환경에서는 칼럼 삭제가 실제로 처리되지 않습니다.\n운영 환경에서는 D1 데이터베이스에서 삭제됩니다.')
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

  /* ===== 썸네일 이미지 미리보기 ===== */
  const thumbInput = document.getElementById('f-thumbnail')
  const thumbPreview = document.getElementById('thumbnail-preview')
  if (thumbInput && thumbPreview) {
    thumbInput.addEventListener('change', (e) => {
      const file = e.target.files[0]
      if (!file) return
      const reader = new FileReader()
      reader.onload = (ev) => {
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

  /* ===== 폼 제출 ===== */
  const columnForm = document.getElementById('column-form')
  if (columnForm) {
    columnForm.addEventListener('submit', (e) => {
      e.preventDefault()
      // 본문 내용 동기화
      if (editor && hiddenContent) {
        hiddenContent.value = editor.innerHTML
      }

      const btn = document.getElementById('column-submit-btn')
      if (btn) {
        btn.disabled = true
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 저장 중...'
      }

      // 데모: 실제 구현에서는 fetch('/api/admin/column/save', { method: 'POST', ... })
      // 폼 데이터 수집
      const formData = new FormData(columnForm)
      const data = {}
      formData.forEach((val, key) => {
        data[key] = val
      })

      setTimeout(() => {
        alert(
          '데모 환경에서는 칼럼 저장이 실제로 처리되지 않습니다.\n\n' +
            '운영 환경에서는 D1 데이터베이스에 저장되고:\n' +
            '- 칼럼 목록에 즉시 반영\n' +
            '- sitemap.xml 자동 갱신\n' +
            '- SEO 메타 태그 자동 생성'
        )
        if (btn) {
          btn.disabled = false
          btn.innerHTML = '<i class="fas fa-save"></i> 칼럼 저장'
        }
      }, 800)
    })
  }
})
