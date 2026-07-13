# AI 글쓰기 테스트

AI 글쓰기 → 검수/게시 → GA4 트래픽 분석 → SEO 개선 루프를 테스트하기 위한 더미 프로젝트입니다.

## 구성

- `dummy_site/`: Next.js 기반 더미 블로그/관리자 사이트
- `automation/`: GA4 Data API 조회 및 트래픽 기반 피드백 스크립트
- `cloudflared-config/`: 로컬 터널 설정 예시

## 주의

다음 파일은 보안상 저장소에 포함하지 않습니다.

- `.env`, `.env.local`
- GA4/GCP 서비스 계정 JSON
- Cloudflare Tunnel 인증서/credentials
- SQLite 런타임 DB
- `node_modules`, `.next`

## GA4 분석 실행

```powershell
cd automation
npm install
npm run ga4:traffic
npm run feedback
```

`automation/.env.example`을 참고해 `automation/.env`를 별도로 만드세요.

## 사이트 실행

```powershell
cd dummy_site
npm install
npm run dev
```

`dummy_site/.env.example`을 참고해 `dummy_site/.env.local`을 별도로 만드세요.
