// 칼럼 목록 페이지 - 카드 등장 효과 (페이지 나누기는 서버에서 ?page= 로 처리)
// SEO 안전: 모든 카드는 서버 사이드 렌더링, JS는 보조 기능만

document.addEventListener('DOMContentLoaded', () => {
  const grid = document.querySelector('.grid')
  if (!grid) return

  // 카드 호버 시 부드러운 진입 애니메이션 (IntersectionObserver)
  if ('IntersectionObserver' in window) {
    const cards = grid.querySelectorAll('article')
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.style.opacity = '1'
            entry.target.style.transform = 'translateY(0)'
            io.unobserve(entry.target)
          }
        })
      },
      { threshold: 0.1 }
    )
    cards.forEach((card, i) => {
      card.style.opacity = '0'
      card.style.transform = 'translateY(20px)'
      card.style.transition = `opacity 0.5s ease ${i * 0.05}s, transform 0.5s ease ${i * 0.05}s`
      io.observe(card)
    })
  }
})
