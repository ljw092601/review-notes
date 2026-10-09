import type { CSSProperties } from 'react'

/** 기본 유형별 색상 각도(oklch hue). 서로 멀리 떨어뜨려 한눈에 구분되게 */
const SEED_HUE: Record<string, number> = {
  programming: 250, // 파랑
  sql: 200, // 하늘
  database: 165, // 청록
  network: 140, // 초록
  security: 20, // 빨강
  os: 300, // 보라
  design: 335, // 자주
  testing: 95, // 올리브
  methodology: 60, // 호박
  interface: 225, // 남색
  release: 120, // 연두
  terminology: 275, // 바이올렛
}

/** 사용자가 추가한 유형은 id 문자열로 각도를 정한다(같은 id면 항상 같은 색) */
function hashHue(id: string): number {
  let h = 0
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0
  return h % 360
}

/** `기타`는 무채색, 나머지는 유형마다 다른 색. CSS 변수로 넘겨 .cat-* 클래스가 색을 만든다 */
export function categoryStyle(id: string): CSSProperties {
  if (id === 'etc') return { '--cat-h': 60, '--cat-c': 0 } as CSSProperties
  return { '--cat-h': SEED_HUE[id] ?? hashHue(id), '--cat-c': 1 } as CSSProperties
}
