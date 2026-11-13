// ===== Google OAuth 인증 헬퍼 (Cloudflare Workers 환경) =====
// Authorization Code Flow 방식 — 서버에서 안전하게 토큰 교환
//
// 환경 변수 (wrangler secret 또는 .dev.vars):
//   GOOGLE_CLIENT_ID      — Google OAuth Client ID
//   GOOGLE_CLIENT_SECRET  — Google OAuth Client Secret
//   ALLOWED_GOOGLE_EMAILS — (선택) 초기 부트스트랩용 허용 이메일 (콤마/공백 구분)
//                            D1의 admin_emails 테이블이 비어있을 때 fallback으로 사용
//   SESSION_SECRET        — (선택) HMAC 서명용 비밀키. 미설정 시 CLIENT_SECRET 사용
//   OAUTH_REDIRECT_BASE   — (선택) 리다이렉트 기본 URL
//   CLOUDINARY_API_KEY    — (권장) Cloudinary 서명 업로드용 API Key
//   CLOUDINARY_API_SECRET — (권장) Cloudinary 서명 업로드용 API Secret
//                            두 값이 있으면 관리자만 서명을 받아 업로드 가능

export interface AppEnv {
  DB: D1Database
  GOOGLE_CLIENT_ID?: string
  GOOGLE_CLIENT_SECRET?: string
  ALLOWED_GOOGLE_EMAILS?: string
  SESSION_SECRET?: string
  OAUTH_REDIRECT_BASE?: string
  CLOUDINARY_API_KEY?: string
  CLOUDINARY_API_SECRET?: string
}

// ===== HMAC 서명 (Web Crypto API 사용, 비동기) =====
// Cloudflare Workers에서 crypto.subtle 사용 — 암호학적으로 안전한 서명
// 비밀키가 없으면 서명하지 않음 (코드에 고정된 키로 서명하면 누구나 세션을 위조할 수 있음)
async function signHmac(raw: string, env: AppEnv): Promise<string> {
  const secret = env.SESSION_SECRET || env.GOOGLE_CLIENT_SECRET
  if (!secret) throw new Error('SESSION_SECRET 또는 GOOGLE_CLIENT_SECRET 가 설정되지 않았습니다.')
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

// ===== 상수 시간 비교(타이밍 공격 방지) =====
function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return diff === 0
}

// ===== 로그인 유지 기간 (30일) =====
// 쿠키 Max-Age 와 서버 측 토큰 만료 검사가 같은 값을 쓰도록 한 곳에서 관리
export const SESSION_MAX_AGE_SECONDS = 30 * 24 * 60 * 60

// ===== 세션 토큰 생성 (비동기, HMAC-SHA256 서명) =====
// 형식: base64url(email:timestamp:hmac)
export async function createSessionToken(email: string, env: AppEnv): Promise<string> {
  const ts = Date.now()
  const raw = `${email}:${ts}`
  const sig = await signHmac(raw, env)
  const payload = `${raw}:${sig}`
  // base64 인코딩 (UTF-8 안전) → URL 안전 base64url 로 변환
  const b64 = btoa(unescape(encodeURIComponent(payload)))
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

// ===== 세션 토큰 검증 (비동기) =====
export async function verifySessionToken(
  token: string,
  env: AppEnv
): Promise<{ valid: boolean; email?: string; expired?: boolean; issuedAt?: number }> {
  try {
    // base64url → base64
    const b64 = token.replace(/-/g, '+').replace(/_/g, '/')
    // 패딩 복원
    const pad = b64.length % 4
    const padded = pad ? b64 + '='.repeat(4 - pad) : b64
    const payload = decodeURIComponent(escape(atob(padded)))
    const parts = payload.split(':')
    if (parts.length < 3) return { valid: false }
    const sig = parts[parts.length - 1]
    const ts = parts[parts.length - 2]
    const email = parts.slice(0, -2).join(':')

    // 서명 검증 (타이밍 공격 방지 상수 시간 비교)
    const raw = `${email}:${ts}`
    const expectedSig = await signHmac(raw, env)
    if (!constantTimeEqual(sig, expectedSig)) return { valid: false }

    // 30일 만료 (사용자 편의성 + 보안 균형)
    const tsNum = parseInt(ts, 10)
    if (isNaN(tsNum)) return { valid: false }
    if (Date.now() - tsNum > SESSION_MAX_AGE_SECONDS * 1000) {
      return { valid: false, expired: true, email }
    }

    return { valid: true, email, issuedAt: tsNum }
  } catch {
    return { valid: false }
  }
}

// ===== OAuth state 값 생성 (로그인 CSRF 방지) =====
// 로그인 시작 시 쿠키에 저장하고, 콜백에서 Google이 돌려준 값과 일치하는지 확인
export function createOAuthState(): string {
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  let hex = ''
  for (let i = 0; i < bytes.length; i++) {
    hex += bytes[i].toString(16).padStart(2, '0')
  }
  return hex
}

export function isValidOAuthState(expected: string | undefined, actual: string | undefined): boolean {
  if (!expected || !actual) return false
  return constantTimeEqual(expected, actual)
}

// ===== Google OAuth 인증 URL 생성 =====
export function getGoogleAuthUrl(env: AppEnv, redirectBase: string, state: string): string {
  const clientId = env.GOOGLE_CLIENT_ID || ''
  const redirectUri = `${redirectBase}/api/auth/google/callback`

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    access_type: 'online',
    // prompt 생략: 브라우저에 구글 계정이 하나만 로그인돼 있으면 계정 선택 없이 바로 통과
    state,
  })

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
}

// ===== Authorization Code → 토큰 교환 =====
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
    // 이메일 소유권 검증(Google 검증 완료 플래그)
    if (payload.email_verified === false) {
      return { ok: false, error: 'Google에서 검증되지 않은 이메일입니다.' }
    }

    return {
      ok: true,
      email: (payload.email as string).toLowerCase(),
      name: payload.name as string | undefined,
    }
  } catch (e: any) {
    console.error('token exchange exception:', e)
    return { ok: false, error: '서버 통신 오류가 발생했습니다.' }
  }
}

// ===== JWT payload 디코딩 =====
// 토큰 엔드포인트에서 직접 받은 id_token이므로 서명 검증은 생략
function decodeJwtPayload(jwt: string): any {
  try {
    const parts = jwt.split('.')
    if (parts.length < 2) return {}
    const payloadB64 = parts[1]
    // base64url → base64
    const b64 = payloadB64.replace(/-/g, '+').replace(/_/g, '/')
    const pad = b64.length % 4
    const padded = pad ? b64 + '='.repeat(4 - pad) : b64
    const json = decodeURIComponent(escape(atob(padded)))
    return JSON.parse(json)
  } catch {
    return {}
  }
}

// ===== 허용된 이메일인지 확인 (D1 기반, 비동기) =====
// 1순위: D1의 admin_emails 테이블(is_active=1)
// 2순위(fallback): 환경변수 ALLOWED_GOOGLE_EMAILS — D1 테이블이 완전히 비어있을 때만
//                   초기 부트스트랩 용도로 사용 (잠김 방지)
export async function isAllowedEmail(email: string, env: AppEnv): Promise<boolean> {
  const normalized = email.trim().toLowerCase()
  if (!normalized) return false

  // 1. D1에서 조회
  try {
    if (env.DB) {
      // 테이블 자체가 존재하는지 먼저 안전하게 확인(마이그레이션 미적용 시 fallback)
      const row = await env.DB
        .prepare('SELECT COUNT(*) as cnt FROM admin_emails WHERE is_active = 1')
        .first<{ cnt: number }>()
      const activeCount = row?.cnt ?? 0

      if (activeCount > 0) {
        // 활성 관리자가 하나라도 있으면 D1을 유일한 진실 공급원으로 사용
        const match = await env.DB
          .prepare(
            'SELECT 1 as hit FROM admin_emails WHERE email = ? AND is_active = 1 LIMIT 1'
          )
          .bind(normalized)
          .first<{ hit: number }>()
        return !!match
      }
      // activeCount === 0 → 아래 env fallback 로 진입
    }
  } catch (e) {
    console.error('isAllowedEmail D1 error (will try env fallback):', e)
  }

  // 2. Fallback: 환경변수 (D1이 비어있거나 접근 실패 시 — 초기 부트스트랩용)
  const envList = env.ALLOWED_GOOGLE_EMAILS || ''
  if (!envList.trim()) return false
  const allowed = envList
    .split(/[,\s]+/)
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
  return allowed.includes(normalized)
}

// ===== Cloudinary 서명 업로드 =====
// 서명 업로드를 쓰면 API Secret 없이는 업로드할 수 없으므로,
// 관리자 인증을 통과한 요청에만 서명을 내려주어 '관리자만 업로드'를 보장
export function isCloudinarySigningConfigured(env: AppEnv): boolean {
  return !!(env.CLOUDINARY_API_KEY && env.CLOUDINARY_API_SECRET)
}

// Cloudinary 규칙: 파라미터를 키 이름순으로 'k=v&k=v' 로 이어붙이고 API Secret 을 붙여 SHA-1
export async function signCloudinaryParams(
  params: Record<string, string>,
  apiSecret: string
): Promise<string> {
  const toSign = Object.keys(params)
    .sort()
    .map((k) => `${k}=${params[k]}`)
    .join('&')
  const digest = await crypto.subtle.digest('SHA-1', new TextEncoder().encode(toSign + apiSecret))
  const bytes = new Uint8Array(digest)
  let hex = ''
  for (let i = 0; i < bytes.length; i++) {
    hex += bytes[i].toString(16).padStart(2, '0')
  }
  return hex
}

// ===== OAuth 설정 완료 여부 확인 =====
export function isOAuthConfigured(env: AppEnv): boolean {
  return !!(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET)
}

// ===== 리다이렉트 기본 URL 추출 =====
export function getRedirectBase(env: AppEnv, headers: any): string {
  if (env.OAUTH_REDIRECT_BASE) return env.OAUTH_REDIRECT_BASE.replace(/\/$/, '')
  // Hono c.req.header 는 함수. 안전하게 두 방식 모두 대응
  const read = (name: string): string | undefined => {
    if (typeof headers === 'function') return headers(name) || undefined
    return headers?.[name] || headers?.[name.toLowerCase()] || undefined
  }
  const proto = read('x-forwarded-proto') || 'https'
  const host = read('x-forwarded-host') || read('host') || 'localhost:3000'
  return `${proto}://${host}`
}
