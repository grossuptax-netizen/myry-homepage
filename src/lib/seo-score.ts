// ===== SEO 점수 (관리자 칼럼 목록의 'SEO 완료' 표시용) =====
// 글쓰기 화면의 SEO 점검(public/static/admin.js 의 updateSeoChecklist)과 같은 규칙.
// 저장된 글 HTML 로 서버에서 다시 계산하므로 DB 변경 없이 기존 글에도 표시된다.
// 한쪽 규칙을 바꾸면 다른 쪽도 같이 바꿀 것.
import type { Column } from './columns'

export const SEO_DONE_SCORE = 80 // 글쓰기 화면의 '좋음' 기준

type Status = 'good' | 'warn' | 'bad'

const decode = (s: string) =>
  s
    .replace(/&nbsp;/gi, ' ')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&amp;/gi, '&')

// 브라우저의 textContent/innerText 처럼 태그를 빼고 글자만 (문단 사이는 띄어쓰기)
function toPlain(html: string): string {
  return decode(
    String(html || '')
      .replace(/<(script|style)\b[\s\S]*?<\/\1>/gi, ' ')
      .replace(/<br\s*\/?>/gi, ' ')
      .replace(/<\/(p|div|h[1-6]|li|ul|ol|blockquote|tr|td|th|table|figure|figcaption|section)>/gi, ' ')
      .replace(/<[^>]+>/g, '')
  )
    .replace(/\s+/g, ' ')
    .trim()
}

const attr = (tag: string, name: string) => {
  const m = tag.match(new RegExp(`\\b${name}\\s*=\\s*("([^"]*)"|'([^']*)')`, 'i'))
  return m ? decode(m[2] ?? m[3] ?? '') : ''
}

const clip = (text: string, max: number) => (text.length > max ? text.slice(0, max - 1) + '…' : text)
const squash = (s: string) => String(s || '').toLowerCase().replace(/\s+/g, '')
const countIn = (text: string, kw: string) => (kw ? squash(text).split(kw).length - 1 : 0)
const keywordWords = (kwRaw: string) => String(kwRaw || '').split(/\s+/).map(squash).filter(Boolean)
const hasKeyword = (text: string, kwRaw: string) => {
  const t = squash(text)
  const words = keywordWords(kwRaw)
  return words.length > 0 && (t.includes(words.join('')) || words.every((w) => t.includes(w)))
}
const keywordPos = (text: string, kwRaw: string) => {
  if (!hasKeyword(text, kwRaw)) return -1
  return squash(text).indexOf(keywordWords(kwRaw)[0])
}

export function getSeoScore(column: Column): number {
  const content = column.content || ''
  const title = (column.title || '').trim()
  const finalTitle = (column.metaTitle || '').trim() || `${title || '제목'} | 명륜세무회계`

  let desc = (column.metaDescription || '').trim()
  let descSource = '메타 설명'
  if (!desc && (column.excerpt || '').trim()) {
    desc = toPlain(column.excerpt)
    descSource = '한 줄 요약'
  }
  if (!desc) {
    desc = toPlain(content)
    descSource = '본문 앞부분'
  }
  desc = clip(desc, 160)

  const statuses: Status[] = []
  const add = (s: Status) => statuses.push(s)
  const kwRaw = (column.focusKeyword || '').trim()
  const bodyText = toPlain(content)
  const bodyChars = bodyText.replace(/\s/g, '').length
  const headings = [...content.matchAll(/<h([23])\b[^>]*>([\s\S]*?)<\/h\1>/gi)].map((m) => toPlain(m[2]))
  const h2Count = (content.match(/<h2\b/gi) || []).length
  const imgs = content.match(/<img\b[^>]*>/gi) || []
  const noAlt = imgs.filter((tag) => !attr(tag, 'alt').trim()).length
  const links = [...content.matchAll(/<a\b[^>]*>/gi)].map((m) => m[0]).filter((t) => /\bhref\s*=/i.test(t)).map((t) => attr(t, 'href'))

  // 1) 핵심 검색어
  if (!squash(kwRaw)) {
    add('warn')
  } else {
    add(hasKeyword(title, kwRaw) ? 'good' : 'bad')
    const inMeta = keywordPos(finalTitle, kwRaw)
    add(inMeta === -1 ? 'bad' : inMeta <= 10 ? 'good' : 'warn')
    add(hasKeyword(desc, kwRaw) ? 'good' : 'bad')
    add(hasKeyword(bodyText.slice(0, 200), kwRaw) ? 'good' : 'warn')
    const words = keywordWords(kwRaw)
    add(headings.some((h) => words.some((w) => squash(h).includes(w))) ? 'good' : 'warn')
    const n = Math.min(...words.map((w) => countIn(bodyText, w)))
    add(n === 0 ? 'bad' : n === 1 ? 'warn' : n > 15 ? 'warn' : 'good')
  }

  // 2) 본문 구성
  add(bodyChars >= 1500 ? 'good' : bodyChars >= 600 ? 'warn' : 'bad')
  add(h2Count >= 2 ? 'good' : h2Count === 1 ? 'warn' : 'bad')
  if (!imgs.length) add('warn')
  else add(noAlt ? 'warn' : 'good')
  add(column.thumbnail || imgs.length > 0 ? 'good' : 'warn')
  add(links.some((h) => /jung6tax|^\/column/i.test(h)) ? 'good' : 'warn')

  // 3) 검색 결과 표시
  add(finalTitle.length <= 40 ? 'good' : 'warn')
  if (descSource === '메타 설명') add(desc.length >= 60 ? 'good' : 'warn')
  else add(descSource === '한 줄 요약' ? 'warn' : 'bad')
  add(/^[a-z0-9-]+$/.test((column.slug || '').trim()) ? 'good' : 'warn')

  const point: Record<Status, number> = { good: 1, warn: 0.5, bad: 0 }
  return Math.round((statuses.reduce((s, it) => s + point[it], 0) / statuses.length) * 100)
}
