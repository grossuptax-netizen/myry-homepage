// 명륜세무회계 - 프론트엔드 스크립트

document.addEventListener('DOMContentLoaded', () => {
  /* ===== 이메일 주소 난독화 해제 (봇 수집 방지) ===== */
  // HTML 소스에는 이메일이 평문으로 노출되지 않음.
  // charCode 배열을 런타임에 복원하여 클릭 시에만 실제 주소를 보여줌.
  const emailEl = document.getElementById('footer-email')
  if (emailEl) {
    const codes = emailEl.getAttribute('data-e')
    if (codes) {
      const decoded = codes
        .split(',')
        .map((c) => String.fromCharCode(parseInt(c, 10)))
        .join('')
      const display = decoded
      const mailto = 'mailto:' + decoded + '?subject=' + encodeURIComponent('[명륜세무회계] 상담 문의')

      emailEl.textContent = display
      emailEl.setAttribute('href', mailto)
      // 우클릭/복사 방지는 사용성을 해치므로 적용하지 않음.
    }
  }

  /* ===== 상담 폼 로드 시간 기록 (봇 차단) ===== */
  const formLoadedInput = document.getElementById('form-loaded-at')
  const loadedAt = Date.now().toString()
  if (formLoadedInput) {
    formLoadedInput.value = loadedAt
  }

  /* ===== 스크롤 진입 애니메이션 ===== */
  const targets = document.querySelectorAll(
    'main section > div, main section h2'
  )
  targets.forEach((el) => el.classList.add('reveal'))

  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible')
            io.unobserve(entry.target)
          }
        })
      },
      { threshold: 0.12 }
    )
    targets.forEach((el) => io.observe(el))
  } else {
    targets.forEach((el) => el.classList.add('is-visible'))
  }

  /* ===== 연락처 자동 하이픈 ===== */
  const phone = document.getElementById('f-phone')
  if (phone) {
    phone.addEventListener('input', (e) => {
      let v = e.target.value.replace(/[^0-9]/g, '').slice(0, 11)
      if (v.length > 7) {
        v = v.replace(/(\d{3})(\d{4})(\d{1,4})/, '$1-$2-$3')
      } else if (v.length > 3) {
        v = v.replace(/(\d{3})(\d{1,4})/, '$1-$2')
      }
      e.target.value = v
    })
  }

  /* ===== 상담 신청 폼 제출 ===== */
  const form = document.getElementById('consult-form')
  const result = document.getElementById('consult-result')
  const submitBtn = document.getElementById('consult-submit')

  /* ===== Formspree 이메일 전송 (수신처는 난독화) ===== */
  const FORMSPREE_ENDPOINT = 'https://formspree.io/f/mreweznq'

  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault()
      result.className = 'text-sm text-center hidden'

      const data = {
        name: form.name.value.trim(),
        phone: form.phone.value.trim(),
        business: form.business.value.trim(),
        message: form.message.value.trim(),
      }

      if (!data.name || !data.phone) {
        result.textContent = '이름과 연락처를 입력해주세요.'
        result.className = 'text-sm text-center error'
        return
      }

      /* ===== 봇 차단 1: Honeypot 필드 검사 ===== */
      // 사람에게는 보이지 않는 함정 필드. 봇은 모든 필드를 채우는 경향이 있음.
      const honeypot = form.querySelector('#website-url')
      if (honeypot && honeypot.value.trim() !== '') {
        result.textContent = '상담 신청이 접수되었습니다.'
        result.className = 'text-sm text-center success'
        form.reset()
        return // 봇으로 판단되어 조용히 차단
      }

      /* ===== 봇 차단 2: 폼 로드 후 시간 검사 ===== */
      // 사람이 폼을 읽고 입력하는 데 최소 수 초가 소요됨.
      // 3초 미만 제출은 봇일 확률이 높음.
      const loadedAtValue = formLoadedInput ? formLoadedInput.value : ''
      if (loadedAtValue) {
        const elapsed = Date.now() - parseInt(loadedAtValue, 10)
        if (elapsed < 3000) {
          result.textContent = '상담 신청이 접수되었습니다.'
          result.className = 'text-sm text-center success'
          form.reset()
          return // 봇으로 판단되어 조용히 차단
        }
      }

      const originalText = submitBtn.innerHTML
      submitBtn.disabled = true
      submitBtn.innerHTML =
        '<i class="fas fa-spinner fa-spin mr-2"></i> 접수 중...'

      try {
        const res = await fetch(FORMSPREE_ENDPOINT, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify({
            _subject: '[명륜세무회계] 새 상담 신청 - ' + data.name,
            이름: data.name,
            연락처: data.phone,
            '업종/상호': data.business || '(미입력)',
            문의내용: data.message || '(미입력)',
          }),
        })

        if (res.ok) {
          result.innerHTML =
            '<i class="fas fa-circle-check mr-1"></i> 상담 신청이 정상적으로 접수되었습니다. 빠른 시일 내에 연락드리겠습니다.'
          result.className = 'text-sm text-center success'
          form.reset()
        } else {
          let msg = '접수에 실패했습니다. 잠시 후 다시 시도하시거나 031-8027-2888로 연락해 주세요.'
          try {
            const json = await res.json()
            if (json && json.errors && json.errors.length) {
              msg = json.errors.map((er) => er.message).join(' ')
            }
          } catch (_) {}
          result.textContent = msg
          result.className = 'text-sm text-center error'
        }
      } catch (err) {
        result.textContent =
          '네트워크 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.'
        result.className = 'text-sm text-center error'
      } finally {
        submitBtn.disabled = false
        submitBtn.innerHTML = originalText
      }
    })
  }

  /* ===== 헤더 스크롤 그림자 ===== */
  const header = document.getElementById('site-header')
  if (header) {
    window.addEventListener('scroll', () => {
      if (window.scrollY > 10) {
        header.classList.add('shadow-md')
      } else {
        header.classList.remove('shadow-md')
      }
    })
  }
})
