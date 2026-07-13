# dummy_site

AI 자동 글쓰기 → Notion 검수 → 사이트 업로드 → GA4 트래픽 기반 재작성 파이프라인을 테스트하기 위한 더미 블로그 사이트.

Next.js(App Router, TypeScript) + SQLite(better-sqlite3)로 구성했고, 실제 서비스가 아니라 컴퓨터 use 자동화(브라우저 조작)와 GA4 연동을 테스트하기 위한 로컬 타겟 사이트입니다.

## 실행

```bash
npm install
npm run dev
```

`http://localhost:3000` 에서 확인. 최초 실행 시 `data/blog.db` SQLite 파일이 자동 생성됩니다(빈 posts 테이블).

## 계정 / 환경변수

`.env.example`을 복사해 `.env.local`로 사용하세요 (이미 기본값으로 `.env.local`이 생성되어 있습니다).

| 변수 | 설명 |
| --- | --- |
| `ADMIN_USERNAME` / `ADMIN_PASSWORD` | 관리자 로그인 계정. 실제 운영에서는 반드시 강한 값으로 변경 |
| `NEXT_PUBLIC_GA_MEASUREMENT_ID` | GA4 속성 생성 후 측정 ID(G-XXXXXXXXXX) 입력 시 모든 페이지에 gtag.js 삽입. 비워두면 스니펫 없음 |

## 구조

- `/` — 게시된 글 목록 (조회수 표시)
- `/posts/[slug]` — 글 상세 (하위 페이지, 조회 시 view_count 증가, 마크다운 렌더링)
- `/admin/login` — 관리자 로그인
- `/admin` — 대시보드 (전체 글 목록, 상태/조회수, 삭제)
- `/admin/new` — 새 글 작성 (제목/슬러그/마크다운 본문/상태)
- `/admin/[id]/edit` — 글 수정

`/admin/*`는 쿠키 기반 세션으로 보호되며, 미인증 접근 시 `/admin/login`으로 리다이렉트됩니다.

## 자동화 파이프라인 연동 포인트

- **글 자동 업로드(컴퓨터 use)**: `/admin/login` → `/admin/new` 폼을 브라우저 자동화로 채우고 제출하는 흐름을 그대로 타겟으로 사용 가능.
- **GA4**: 이 사이트로 실제 GA4 속성을 만들고 `NEXT_PUBLIC_GA_MEASUREMENT_ID`를 설정하면 트래픽 수집 가능. 조회수는 우선 자체 `view_count` 컬럼으로도 추적되므로 GA4 연동 전에도 "조회수 기반 재작성" 로직을 테스트할 수 있음.
- **Notion 사전 검수**: 이 사이트 자체에는 Notion 연동이 없음 — 파이프라인상 "Notion에 초안 업로드 → 관리자 확인 → 이 사이트에 게시" 순서이므로, 이 사이트는 마지막 단계(게시)만 담당.

## 커스텀 도메인

Cloudflare Named Tunnel로 로컬 dev 서버를 공개 도메인에 연결할 수 있습니다. Vercel 등에 배포하지 않고 로컬 `npm run dev`를 그대로 쓰기 때문에 `/admin` 글쓰기가 정상 동작합니다.

- 공개 주소: `.env.local`의 `NEXT_PUBLIC_SITE_URL` 참조
- cloudflared 실행파일: `tools/cloudflared.exe` 등 PC별 설치 위치 사용
- 설정 파일 예시: `../cloudflared-config/config.example.yml`
- 로그인 인증서/터널 자격증명은 저장소에 커밋하지 마세요.

**재시작 방법** (PC를 껐다 켰거나 세션이 끊긴 경우, 아래 두 개를 순서대로 실행):

```bash
# 1) dev 서버 실행 (dummy_site 폴더에서)
npm run dev

# 2) 터널 실행 (별도 터미널에서, 프로젝트 루트 기준)
"tools/cloudflared.exe" --config ".\cloudflared-config\config.yml" tunnel run
```

DNS(CNAME)와 터널 자격증명은 Cloudflare 계정에 이미 등록되어 있어서 `tunnel login` / `tunnel create` / `tunnel route dns`는 다시 할 필요 없습니다. 위 두 프로세스만 켜져 있으면 `dummy.jeezdev.com`이 바로 살아납니다.

## DB 스키마 (`posts` 테이블)

`id, slug, title, content, status(draft|published), view_count, created_at, updated_at`

`data/` 디렉터리는 `.gitignore` 처리되어 있습니다 (런타임에 생성되는 로컬 DB).
