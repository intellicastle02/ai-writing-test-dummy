# dummy_site

AI 글쓰기 자동화, 관리자 업로드 흐름, GA4 트래픽 기반 개선 루프를 테스트하기 위한 Next.js 블로그 사이트입니다.

현재 구조는 Vercel 배포를 위해 SQLite를 제거하고 Git-as-DB 방식으로 전환했습니다.

```text
content/posts/*.md
→ Next.js가 글 목록/상세 페이지 렌더링
→ /admin 글 작성/수정
→ GitHub Contents API로 Markdown 파일 커밋
→ Vercel Git 연동으로 자동 재배포
```

## 실행

```bash
npm install
npm run dev
```

로컬 개발에서는 `GITHUB_TOKEN`이 없으면 `/admin` 저장 작업이 `content/posts/*.md`에 직접 파일을 씁니다.  
Vercel 운영에서는 파일시스템이 읽기 전용이므로 반드시 GitHub 환경변수를 설정해야 합니다.

## 환경변수

`.env.example`을 참고해서 `.env.local` 또는 Vercel Environment Variables에 설정합니다.

| 변수 | 설명 |
| --- | --- |
| `ADMIN_USERNAME` / `ADMIN_PASSWORD` | 관리자 로그인 계정 |
| `NEXT_PUBLIC_GA_MEASUREMENT_ID` | GA4 측정 ID |
| `NEXT_PUBLIC_SITE_URL` | sitemap, robots, canonical URL 기준 주소 |
| `GITHUB_TOKEN` | GitHub Contents API 커밋용 토큰 |
| `GITHUB_OWNER` / `GITHUB_REPO` / `GITHUB_BRANCH` | 커밋 대상 저장소 |
| `GITHUB_CONTENT_DIR` | 글 Markdown 저장 경로. 기본값 `content/posts` |
| `GITHUB_COMMIT_AUTHOR_NAME` / `GITHUB_COMMIT_AUTHOR_EMAIL` | 선택 커밋 작성자 정보 |

## 라우트

- `/` — 게시된 글 목록
- `/posts/[slug]` — 글 상세
- `/admin/login` — 관리자 로그인
- `/admin` — 전체 글 대시보드
- `/admin/new` — 새 글 작성
- `/admin/[slug]/edit` — 글 수정

조회수는 더 이상 로컬 DB에 기록하지 않습니다. 방문/성과 데이터는 GA4와 `automation/` 스크립트에서 확인합니다.

## 자동화 테스트 포인트

- Claude/Codex/Chrome 자동화는 기존처럼 `/admin/login → /admin/new → 제출` 흐름을 사용합니다.
- 저장 결과는 SQLite가 아니라 GitHub 커밋으로 남습니다.
- Vercel을 연결하면 커밋 후 보통 수십 초~수분 내 새 배포가 생성됩니다.
- Notion은 작업 큐/검수표로 두고, 실제 사이트 콘텐츠 원본은 Git의 Markdown 파일로 둡니다.
