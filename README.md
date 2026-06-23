# 요즘돈 카드뉴스 자동화 툴

인스타 카드뉴스 채널 **요즘돈** 운영을 위한 자동화 툴입니다.

세 가지 모드가 있습니다.

1. `index.html` — 정적 원고 생성기
2. `public/publisher.html` — 자동 생성·PNG 렌더링·Instagram 즉시 등록기
3. `.github/workflows/instagram-publish.yml` — JSON 파일 기반 GitHub Actions 자동 발행

## 1. 정적 원고 생성기

별도 설치 없이 브라우저에서 실행합니다.

```bash
git clone https://github.com/apark12321-ux/cardnews.git
cd cardnews
```

그 다음 `index.html` 파일을 브라우저로 열면 됩니다.

입력값을 넣으면 다음 산출물을 생성합니다.

- 13장 인스타 캐러셀 카드뉴스 원고
- 게시물 캡션
- 해시태그
- 발행 전 검수 체크리스트
- 캔바/미리캔버스에 붙여넣기 쉬운 Markdown 원고

## 2. 자동 생성·즉시 등록기

Instagram 자동 등록까지 쓰려면 Node 서버를 실행해야 합니다.

```bash
npm install
cp .env.example .env
npm start
```

브라우저에서 아래 주소를 엽니다.

```txt
http://localhost:3000/public/publisher.html
```

자동 등록기는 다음 순서로 작동합니다.

```txt
주제 입력
→ 10장 카드뉴스 원고 생성
→ 1080x1350 PNG 렌더링
→ Cloudinary 이미지 업로드
→ Instagram media container 생성
→ carousel container 생성
→ media_publish 호출
→ 인스타그램 게시물 등록 완료
```

## 3. JSON 기반 자동 발행

이미 공개 HTTPS 이미지 URL이 준비되어 있다면 브라우저 없이 명령어로 발행할 수 있습니다.

```bash
npm run check:instagram
npm run publish:instagram -- posts/example-instagram-post.json --dry-run
npm run publish:instagram -- posts/example-instagram-post.json
```

게시물 파일 형식:

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

## 4. GitHub Actions 자동 발행

GitHub 저장소의 Actions 탭에서 `Instagram Publish` 워크플로우를 수동 실행할 수 있습니다.

```txt
Actions → Instagram Publish → Run workflow
```

입력값:

```txt
post_file: posts/example-instagram-post.json
dry_run: true 또는 false
```

처음에는 반드시 `dry_run=true`로 검증한 뒤, 성공하면 `dry_run=false`로 실제 발행합니다.

자세한 설명은 `docs/instagram-github-actions.md`를 확인하세요.

## 자동 등록 환경변수

`.env.example`을 `.env`로 복사한 뒤 아래 값을 채워야 합니다.

```txt
IG_USER_ID=인스타그램 비즈니스/크리에이터 계정 ID
INSTAGRAM_ACCESS_TOKEN=Instagram Graph API 액세스 토큰
CLOUDINARY_CLOUD_NAME=Cloudinary 클라우드명
CLOUDINARY_API_KEY=Cloudinary API Key
CLOUDINARY_API_SECRET=Cloudinary API Secret
```

GitHub Actions에서는 아래 값을 Repository Secrets에 넣습니다.

```txt
IG_USER_ID
INSTAGRAM_ACCESS_TOKEN
```

Cloudinary 값은 브라우저 즉시 등록기에서 PNG를 업로드할 때 필요합니다. GitHub Actions 방식은 이미 공개된 `imageUrls`를 사용하므로 Cloudinary가 필수는 아닙니다.

## 파일 구조

```txt
cardnews/
├─ index.html
├─ styles.css
├─ app.js
├─ server.js
├─ package.json
├─ .env.example
├─ src/
│  └─ instagramPublisher.mjs
├─ scripts/
│  └─ publish-instagram.mjs
├─ public/
│  ├─ publisher.html
│  ├─ publisher.css
│  └─ publisher.js
├─ posts/
│  └─ example-instagram-post.json
├─ docs/
│  ├─ instagram-github-actions.md
│  ├─ auto-publish.md
│  └─ auto-publishing-setup.md
├─ templates/
│  └─ workflow.md
└─ .github/workflows/
   └─ instagram-publish.yml
```

## 운영 원칙

1. 금액·기한·소득기준은 발행 당일 공식 출처 기준으로 확인합니다.
2. “무조건”, “누구나”, “확정 지급” 같은 낚시성 표현을 쓰지 않습니다.
3. AI가 쓴 티가 나지 않도록 운영자 관점 한 줄을 반드시 넣습니다.
4. 자동 등록 전에는 드라이런 검증을 먼저 실행합니다.
5. 액세스 토큰은 절대 프론트엔드 코드에 넣지 않습니다.

## 채널 컨셉

> 돈 되는 트렌드만 골라드림.  
> 바빠서 못 챙기는 소비·재테크·정책 흐름을 매주 카드 한 세트로 정리합니다.
