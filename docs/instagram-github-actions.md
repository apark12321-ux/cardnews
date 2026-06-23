# Instagram 자동 발행 — GitHub Actions 방식

이 문서는 `posts/*.json` 파일을 기준으로 Instagram 캐러셀을 자동 발행하는 방법입니다.

## 1. 전제 조건

Instagram Graph API 자동 발행은 일반 개인 계정이 아니라 비즈니스/크리에이터 계정에서 사용합니다. Meta 앱, Instagram 계정 ID, 장기 액세스 토큰이 필요합니다.

필수값:

```txt
IG_USER_ID=인스타그램 비즈니스/크리에이터 계정 ID
INSTAGRAM_ACCESS_TOKEN=Instagram Graph API 액세스 토큰
```

이미지 URL은 외부에서 접근 가능한 HTTPS 주소여야 합니다. 로컬 파일 경로는 Instagram API에 직접 넣을 수 없습니다.

## 2. GitHub Secrets 설정

GitHub 저장소에서 아래 경로로 이동합니다.

```txt
Settings → Secrets and variables → Actions → New repository secret
```

다음 Secrets를 추가합니다.

```txt
IG_USER_ID
INSTAGRAM_ACCESS_TOKEN
```

선택적으로 Variables에 아래 값을 넣을 수 있습니다.

```txt
GRAPH_API_VERSION=v23.0
MAX_CAROUSEL_IMAGES=10
IG_WAIT_FOR_READY=true
IG_READY_MAX_ATTEMPTS=12
IG_READY_INTERVAL_MS=5000
```

## 3. 게시물 JSON 작성

`posts/example-instagram-post.json` 형식으로 파일을 만듭니다.

```json
{
  "caption": "게시물 캡션",
  "imageUrls": [
    "https://example.com/card-01.png",
    "https://example.com/card-02.png"
  ],
  "dryRun": true
}
```

- `caption`: 인스타그램 게시물 캡션
- `imageUrls`: 공개 HTTPS 이미지 URL 목록
- `dryRun`: 파일 자체에서 드라이런을 기본값으로 둘 때 사용

## 4. GitHub Actions에서 실행

```txt
Actions → Instagram Publish → Run workflow
```

입력값:

```txt
post_file: posts/example-instagram-post.json
dry_run: true 또는 false
```

처음에는 반드시 `dry_run=true`로 실행합니다. 성공하면 `dry_run=false`로 실제 발행합니다.

## 5. 로컬 명령어로 실행

```bash
npm install
cp .env.example .env
npm run check:instagram
npm run publish:instagram -- posts/example-instagram-post.json --dry-run
npm run publish:instagram -- posts/example-instagram-post.json
```

## 6. 운영 팁

- 실수 방지를 위해 `.env`에서 `DRY_RUN_ONLY=true`로 시작하세요.
- 실발행 전 `npm run check:instagram`으로 계정 연결을 먼저 확인하세요.
- 이미지 URL은 브라우저 시크릿 창에서 열리는지 확인하세요.
- 카드 수는 기본 10장 이하로 운영하세요.
- 공식 출처, 발행일, 신청 조건이 들어간 캡션인지 최종 확인하세요.
