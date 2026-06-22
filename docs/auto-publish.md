# 자동 등록 기능

자동 등록 기능은 `docs/auto-publishing-setup.md`를 기준 문서로 사용합니다.

핵심 흐름은 다음과 같습니다.

```txt
카드뉴스 생성
→ 1080x1350 PNG 렌더링
→ Cloudinary 이미지 업로드
→ Instagram Graph API 캐러셀 컨테이너 생성
→ media_publish 호출
→ 인스타그램 자동 등록 완료
```

실행 방법과 환경변수 설정은 아래 문서를 확인하세요.

- `docs/auto-publishing-setup.md`
