// 칼럼 목록 페이지 - 더보기 버튼 (페이지네이션 대신)
// SEO 안전: 모든 카드는 서버 사이드 렌더링, JS는 보조 기능만

document.addEventListener('DOMContentLoaded', () => {
  const loadMoreBtn = document.getElementById('load-more-btn')
  if (!loadMoreBtn) return

  // 현재 표시된 카드 수
  const grid = document.querySelector('.grid')
  if (!grid) return

  let visibleCount = grid.children.length

  loadMoreBtn.addEventListener('click', () => {
    // 더미 단계: 모든 카드가 이미 서버에서 렌더링됨
    // 실제 구현에서는 fetch('/api/columns?page=2') 로 추가 로드
    // 현재는 안내 메시지만 표시
    loadMoreBtn.innerHTML = '<i class="fas fa-check"></i> 모든 칼럼을 표시했습니다'
    loadMoreBtn.disabled = true
    loadMoreBtn.classList.add('opacity-50', 'cursor-not-allowed')
  })

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
