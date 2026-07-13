# AI 글쓰기 테스트

AI 글쓰기, 게시 자동화, GA4 트래픽 분석, SEO 개선 루프를 테스트하기 위한 더미 프로젝트입니다.

## 구성

- `dummy_site/`: Next.js 기반 더미 블로그/관리자 사이트
- `dummy_site/content/posts/`: Git-as-DB 방식의 글 Markdown 저장소
- `automation/`: GA4 Data API 조회와 트래픽 기반 피드백 스크립트
- `cloudflared-config/`: 로컬 Cloudflare Tunnel 설정 예시

## 현재 배포 구조

`dummy_site`는 Vercel 배포를 고려해 SQLite 런타임 DB 대신 Markdown 파일을 콘텐츠 원본으로 사용합니다.

```text
관리자 글 작성
→ GitHub Contents API로 content/posts/*.md 커밋
→ GitHub main 브랜치 변경
→ Vercel 자동 배포
→ GA4 데이터 수집
→ automation/ 또는 Claude Routine이 개선 대상 분석
```

## 보안 주의

다음 파일은 저장소에 포함하지 않습니다.

- `.env`, `.env.local`
- GA4/GCP 서비스 계정 JSON
- Cloudflare Tunnel credentials/cert
- 로컬 SQLite DB 백업
- `node_modules`, `.next`
- aiorch 검토 산출물 `runs/`

## GA4 분석 실행

```powershell
cd automation
npm install
npm run ga4:traffic
npm run feedback
```

`automation/.env.example`을 참고해서 `automation/.env`를 별도로 만듭니다.

## 사이트 실행

```powershell
cd dummy_site
npm install
npm run dev
```

`dummy_site/.env.example`을 참고해서 `dummy_site/.env.local` 또는 Vercel 환경변수를 설정합니다.
