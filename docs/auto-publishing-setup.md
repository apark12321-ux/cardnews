# 요즘돈 자동 생성·자동 등록 설정

이 문서는 `public/publisher.html`에서 카드뉴스를 생성하고 Instagram Graph API로 캐러셀을 자동 등록하는 방법을 정리합니다.

## 1. 실행

```bash
npm install
cp .env.example .env
npm start
```

브라우저에서 아래 주소를 엽니다.

```txt
http://localhost:3000/public/publisher.html
```

## 2. 필요한 외부 설정

자동 등록은 브라우저 단독으로 할 수 없습니다. Instagram 액세스 토큰을 클라이언트에 노출하면 안 되기 때문에 `server.js`가 중간 서버 역할을 합니다.

필요한 값은 `.env`에 넣습니다.

```txt
IG_USER_ID=인스타그램 비즈니스/크리에이터 계정 ID
INSTAGRAM_ACCESS_TOKEN=Instagram Graph API 액세스 토큰
CLOUDINARY_CLOUD_NAME=Cloudinary 클라우드명
CLOUDINARY_API_KEY=Cloudinary API Key
CLOUDINARY_API_SECRET=Cloudinary API Secret
```

## 3. 등록 흐름

```txt
주제 입력
→ 10장 카드뉴스 원고 생성
→ Canvas로 1080x1350 PNG 렌더링
→ Cloudinary에 이미지 업로드
→ Instagram media container 생성
→ carousel container 생성
→ media_publish 호출
→ 인스타그램 게시물 등록 완료
```

## 4. 드라이런

실제 인스타그램에 올리기 전 `드라이런 검증` 버튼을 누릅니다.

드라이런은 다음을 확인합니다.

- 카드 이미지가 정상 렌더링되는지
- Cloudinary 이미지 업로드가 되는지
- Instagram 게시 요청 payload가 만들어지는지

단, 드라이런에서는 Instagram `media_publish`를 호출하지 않습니다.

## 5. 주의사항

- 자동 등록은 Instagram Business 또는 Creator 계정이 필요합니다.
- Instagram 계정은 Facebook Page와 연결되어 있어야 합니다.
- 액세스 토큰은 절대 프론트엔드 코드에 넣지 않습니다.
- 카드뉴스 자동 등록은 API 제한과 계정 권한에 따라 실패할 수 있습니다.
- 금액·기한·대상 조건은 발행 직전 공식 출처로 다시 확인합니다.

## 6. 파일 위치

```txt
server.js                  # 자동 등록 API 서버
public/publisher.html       # 자동 생성·자동 등록 화면
public/publisher.css        # 화면 스타일
public/publisher.js         # 카드 생성, PNG 렌더링, 등록 요청 로직
.env.example                # 환경변수 예시
package.json                # Node 실행 설정
```
