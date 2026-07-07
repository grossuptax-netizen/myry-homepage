# 명륜세무회계 (Myry Tax Accounting) - 정육점 전문

## 프로젝트 개요
- **이름**: 명륜세무회계 랜딩페이지 + 칼럼 게시판
- **목표**: 정육점·축산물 전문 세무 컨설팅 서비스 홍보, 상담 유치, 그리고 **세무 칼럼 콘텐츠 마케팅**을 위한 웹사이트
- **도메인**: jung6tax.com
- **브랜드 컬러**: 버건디 레드 `#8B1A1A`(brand) / 네이비 `#1A2A4A`(navy) / 골드 `#C9A84C`(gold) / 크림 `#F5F0EB`(cream)
- **폰트**: Noto Sans KR (400/500/700/900)
- **전문 분야**: 정육점, 한우·한돈 전문점, 수입육, 축산물 도·소매, 정육식당, 축산 가공, 운송·물류, 온라인 정육 쇼핑몰

## 완료된 기능 (Currently Completed Features)

### 1. 랜딩 페이지 (기존)
1. **Hero 섹션** – "비용은 더 낮게, 절세는 더 크게" 메인 카피 + CTA
2. **신뢰 지표** – 정육·축산 고객사 200+ / 압도적인 유지율 99% / 관리 매출 200억+ / 연간 세금신고 400+
3. **업종별 전문성** – 정육 관련 8개 업종 카드
4. **무료 컨설팅 / 절세** – 의제매입세액공제, 한우·한돈 매입 단가 관리, 정부지원금 3카드
5. **차별화 포인트** – 10가지 포인트 (축산물이력제·도축·도매·소매 단계별 세무)
6. **직원관리 서비스** – 임금명세서 / 고용지원금 / 원천세·4대보험
7. **이용방법** – 5단계 프로세스
8. **고객후기** – 정육점·축산 고객 4개 후기
9. **상담신청 (CTA)** – "월 8만원부터" + 상담신청 폼
10. **Footer** – 연락처 031-8027-2888 / 메일 (이메일 난독화 적용)
11. **부가 기능** – 스크롤 진입 애니메이션, 연락처 자동 하이픈, 폼 AJAX 제출, 헤더 스크롤 그림자
12. **브랜드 로고 적용** – 심볼 마크 + "명륜세무회계" 텍스트 조합
13. **봇 스팸 차단** – 이메일 난독화, honeypot 필드, 시간 기반 봇 차단

### 2. 칼럼 게시판 (신규 추가)
EY 코리아 인사이트 페이지(ey.com/ko_kr/insights) 구조를 레퍼런스로 한 세무 칼럼 섹션.

- **칼럼 목록 페이지** (`/column`) – 상단 카테고리 탭(sticky) + 카드형 그리드(반응형: 모바일 1열 / 태블릿 2열 / PC 3열), 더보기 버튼, 카드 진입 애니메이션
- **카테고리 필터** (`/column/:category`) – 6개 카테고리별 필터링
- **칼럼 상세 페이지** (`/column/:category/:slug`) – H1 제목, 카테고리 라벨, 작성자/발행일/조회수, 대표 이미지, 본문(.prose-column), 관련 칼럼 3개 추천, 상담신청 CTA
- **관리자 페이지** (`/admin/column`) – 비밀번호 보호 로그인, 칼럼 목록(수정/삭제), 리치 텍스트 에디터(굵게/이탤릭/링크/이미지/표), 썸네일 업로드+미리보기, 슬러그 자동생성, 메타 설명 160자 카운트
- **6개 카테고리**: 부가가치세(vat), 원가·재고관리(inventory), 인건비·노무(labor), 사업자유형·법인전환(business-type), 정부지원금·정책자금(subsidy), 세법개정·시사(tax-news)
- **더미 데이터 18개** (카테고리별 3개) – 모든 콘텐츠는 정육점·축산물 세무 관련만

### 3. SEO 인프라 (신규 추가)
- **영문 URL 슬러그** – 고유 slug 기반 깔끔한 URL (예: `/column/vat/butcher-deemed-vat-credit-guide`)
- **자동 title / meta description** – 칼럼별 메타 타이틀·설명 자동 생성
- **Open Graph 태그** – og:type(칼럼=article / 그 외=website), og:title, og:description, og:image, og:locale
- **Twitter Card** – summary_large_image
- **canonical** – 칼럼별 정규 URL
- **alt 텍스트 자동 보정** – 정육점 키워드가 없으면 자동 포함 (`ensureButcherAlt()`)
- **Schema.org 구조화 데이터** – Article(JSON-LD) + BreadcrumbList(JSON-LD)
- **sitemap.xml** – 홈페이지 + 주요 페이지
- **sitemap-columns.xml** – 칼럼 전용 sitemap (18개 칼럼 자동 갱신)
- **robots.txt** – sitemap 참조 + /admin noindex
- **관리자 페이지 noindex** – `/admin/*` 경로 robots noindex,nofollow
- **WebP 최적화 / lazy loading** – 본문 이미지 loading="lazy", 대표 이미지 fetchpriority="high"
- **모바일 반응형** – 모든 페이지 모바일 우선 설계
- **내부 링크 강화** – 관련 칼럼 추천, 카테고리 이동, breadcrumb
- **기존 키워드 일관성** – 의제매입세액공제, 한우·한돈, 축산물이력제, 식육판매업, HACCP

## 기능 진입 URI (Functional Entry URIs)

| Method | Path | 설명 | 비고 |
|--------|------|------|------|
| GET | `/` | 메인 랜딩 페이지 | - |
| POST | `/api/consult` | 상담 신청 접수 | JSON Body |
| GET | `/column` | 칼럼 목록 (전체) | 카테고리 탭 + 카드 그리드 |
| GET | `/column/:category` | 카테고리별 칼럼 목록 | vat/inventory/labor/business-type/subsidy/tax-news |
| GET | `/column/:category/:slug` | 칼럼 상세 | SEO/OG/JSON-LD 포함 |
| GET | `/admin/column/login` | 관리자 로그인 | robots noindex |
| GET | `/admin/column` | 관리자 칼럼 목록 | robots noindex, 세션 필요 |
| GET | `/admin/column/new` | 새 칼럼 작성 | robots noindex |
| GET | `/admin/column/edit/:id` | 칼럼 수정 | robots noindex |
| GET | `/sitemap.xml` | 메인 sitemap | - |
| GET | `/sitemap-columns.xml` | 칼럼 전용 sitemap | 18개 칼럼 자동 갱신 |
| GET | `/robots.txt` | robots | sitemap 참조, /admin noindex |
| GET | `/static/style.css` | 커스텀 스타일 | .prose-column, .prose-admin 포함 |
| GET | `/static/column-list.js` | 칼럼 목록 스크립트 | 더보기, 카드 애니메이션 |
| GET | `/static/admin.js` | 관리자 스크립트 | 로그인, 리치 에디터 |
| GET | `/static/columns/*.svg` | 카테고리별 썸네일 | 6개 SVG |

### `/api/consult` 파라미터
JSON Body: `name`(필수), `phone`(필수), `business`(선택), `message`(선택), `_gotcha`(honeypot), `_form_loaded_at`(봇 차단)

## 데이터 아키텍처 (Data Architecture)

### 상담 신청
- **데이터 모델**: name, phone, business, message
- **스토리지**: Formspree 이메일 전송 (별도 DB 미사용)
- **데이터 흐름**: 프론트 폼 → `fetch POST https://formspree.io/f/mreweznq` → 담당자 메일

### 칼럼 게시판
- **데이터 모델**: id, category, title, slug(UNIQUE), excerpt, content(리치텍스트 HTML), thumbnail, thumbnail_alt, author, published_at, meta_title, meta_description(160자), views, is_published, created_at, updated_at
- **스토리지**: Cloudflare D1 (마이그레이션 `migrations/0001_initial_schema.sql`)
- **현재 상태**: D1 스키마 설계 완료. 미리보기는 `src/lib/dummy-data.ts`의 18개 더미 데이터를 SSR로 렌더링 (D1 연동 전)
- **카테고리 정의**: `src/lib/columns.ts` (slug, label, icon, desc)
- **SEO 헬퍼**: alt 텍스트 자동 보정, 메타 타이틀/설명 생성

## 관리자 접근법 (Admin Access)
- **로그인 URL**: `/admin/column/login`
- **데모 비밀번호**: `myungryun2026`
- **세션**: sessionStorage 기반, 4시간 만료
- **기능**: 칼럼 작성/수정/삭제 (현재 데모 모드 - alert만 표시, D1 연동 후 실제 저장)

## 보안 조치 (Bot & Spam Protection)
1. **이메일 주소 난독화** – charCode 인코딩 (HTML 평문 노출 없음)
2. **Honeypot 필드** – 숨겨진 `_gotcha` 입력란
3. **시간 기반 봇 차단** – 3초 미만 제출 시 봇으로 간주
4. **관리자 페이지 noindex** – `/admin/*` robots noindex,nofollow

## 디렉토리 구조 (Project Structure)
```
webapp/
├── src/
│   ├── index.tsx              # 메인 Hono 앱 + 모든 라우트
│   ├── renderer.tsx           # JSX renderer (동적 head, OG, JSON-LD)
│   ├── lib/
│   │   ├── columns.ts         # 카테고리 정의, Column 타입, ensureButcherAlt()
│   │   └── dummy-data.ts      # 18개 더미 칼럼 + 헬퍼 함수
│   ├── components/
│   │   └── layout.tsx         # SiteHeader(칼럼 메뉴), SiteFooter, CommonScript
│   └── pages/
│       ├── column-list.tsx    # 칼럼 목록 (EY 스타일)
│       ├── column-detail.tsx  # 칼럼 상세 (SEO, JSON-LD)
│       └── admin.tsx          # 관리자 (로그인/목록/폼)
├── migrations/
│   └── 0001_initial_schema.sql # D1 columns 테이블 스키마
├── public/
│   └── static/
│       ├── style.css          # 칼럼 전용 스타일 (.prose-column 등)
│       ├── app.js             # 랜딩 페이지 스크립트
│       ├── column-list.js     # 칼럼 목록 스크립트
│       ├── admin.js           # 관리자 스크립트
│       └── columns/*.svg      # 6개 카테고리 SVG 썸네일
├── ecosystem.config.cjs       # PM2 설정
├── wrangler.jsonc             # Cloudflare Pages 설정
├── vite.config.ts             # Vite 빌드 설정
└── package.json
```

## 아직 구현되지 않은 기능 (Features Not Yet Implemented)
- D1 데이터베이스 실제 연동 (스키마는 완료, 더미 데이터 → D1 전환)
- 관리자 CRUD 실제 저장 (현재 데모 모드)
- 상담 신청 내역 영구 저장 (D1) 및 관리자 조회
- 상담 접수 시 이메일/문자/슬랙 알림 연동
- 실제 로고/사무소 이미지 자산 (현재 SVG 썸네일)
- 실제 칼럼 콘텐츠 작성 (현재 더미 18개)
- WebP 이미지 변환 파이프라인

## 권장 다음 단계 (Recommended Next Steps)
1. **D1 연동** – 더미 데이터 → D1 데이터베이스 전환, 관리자 CRUD 실제 저장 구현
2. **실제 칼럼 콘텐츠 작성** – 더미 18개 → 실제 세무 칼럼으로 교체
3. **썸네일 이미지** – SVG → 실제 정육점 관련 사진 (WebP 변환)
4. 상담 신청 D1 영구 저장 + 관리자 알림
5. Cloudflare Pages 배포 (jung6tax.com)

## 사용 가이드 (User Guide)

### 방문자
1. **랜딩 페이지**: `/`에서 서비스 확인 후 하단 상담 폼으로 신청
2. **칼럼 읽기**: 헤더 "칼럼" 메뉴 → `/column`에서 카테고리 탭으로 이동 or 카드 클릭
3. **칼럼 상세**: 관련 칼럼 추천, 상담신청 CTA 제공

### 관리자
1. `/admin/column/login` 접속 → 비밀번호 `myungryun2026` 입력
2. 칼럼 목록 확인 → "새 칼럼 작성" 클릭
3. 제목/카테고리/본문/썸네일/슬러그/SEO 설정 입력 후 저장

## 배포 (Deployment)
- **플랫랫폼**: Cloudflare Pages
- **상태**: ✅ 개발 완료 (미리보기 가능)
- **기술 스택**: Hono + TypeScript(JSX) + Vite + TailwindCSS(CDN) + Font Awesome + D1
- **로컬 실행**:
  ```bash
  npm install
  npm run build
  pm2 start ecosystem.config.cjs
  # http://localhost:3000
  ```
- **미리보기 URL**: https://3000-ib1oxzgrjlrbzn8jh24fg-82b888ba.sandbox.novita.ai
- **GitHub**: https://github.com/grossuptax-netizen/myry-homepage
- **연락처**: 031-8027-2888 / 이메일 (난독화 적용, 페이지 하단에서 확인)
- **최종 업데이트**: 2026-07-07
