-- ===== 칼럼 게시판 테이블 =====
-- 정육점·축산물 세무 전문 칼럼 데이터 저장

CREATE TABLE IF NOT EXISTS columns (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  category TEXT NOT NULL,          -- 카테고리 슬러그: vat/inventory/labor/business-type/subsidy/tax-news
  title TEXT NOT NULL,             -- 제목
  slug TEXT NOT NULL UNIQUE,       -- URL 슬러그 (영문, 고유값)
  excerpt TEXT,                    -- 한 줄 요약 (목록용)
  content TEXT NOT NULL,           -- 본문 (HTML 리치 텍스트)
  thumbnail TEXT,                  -- 대표 썸네일 이미지 경로
  thumbnail_alt TEXT,              -- 썸네일 alt 텍스트 (정육점 키워드 포함)
  author TEXT DEFAULT '김명륜 세무사', -- 작성자 (세무사명)
  published_at TEXT NOT NULL,      -- 발행일 (ISO 날짜)
  meta_title TEXT,                 -- SEO 메타 타이틀
  meta_description TEXT,           -- SEO 메타 설명 (최대 160자)
  views INTEGER DEFAULT 0,         -- 조회수 (자동 증가)
  is_published INTEGER DEFAULT 1,  -- 공개 여부 (1:공개, 0:비공개)
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 카테고리별 조회를 위한 인덱스
CREATE INDEX IF NOT EXISTS idx_columns_category ON columns(category);
-- 발행일 기준 최신순 정렬을 위한 인덱스
CREATE INDEX IF NOT EXISTS idx_columns_published ON columns(published_at DESC);
-- 공개된 글만 조회하기 위한 인덱스
CREATE INDEX IF NOT EXISTS idx_columns_published_flag ON columns(is_published);

-- 슬러그 중복 방지 (UNIQUE 제약으로 자동 처리됨)
-- category + slug 조합으로 상세 페이지 URL 생성: /column/{category}/{slug}
