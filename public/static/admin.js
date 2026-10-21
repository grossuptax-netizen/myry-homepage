// 관리자 페이지 스크립트
// Google OAuth 세션 (쿠키 기반) + D1 CRUD API 연동 + Cloudinary 이미지 업로드
// - 로그인: Google OAuth → /api/auth/google → 콜백 → 쿠키 설정
// - 칼럼 저장: POST /api/admin/column (신규) / PUT /api/admin/column/:id (수정)
// - 칼럼 삭제: DELETE /api/admin/column/:id
// - 시드: POST /api/admin/seed
// - 로그아웃: POST /api/auth/logout
// - 이미지 업로드: Cloudinary unsigned upload (썸네일 + 본문 삽입 이미지)
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
 * 이미지 파일을 Cloudinary에 업로드하고 secure_url 반환
 * @param {File} file - 업로드할 이미지 파일
 * @returns {Promise<string>} secure_url
 * @throws {Error} 업로드 실패 시
 */
async function uploadToCloudinary(file) {
  if (!file) throw new Error('파일이 없습니다.')
  if (!file.type || !file.type.startsWith('image/')) {
    throw new Error('이미지 파일만 업로드 가능합니다.')
  }

  const formData = new FormData()
  formData.append('file', file)
  formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET)

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
          // 관리자 칼럼 목록으로 이동
          window.location.href = '/admin/column'
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
