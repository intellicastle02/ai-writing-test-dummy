# dummy_site

AI 글쓰기 자동화, 관리자 업로드 흐름, GA4 트래픽 기반 개선 루프를 테스트하기 위한 Next.js 블로그 사이트입니다.

현재 구조는 Vercel 배포와 Supabase 콘텐츠 저장소를 사용합니다. GitHub에는 사이트 코드와
마이그레이션만 저장하며, 게시글 생성·수정·삭제는 Vercel 서버에서 Supabase로 직접 반영합니다.

```text
Supabase posts 테이블
→ Next.js 서버 컴포넌트가 글 목록/상세 페이지 렌더링
→ /admin 글 작성/수정/삭제
→ Vercel Server Action이 Supabase CRUD 실행
→ 재배포 없이 즉시 반영
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
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 프로젝트 URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | 공개 글 읽기용 Publishable key |
| `SUPABASE_SECRET_KEY` | 관리자 CRUD용 서버 전용 Secret key |

## Supabase 초기 설정과 기존 글 이관

1. Supabase SQL Editor에서 `supabase/migrations/202607160001_initial_content_store.sql`을 실행합니다.
2. `.env.local`에 `.env.example`의 Supabase 변수를 설정합니다.
3. 기존 Markdown 글을 한 번 가져옵니다.

```bash
npm run supabase:import
```

가져오기는 slug 기준 upsert라 재실행할 수 있습니다. 성공 후 콘텐츠 원본은 Supabase이며,
`content/posts/*.md`는 더 이상 런타임에서 읽거나 수정하지 않습니다.

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
- 저장 결과는 Supabase의 `posts`, `post_revisions`, `post_events`에 남습니다.
- 글 변경은 Vercel 재배포 없이 즉시 반영됩니다.
- Notion은 작업 큐/검수표로 두고, 실제 사이트 콘텐츠 원본은 Git의 Markdown 파일로 둡니다.
