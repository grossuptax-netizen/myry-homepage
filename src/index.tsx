import { Hono } from 'hono'
import { renderer } from './renderer'
import { Home } from './pages/home'

const app = new Hono()

app.use(renderer)

// 메인 랜딩 페이지
app.get('/', (c) => {
  return c.render(<Home />)
})

// 상담 신청 접수 API
app.post('/api/consult', async (c) => {
  try {
    const body = await c.req.json<{
      name?: string
      phone?: string
      business?: string
      message?: string
    }>()

    if (!body.name || !body.phone) {
      return c.json({ ok: false, error: '이름과 연락처는 필수입니다.' }, 400)
    }

    // 실제 서비스에서는 D1/KV 저장 또는 외부 알림(이메일/슬랙) 연동
    // 현재는 접수 확인 응답만 반환
    return c.json({
      ok: true,
      message: '상담 신청이 정상적으로 접수되었습니다. 1분 내로 연락드리겠습니다.',
      received: {
        name: body.name,
        phone: body.phone,
        business: body.business ?? '',
        message: body.message ?? '',
      },
    })
  } catch (e) {
    return c.json({ ok: false, error: '요청 형식이 올바르지 않습니다.' }, 400)
  }
})

export default app
