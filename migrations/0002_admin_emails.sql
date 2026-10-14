-- ===== 관리자 이메일 허용 목록 테이블 =====
-- Google OAuth 로그인 후, 이 테이블에 등록된 이메일만 관리자 페이지 접근 허용
-- UI(/admin/settings)에서 추가/삭제/수정 가능

CREATE TABLE IF NOT EXISTS admin_emails (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE,         -- 소문자 정규화된 Google 이메일
  display_name TEXT,                   -- 선택: 표시용 이름 (예: "홍길동 세무사")
  note TEXT,                           -- 선택: 메모 (예: "운영 담당")
  is_active INTEGER DEFAULT 1,         -- 1: 활성, 0: 일시 중지(로그인 거부)
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 이메일 조회를 위한 인덱스 (UNIQUE가 이미 인덱스 역할하지만 명시)
CREATE INDEX IF NOT EXISTS idx_admin_emails_email ON admin_emails(email);
CREATE INDEX IF NOT EXISTS idx_admin_emails_active ON admin_emails(is_active);

-- 초기 부트스트랩: 환경변수 ALLOWED_GOOGLE_EMAILS가 설정된 상태라면
-- 여전히 fallback 으로 동작 (auth.ts 참조). 테이블이 비어있어도 시스템이 잠기지 않도록.
