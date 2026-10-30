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
- `src/lib/figures.ts` 본문 그림 참조. 마크다운 `![설명](img:fig-1.png)`가 그 문제의 첨부 이미지(이름 일치)를 그 자리에 그린다. `Markdown`에 `images`를 넘겨야 동작하고, 참조된 그림은 '원본 사진' 목록에서 뺀다
- `src/models/` 타입, zod 스키마(가져오기 파일 검증), 문제 유형 시드
- `src/features/<도메인>/` 화면과 훅. problems / quiz / transfer / print(인쇄) / anki(빈칸 카드 내보내기: `cloze.ts` 순수 로직, `markdownHtml.tsx` 마크다운→HTML) / exams(기출 풀기) / study(암기 탭: `content.ts`에 결합도·응집도·GoF·테스트 기법·DB 이론·라우팅 정리, 가리기 모드, `anki.ts`로 용어 가리기 Anki 기본 카드 파일)
  - `exams/data.ts`가 `inbox/기출문제/*.md`와 `images/`를 `import.meta.glob`으로 읽는다(inbox는 gitignore라 레포엔 문제 내용이 없고, 폴더가 없으면 빈 목록). `parse.ts`는 문제 파일(`## N번 <sub>(난이도 ..)</sub>`)과 정답 파일(`**유형**:` / `**정답**:` / `> 비고:`) 파서
  - `inbox/모의고사/`(`모의고사 N회 정보처리기사 실기.md` + `... 정답.md`, 형식은 기출과 같음)는 자체 출제 모의고사. `Exam.kind`가 `mock`, id `mock-N`, 화면은 `/mocks`(같은 `ExamListPage`·`ExamPage`에 `kind`)
  - 회차 풀이 기록은 `examResults` 테이블(Dexie v3, `src/db/exams.ts`). 오답노트로 옮길 때 출처(`2024년 1회 정보처리기사 실기 5번`)로 중복을 막는다
- `src/components/` 공용 UI
- `inbox/` 문제 사진 입력 (gitignore). 결과 JSON도 같은 날짜 폴더(`inbox/<날짜>/<날짜>.json`)에 둔다
- `.claude/skills/import-problems/` 사진 → 가져오기 JSON 변환 스킬. `SKILL.md`(규칙·분류표) + `build.mjs`(중간 파일에 이미지 base64 합치기) + `crop.py`(Pillow로 그림 잘라내기, `figures` 항목). 사용자가 "오답 정리해줘"라고 하면 이 스킬을 따른다
- `scripts/` 바탕화면 실행용. `start.ps1`(서버 없으면 켜고 크롬으로 5173 열기), `make-shortcut.ps1`(바탕화면 바로가기 생성), `reviewnotes.ico`(favicon.svg에서 만든 아이콘)
- import 경로 별칭 `@/` = `src/`

## 작업 규칙
- 서버 없음. 모든 데이터는 브라우저 IndexedDB. 외부 API 호출 금지
- UI 문구는 한국어
- 데이터 스키마를 바꾸면 Dexie 버전을 올리고 마이그레이션을 쓴다
- File System Access API는 Chrome·Edge 전용이라 항상 미지원 분기를 둔다(`isFsAccessSupported`). 권한 요청은 사용자 클릭 안에서만
- 기능을 끝내면 `npm run typecheck && npm run lint && npm run test`가 통과해야 한다
