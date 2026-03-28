# FrameCalc Web

Next.js 기반 모바일 우선 난간 계산기입니다. 기존 Android 앱은 그대로 두고 `web/` 폴더에 별도 웹 앱으로 구성했습니다.

## 주요 기능

- 전체 길이, 간격 개수, 난간 두께 기반 난간 배치 계산
- 난간 개수와 동일 간격 요약 표시
- 난간 시작/끝 위치 결과 표시
- 최근 유효 계산 자동 저장, 재불러오기, 삭제
- 모바일 화면 최적화 레이아웃

## 로컬 실행

```bash
npm install
npm run dev
```

브라우저에서 `http://localhost:3000`을 열면 됩니다.

## 품질 확인

```bash
npm run lint
npm run test
npm run build
```

## GitHub 업로드

현재 프로젝트 루트는 아직 Git 저장소가 아닐 수 있습니다. 그런 경우 루트에서 아래 순서로 진행합니다.

```bash
git init
git add .
git commit -m "Add FrameCalc Next.js web app"
git branch -M main
git remote add origin <YOUR_GITHUB_REPO_URL>
git push -u origin main
```

## Vercel 배포

1. GitHub 저장소를 Vercel에 import 합니다.
2. Root Directory를 `web`으로 지정합니다.
3. Framework Preset은 `Next.js`를 사용합니다.
4. 별도 환경변수 없이 바로 배포합니다.

배포 후 모바일 기기에서 첫 화면, 입력 동작, 이력 저장 동작을 바로 확인하면 됩니다.
