// ===== D1 데이터베이스 접근 레이어 =====
// 칼럼 게시판 CRUD
//
// 설계 원칙:
// 1. 모든 쿼리는 파라미터 바인딩(? 플레이스홀더) 사용 → SQL 인젝션 방지
// 2. 보여주는 글은 DB 에 있는 글뿐 (조회 실패·빈 DB 면 빈 목록)
// 3. D1 행(snake_case, INTEGER 불린) ↔ Column 인터페이스(camelCase) 변환

import type { Column } from './columns'

// D1 원시 행 타입 (DB 컬럼명 스네이크케이스)
interface ColumnRow {
  id: number
  category: string
  title: string
  slug: string
  excerpt: string | null
  content: string
  thumbnail: string | null
  thumbnail_alt: string | null
  author: string | null
  published_at: string
  meta_title: string | null
  meta_description: string | null
  views: number
  is_published: number
  created_at: string
  updated_at: string
  source_url?: string | null // 0003 마이그레이션 (네이버 원본 주소)
  focus_keyword?: string | null // 0004 마이그레이션 (SEO 핵심 검색어)
}

// D1 행 → Column 인터페이스 변환
function rowToColumn(row: ColumnRow): Column {
  return {
    id: row.id,
    category: row.category,
    title: row.title,
    slug: row.slug,
    excerpt: row.excerpt ?? '',
    content: row.content,
    thumbnail: row.thumbnail ?? '',
    thumbnailAlt: row.thumbnail_alt ?? '',
    author: row.author ?? '김명륜 세무사',
    publishedAt: row.published_at,
    updatedAt: row.updated_at ? row.updated_at.slice(0, 10) : undefined,
    isPublished: row.is_published !== 0,
    // D1 의 CURRENT_TIMESTAMP 는 'YYYY-MM-DD HH:MM:SS' (UTC) 형식
    savedAt: row.updated_at ? row.updated_at.replace(' ', 'T') + 'Z' : undefined,
    sourceUrl: row.source_url ?? undefined,
    focusKeyword: row.focus_keyword ?? undefined,
    metaTitle: row.meta_title ?? '',
    metaDescription: row.meta_description ?? '',
    views: row.views ?? 0,
  }
}

// 발행일 내림차순(최신순) 정렬
function sortByPublished(cols: Column[]): Column[] {
  return [...cols].sort(
    (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
  )
}

// ===== 조회 함수들 =====
// DB(D1)에 있는 글만 보여줌. 글이 하나도 없으면 빈 목록 (예전처럼 코드 속 더미 글로 채우지 않음)

// 전체 공개 칼럼 조회 (최신순)
export async function getAllColumns(db: D1Database | undefined): Promise<Column[]> {
  if (!db) return []
  try {
    const result = await db
      .prepare('SELECT * FROM columns WHERE is_published = 1 ORDER BY published_at DESC')
      .all<ColumnRow>()
    return (result.results || []).map(rowToColumn)
  } catch (e) {
    console.error('getAllColumns error:', e)
    return []
  }
}

// 관리자용 전체 칼럼 조회 (비공개 포함)
export async function getAllColumnsForAdmin(db: D1Database | undefined): Promise<Column[]> {
  if (!db) return []
  try {
    const result = await db
      .prepare('SELECT * FROM columns ORDER BY published_at DESC')
      .all<ColumnRow>()
    return (result.results || []).map(rowToColumn)
  } catch (e) {
    console.error('getAllColumnsForAdmin error:', e)
    return []
  }
}

// 카테고리별 공개 칼럼 조회
export async function getColumnsByCategoryDb(
  db: D1Database | undefined,
  category: string
): Promise<Column[]> {
  if (!db) return []
  try {
    const result = await db
      .prepare(
        'SELECT * FROM columns WHERE category = ? AND is_published = 1 ORDER BY published_at DESC'
      )
      .bind(category)
      .all<ColumnRow>()
    return (result.results || []).map(rowToColumn)
  } catch (e) {
    console.error('getColumnsByCategoryDb error:', e)
    return []
  }
}

// slug로 단일 칼럼 조회 (기본: 공개만, includeDrafts=true 면 임시저장 글 포함 — 관리자 미리보기용)
export async function getColumnBySlugDb(
  db: D1Database | undefined,
  category: string,
  slug: string,
  includeDrafts = false
): Promise<Column | undefined> {
  if (!db) return undefined
  try {
    const row = await db
      .prepare(
        `SELECT * FROM columns WHERE category = ? AND slug = ?${includeDrafts ? '' : ' AND is_published = 1'}`
      )
      .bind(category, slug)
      .first<ColumnRow>()
    return row ? rowToColumn(row) : undefined
  } catch (e) {
    console.error('getColumnBySlugDb error:', e)
    return undefined
  }
}

// ID로 단일 칼럼 조회 (관리자용, 비공개 포함)
export async function getColumnByIdDb(
  db: D1Database | undefined,
  id: number
): Promise<Column | undefined> {
  if (!db) return undefined
  try {
    const row = await db
      .prepare('SELECT * FROM columns WHERE id = ?')
      .bind(id)
      .first<ColumnRow>()
    return row ? rowToColumn(row) : undefined
  } catch (e) {
    console.error('getColumnByIdDb error:', e)
    return undefined
  }
}

// 같은 카테고리 관련 칼럼 (본인 제외, 최대 n개)
export async function getRelatedColumnsDb(
  db: D1Database | undefined,
  column: Column,
  count: number = 3
): Promise<Column[]> {
  if (!db) return []
  try {
    const result = await db
      .prepare(
        'SELECT * FROM columns WHERE category = ? AND id != ? AND is_published = 1 ORDER BY published_at DESC LIMIT ?'
      )
      .bind(column.category, column.id, count)
      .all<ColumnRow>()
    return (result.results || []).map(rowToColumn)
  } catch (e) {
    console.error('getRelatedColumnsDb error:', e)
    return []
  }
}

// 조회수 증가
export async function incrementViewsDb(db: D1Database | undefined, id: number): Promise<void> {
  if (!db) return
  try {
    await db.prepare('UPDATE columns SET views = views + 1 WHERE id = ?').bind(id).run()
  } catch (e) {
    console.error('incrementViewsDb error:', e)
  }
}

// 칼럼 개수 카운트
export async function countColumnsDb(db: D1Database | undefined): Promise<number> {
  if (!db) return 0
  try {
    const row = await db.prepare('SELECT COUNT(*) as cnt FROM columns').first<{ cnt: number }>()
    return row?.cnt ?? 0
  } catch (e) {
    console.error('countColumnsDb error:', e)
    return 0
  }
}

// ===== 생성/수정/삭제 (관리자 CRUD) =====

// 칼럼 생성 입력 타입
export interface ColumnInput {
  category: string
  title: string
  slug: string
  excerpt: string
  content: string
  thumbnail: string
  thumbnail_alt: string
  author: string
  published_at: string
  meta_title: string
  meta_description: string
  is_published?: number
  source_url?: string | null // 네이버 원본 주소 (직접 작성한 글은 null)
  focus_keyword?: string | null // SEO 핵심 검색어
}

// 칼럼 생성 → 새 id 반환
export async function createColumnDb(db: D1Database | undefined, input: ColumnInput): Promise<number | null> {
  if (!db) return null
  try {
    const result = await db
      .prepare(
        `INSERT INTO columns
          (category, title, slug, excerpt, content, thumbnail, thumbnail_alt, author, published_at, meta_title, meta_description, is_published, source_url, focus_keyword)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        input.category,
        input.title,
        input.slug,
        input.excerpt || null,
        input.content,
        input.thumbnail || null,
        input.thumbnail_alt || null,
        input.author || '김명륜 세무사',
        input.published_at,
        input.meta_title || null,
        input.meta_description || null,
        input.is_published ?? 1,
        input.source_url || null,
        input.focus_keyword || null
      )
      .run()
    return result.meta.last_row_id ?? null
  } catch (e) {
    console.error('createColumnDb error:', e)
    throw e
  }
}

// 칼럼 수정
export async function updateColumnDb(
  db: D1Database | undefined,
  id: number,
  input: ColumnInput
): Promise<boolean> {
  if (!db) return false
  try {
    await db
      .prepare(
        `UPDATE columns SET
          category = ?, title = ?, slug = ?, excerpt = ?, content = ?,
          thumbnail = ?, thumbnail_alt = ?, author = ?, published_at = ?,
          meta_title = ?, meta_description = ?, is_published = ?, source_url = ?, focus_keyword = ?,
          updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`
      )
      .bind(
        input.category,
        input.title,
        input.slug,
        input.excerpt || null,
        input.content,
        input.thumbnail || null,
        input.thumbnail_alt || null,
        input.author || '김명륜 세무사',
        input.published_at,
        input.meta_title || null,
        input.meta_description || null,
        input.is_published ?? 1,
        input.source_url || null,
        input.focus_keyword || null,
        id
      )
      .run()
    return true
  } catch (e) {
    console.error('updateColumnDb error:', e)
    throw e
  }
}

// 같은 네이버 원본 주소로 이미 등록된 글 찾기 (네이버 글 담기 중복 확인용, 수정 중인 글 자신은 제외)
export interface SourceMatch {
  id: number
  title: string
  isPublished: boolean
}

interface SourceMatchRow {
  id: number
  title: string
  is_published: number
}

export async function findColumnsBySourceDb(
  db: D1Database | undefined,
  sourceUrl: string,
  excludeId?: number
): Promise<SourceMatch[]> {
  if (!db || !sourceUrl) return []
  const result = await db
    .prepare('SELECT id, title, is_published FROM columns WHERE source_url = ? AND id != ? ORDER BY id DESC LIMIT 5')
    .bind(sourceUrl, excludeId ?? -1)
    .all<SourceMatchRow>()
  return (result.results || []).map((r: SourceMatchRow) => ({
    id: r.id,
    title: r.title,
    isPublished: r.is_published !== 0,
  }))
}

// 임시저장 글 목록 (최근 저장 순) — 글쓰기 화면의 '임시저장 글' 창용
export interface DraftSummary {
  id: number
  title: string
  savedAt: string // ISO (UTC)
}

interface DraftRow {
  id: number
  title: string
  updated_at: string | null
}

export async function listDraftsDb(db: D1Database | undefined): Promise<DraftSummary[]> {
  if (!db) return []
  const result = await db
    .prepare('SELECT id, title, updated_at FROM columns WHERE is_published = 0 ORDER BY updated_at DESC, id DESC')
    .all<DraftRow>()
  return (result.results || []).map((r: DraftRow) => ({
    id: r.id,
    title: r.title,
    savedAt: r.updated_at ? r.updated_at.replace(' ', 'T') + 'Z' : '',
  }))
}

// 칼럼 삭제
export async function deleteColumnDb(db: D1Database | undefined, id: number): Promise<boolean> {
  if (!db) return false
  try {
    await db.prepare('DELETE FROM columns WHERE id = ?').bind(id).run()
    return true
  } catch (e) {
    console.error('deleteColumnDb error:', e)
    throw e
  }
}

// slug 중복 확인 (자신 제외)
export async function isSlugTakenDb(
  db: D1Database | undefined,
  slug: string,
  excludeId?: number
): Promise<boolean> {
  if (!db) return false
  try {
    if (excludeId) {
      const row = await db
        .prepare('SELECT id FROM columns WHERE slug = ? AND id != ?')
        .bind(slug, excludeId)
        .first<{ id: number }>()
      return !!row
    }
    const row = await db.prepare('SELECT id FROM columns WHERE slug = ?').bind(slug).first<{ id: number }>()
    return !!row
  } catch (e) {
    console.error('isSlugTakenDb error:', e)
    return false
  }
}

// ============================================================================
// ===== 관리자 이메일(admin_emails) CRUD =====
// ============================================================================
// Google OAuth 로그인 후 접근 허용된 이메일 목록을 D1에서 관리
// /admin/settings 페이지의 UI에서 추가/삭제/활성화 관리

export interface AdminEmail {
  id: number
  email: string
  displayName: string | null
  note: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
}

interface AdminEmailRow {
  id: number
  email: string
  display_name: string | null
  note: string | null
  is_active: number
  created_at: string
  updated_at: string
}

function rowToAdminEmail(row: AdminEmailRow): AdminEmail {
  return {
    id: row.id,
    email: row.email,
    displayName: row.display_name,
    note: row.note,
    isActive: row.is_active === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

// 전체 관리자 이메일 목록 조회 (활성/비활성 모두)
export async function listAdminEmails(db: D1Database | undefined): Promise<AdminEmail[]> {
  if (!db) return []
  try {
    const res = await db
      .prepare(
        'SELECT id, email, display_name, note, is_active, created_at, updated_at FROM admin_emails ORDER BY created_at ASC'
      )
      .all<AdminEmailRow>()
    return (res.results || []).map(rowToAdminEmail)
  } catch (e) {
    console.error('listAdminEmails error:', e)
    return []
  }
}

// 관리자 이메일 추가
export async function addAdminEmail(
  db: D1Database | undefined,
  input: { email: string; displayName?: string; note?: string }
): Promise<{ ok: true; id: number } | { ok: false; error: string }> {
  if (!db) return { ok: false, error: '데이터베이스를 사용할 수 없습니다.' }
  const email = input.email.trim().toLowerCase()
  if (!email) return { ok: false, error: '이메일을 입력하세요.' }
  // 간단한 이메일 포맷 검증
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, error: '유효한 이메일 형식이 아닙니다.' }
  }
  try {
    const result = await db
      .prepare(
        'INSERT INTO admin_emails (email, display_name, note, is_active) VALUES (?, ?, ?, 1)'
      )
      .bind(email, input.displayName?.trim() || null, input.note?.trim() || null)
      .run()
    const id = (result.meta?.last_row_id as number) ?? 0
    return { ok: true, id }
  } catch (e: any) {
    // UNIQUE 제약 위반
    if (String(e?.message || '').toLowerCase().includes('unique')) {
      return { ok: false, error: '이미 등록된 이메일입니다.' }
    }
    console.error('addAdminEmail error:', e)
    return { ok: false, error: '추가 중 오류가 발생했습니다.' }
  }
}

// 관리자 이메일 수정 (활성 토글, 이름/메모 변경)
export async function updateAdminEmail(
  db: D1Database | undefined,
  id: number,
  input: { displayName?: string | null; note?: string | null; isActive?: boolean }
): Promise<{ ok: boolean; error?: string }> {
  if (!db) return { ok: false, error: '데이터베이스를 사용할 수 없습니다.' }
  try {
    const sets: string[] = []
    const binds: any[] = []
    if (input.displayName !== undefined) {
      sets.push('display_name = ?')
      binds.push(input.displayName?.trim() || null)
    }
    if (input.note !== undefined) {
      sets.push('note = ?')
      binds.push(input.note?.trim() || null)
    }
    if (input.isActive !== undefined) {
      sets.push('is_active = ?')
      binds.push(input.isActive ? 1 : 0)
    }
    if (sets.length === 0) return { ok: true }
    sets.push("updated_at = CURRENT_TIMESTAMP")
    binds.push(id)
    await db
      .prepare(`UPDATE admin_emails SET ${sets.join(', ')} WHERE id = ?`)
      .bind(...binds)
      .run()
    return { ok: true }
  } catch (e: any) {
    console.error('updateAdminEmail error:', e)
    return { ok: false, error: '수정 중 오류가 발생했습니다.' }
  }
}

// 관리자 이메일 삭제
export async function deleteAdminEmail(
  db: D1Database | undefined,
  id: number
): Promise<{ ok: boolean; error?: string }> {
  if (!db) return { ok: false, error: '데이터베이스를 사용할 수 없습니다.' }
  try {
    await db.prepare('DELETE FROM admin_emails WHERE id = ?').bind(id).run()
    return { ok: true }
  } catch (e: any) {
    console.error('deleteAdminEmail error:', e)
    return { ok: false, error: '삭제 중 오류가 발생했습니다.' }
  }
}

// 특정 이메일이 활성 관리자인지 조회 (auth.ts isAllowedEmail에서 사용 가능)
export async function isActiveAdminEmail(
  db: D1Database | undefined,
  email: string
): Promise<boolean> {
  if (!db) return false
  const normalized = email.trim().toLowerCase()
  if (!normalized) return false
  try {
    const row = await db
      .prepare(
        'SELECT 1 as hit FROM admin_emails WHERE email = ? AND is_active = 1 LIMIT 1'
      )
      .bind(normalized)
      .first<{ hit: number }>()
    return !!row
  } catch (e) {
    console.error('isActiveAdminEmail error:', e)
    return false
  }
}
