// ===== Cloudinary 서버 업로드 (네이버 사진 옮기기) =====
// 네이버 사진 서버는 다른 사이트 화면에서 바로 띄우면 막으므로(Referer 검사),
// 서버가 Referer 없이 받아서 정육점 Cloudinary 폴더로 서명 업로드한다.
//
// 환경변수 (서버 전용, 코드에 키를 넣지 않음):
//   CLOUDINARY_API_KEY / CLOUDINARY_API_SECRET — 서명 업로드
//   CLOUDINARY_CLOUD_NAME — (선택) 미설정 시 기본 cloud name 사용

import { signCloudinaryParams } from './auth'

// 정육점 홈페이지 전용 폴더 (호텔 홈페이지는 'myhoteltax')
export const CLOUDINARY_FOLDER = 'jung6tax'
export const DEFAULT_CLOUDINARY_CLOUD_NAME = 'vxqu6qlr'

const MAX_IMAGE_BYTES = 10 * 1024 * 1024
const FETCH_TIMEOUT_MS = 15000

export interface CloudinaryConfig {
  cloudName: string
  apiKey: string
  apiSecret: string
}

export function cloudinaryConfig(env: {
  CLOUDINARY_CLOUD_NAME?: string
  CLOUDINARY_API_KEY?: string
  CLOUDINARY_API_SECRET?: string
}): CloudinaryConfig | null {
  if (!env.CLOUDINARY_API_KEY || !env.CLOUDINARY_API_SECRET) return null
  return {
    cloudName: env.CLOUDINARY_CLOUD_NAME || DEFAULT_CLOUDINARY_CLOUD_NAME,
    apiKey: env.CLOUDINARY_API_KEY,
    apiSecret: env.CLOUDINARY_API_SECRET,
  }
}

// 링크 카드 썸네일 등 네이버 중계 주소(dthumb-phinf.pstatic.net/?src="원본")를 원본 주소로
export function unwrapProxyImage(raw: string): string {
  try {
    const u = new URL(raw)
    if (/^dthumb-phinf\.pstatic\.net$/i.test(u.hostname)) {
      const inner = (u.searchParams.get('src') || '').replace(/^"|"$/g, '')
      if (/^https?:\/\//i.test(inner)) return inner
    }
  } catch {}
  return raw
}

// 네이버 사진은 작은 판(type=w800 등)으로 오므로 큰 판부터 (카페 w1600, 블로그 w966)
export function largerNaverImage(url: string): string {
  try {
    const u = new URL(url)
    const want = /^cafeptthumb-phinf\.pstatic\.net$/i.test(u.hostname)
      ? 1600
      : /^(postfiles|mblogthumb-phinf)\.pstatic\.net$/i.test(u.hostname)
        ? 966
        : 0
    const m = (u.searchParams.get('type') || '').match(/^w(\d+)/)
    if (!want || (m && Number(m[1]) >= want)) return url
    u.searchParams.set('type', 'w' + want)
    return u.toString()
  } catch {
    return url
  }
}

// Referer 없이 일반 브라우저처럼 받기 (10MB · 15초 제한, 사진만)
export async function fetchImage(url: string): Promise<Blob> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
  try {
    const res = await fetch(url, {
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36',
        Accept: 'image/*,*/*;q=0.8',
      },
    })
    if (!res.ok) throw new Error(`사진 받기 실패: HTTP ${res.status}`)
    const type = res.headers.get('content-type') || ''
    if (!/^image\//i.test(type)) throw new Error('사진이 아닌 응답입니다.')
    const declared = Number(res.headers.get('content-length') || 0)
    if (declared > MAX_IMAGE_BYTES) throw new Error('10MB를 넘는 사진입니다.')
    const buf = await res.arrayBuffer()
    if (buf.byteLength > MAX_IMAGE_BYTES) throw new Error('10MB를 넘는 사진입니다.')
    return new Blob([buf], { type })
  } finally {
    clearTimeout(timer)
  }
}

// 서명 업로드: folder · timestamp 를 서명에 포함 (API Secret 은 서버에만)
export async function uploadFromServer(cfg: CloudinaryConfig, file: Blob | string): Promise<string> {
  const timestamp = String(Math.floor(Date.now() / 1000))
  const signature = await signCloudinaryParams({ folder: CLOUDINARY_FOLDER, timestamp }, cfg.apiSecret)
  const form = new FormData()
  form.append('file', file) // Blob, 또는 사진 주소 문자열(Cloudinary 가 직접 가져옴)
  form.append('api_key', cfg.apiKey)
  form.append('timestamp', timestamp)
  form.append('folder', CLOUDINARY_FOLDER)
  form.append('signature', signature)
  const res = await fetch(`https://api.cloudinary.com/v1_1/${cfg.cloudName}/image/upload`, {
    method: 'POST',
    body: form,
  })
  const json: any = await res.json().catch(() => ({}))
  if (!res.ok || !json.secure_url) {
    throw new Error(json?.error?.message || `Cloudinary 업로드 실패 (HTTP ${res.status})`)
  }
  return json.secure_url as string
}

// 1) 서버가 받아서 올리기 (큰 판 → 원래 주소)  2) 안 되면 Cloudinary 가 주소로 직접 가져오기
export async function importImage(
  cfg: CloudinaryConfig,
  rawUrl: unknown
): Promise<{ ok: true; url: string; via: 'server' | 'cloudinary' } | { ok: false; error: string }> {
  if (typeof rawUrl !== 'string' || !/^https?:\/\//i.test(rawUrl)) {
    return { ok: false, error: '사진 주소가 올바르지 않습니다.' }
  }
  const src = unwrapProxyImage(rawUrl)
  for (const candidate of new Set([largerNaverImage(src), src])) {
    try {
      return { ok: true, url: await uploadFromServer(cfg, await fetchImage(candidate)), via: 'server' }
    } catch {}
  }
  try {
    return { ok: true, url: await uploadFromServer(cfg, src), via: 'cloudinary' }
  } catch (e: any) {
    return { ok: false, error: e?.message || '사진을 옮기지 못했습니다.' }
  }
}
