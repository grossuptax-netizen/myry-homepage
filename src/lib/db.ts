// ===== D1 데이터베이스 접근 레이어 =====
// 칼럼 게시판 CRUD + 더미 데이터 폴백 + 시드 기능
//
// 설계 원칙:
// 1. 모든 쿼리는 파라미터 바인딩(? 플레이스홀더) 사용 → SQL 인젝션 방지
// 2. D1 바인딩이 없거나 쿼리 실패 시 더미 데이터로 폴백 → 개발/미리보기 안정성
// 3. D1 행(snake_case, INTEGER 불린) ↔ Column 인터페이스(camelCase) 변환

import type { Column } from './columns'
import { DUMMY_COLUMNS, SORTED_COLUMNS } from './dummy-data'

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

// 전체 공개 칼럼 조회 (최신순)
export async function getAllColumns(db: D1Database | undefined): Promise<Column[]> {
  if (!db) return SORTED_COLUMNS
  try {
    const result = await db
      .prepare('SELECT * FROM columns WHERE is_published = 1 ORDER BY published_at DESC')
      .all<ColumnRow>()
    if (!result.results || result.results.length === 0) {
      return SORTED_COLUMNS // 빈 DB면 더미 폴백
    }
    return result.results.map(rowToColumn)
  } catch (e) {
    console.error('getAllColumns error:', e)
    return SORTED_COLUMNS
  }
}

// 관리자용 전체 칼럼 조회 (비공개 포함)
export async function getAllColumnsForAdmin(db: D1Database | undefined): Promise<Column[]> {
  if (!db) return SORTED_COLUMNS
  try {
    const result = await db
      .prepare('SELECT * FROM columns ORDER BY published_at DESC')
      .all<ColumnRow>()
    if (!result.results || result.results.length === 0) {
      return SORTED_COLUMNS
    }
    return result.results.map(rowToColumn)
  } catch (e) {
    console.error('getAllColumnsForAdmin error:', e)
    return SORTED_COLUMNS
  }
}

// 카테고리별 공개 칼럼 조회
export async function getColumnsByCategoryDb(
  db: D1Database | undefined,
  category: string
): Promise<Column[]> {
  if (!db) return SORTED_COLUMNS.filter((c) => c.category === category)
  try {
    const result = await db
      .prepare(
        'SELECT * FROM columns WHERE category = ? AND is_published = 1 ORDER BY published_at DESC'
      )
      .bind(category)
      .all<ColumnRow>()
    if (!result.results || result.results.length === 0) {
      return SORTED_COLUMNS.filter((c) => c.category === category)
    }
    return result.results.map(rowToColumn)
  } catch (e) {
    console.error('getColumnsByCategoryDb error:', e)
    return SORTED_COLUMNS.filter((c) => c.category === category)
  }
}

// slug로 단일 칼럼 조회 (공개만)
export async function getColumnBySlugDb(
  db: D1Database | undefined,
  category: string,
  slug: string
): Promise<Column | undefined> {
  if (!db) return DUMMY_COLUMNS.find((c) => c.category === category && c.slug === slug)
  try {
    const row = await db
      .prepare('SELECT * FROM columns WHERE category = ? AND slug = ? AND is_published = 1')
      .bind(category, slug)
      .first<ColumnRow>()
    if (!row) {
      return DUMMY_COLUMNS.find((c) => c.category === category && c.slug === slug)
    }
    return rowToColumn(row)
  } catch (e) {
    console.error('getColumnBySlugDb error:', e)
    return DUMMY_COLUMNS.find((c) => c.category === category && c.slug === slug)
  }
}

// ID로 단일 칼럼 조회 (관리자용, 비공개 포함)
export async function getColumnByIdDb(
  db: D1Database | undefined,
  id: number
): Promise<Column | undefined> {
  if (!db) return DUMMY_COLUMNS.find((c) => c.id === id)
  try {
    const row = await db
      .prepare('SELECT * FROM columns WHERE id = ?')
      .bind(id)
      .first<ColumnRow>()
    if (!row) return DUMMY_COLUMNS.find((c) => c.id === id)
    return rowToColumn(row)
  } catch (e) {
    console.error('getColumnByIdDb error:', e)
    return DUMMY_COLUMNS.find((c) => c.id === id)
  }
}

// 같은 카테고리 관련 칼럼 (본인 제외, 최대 n개)
export async function getRelatedColumnsDb(
  db: D1Database | undefined,
  column: Column,
  count: number = 3
): Promise<Column[]> {
  if (!db) {
    return SORTED_COLUMNS.filter((c) => c.category === column.category && c.id !== column.id).slice(0, count)
  }
  try {
    const result = await db
      .prepare(
        'SELECT * FROM columns WHERE category = ? AND id != ? AND is_published = 1 ORDER BY published_at DESC LIMIT ?'
      )
      .bind(column.category, column.id, count)
      .all<ColumnRow>()
    if (!result.results || result.results.length === 0) {
      return SORTED_COLUMNS.filter((c) => c.category === column.category && c.id !== column.id).slice(0, count)
    }
    return result.results.map(rowToColumn)
  } catch (e) {
    console.error('getRelatedColumnsDb error:', e)
    return SORTED_COLUMNS.filter((c) => c.category === column.category && c.id !== column.id).slice(0, count)
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
  if (!db) return DUMMY_COLUMNS.length
  try {
    const row = await db.prepare('SELECT COUNT(*) as cnt FROM columns').first<{ cnt: number }>()
    return row?.cnt ?? 0
  } catch (e) {
    console.error('countColumnsDb error:', e)
    return DUMMY_COLUMNS.length
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
}

// 칼럼 생성 → 새 id 반환
export async function createColumnDb(db: D1Database | undefined, input: ColumnInput): Promise<number | null> {
  if (!db) return null
  try {
    const result = await db
      .prepare(
        `INSERT INTO columns
          (category, title, slug, excerpt, content, thumbnail, thumbnail_alt, author, published_at, meta_title, meta_description, is_published)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
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
        input.is_published ?? 1
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
          meta_title = ?, meta_description = ?, is_published = ?,
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
        id
      )
      .run()
    return true
  } catch (e) {
    console.error('updateColumnDb error:', e)
    throw e
  }
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

// ===== 시드 기능 =====
// D1이 비어있을 때 더미 데이터 18개를 INSERT
// /api/admin/seed 엔드포인트에서 호출
export async function seedDatabase(db: D1Database | undefined): Promise<{ seeded: number; skipped: boolean }> {
  if (!db) return { seeded: 0, skipped: true }
  try {
    // 이미 데이터가 있으면 스킵
    const countRow = await db.prepare('SELECT COUNT(*) as cnt FROM columns').first<{ cnt: number }>()
    if (countRow && countRow.cnt > 0) {
      return { seeded: 0, skipped: true }
    }

    // 더미 데이터 전체 INSERT (파라미터 바인딩으로 안전하게)
    let inserted = 0
    for (const col of DUMMY_COLUMNS) {
      await db
        .prepare(
          `INSERT INTO columns
            (id, category, title, slug, excerpt, content, thumbnail, thumbnail_alt, author, published_at, meta_title, meta_description, views, is_published)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`
        )
        .bind(
          col.id,
          col.category,
          col.title,
          col.slug,
          col.excerpt,
          col.content,
          col.thumbnail,
          col.thumbnailAlt,
          col.author,
          col.publishedAt,
          col.metaTitle,
          col.metaDescription,
          col.views
        )
        .run()
      inserted++
    }
    return { seeded: inserted, skipped: false }
  } catch (e) {
    console.error('seedDatabase error:', e)
    throw e
  }
}
