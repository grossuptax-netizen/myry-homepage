# 명륜세무회계 (Myry Tax Accounting) - 정육점 전문

## 프로젝트 개요
- **이름**: 명륜세무회계 랜딩페이지
- **목표**: 정육점·축산물 전문 세무 컨설팅 서비스 홍보 및 상담 유치용 원페이지 웹사이트
- **포인트 컬러**: `#0c5ab9` (딥 블루)
- **전문 분야**: 정육점, 한우·한돈 전문점, 수입육, 축산물 도·소매, 정육식당, 축산 가공, 운송·물류, 온라인 정육 쇼핑몰

## 완료된 기능 (Currently Completed Features)
1. **Hero 섹션** – "비용은 더 낮게, 절세는 더 크게" 메인 카피 + CTA
2. **신뢰 지표** – 정육·축산 고객사 200+ / 압도적인 유지율 99% / 관리 매출 200억+ / 연간 세금신고 400+
3. **업종별 전문성** – 정육 관련 8개 업종 카드 (정육점, 한우·한돈, 수입육, 도·소매, 정육식당 등)
4. **무료 컨설팅 / 절세** – 의제매입세액공제, 한우·한돈 매입 단가 관리, 정부지원금 3카드
5. **차별화 포인트** – 10가지 포인트 (다크 섹션, 축산물이력제·도축·도매·소매 단계별 세무)
6. **직원관리 서비스** – 임금명세서 / 고용지원금 / 원천세·4대보험
7. **이용방법** – 5단계 프로세스
8. **고객후기** – 정육점·축산 고객 4개 후기 (한우정육점, 으뜸축산, 한돈마트, 정육식당)
9. **상담신청 (CTA)** – "월 8만원부터" + 상담신청 폼 (이름·연락처·업종·문의)
10. **Footer** – 연락처 031-8027-2888 / 메일 contact@myrytax.com
11. **부가 기능** – 스크롤 진입 애니메이션, 연락처 자동 하이픈, 폼 AJAX 제출, 헤더 스크롤 그림자
12. **브랜드 로고 적용** – 제공받은 명륜세무회계 심볼 마크(.ai → 투명 PNG 변환)를 헤더·푸터 로고 및 favicon에 적용 (심볼 아이콘 + "명륜세무회계" 텍스트 조합)

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
  "received": { "name": "홍길동", "phone": "010-1234-5678", "business": "정육점", "message": "" }
}
```

## 데이터 아키텍처 (Data Architecture)
- **데이터 모델**: 상담 신청(name, phone, business, message)
- **스토리지 서비스**: 별도 DB 미사용. 상담 신청은 **Formspree**를 통해 담당자 이메일(`tg@myrytax.com`)로 즉시 전송.
- **데이터 흐름**: 프론트 폼 → `fetch POST https://formspree.io/f/mreweznq` → Formspree → `tg@myrytax.com` 메일 수신
- **상담 연결**: 상담 폼은 Formspree 이메일 전송 방식 사용 (입력 정보가 담당자 메일로 자동 전달)

## 아직 구현되지 않은 기능 (Features Not Yet Implemented)
- 상담 신청 내역의 영구 저장 (Cloudflare D1) 및 관리자 조회 화면
- 상담 접수 시 이메일/문자(알림톡)/슬랙 알림 연동
- 실제 로고/사무소 이미지 자산 (현재 아이콘 + 텍스트 기반)
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
  npm install
  npm run build
  pm2 start ecosystem.config.cjs
  # http://localhost:3000
  ```
- **GitHub**: https://github.com/grossuptax-netizen/myry-homepage
- **연락처**: 031-8027-2888 / contact@myrytax.com
- **최종 업데이트**: 2026-06-19
