# 관리자 삭제 동작 기록

작성일: 2026-07-13

## 확인 결과

`/admin`에서 삭제 버튼을 눌렀을 때 실제 컨텐츠 삭제 동작은 정상 작동하는 것을 확인했다.

다만 웹 페이지 반영은 즉시 일어나지 않는다. 현재 사이트는 GitHub 저장소의 Markdown 파일을 컨텐츠 저장소로 사용하고, Vercel이 GitHub 커밋을 감지해 다시 배포하는 구조이기 때문이다.

## 현재 삭제 흐름

```text
/admin 삭제 버튼 클릭
→ Vercel Server Action 실행
→ GitHub Contents API로 Markdown 파일 삭제 커밋 생성
→ GitHub main 브랜치 변경
→ Vercel 자동 배포 시작
→ 새 배포가 Ready 된 뒤 웹 페이지와 sitemap에 반영
```

## 정상 동작 확인 기준

삭제 버튼을 누른 직후 웹 화면만 보고 판단하지 않는다. 아래 순서로 확인한다.

1. GitHub 커밋 목록에 `Delete post: <slug>` 커밋이 생성되었는지 확인
2. Vercel Deployments에 해당 커밋 기반 새 배포가 생성되었는지 확인
3. 배포 상태가 Ready가 되었는지 확인
4. 이후 `/posts/<slug>` 접근 시 404가 되는지 확인
5. `sitemap.xml`에서 해당 글 URL이 사라졌는지 확인

## 느리게 보이는 이유

현재 구조는 런타임 DB를 직접 수정하는 방식이 아니라, GitHub 파일 변경 후 Vercel 재배포를 기다리는 방식이다.

그래서 삭제, 생성, 수정 모두 다음 지연이 발생할 수 있다.

- GitHub API 요청 시간
- GitHub 커밋 반영 시간
- Vercel 빌드/배포 시간
- CDN 캐시 또는 브라우저 캐시 반영 시간

이 지연은 현재 구조에서는 자연스러운 동작이며, 삭제 기능 자체의 오류로 보지 않는다.

## 운영 판단

자동 글 업로드/수정/삭제 테스트 목적에서는 현재 방식으로 충분하다.

다만 관리자 화면에서 즉시 삭제된 것처럼 보이는 UX가 필요하거나, 대량 컨텐츠를 빠르게 수정해야 한다면 GitHub 파일 기반 저장소 대신 별도 런타임 DB를 검토해야 한다.

후보:

- Vercel KV
- Supabase
- Postgres
- Notion API
- GitHub 저장소 유지 + 별도 상태 캐시

현재 단계에서는 GitHub 커밋과 Vercel 재배포 기반으로 운영한다.
