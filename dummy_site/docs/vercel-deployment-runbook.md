# Vercel 배포 진행 방법

이 문서는 현재 `dummy_site`를 Vercel Hobby 플랜에 배포하고, `/admin` 글쓰기 자동화가 GitHub 커밋 → Vercel 재배포로 이어지도록 설정하는 절차서다.

현재 사이트는 SQLite가 아니라 Git-as-DB 구조다.

```text
/admin/new 또는 /admin/[slug]/edit
→ GitHub Contents API로 content/posts/*.md 커밋
→ GitHub main 브랜치 변경
→ Vercel이 자동 재배포
→ 공개 사이트에 글 반영
→ GA4가 트래픽 수집
```

## 0. 현재 구현 상태

이미 코드에는 다음 변경이 들어가 있다.

- 글 저장 위치: `dummy_site/content/posts/*.md`
- 글 읽기: Next.js가 Markdown 파일을 읽어서 목록/상세 페이지 생성
- 글 쓰기: `/admin` 서버 액션이 GitHub Contents API로 Markdown 파일 커밋
- 로컬 fallback: `GITHUB_TOKEN`이 없고 로컬 개발 모드면 파일시스템에 직접 저장
- 조회수: 로컬 `view_count` 제거, GA4 데이터만 사용
- SQLite: `better-sqlite3`, `data/blog.db` 런타임 의존 제거

## 1. GitHub 저장소 확인

Vercel은 GitHub 저장소를 기준으로 배포한다.

현재 기준 저장소:

```text
https://github.com/intellicastle02/ai-writing-test-dummy
```

확인할 것:

- 기본 브랜치가 `main`인지 확인
- 최신 커밋에 `dummy_site/content/posts/*.md`가 포함되어 있는지 확인
- `dummy_site/package.json`에 `better-sqlite3`가 없는지 확인
- GitHub 저장소에 `.env`, `.env.local`, 서비스 계정 JSON, Cloudflare credentials가 올라가지 않았는지 확인

로컬에서 확인:

```powershell
cd "C:\Users\jisung\Desktop\회사\AI Works\AI 글쓰기\_publish_ai_write_test_dummy"
git status
git log --oneline -5
```

빌드 확인:

```powershell
cd dummy_site
npm install
npm run build
```

정상 기준:

```text
✓ Compiled successfully
✓ Generating static pages
```

## 2. GitHub 토큰 준비

Vercel의 `/admin` 저장 기능은 GitHub API로 저장소에 커밋해야 한다. 따라서 GitHub 토큰이 필요하다.

권장 방식:

- Fine-grained personal access token 사용
- 대상 저장소를 `intellicastle02/ai-writing-test-dummy` 하나로 제한
- 권한은 Contents read/write만 부여
- 만료일은 테스트 기간에 맞춰 짧게 설정

필요 권한:

```text
Repository access:
- Only selected repositories
- intellicastle02/ai-writing-test-dummy

Permissions:
- Contents: Read and write
```

주의:

- 토큰은 GitHub 저장소에 커밋하지 않는다.
- `.env.local`에 넣더라도 로컬 전용으로만 둔다.
- Vercel에는 Project Settings의 Environment Variables로 넣는다.

## 3. Vercel 프로젝트 생성

Vercel 대시보드에서 진행한다.

1. Vercel 로그인
2. `Add New...` 또는 `New Project` 선택
3. GitHub 계정 연결
4. `intellicastle02/ai-writing-test-dummy` 저장소 선택
5. 프로젝트 설정 화면에서 Root Directory를 `dummy_site`로 지정

중요 설정:

```text
Framework Preset: Next.js
Root Directory: dummy_site
Build Command: npm run build
Install Command: npm install
Output Directory: 비워둠
Production Branch: main
```

Root Directory를 저장소 루트가 아니라 반드시 `dummy_site`로 잡아야 한다. 이 프로젝트는 monorepo처럼 루트 아래에 `dummy_site`가 있기 때문이다.

## 4. Vercel 환경변수 설정

Vercel 프로젝트 생성 중 또는 생성 후 다음 위치에서 설정한다.

```text
Project → Settings → Environment Variables
```

공식 문서 기준으로 Vercel 환경변수는 코드 밖에서 설정되는 key-value 값이며, Build Step 또는 Function 실행 시 읽힌다. 환경변수를 변경해도 기존 배포에는 적용되지 않고, 새 배포부터 적용된다.

### 필수 환경변수

| 변수 | 값 예시 | 설명 |
|---|---|---|
| `ADMIN_USERNAME` | 직접 지정 | 관리자 로그인 ID |
| `ADMIN_PASSWORD` | 직접 지정 | 관리자 로그인 비밀번호 |
| `NEXT_PUBLIC_SITE_URL` | `https://배포도메인` | sitemap, canonical, OG URL 기준 |
| `GITHUB_TOKEN` | GitHub 토큰 | `/admin` 저장 커밋용 |
| `GITHUB_OWNER` | `intellicastle02` | 저장소 owner |
| `GITHUB_REPO` | `ai-writing-test-dummy` | 저장소 이름 |
| `GITHUB_BRANCH` | `main` | 커밋 대상 브랜치 |
| `GITHUB_CONTENT_DIR` | `content/posts` | Markdown 글 저장 경로 |

### 권장 환경변수

| 변수 | 값 예시 | 설명 |
|---|---|---|
| `NEXT_PUBLIC_GA_MEASUREMENT_ID` | `G-XXXXXXXXXX` | GA4 측정 ID |
| `GITHUB_COMMIT_AUTHOR_NAME` | `AI Writing Bot` | `/admin` 저장 커밋 작성자 이름 |
| `GITHUB_COMMIT_AUTHOR_EMAIL` | 봇/본인 이메일 | `/admin` 저장 커밋 작성자 이메일 |

### 적용 Environment

처음 테스트는 다음 둘 다 체크하는 것을 권장한다.

```text
Production
Preview
```

운영이 안정되면 Production/Preview 값을 분리해도 된다.

## 5. 첫 배포 실행

환경변수까지 넣은 뒤 `Deploy`를 누른다.

성공하면 Vercel이 임시 도메인을 만든다.

예:

```text
https://ai-writing-test-dummy-xxxx.vercel.app
```

확인할 URL:

```text
/
/posts/why-dummy-testing-matters
/admin/login
/sitemap.xml
/robots.txt
```

정상 기준:

- `/`에서 기존 글 목록이 보임
- `/posts/...` 상세 글이 열림
- `/admin/login` 로그인 화면이 열림
- 로그인 후 `/admin`에서 글 목록이 보임

## 6. `/admin` 저장 테스트

Vercel 배포가 성공하면 관리자 저장 테스트를 한다.

1. `/admin/login` 접속
2. `ADMIN_USERNAME`, `ADMIN_PASSWORD`로 로그인
3. `/admin/new` 이동
4. 테스트 글 작성
5. 상태를 `게시`로 선택
6. 저장

예시 테스트 글:

```text
제목: Vercel Git DB 테스트 글
슬러그: vercel-git-db-test
상태: 게시
본문:
# Vercel Git DB 테스트

이 글은 Vercel 관리자 화면에서 저장했고 GitHub Markdown 파일로 커밋되는지 확인하기 위한 테스트입니다.
```

저장 직후 기대 동작:

```text
관리자 폼 제출
→ GitHub에 content/posts/vercel-git-db-test.md 커밋 생성
→ Vercel이 main 변경을 감지
→ 새 Production Deployment 실행
→ 배포 완료 후 /posts/vercel-git-db-test 접속 가능
```

주의:

- 저장 버튼을 눌렀다고 즉시 공개 페이지가 바뀌는 것은 아니다.
- GitHub 커밋과 Vercel 재배포가 끝나야 반영된다.
- 보통 수십 초~수분 딜레이가 정상이다.

## 7. GitHub 커밋 확인

글 저장 후 GitHub 저장소에서 커밋이 생겼는지 확인한다.

확인 위치:

```text
GitHub → ai-writing-test-dummy → Commits
```

또는 로컬에서:

```powershell
cd "C:\Users\jisung\Desktop\회사\AI Works\AI 글쓰기\_publish_ai_write_test_dummy"
git pull
git log --oneline -5
```

정상 기준:

```text
Create post: Vercel Git DB 테스트 글
```

또는 비슷한 커밋 메시지가 보여야 한다.

## 8. Vercel 재배포 확인

Vercel 대시보드에서 확인한다.

```text
Project → Deployments
```

정상 흐름:

```text
Queued
→ Building
→ Ready
```

배포 실패 시 확인할 것:

- Build log에서 TypeScript 오류가 있는지
- `GITHUB_*` 환경변수가 비어 있지 않은지
- `Root Directory`가 `dummy_site`인지
- `npm run build`가 로컬에서 성공하는지

## 9. 커스텀 도메인 연결

Vercel 기본 도메인으로 먼저 테스트한 뒤 커스텀 도메인을 연결한다.

Vercel:

```text
Project → Settings → Domains
```

연결할 도메인 또는 서브도메인을 입력한다.

예:

```text
dummy.jeezdev.com
```

Cloudflare를 DNS로 쓰는 경우:

- Vercel이 안내하는 CNAME 또는 A 레코드를 Cloudflare DNS에 추가
- 기존 Cloudflare Tunnel용 DNS 레코드와 충돌하지 않게 정리
- 같은 서브도메인을 Cloudflare Tunnel과 Vercel에 동시에 물리지 않는다

권장 전환 순서:

1. Vercel 기본 도메인으로 배포 정상 확인
2. `/admin` 저장 → GitHub 커밋 → Vercel 재배포 확인
3. GA4 수집 확인
4. 마지막에 `dummy.jeezdev.com` DNS를 Vercel로 전환

## 10. GA4 연결 확인

Vercel 배포 도메인을 기준으로 GA4 측정이 들어오는지 확인한다.

필요 환경변수:

```text
NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX
NEXT_PUBLIC_SITE_URL=https://실제도메인
```

확인:

```text
GA4 → Reports 또는 Realtime
```

자동화 쪽에서는 `automation` 폴더의 GA4 Data API 스크립트를 계속 사용한다.

```powershell
cd automation
npm run ga4:traffic
npm run feedback
```

## 11. Claude Routine 자동화 테스트 방식

Vercel 도입 후 자동화 테스트는 다음 흐름으로 잡는다.

```text
Claude Routine
→ GA4 데이터 확인
→ Notion 작업 큐 확인
→ 개선 대상 글 선정
→ /admin 로그인
→ /admin/[slug]/edit 또는 /admin/new 입력
→ 저장
→ GitHub 커밋 확인
→ Vercel 재배포 확인
→ Notion에 결과 기록
```

처음에는 반드시 제한을 둔다.

```text
하루 1개 글
새 글보다는 기존 글 수정 우선
자동 삭제 금지
자동 저장 후 GitHub 커밋 확인
Vercel 배포 Ready 확인 후 완료 처리
```

## 12. 장애 대응

### `/admin` 저장 후 글이 바로 안 보임

정상일 수 있다.

- GitHub 커밋이 생겼는지 확인
- Vercel Deployments에서 새 배포가 Ready인지 확인
- 배포가 끝난 뒤 새 글 URL 접속

### `/admin` 저장 시 오류

확인할 것:

- `GITHUB_TOKEN`이 Vercel 환경변수에 있는지
- 토큰에 Contents read/write 권한이 있는지
- `GITHUB_OWNER`, `GITHUB_REPO`, `GITHUB_BRANCH` 값이 맞는지
- 토큰 만료일이 지나지 않았는지

### 배포는 됐는데 글 목록이 비어 있음

확인할 것:

- `dummy_site/content/posts/*.md`가 GitHub에 올라가 있는지
- 각 Markdown 파일 frontmatter에 `status: "published"`가 있는지
- Vercel Root Directory가 `dummy_site`인지

### 환경변수를 바꿨는데 반영이 안 됨

Vercel 환경변수 변경은 기존 배포에 소급 적용되지 않는다. 새 배포를 만들어야 한다.

해결:

```text
Vercel → Deployments → Redeploy
```

또는 GitHub에 새 커밋 push.

## 13. 완료 기준

Vercel 전환 완료 기준은 다음이다.

- Vercel 기본 도메인에서 `/` 글 목록이 보임
- `/posts/[slug]` 상세 페이지가 열림
- `/admin/login` 로그인 가능
- `/admin/new`에서 글 저장 가능
- 저장 후 GitHub에 Markdown 파일 커밋 생성
- Vercel이 자동 재배포
- 재배포 후 새 글 공개 URL 접속 가능
- GA4 Realtime 또는 Data API에서 페이지뷰 확인 가능

여기까지 되면 기존 로컬 PC + Cloudflare Tunnel 중심 구조에서 벗어나, GitHub/Vercel 중심의 자동화 테스트 구조로 전환된 것이다.

## 참고 공식 문서

- [Vercel Git 배포 문서](https://vercel.com/docs/git)
- [Vercel 환경변수 문서](https://vercel.com/docs/environment-variables)
- [Vercel 프로젝트 문서](https://vercel.com/docs/projects)
