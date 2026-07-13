# Vercel 배포를 위한 Git-as-DB 전환 설계

## 배경

Site A(dummy_site)를 Vercel(Hobby 플랜, 무료)에 실제로 배포하기로 결정. 근데 지금 구조(`better-sqlite3` + 로컬 `data/blog.db`)는 Vercel Functions의 파일시스템이 배포 후 읽기 전용이라 런타임 쓰기가 안 됨 — `/admin/new`에서 글을 써도 저장이 안 되거나 요청마다 초기화됨. 이건 플랜(Hobby/Pro)과 무관하게 전 Vercel 플랜 공통 제약.

## 검토한 대안 두 가지

### 1. Notion을 DB로 직접 활용 (기각)

사이트가 Notion API로 직접 콘텐츠를 읽는 구조. 기술적으로는 되지만(Notion 공식 API, MCP 아님), 이렇게 하면 "게시"가 Notion 상태 필드 변경으로 끝나버려서 **`/admin` 로그인 → 글쓰기 폼 → 컴퓨터 use 업로드** 리허설 자체가 사라짐. Site A의 목적(독립 저장소를 가진 사이트에 자동화로 업로드하는 연습, 그누보드→Next.js 마이그레이션 리허설)과 어긋나서 기각.

### 2. Git-as-DB (채택)

`data/blog.db` 대신 `content/posts/*.md` (frontmatter로 title/slug/status 관리)로 콘텐츠를 저장. Next.js는 빌드 타임에 이 파일들을 읽어서 페이지 생성. 새 글 게시 = 파일 추가 + git commit + push → Vercel이 GitHub 연동으로 자동 재배포.

**핵심**: `/admin` 로그인 폼과 글쓰기 UI는 그대로 유지하고, 저장 로직만 바꾼다. 관리자가 폼을 채우고 제출하면, 서버 액션이 (a) 로컬 SQLite에 INSERT 하는 대신 (b) 마크다운 파일을 만들어 GitHub API(또는 로컬 git)로 커밋·푸시하도록 변경. 컴퓨터 use 자동화 흐름(로그인 → 폼 채우기 → 제출) 자체는 겉보기에 동일하게 유지되므로 리허설 가치를 잃지 않으면서 Vercel 호환 구조가 됨.

## 구현 시 변경 범위

1. **`src/lib/db.ts` 교체**
   - `listPublishedPosts`, `getPostBySlug` 등: 빌드 타임에 `content/posts/*.md`를 읽어 frontmatter 파싱 (예: `gray-matter` 패키지)
   - `createPost`, `updatePost`: GitHub Contents API(`@octokit/rest` 등)로 파일 생성/수정 커밋. 환경변수로 GitHub PAT(또는 GitHub App 토큰) 필요 — repo에 커밋 권한 있는 전용 토큰.
2. **`src/app/admin/actions.ts`**: 위 변경된 db 함수를 호출하도록만 수정 (로그인/폼 로직 자체는 무변경)
3. **조회수(`view_count`) 제거**: 방문마다 git commit할 수 없으므로, 자체 조회수 추적은 제거하고 GA4 데이터만 사용. `posts/[slug]/page.tsx`의 `incrementViewCount` 호출 제거.
4. **게시 지연 고려**: 글 하나 저장할 때마다 Vercel이 재빌드(보통 30초~2분) 해야 실제로 반영됨. 지금 몇 분 간격 자동화 주기에는 문제없는 수준.
5. **caching 전략**: 정적 생성(SSG) 또는 짧은 revalidate 주기의 ISR 사용 권장.

## Vercel Hobby 플랜 관련 참고사항

- **상업적 이용 금지** (fair use 가이드라인 명시) — 지금은 개인 리허설 용도라 문제없음. 실제 회사 프로젝트로 전환 시 Pro 플랜 필요.
- **Vercel 자체 Cron Jobs는 Hobby에서 하루 1번만 가능** (±59분 오차). 단, 글쓰기 자동화는 Vercel Cron이 아니라 Claude 쪽 스케줄 기능을 쓰고 있어서 이 제약과 무관함.
- 파일시스템 읽기 전용 제약은 전 플랜 공통이라 Pro로 올려도 해결 안 됨 — Git-as-DB 전환은 플랜과 무관하게 필요.

## 결정 배경 요약

| | Notion-as-DB | Git-as-DB (채택) |
|---|---|---|
| Vercel 호환 | O | O |
| 컴퓨터 use 리허설 유지 | X (관리자 폼 불필요해짐) | O (폼 유지, 내부 저장만 교체) |
| 추가 연동 필요 | Notion Internal Integration 토큰 신규 발급 | GitHub 토큰만 있으면 됨 (이미 연결된 계정 활용 가능) |
| 버전 관리 | 없음 | git 히스토리로 자동 확보 |
