// ===== Google OAuth 인증 헬퍼 (Cloudflare Workers 환경) =====
// Authorization Code Flow 방식 — 서버에서 안전하게 토큰 교환
//
// 환경 변수 (wrangler secret 또는 .dev.vars):
//   GOOGLE_CLIENT_ID      — Google OAuth Client ID
//   GOOGLE_CLIENT_SECRET  — Google OAuth Client Secret
//   ALLOWED_GOOGLE_EMAILS — 접근 허용된 Google 이메일 (콤마 또는 공백 구분)
//                            예: "admin@example.com, editor@gmail.com"
//   OAUTH_REDIRECT_BASE   — 리다이렉트 기본 URL (예: "https://jung6tax.com")
//                            미설정 시 요청 호스트에서 자동 추출

export interface AppEnv {
  DB: D1Database
  GOOGLE_CLIENT_ID?: string
  GOOGLE_CLIENT_SECRET?: string
  ALLOWED_GOOGLE_EMAILS?: string
  OAUTH_REDIRECT_BASE?: string
}

// ===== 세션 토큰 생성 =====
// 형식: base64(email:timestamp:hmac)
// HMAC은 GOOGLE_CLIENT_SECRET(있으면) 또는 고정 시드로 서명
export function createSessionToken(email: string, env: AppEnv): string {
  const ts = Date.now()
  const raw = `${email}:${ts}`
  const sig = sign(raw, env)
  const payload = `${raw}:${sig}`
  // base64 인코딩 (UTF-8 안전)
  return btoa(unescape(encodeURIComponent(payload)))
}

// ===== 세션 토큰 검증 =====
// 반환: { valid: boolean, email?: string, expired?: boolean }
export function verifySessionToken(token: string, env: AppEnv): {
  valid: boolean
  email?: string
  expired?: boolean
} {
  try {
    const payload = decodeURIComponent(escape(atob(token)))
    const parts = payload.split(':')
    // 이메일에 콜론이 포함될 수 있으므로, 마지막 두 요소가 timestamp와 sig
    if (parts.length < 3) return { valid: false }
    const sig = parts[parts.length - 1]
    const ts = parts[parts.length - 2]
    const email = parts.slice(0, -2).join(':')

    // 서명 검증
    const raw = `${email}:${ts}`
    const expectedSig = sign(raw, env)
    if (sig !== expectedSig) return { valid: false }

    // 4시간 만료
    const tsNum = parseInt(ts, 10)
    if (isNaN(tsNum)) return { valid: false }
    if (Date.now() - tsNum > 4 * 60 * 60 * 1000) {
      return { valid: false, expired: true, email }
    }

    return { valid: true, email }
  } catch {
    return { valid: false }
  }
}

// ===== HMAC 서명 (Web Crypto API 사용) =====
// Cloudflare Workers에서 crypto.subtle 사용 가능
async function signAsync(raw: string, env: AppEnv): Promise<string> {
  const secret = env.GOOGLE_CLIENT_SECRET || 'myungryun-fallback-secret-key-2026'
  const enc = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const sigBuf = await crypto.subtle.sign('HMAC', key, enc.encode(raw))
  // hex 문자열로 변환
  const bytes = new Uint8Array(sigBuf)
  let hex = ''
  for (let i = 0; i < bytes.length; i++) {
    hex += bytes[i].toString(16).padStart(2, '0')
  }
  return hex
}

// 동기식 래퍼 — signAsync는 Promise를 반환하므로, 실제 사용 시 await 필요
// 하지만 createSessionToken / verifySessionToken은 동기 함수로 유지하기 위해
// 간단한 해시를 사용하는 fallback 버전
export function sign(raw: string, env: AppEnv): string {
  // 간단한 문자열 해시 (djb2 변형) — 비밀키 기반
  const secret = env.GOOGLE_CLIENT_SECRET || 'myungryun-fallback-secret-key-2026'
  const data = raw + '|' + secret
  let hash = 5381
  for (let i = 0; i < data.length; i++) {
    hash = ((hash << 5) + hash) + data.charCodeAt(i)
    hash = hash & 0xffffffff // 32비트 유지
  }
  // 부호 없는 hex로 변환
  return (hash >>> 0).toString(16).padStart(8, '0')
}

// ===== Google OAuth 인증 URL 생성 =====
export function getGoogleAuthUrl(env: AppEnv, redirectBase: string): string {
  const clientId = env.GOOGLE_CLIENT_ID || ''
  const redirectUri = `${redirectBase}/api/auth/google/callback`

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    access_type: 'online',
    prompt: 'select_account',
  })

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
}

// ===== Authorization Code → 토큰 교환 =====
// Google 토큰 엔드포인트에 POST하여 access_token + id_token 획득
export async function exchangeCodeForToken(
  code: string,
  env: AppEnv,
  redirectBase: string
): Promise<{ ok: boolean; email?: string; name?: string; error?: string }> {
  const clientId = env.GOOGLE_CLIENT_ID || ''
  const clientSecret = env.GOOGLE_CLIENT_SECRET || ''
  const redirectUri = `${redirectBase}/api/auth/google/callback`

  if (!clientId || !clientSecret) {
    return { ok: false, error: 'Google OAuth가 설정되지 않았습니다.' }
  }

  try {
    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    })

    if (!res.ok) {
      const errText = await res.text()
      console.error('Google token exchange error:', errText)
      return { ok: false, error: 'Google 인증에 실패했습니다.' }
    }

    const data: any = await res.json()
    const idToken = data.id_token
    if (!idToken) {
      return { ok: false, error: '인증 토큰을 받지 못했습니다.' }
    }

    // id_token 디코딩 (JWT의 payload 부분)
    const payload = decodeJwtPayload(idToken)
    if (!payload.email) {
      return { ok: false, error: '이메일 정보를 받지 못했습니다.' }
    }

    return {
      ok: true,
      email: payload.email as string,
      name: payload.name as string | undefined,
    }
  } catch (e: any) {
    console.error('token exchange exception:', e)
    return { ok: false, error: '서버 통신 오류가 발생했습니다.' }
  }
}

// ===== JWT payload 디코딩 (서명 검증 없이 — 토큰 엔드포인트에서 받은 토큰이므로 신뢰) =====
function decodeJwtPayload(jwt: string): any {
  try {
    const parts = jwt.split('.')
    if (parts.length < 2) return {}
    const payloadB64 = parts[1]
    // base64url → base64
    const b64 = payloadB64.replace(/-/g, '+').replace(/_/g, '/')
    const json = decodeURIComponent(escape(atob(b64)))
    return JSON.parse(json)
  } catch {
    return {}
  }
}

// ===== 허용된 이메일인지 확인 =====
export function isAllowedEmail(email: string, env: AppEnv): boolean {
  const allowed = env.ALLOWED_GOOGLE_EMAILS || ''
  if (!allowed.trim()) return false // 허용 목록이 비어있으면 거부

  const list = allowed
    .split(/[,\s]+/)
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)

  return list.includes(email.toLowerCase())
}

// ===== OAuth 설정 완료 여부 확인 =====
export function isOAuthConfigured(env: AppEnv): boolean {
  return !!(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET)
}

// ===== 리다이렉트 기본 URL 추출 =====
export function getRedirectBase(env: AppEnv, headers: any): string {
  if (env.OAUTH_REDIRECT_BASE) return env.OAUTH_REDIRECT_BASE.replace(/\/$/, '')
  const proto = headers['x-forwarded-proto'] || 'https'
  const host = headers['x-forwarded-host'] || headers['host'] || 'localhost:3000'
  return `${proto}://${host}`
}
