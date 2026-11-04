-- ===== 칼럼 원본 주소 (네이버 글 담기) =====
-- 북마클릿 '네이버 글 담기'로 가져온 글의 네이버 원본 주소 (늘 같은 모양으로 맞춘 값)
--   카페: https://cafe.naver.com/ca-fe/cafes/{카페번호}/articles/{글번호}
--   블로그: https://blog.naver.com/{블로그아이디}/{글번호}
-- 직접 작성·복붙한 글은 NULL. 같은 글을 두 번 가져오는지 확인하는 데 사용

ALTER TABLE columns ADD COLUMN source_url TEXT;

CREATE INDEX IF NOT EXISTS idx_columns_source_url ON columns(source_url);
