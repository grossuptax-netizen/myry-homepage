// 칼럼 상세 페이지 - 관리자 전용 삭제 버튼
// 관리자로 로그인한 경우에만 이 스크립트가 페이지에 포함됨
// 실제 삭제 권한은 서버(DELETE /api/admin/column/:id)에서 다시 확인

document.addEventListener('DOMContentLoaded', () => {
  const btn = document.getElementById('column-delete-btn')
  if (!btn) return

  btn.addEventListener('click', async () => {
    const id = btn.getAttribute('data-id')
    const title = btn.getAttribute('data-title')
    const back = btn.getAttribute('data-back') || '/column'
    if (!confirm(`정말로 이 칼럼을 삭제하시겠습니까?\n\n제목: ${title}`)) return

    const originalHtml = btn.innerHTML
    btn.disabled = true
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 삭제 중...'

    try {
      const res = await fetch('/api/admin/column/' + encodeURIComponent(id), {
        method: 'DELETE',
        credentials: 'same-origin',
      })
      const data = await res.json()
      if (res.ok && data.ok) {
        alert('칼럼이 삭제되었습니다.')
        window.location.href = back
        return
      }
      if (res.status === 401) {
        alert('로그인이 만료되었습니다. 다시 로그인해 주세요.')
        window.location.href = '/admin/column/login'
        return
      }
      alert(data.error || '삭제에 실패했습니다.')
    } catch (err) {
      alert('서버 연결에 실패했습니다.')
    }
    btn.disabled = false
    btn.innerHTML = originalHtml
  })
})
