-- ===== 칼럼 핵심 검색어 (SEO 점검용) =====
-- 글쓰기 화면의 'SEO 점검'에서 이 글로 노출되고 싶은 검색어 (예: 해고예고수당)
-- 제목·메타 타이틀·메타 설명·첫 문단·소제목에 들어 있는지 점검하는 기준. 화면에는 표시하지 않음

ALTER TABLE columns ADD COLUMN focus_keyword TEXT;
