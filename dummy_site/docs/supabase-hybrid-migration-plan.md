# Supabase 하이브리드 전환 개발 계획

작성일: 2026-07-14

## 1. 목표 구조

현재 구조는 GitHub Markdown 파일을 컨텐츠 원본으로 사용하고, Vercel이 GitHub 커밋을 감지해 다시 배포하는 방식이다.

전환 후 목표 구조는 다음과 같다.

```text
GitHub
  - 사이트 코드 저장소
  - Supabase schema/migration 파일
  - 월 1회 Markdown 백업 저장소

Vercel
  - Next.js 사이트 배포
  - Server Actions / Route Handlers 실행
  - 관리자 페이지와 공개 페이지 제공

Supabase
  - 글 원본 DB
  - 자동화 작업 상태 DB
  - SEO/GA4 분석 결과 저장
  - 글 수정 이력과 이벤트 로그 저장
```

## 2. 설계 원칙

1. Supabase를 글 원본으로 사용한다.
2. GitHub Markdown은 운영 원본이 아니라 월 1회 백업 스냅샷으로 사용한다.
3. GitHub와 Supabase 간 동기화는 `Supabase -> GitHub backup` 단방향으로 제한한다.
4. 공개 페이지는 Supabase에서 데이터를 읽되, SEO를 위해 서버 렌더링 또는 ISR 캐시를 사용한다.
5. 관리자 저장/수정/삭제는 Vercel Server Action 또는 Route Handler에서 처리한다.
6. Supabase service role key는 브라우저에 노출하지 않는다.
7. 자동화 작업은 작업 큐와 이벤트 로그를 남긴다.

## 3. 권장 단계

### Phase 0. 준비와 백업

- 현재 GitHub Markdown 컨텐츠를 기준으로 백업한다.
- 현재 Vercel 환경변수와 관리자 계정 설정을 확인한다.
- Supabase 프로젝트를 생성한다.
- Supabase DB 비밀번호, Project URL, anon key, service role key를 확보한다.
- 기존 GitHub Markdown 구조에서 Supabase로 옮길 필드를 확정한다.

완료 기준:

- Supabase 프로젝트가 준비되어 있다.
- 필요한 키와 URL이 Vercel 환경변수로 입력 가능하다.
- 현재 글 목록을 Supabase로 이관할 기준이 정해졌다.

### Phase 1. Supabase 스키마 추가

초기 테이블 후보:

```text
posts
post_revisions
post_events
automation_jobs
seo_audits
backup_runs
```

`posts` 예시 필드:

```text
id uuid primary key
slug text unique not null
title text not null
content text not null
status text not null
excerpt text
meta_title text
meta_description text
created_at timestamptz
updated_at timestamptz
published_at timestamptz
deleted_at timestamptz
```

`post_revisions` 예시 필드:

```text
id uuid primary key
post_id uuid references posts(id)
title text
content text
status text
change_source text
created_at timestamptz
```

`post_events` 예시 필드:

```text
id uuid primary key
post_id uuid references posts(id)
event_type text not null
message text
metadata jsonb
created_at timestamptz
```

`automation_jobs` 예시 필드:

```text
id uuid primary key
job_type text not null
target_slug text
status text not null
agent text
input jsonb
output jsonb
error_message text
created_at timestamptz
started_at timestamptz
finished_at timestamptz
```

완료 기준:

- Supabase SQL migration 파일이 GitHub에 저장된다.
- 로컬/배포 환경에서 Supabase 연결 테스트가 가능하다.

### Phase 2. 읽기 경로 전환

기존:

```text
dummy_site/content/posts/*.md
```

전환:

```text
Supabase posts table
```

작업:

- `src/lib/db.ts` 또는 새 `src/lib/content-store.ts`를 Supabase 기반으로 재구성한다.
- 공개 글 목록 `/`은 `status = published`이고 `deleted_at is null`인 글만 읽는다.
- 글 상세 `/posts/[slug]`는 Supabase에서 slug로 조회한다.
- `sitemap.xml`도 Supabase 기준으로 생성한다.

캐시 전략:

- 테스트 단계에서는 dynamic 렌더링으로 즉시성 확인
- 안정화 후 공개 페이지는 ISR 또는 tag 기반 revalidate 검토

완료 기준:

- GitHub Markdown 파일 없이도 공개 글 목록과 상세 페이지가 Supabase 데이터를 표시한다.
- sitemap이 Supabase 기준으로 생성된다.

### Phase 3. 관리자 쓰기 경로 전환

기존:

```text
/admin 저장
→ GitHub Contents API
→ Markdown 커밋
→ Vercel 재배포
```

전환:

```text
/admin 저장
→ Supabase insert/update/delete
→ 즉시 반영
→ post_events / post_revisions 기록
```

작업:

- `/admin/new` 저장을 Supabase insert로 변경한다.
- `/admin/[slug]/edit` 수정을 Supabase update로 변경한다.
- 삭제는 hard delete보다 soft delete를 기본값으로 둔다.

삭제 권장 방식:

```text
deleted_at = now()
status = deleted
```

완료 기준:

- 관리자에서 생성/수정/삭제 후 Vercel 재배포 없이 화면에 반영된다.
- 수정 전 버전이 `post_revisions`에 남는다.
- 작업 결과가 `post_events`에 남는다.

### Phase 4. 기존 Markdown 데이터 이관

작업:

- `dummy_site/content/posts/*.md`를 읽어 Supabase `posts`에 삽입하는 import script 작성
- frontmatter의 slug, title, status, created_at, updated_at을 유지
- 중복 slug 처리 정책 확정

완료 기준:

- 기존 글 전체가 Supabase에 들어간다.
- 공개 페이지 글 수와 sitemap URL 수가 이관 전과 일치한다.

### Phase 5. 월 1회 GitHub Markdown 백업

백업 방향:

```text
Supabase -> GitHub Markdown
```

백업 경로:

```text
backups/posts/YYYY-MM/<slug>.md
```

백업 Markdown 예시:

```md
---
id: "uuid"
slug: "example-slug"
title: "Example Title"
status: "published"
created_at: "2026-07-14T00:00:00.000Z"
updated_at: "2026-07-14T00:00:00.000Z"
backup_month: "2026-07"
source: "supabase"
---

본문
```

실행 방식 후보:

1. Vercel Cron
2. GitHub Actions schedule
3. PC-A Windows 작업 스케줄러
4. Claude Routine 월간 작업

초기 추천:

- 테스트 단계: 수동 스크립트 실행
- 안정화 후: GitHub Actions 또는 Vercel Cron

완료 기준:

- 월별 전체 Markdown 스냅샷이 GitHub에 커밋된다.
- `backup_runs`에 백업 실행 결과가 남는다.

### Phase 6. 자동화 상태 DB 확장

작업:

- GA4 분석 결과를 `seo_audits`에 저장한다.
- Claude/Codex/Gemini 작업 결과를 `automation_jobs`와 `post_events`에 저장한다.
- 실패 작업을 재시도할 수 있도록 status를 둔다.

상태 예시:

```text
queued
running
succeeded
failed
cancelled
```

완료 기준:

- 자동화가 어떤 글을 왜 수정했는지 추적 가능하다.
- 실패한 자동화 작업을 다시 실행할 수 있다.

## 4. 사용자 준비 항목

### Supabase

- Supabase 계정
- 새 프로젝트
- Project URL
- anon public key
- service role key
- Database password
- 리전 선택
- Free/Pro 플랜 선택

### Vercel 환경변수

추가 예정:

```text
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_DB_URL=
```

기존 유지:

```text
ADMIN_USERNAME=
ADMIN_PASSWORD=
NEXT_PUBLIC_SITE_URL=
NEXT_PUBLIC_GA_MEASUREMENT_ID=
```

GitHub Markdown 백업을 자동화할 경우 유지 또는 추가:

```text
GITHUB_TOKEN=
GITHUB_OWNER=intellicastle02
GITHUB_REPO=ai-writing-test-dummy
GITHUB_BRANCH=main
GITHUB_BACKUP_DIR=backups/posts
```

### GitHub

- 백업 커밋에 사용할 GitHub token
- Contents read/write 권한
- 백업 경로 확정
- 백업 커밋 작성자 이름/이메일 결정

### 운영 정책

- 삭제를 soft delete로 할지 hard delete로 할지 결정
- 월간 백업 실행일 결정
- 백업에 draft 글도 포함할지 결정
- AI 자동 수정 전 사람 승인 단계를 둘지 결정
- Notion은 운영 원본이 아니라 업무 관리/기록용으로 유지할지 결정

## 5. 주요 리스크

### 데이터 원본 혼선

Supabase와 GitHub Markdown을 양방향으로 수정하면 충돌 위험이 크다.

대응:

```text
Supabase = 원본
GitHub Markdown = 백업
```

단방향 원칙을 유지한다.

### 보안

Supabase service role key가 브라우저에 노출되면 안 된다.

대응:

- service role key는 서버 전용 환경변수로만 사용
- 브라우저에서는 anon key만 사용
- 관리자 쓰기는 Server Action 또는 Route Handler에서 처리

### 캐시 지연

Supabase로 전환해도 Next.js 캐시 전략에 따라 즉시 반영이 안 될 수 있다.

대응:

- 초기에는 dynamic 렌더링으로 즉시성 확인
- 이후 성능이 필요하면 ISR/revalidate를 단계적으로 적용

### 비용과 프로젝트 일시정지

Free 플랜은 테스트에는 충분할 수 있지만, 비활성 일시정지나 용량 제한이 있을 수 있다.

대응:

- 테스트 후 운영 안정화 단계에서 Pro 필요 여부 판단

## 6. 우선순위 요약

1. Supabase 프로젝트와 키 준비
2. DB schema/migration 작성
3. 기존 Markdown import script 작성
4. 공개 읽기 경로를 Supabase로 전환
5. 관리자 생성/수정/삭제를 Supabase로 전환
6. sitemap/robots/SEO 경로 확인
7. 월간 GitHub Markdown 백업 스크립트 추가
8. 자동화 작업 로그/GA4 분석 결과 저장 확장

## 7. 첫 구현 범위 추천

첫 PR 또는 첫 구현 단위는 너무 크게 잡지 않는다.

추천 첫 범위:

```text
- Supabase client/server helper 추가
- posts 테이블 migration SQL 작성
- Markdown -> Supabase import script 작성
- list/get 읽기 로직을 Supabase로 바꿀 수 있는 abstraction 추가
```

이 단계에서는 기존 GitHub Markdown 동작을 바로 제거하지 않는다.

다음 단계에서 관리자 쓰기 경로를 Supabase로 전환한다.
