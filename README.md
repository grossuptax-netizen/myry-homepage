# 명륜세무회계 (Myeongnyun Tax Accounting)

## 프로젝트 개요
- **이름**: 명륜세무회계 랜딩페이지
- **목표**: 세금신고·절세 컨설팅 서비스를 제공하는 세무사 사무소의 홍보/상담 유치용 원페이지 웹사이트
- **참고 구조**: 세이브택스(save-tax.co.kr)의 섹션 구조를 동일하게 차용
- **포인트 컬러**: `#ff69b4` (핫핑크)

## 완료된 기능 (Currently Completed Features)
1. **Hero 섹션** – "비용은 더 낮게, 절세는 더 크게" 메인 카피 + CTA
2. **신뢰 지표** – 고객사 12,000+ / 만족도 98점 / 관리매출 7,700억+ / 연간 신고 16,000+
3. **업종별 전문성** – 120가지 업종 전문 세무사 집단 (8개 업종 아이콘 카드)
4. **무료 컨설팅 / 절세** – 정부지원금, 세액공제·감면 특례, 법인전환 컨설팅 3카드
5. **차별화 포인트** – 10가지 포인트 (다크 섹션)
6. **직원관리 서비스** – 임금명세서 / 고용지원금 / 원천세·4대보험
7. **이용방법** – 5단계 프로세스
8. **고객후기** – 4개 후기 카드
9. **상담신청 (CTA)** – "월 8만원부터" + 상담신청 폼 (이름·연락처·업종·문의)
10. **Footer** – 연락처 정보
11. **부가 기능** – 스크롤 진입 애니메이션, 연락처 자동 하이픈, 폼 AJAX 제출, 헤더 스크롤 그림자, SVG favicon

## 기능 진입 URI (Functional Entry URIs)
| Method | Path | 설명 | 파라미터 |
|--------|------|------|----------|
| GET | `/` | 메인 랜딩 페이지 | - |
| POST | `/api/consult` | 상담 신청 접수 | JSON Body: `name`(필수), `phone`(필수), `business`(선택), `message`(선택) |
| GET | `/static/style.css` | 커스텀 스타일 | - |
| GET | `/static/app.js` | 프론트엔드 스크립트 | - |
| GET | `/static/favicon.svg` | 파비콘 | - |

### `/api/consult` 응답 예시
```json
{
  "ok": true,
  "message": "상담 신청이 정상적으로 접수되었습니다. 1분 내로 연락드리겠습니다.",
  "received": { "name": "홍길동", "phone": "010-1234-5678", "business": "요식업", "message": "" }
}
```

## 데이터 아키텍처 (Data Architecture)
- **데이터 모델**: 상담 신청(name, phone, business, message)
- **스토리지 서비스**: 현재 미사용 (상담 신청은 접수 확인 응답만 반환).
  실제 운영 시 Cloudflare D1(신청 내역 저장) 또는 외부 알림(이메일/슬랙) 연동 권장.
- **데이터 흐름**: 프론트 폼 → `fetch POST /api/consult` → Hono 핸들러 → JSON 응답

## 아직 구현되지 않은 기능 (Features Not Yet Implemented)
- 상담 신청 내역의 영구 저장 (Cloudflare D1) 및 관리자 조회 화면
- 상담 접수 시 이메일/문자(알림톡)/슬랙 알림 연동
- 실제 로고/이미지 자산 (현재 아이콘 + 텍스트 기반)
- 다국어(영문) 페이지
- 블로그/세무 정보 콘텐츠 페이지

## 권장 다음 단계 (Recommended Next Steps)
1. Cloudflare D1 연동으로 상담 신청 영구 저장
2. 접수 시 관리자에게 알림(이메일/알림톡) 발송
3. 실제 브랜드 로고 및 사무소 사진 교체
4. 운영 배포 전 Tailwind를 CDN → 빌드 방식으로 전환(콘솔 경고 제거)
5. Cloudflare Pages 배포

## 사용 가이드 (User Guide)
1. 페이지 최하단(또는 상단 "무료 상담신청" 버튼)의 상담 폼으로 이동합니다.
2. 이름과 연락처(필수), 업종/문의(선택)를 입력 후 "무료 상담 신청하기"를 누릅니다.
3. 접수 완료 메시지가 표시됩니다.

## 배포 (Deployment)
- **플랫폼**: Cloudflare Pages (예정)
- **상태**: 🟢 로컬 샌드박스 실행 중 (미배포)
- **기술 스택**: Hono + TypeScript(JSX) + Vite + TailwindCSS(CDN) + Font Awesome
- **로컬 실행**:
  ```bash
  npm run build
  pm2 start ecosystem.config.cjs
  # http://localhost:3000
  ```
- **최종 업데이트**: 2026-06-15
