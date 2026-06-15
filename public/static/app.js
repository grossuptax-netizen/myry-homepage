// 명륜세무회계 - 프론트엔드 스크립트

document.addEventListener('DOMContentLoaded', () => {
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

      const originalText = submitBtn.innerHTML
      submitBtn.disabled = true
      submitBtn.innerHTML =
        '<i class="fas fa-spinner fa-spin mr-2"></i> 접수 중...'

      try {
        const res = await fetch('/api/consult', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        })
        const json = await res.json()

        if (json.ok) {
          result.textContent = json.message
          result.className = 'text-sm text-center success'
          form.reset()
        } else {
          result.textContent = json.error || '접수에 실패했습니다. 다시 시도해주세요.'
          result.className = 'text-sm text-center error'
        }
      } catch (err) {
        result.textContent = '네트워크 오류가 발생했습니다. 잠시 후 다시 시도해주세요.'
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
