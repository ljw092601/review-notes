# ReviewNotes — 정보처리기사 오답노트 웹앱

전체 설계·단계별 계획은 `PLAN.md`를 먼저 읽는다.

## 기술 스택
- Vite + React 19 + TypeScript, Tailwind CSS v4 (`@tailwindcss/vite`, 설정 파일 없음, `src/index.css`의 `@theme`로 토큰 정의)
- Dexie(IndexedDB) + dexie-react-hooks, react-router-dom, react-markdown + remark-gfm, zod
- 테스트: Vitest + Testing Library (jsdom). 테스트는 `tests/` 또는 `src/**/*.test.tsx`
- 린트: oxlint

## 명령
```
npm run dev        # 개발 서버
npm run build      # tsc -b && vite build
npm run typecheck  # tsc -b
npm run lint       # oxlint
npm run test       # vitest run
```

## 폴더 규칙
- `src/db/` Dexie 인스턴스·스키마·마이그레이션
  - `src/db/backup.ts` 자동 백업: 폴더에 `review-notes.json`+`images/`+`history/` 쓰기, 폴더에서 복원, 변경 구독(`onDataChanged`)
  - `src/db/settings.ts` key-value 설정 테이블(백업 폴더 핸들, 마지막 백업 시각)
- `src/lib/fsAccess.ts` File System Access API 래퍼(폴더 선택, 권한, 파일 읽기/쓰기)와 lib.dom에 없는 타입 선언
- `src/models/` 타입, zod 스키마(가져오기 파일 검증), 문제 유형 시드
- `src/features/<도메인>/` 화면과 훅. problems / quiz / transfer
- `src/components/` 공용 UI
- `inbox/` 문제 사진 입력 (gitignore). 결과 JSON도 같은 날짜 폴더(`inbox/<날짜>/<날짜>.json`)에 둔다
- `.claude/skills/import-problems/` 사진 → 가져오기 JSON 변환 스킬. `SKILL.md`(규칙·분류표) + `build.mjs`(중간 파일에 이미지 base64 합치기). 사용자가 "오답 정리해줘"라고 하면 이 스킬을 따른다
- `scripts/` 바탕화면 실행용. `start.ps1`(서버 없으면 켜고 크롬으로 5173 열기), `make-shortcut.ps1`(바탕화면 바로가기 생성), `reviewnotes.ico`(favicon.svg에서 만든 아이콘)
- import 경로 별칭 `@/` = `src/`

## 작업 규칙
- 서버 없음. 모든 데이터는 브라우저 IndexedDB. 외부 API 호출 금지
- UI 문구는 한국어
- 데이터 스키마를 바꾸면 Dexie 버전을 올리고 마이그레이션을 쓴다
- File System Access API는 Chrome·Edge 전용이라 항상 미지원 분기를 둔다(`isFsAccessSupported`). 권한 요청은 사용자 클릭 안에서만
- 기능을 끝내면 `npm run typecheck && npm run lint && npm run test`가 통과해야 한다
