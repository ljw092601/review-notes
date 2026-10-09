import type { Category } from './types'

export const DEFAULT_CERTIFICATION = '정보처리기사'
export const FALLBACK_CATEGORY_ID = 'etc'

/** 정보처리기사 실기 출제 범위 기준 초기 문제 유형. DB 최초 생성 시 시드로 들어간다. */
export const DEFAULT_CATEGORIES: Category[] = [
  { id: 'programming', name: '프로그래밍', description: 'C / Java / Python 코드 실행 결과, 문법, 자료구조·알고리즘', order: 0 },
  { id: 'sql', name: 'SQL', description: 'DDL / DML / DCL, 조인, 서브쿼리, 뷰, 인덱스, 실행 결과', order: 1 },
  { id: 'database', name: '데이터베이스 이론', description: '정규화, 키, 무결성, 트랜잭션, 회복, 병행 제어, 관계대수', order: 2 },
  { id: 'network', name: '네트워크', description: 'OSI 7계층, TCP/IP, 프로토콜, 라우팅, IP 주소·서브넷, 네트워크 장비', order: 3 },
  { id: 'security', name: '보안', description: '암호화 알고리즘, 공격 유형, 인증·접근통제, 보안 솔루션, 시큐어 코딩', order: 4 },
  { id: 'os', name: '운영체제', description: '프로세스·스레드, 스케줄링, 메모리·페이지 교체, 파일 시스템, 교착상태, 유닉스·리눅스 명령', order: 5 },
  { id: 'design', name: '소프트웨어 설계', description: 'UML, 디자인 패턴, 아키텍처, 결합도·응집도, 모듈화, 객체지향 원칙', order: 6 },
  { id: 'testing', name: '테스트', description: '화이트박스·블랙박스, 커버리지, 테스트 단계·종류, 테스트 오라클, 결함 관리', order: 7 },
  { id: 'methodology', name: '개발방법론·요구사항', description: '폭포수·애자일, 비용산정, 요구사항 분석·검증, 프로젝트 관리', order: 8 },
  { id: 'interface', name: '인터페이스·통합', description: 'EAI/ESB, 미들웨어, JSON/XML/AJAX, 인터페이스 보안·검증', order: 9 },
  { id: 'release', name: '형상관리·패키징', description: '버전 관리 도구, 빌드·배포, 릴리즈 노트, DRM, 매뉴얼', order: 10 },
  { id: 'terminology', name: 'IT 신기술·용어', description: '약어, 신기술 용어, 클라우드·빅데이터·AI 관련 개념', order: 11 },
  { id: FALLBACK_CATEGORY_ID, name: '기타', description: '위에 안 들어가는 것', order: 12 },
]
