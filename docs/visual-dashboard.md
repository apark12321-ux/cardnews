# 요즘돈 자동화 진행 대시보드

`dashboard.html`은 요즘돈 카드뉴스 자동화가 어디까지 진행됐는지 한눈에 확인하기 위한 관제 화면입니다.

## 접속

Vercel 배포 후 아래 경로로 접속합니다.

```txt
/dashboard
```

로컬에서는 저장소의 `dashboard.html` 파일을 브라우저로 열면 됩니다.

## 무엇을 보여주나

- `posts/*.json` 발행 큐 상태
- queued / published 글 개수
- GitHub Actions 최근 실행 기록
- 예약 cron 설정 여부
- 자동화 구성 파일 존재 여부
- 정적 생성기 → 큐 → 렌더 → 업로드 → 인스타 게시 → 완료 처리 흐름

## 주의

브라우저 화면에서는 GitHub Secrets 값을 직접 확인할 수 없습니다. `IG_USER_ID`, `INSTAGRAM_ACCESS_TOKEN`, `CLOUDINARY_API_SECRET` 같은 값은 보안상 노출되지 않습니다.

대신 Actions 실행 결과를 통해 간접적으로 확인합니다.

- `Check Instagram account` 성공: 인스타 토큰/계정 연결 정상 가능성이 높음
- `Cloudinary upload` 성공: Cloudinary 키 정상 가능성이 높음
- 게시 단계 실패: Graph API 권한, 토큰 만료, 인스타 계정 연결 문제를 확인

## 왜 n8n 대신 이 화면을 쓰나

이 프로젝트의 자동화 실행 주체는 GitHub Actions입니다. n8n처럼 별도 서버를 상시 운영할 필요가 없습니다.

대시보드는 실행 주체가 아니라 관제판입니다.

```txt
생성기 → posts 큐 → GitHub Actions → Cloudinary → Instagram → published
```

위 흐름을 사람이 이해하기 쉽게 시각화합니다.
