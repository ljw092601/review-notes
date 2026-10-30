/**
 * 암기 탭 정리 내용. 기출에서 반복 출제되는 결합도·응집도, GoF 디자인 패턴, 테스트 기법, DB 이론, 라우팅 프로토콜.
 * 순서가 의미 있는 묶음(결합도·응집도·커버리지)은 `order`에 방향을 적고 항목도 그 순서로 둔다.
 */

export interface StudyItem {
  /** 한국어 용어 */
  term: string
  /** 영문 명칭. 시험에서 영문으로 쓰게 하는 경우가 많다 */
  en?: string
  desc: string
  /** 헷갈리는 짝·구별 포인트 */
  tip?: string
}

export interface StudyGroup {
  id: string
  title: string
  /** 항목 순서의 뜻. 예: '약함 → 강함' */
  order?: string
  /** 앞 글자 외우기 */
  mnemonic?: string
  note?: string
  items: StudyItem[]
}

export interface StudyTopic {
  id: string
  title: string
  intro: string
  groups: StudyGroup[]
}

export const STUDY_TOPICS: StudyTopic[] = [
  {
    id: 'module',
    title: '결합도 · 응집도',
    intro: '좋은 모듈은 결합도는 낮고 응집도는 높다. 종류를 순서대로 외우고, 설명을 보고 이름을 고를 수 있어야 한다.',
    groups: [
      {
        id: 'coupling',
        title: '결합도 (Coupling)',
        order: '약함(좋음) → 강함(나쁨)',
        mnemonic: '자 · 스 · 제 · 외 · 공 · 내',
        note: '모듈 사이의 의존 정도. 낮을수록 좋다.',
        items: [
          { term: '자료 결합도', en: 'Data Coupling', desc: '모듈끼리 필요한 데이터만 매개변수로 주고받는다. 가장 바람직하다.' },
          {
            term: '스탬프 결합도',
            en: 'Stamp Coupling',
            desc: '배열·레코드·객체 같은 자료 구조를 통째로 넘기고, 받는 쪽은 그중 일부만 쓴다.',
            tip: '자료 구조가 바뀌면 그것을 쓰지 않는 모듈도 영향을 받는다',
          },
          {
            term: '제어 결합도',
            en: 'Control Coupling',
            desc: '제어 신호(플래그)를 넘겨 받는 모듈의 처리 흐름을 결정한다.',
            tip: '하위 모듈이 상위 모듈에 처리 지시를 하는 권리 전도 현상이 생길 수 있다',
          },
          { term: '외부 결합도', en: 'External Coupling', desc: '외부에서 선언된 데이터(외부 변수)나 외부 장치·통신 프로토콜을 여러 모듈이 참조한다.' },
          {
            term: '공통 결합도',
            en: 'Common Coupling',
            desc: '전역 변수 같은 공유 공통 데이터 영역을 여러 모듈이 함께 쓴다.',
            tip: '외부 결합도는 데이터 하나를 참조, 공통 결합도는 공통 영역 전체를 공유',
          },
          { term: '내용 결합도', en: 'Content Coupling', desc: '한 모듈이 다른 모듈의 내부 기능이나 내부 자료를 직접 참조하거나 고친다. 가장 나쁘다.' },
        ],
      },
      {
        id: 'cohesion',
        title: '응집도 (Cohesion)',
        order: '강함(좋음) → 약함(나쁨)',
        mnemonic: '기 · 순 · 교 · 절 · 시 · 논 · 우',
        note: '모듈 안의 요소들이 하나의 목적에 얼마나 모여 있는지. 높을수록 좋다.',
        items: [
          { term: '기능적 응집도', en: 'Functional Cohesion', desc: '모듈 안의 모든 요소가 하나의 기능을 수행하려고 모여 있다. 가장 바람직하다.' },
          { term: '순차적 응집도', en: 'Sequential Cohesion', desc: '한 요소의 출력이 다음 요소의 입력으로 쓰인다.' },
          {
            term: '교환적 응집도',
            en: 'Communicational Cohesion',
            desc: '같은 입력 데이터나 출력 데이터를 쓰는 서로 다른 기능들이 모여 있다. 통신적 응집도라고도 한다.',
            tip: '순차적은 출력→입력으로 이어짐, 교환적은 같은 데이터를 함께 씀',
          },
          {
            term: '절차적 응집도',
            en: 'Procedural Cohesion',
            desc: '모듈 안의 요소들이 정해진 순서대로 실행되지만, 주고받는 데이터는 관련이 없다.',
          },
          { term: '시간적 응집도', en: 'Temporal Cohesion', desc: '초기화·종료 처리처럼 같은 시점에 함께 실행되는 기능들이 모여 있다.' },
          {
            term: '논리적 응집도',
            en: 'Logical Cohesion',
            desc: '성격이 비슷하거나 같은 범주의 처리들을 한 모듈에 모아 두고, 그때그때 하나를 골라 실행한다.',
          },
          { term: '우연적 응집도', en: 'Coincidental Cohesion', desc: '서로 관련 없는 요소들이 우연히 한 모듈에 모여 있다. 가장 나쁘다.' },
        ],
      },
    ],
  },
  {
    id: 'gof',
    title: 'GoF 디자인 패턴',
    intro: 'GoF 23개 패턴은 목적에 따라 생성(5) · 구조(7) · 행위(11)로 나뉜다. 분류와 한 줄 정의를 같이 외운다.',
    groups: [
      {
        id: 'creational',
        title: '생성 패턴 (Creational) · 5개',
        mnemonic: '추 · 빌 · 팩 · 프 · 싱',
        note: '객체를 만드는 방법을 감춘다.',
        items: [
          {
            term: '추상 팩토리',
            en: 'Abstract Factory',
            desc: '서로 관련된 객체들의 묶음을 구체 클래스를 지정하지 않고 생성하는 인터페이스를 제공한다.',
            tip: 'Factory Method는 객체 하나, Abstract Factory는 관련 객체의 묶음(제품군)',
          },
          { term: '빌더', en: 'Builder', desc: '복잡한 객체를 만드는 과정과 표현을 분리해, 같은 과정으로 다른 표현을 단계별로 조립한다.' },
          { term: '팩토리 메서드', en: 'Factory Method', desc: '객체를 만드는 인터페이스는 상위 클래스가 정하고, 어떤 객체를 만들지는 하위 클래스가 결정한다. 가상 생성자라고도 한다.' },
          { term: '프로토타입', en: 'Prototype', desc: '원형 객체를 복제(clone)해서 새 객체를 만든다.' },
          { term: '싱글톤', en: 'Singleton', desc: '클래스의 인스턴스를 하나만 만들고, 어디서든 그 인스턴스에 접근하게 한다.' },
        ],
      },
      {
        id: 'structural',
        title: '구조 패턴 (Structural) · 7개',
        mnemonic: '어 · 브 · 컴 · 데 · 퍼 · 플 · 프',
        note: '클래스와 객체를 묶어 더 큰 구조를 만든다.',
        items: [
          { term: '어댑터', en: 'Adapter', desc: '호환되지 않는 인터페이스를 가진 클래스를 원하는 인터페이스로 변환해 함께 쓰게 한다.' },
          {
            term: '브리지',
            en: 'Bridge',
            desc: '기능(추상화)과 구현을 분리해 둘을 각각 독립적으로 확장할 수 있게 한다.',
            tip: 'Adapter는 이미 있는 것을 맞추기, Bridge는 처음부터 분리해 설계',
          },
          { term: '컴포지트', en: 'Composite', desc: '객체들을 트리 구조로 묶어 부분-전체 관계를 표현하고, 개별 객체와 복합 객체를 같은 방법으로 다룬다.' },
          {
            term: '데코레이터',
            en: 'Decorator',
            desc: '객체에 기능(책임)을 동적으로 덧붙인다. 기능 확장을 상속 대신 감싸기로 한다.',
            tip: 'Proxy는 접근을 제어, Decorator는 기능을 추가',
          },
          { term: '퍼사드', en: 'Facade', desc: '복잡한 서브시스템 앞에 통합된 단순한 인터페이스(창구)를 하나 둔다.' },
          { term: '플라이웨이트', en: 'Flyweight', desc: '같은 상태를 가진 작은 객체들을 공유해서 메모리 사용을 줄인다.' },
          { term: '프록시', en: 'Proxy', desc: '대리 객체를 두어 실제 객체에 대한 접근을 제어한다(지연 생성, 접근 권한, 원격 접근 등).' },
        ],
      },
      {
        id: 'behavioral',
        title: '행위 패턴 (Behavioral) · 11개',
        note: '객체끼리 책임을 나누고 서로 소통하는 방법을 정한다. 생성·구조 12개를 외우면 나머지가 행위 패턴이다.',
        items: [
          { term: '책임 연쇄', en: 'Chain of Responsibility', desc: '요청을 처리할 수 있는 객체가 나올 때까지 객체 사슬을 따라 요청을 넘긴다.' },
          { term: '커맨드', en: 'Command', desc: '요청(명령)을 객체로 캡슐화해 저장·큐잉·실행 취소를 할 수 있게 한다.' },
          { term: '인터프리터', en: 'Interpreter', desc: '언어의 문법 규칙을 클래스로 표현해 문장을 해석한다.' },
          { term: '이터레이터', en: 'Iterator', desc: '내부 구조를 드러내지 않고 집합 객체의 원소에 하나씩 차례로 접근한다.' },
          {
            term: '중재자',
            en: 'Mediator',
            desc: '객체들 사이의 복잡한 상호작용을 중재자 객체 하나에 모아, 객체끼리 직접 참조하지 않게 한다.',
            tip: 'Observer는 1:N 통지, Mediator는 N:N 관계를 중재자 하나로 정리',
          },
          { term: '메멘토', en: 'Memento', desc: '캡슐화를 깨지 않고 객체의 상태를 저장해 두었다가 나중에 되돌린다(Undo).' },
          { term: '옵서버', en: 'Observer', desc: '한 객체의 상태가 바뀌면 그 객체에 의존하는 다른 객체들에게 자동으로 알린다(1:N).' },
          {
            term: '상태',
            en: 'State',
            desc: '객체의 상태를 별도 객체로 만들고, 상태가 바뀌면 행위도 바뀌게 한다.',
            tip: 'State는 상태에 따라 행위가 저절로 바뀜, Strategy는 알고리즘을 바깥에서 골라 끼움',
          },
          { term: '전략', en: 'Strategy', desc: '알고리즘들을 각각 캡슐화해 두고, 실행 중에 바꿔 쓸 수 있게 한다.' },
          { term: '템플릿 메서드', en: 'Template Method', desc: '알고리즘의 골격은 상위 클래스에 두고, 세부 단계는 하위 클래스가 구현한다.' },
          { term: '방문자', en: 'Visitor', desc: '객체 구조는 그대로 두고, 처리 기능(연산)을 별도 클래스로 분리해 새 연산을 쉽게 추가한다.' },
        ],
      },
    ],
  },
  {
    id: 'testing',
    title: '테스트 기법',
    intro: '화이트박스는 내부 구조(코드)를, 블랙박스는 명세(입력·출력)를 보고 테스트한다. 커버리지는 약한 것부터 순서대로 외운다.',
    groups: [
      {
        id: 'whitebox',
        title: '화이트박스 테스트 · 커버리지',
        order: '약함 → 강함',
        note: '코드의 논리 구조를 보고 테스트 케이스를 만든다.',
        items: [
          { term: '구문 커버리지', en: 'Statement Coverage', desc: '모든 문장(구문)을 최소 한 번씩 실행한다. 문장 커버리지라고도 한다.' },
          { term: '결정 커버리지', en: 'Decision Coverage', desc: '각 결정(분기)문 전체의 결과가 참과 거짓을 최소 한 번씩 갖게 한다. 분기 커버리지(Branch Coverage)라고도 한다.' },
          {
            term: '조건 커버리지',
            en: 'Condition Coverage',
            desc: '결정문 안의 개별 조건식이 각각 참과 거짓을 최소 한 번씩 갖게 한다.',
            tip: '결정은 if 전체 결과, 조건은 && · || 로 나뉜 하나하나',
          },
          { term: '조건/결정 커버리지', en: 'Condition/Decision Coverage', desc: '개별 조건식과 결정 전체가 모두 참과 거짓을 최소 한 번씩 갖게 한다.' },
          {
            term: '변경 조건/결정 커버리지',
            en: 'MC/DC',
            desc: '각 개별 조건이 다른 조건과 상관없이 결정 결과에 독립적으로 영향을 주는 경우를 모두 확인한다.',
          },
          { term: '다중 조건 커버리지', en: 'Multiple Condition Coverage', desc: '결정문 안 개별 조건식들의 가능한 모든 참·거짓 조합을 테스트한다.' },
        ],
      },
      {
        id: 'whitebox-etc',
        title: '화이트박스 · 그 밖의 기법',
        items: [
          {
            term: '기초 경로 검사',
            en: 'Basis Path Testing',
            desc: '맥케이브(McCabe)의 순환 복잡도로 독립 경로 수를 구하고, 그 경로를 모두 지나게 테스트한다.',
            tip: '순환 복잡도 V(G) = E − N + 2 (간선 − 노드 + 2), 또는 영역 수 + 1',
          },
          { term: '제어 구조 검사', en: 'Control Structure Testing', desc: '조건 검사, 루프 검사(반복 구조), 데이터 흐름 검사(변수의 정의와 사용 위치)로 나뉜다.' },
        ],
      },
      {
        id: 'blackbox',
        title: '블랙박스 테스트',
        note: '내부 코드를 보지 않고 명세(요구사항)의 입력·출력만 보고 테스트 케이스를 만든다.',
        items: [
          {
            term: '동등 분할',
            en: 'Equivalence Partitioning',
            desc: '입력 영역을 같은 결과를 낼 것으로 예상되는 유효·무효 그룹으로 나누고, 그룹마다 대표값을 골라 테스트한다. 동치 분할이라고도 한다.',
          },
          {
            term: '경계값 분석',
            en: 'Boundary Value Analysis',
            desc: '오류가 입력 범위의 경계에서 자주 생긴다는 점을 이용해 경계값과 그 바로 아래·위 값을 테스트한다.',
            tip: '1~100이 유효하면 0 · 1 · 2 · 99 · 100 · 101 같은 값을 쓴다',
          },
          {
            term: '원인-결과 그래프',
            en: 'Cause-Effect Graph',
            desc: '입력(원인)과 출력(결과)의 관계를 그래프로 그린 뒤 결정 테이블로 바꿔 효율이 높은 테스트 케이스를 고른다.',
          },
          { term: '결정 테이블', en: 'Decision Table', desc: '조건의 조합과 그에 따른 동작을 표로 정리해 각 조합을 테스트한다.' },
          { term: '상태 전이 테스트', en: 'State Transition Testing', desc: '상태와 이벤트에 따른 상태 변화(전이)를 테스트한다.' },
          { term: '페어와이즈 테스트', en: 'Pairwise Testing', desc: '모든 조합 대신, 변수 값들이 둘씩 짝지어 최소 한 번씩 나오게 해서 케이스 수를 줄인다.' },
          { term: '오류 예측 검사', en: 'Error Guessing', desc: '테스터의 경험과 감각으로 오류가 날 만한 곳을 짐작해 테스트한다. 다른 기법을 보완한다.' },
          { term: '비교 검사', en: 'Comparison Testing', desc: '여러 버전의 프로그램에 같은 입력을 넣고 결과를 비교한다.' },
        ],
      },
      {
        id: 'integration',
        title: '통합 테스트 방식',
        items: [
          {
            term: '하향식 통합',
            en: 'Top-Down Integration',
            desc: '상위 모듈부터 하위 모듈 쪽으로 통합한다. 아직 없는 하위 모듈을 대신하는 스텁(Stub)이 필요하다.',
            tip: '깊이 우선 또는 너비 우선으로 통합',
          },
          {
            term: '상향식 통합',
            en: 'Bottom-Up Integration',
            desc: '하위 모듈부터 상위 모듈 쪽으로 통합한다. 하위 모듈을 호출해 줄 테스트 드라이버(Driver)가 필요하다.',
            tip: '하위 모듈들을 클러스터(Cluster)로 묶어 진행',
          },
          { term: '테스트 스텁', en: 'Test Stub', desc: '하향식에서 쓰는, 호출되는 하위 모듈의 임시 대역. 정해진 값만 돌려준다.' },
          { term: '테스트 드라이버', en: 'Test Driver', desc: '상향식에서 쓰는, 테스트 대상 하위 모듈을 호출하고 인자를 넘겨주는 임시 상위 모듈.' },
          { term: '빅뱅 통합', en: 'Big Bang Integration', desc: '모든 모듈을 한꺼번에 통합해 테스트한다. 결함 위치를 찾기 어렵다.' },
          { term: '샌드위치 통합', en: 'Sandwich Integration', desc: '상위는 하향식, 하위는 상향식으로 진행하는 혼합 방식이다.' },
        ],
      },
      {
        id: 'level',
        title: '테스트 레벨 (V 모델)',
        order: '진행 순서',
        note: 'V 모델에서 왼쪽 개발 단계와 오른쪽 테스트 단계가 짝을 이룬다.',
        items: [
          { term: '단위 테스트', en: 'Unit Test', desc: '모듈·컴포넌트 하나를 따로 테스트한다. 상세 설계(모듈 설계)와 짝.' },
          { term: '통합 테스트', en: 'Integration Test', desc: '모듈 사이의 인터페이스와 상호작용을 테스트한다. 아키텍처(구조) 설계와 짝.' },
          { term: '시스템 테스트', en: 'System Test', desc: '통합된 시스템 전체가 기능·비기능 요구사항을 만족하는지 테스트한다. 요구사항 분석(명세)과 짝.' },
          {
            term: '인수 테스트',
            en: 'Acceptance Test',
            desc: '사용자의 요구대로 만들어졌는지 사용자가 확인한다.',
            tip: '알파 테스트는 개발자 환경에서 사용자가, 베타 테스트는 사용자 환경에서 사용자가 한다',
          },
        ],
      },
      {
        id: 'oracle',
        title: '테스트 오라클',
        note: '테스트 결과가 맞는지 판단하는 기준(참값).',
        items: [
          { term: '참 오라클', en: 'True Oracle', desc: '모든 입력값에 대해 기대 결과를 제공한다. 모든 오류를 찾을 수 있다.' },
          { term: '샘플링 오라클', en: 'Sampling Oracle', desc: '특정한 몇몇 입력값에 대해서만 기대 결과를 제공한다.' },
          { term: '추정 오라클', en: 'Heuristic Oracle', desc: '특정 입력값은 기대 결과를 주고, 나머지는 추정으로 처리한다. 휴리스틱 오라클이라고도 한다.' },
          { term: '일관성 검사 오라클', en: 'Consistent Oracle', desc: '변경이 있을 때 이전 수행 결과와 현재 수행 결과가 같은지 확인한다.' },
        ],
      },
      {
        id: 'principle',
        title: '테스트 원리',
        items: [
          { term: '결함 집중', en: 'Defect Clustering', desc: '결함의 대부분은 소수의 모듈에 몰려 있다(파레토 법칙: 20%의 모듈에서 80%의 결함).' },
          { term: '살충제 패러독스', en: 'Pesticide Paradox', desc: '같은 테스트 케이스를 반복하면 더 이상 새 결함을 찾지 못한다. 케이스를 계속 검토하고 바꿔야 한다.' },
          { term: '오류-부재의 궤변', en: 'Absence of Errors Fallacy', desc: '결함을 다 없애도 사용자 요구를 만족하지 못하면 품질이 높다고 할 수 없다.' },
          { term: '완벽한 테스트는 불가능', desc: '모든 경우를 다 테스트할 수는 없다. 테스트는 결함이 있음을 보여 줄 뿐, 없음을 증명하지 못한다.' },
          { term: '정황 의존', desc: '소프트웨어의 성격과 상황에 따라 테스트 방법을 달리해야 한다.' },
        ],
      },
    ],
  },
  {
    id: 'db',
    title: 'DB 이론',
    intro: '릴레이션 용어와 관계대수 기호, 키의 조건, 무결성 종류를 정리했다. 최근에는 기호를 쓰는 문제보다 관계대수 결과를 구하는 문제가 많다.',
    groups: [
      {
        id: 'relation',
        title: '릴레이션 구조 용어',
        note: '릴레이션의 특징: 튜플은 중복되지 않고, 튜플과 속성의 순서는 의미가 없으며, 속성 값은 더 나눌 수 없는 원자값이다.',
        items: [
          { term: '릴레이션', en: 'Relation', desc: '데이터를 행과 열로 이루어진 2차원 표 형태로 표현한 것. 테이블.' },
          { term: '튜플', en: 'Tuple', desc: '릴레이션의 행(Row) 하나. 레코드에 해당한다.' },
          { term: '속성', en: 'Attribute', desc: '릴레이션의 열(Column) 하나. 데이터의 가장 작은 논리적 단위.' },
          { term: '도메인', en: 'Domain', desc: '하나의 속성이 가질 수 있는 원자값들의 집합(값의 범위).', tip: '예: 성별 속성의 도메인은 {남, 여}' },
          { term: '차수', en: 'Degree', desc: '한 릴레이션에 있는 속성(열)의 수.', tip: '차수 = 열 개수, 카디널리티 = 행 개수. 헷갈리기 쉬운 짝' },
          { term: '카디널리티', en: 'Cardinality', desc: '한 릴레이션에 있는 튜플(행)의 수.' },
          {
            term: '릴레이션 스키마',
            en: 'Relation Schema',
            desc: '릴레이션의 이름과 속성들로 정의한 구조(틀). 시간이 지나도 잘 바뀌지 않는다. 릴레이션 내포(Intension)라고도 한다.',
          },
          {
            term: '릴레이션 인스턴스',
            en: 'Relation Instance',
            desc: '어느 한 시점에 릴레이션에 들어 있는 튜플들의 집합. 데이터가 바뀌면 계속 달라진다. 릴레이션 외연(Extension)이라고도 한다.',
          },
        ],
      },
      {
        id: 'algebra-pure',
        title: '관계대수 · 순수 관계 연산자',
        note: '관계대수는 원하는 결과를 얻는 과정(순서)을 기술하는 절차적 언어다. 관계해석은 무엇을 얻을지만 기술하는 비절차적 언어다.',
        items: [
          {
            term: '셀렉트 (σ)',
            en: 'Select',
            desc: '조건을 만족하는 튜플(행)만 골라낸다. 행을 자르므로 수평 연산이라고 한다.',
            tip: '표기: σ조건(R). 예: σ학년=3(학생)',
          },
          {
            term: '프로젝트 (π)',
            en: 'Project',
            desc: '원하는 속성(열)만 뽑아낸다. 열을 자르므로 수직 연산이라고 하며, 결과에서 중복 튜플은 없앤다.',
            tip: '중복 제거 때문에 결과 행 수가 원래보다 줄 수 있다',
          },
          { term: '조인 (⋈)', en: 'Join', desc: '공통 속성을 기준으로 두 릴레이션의 튜플을 연결해 새 릴레이션을 만든다.' },
          {
            term: '디비전 (÷)',
            en: 'Division',
            desc: 'R ÷ S는 S의 모든 튜플과 관련이 있는 R의 튜플을 찾고, 결과에서 S의 속성은 뺀다.',
            tip: '예: 모든 과목을 수강한 학생 찾기',
          },
        ],
      },
      {
        id: 'algebra-set',
        title: '관계대수 · 일반 집합 연산자',
        note: '합집합·교집합·차집합은 두 릴레이션이 합병 가능(속성 수가 같고 대응하는 속성의 도메인이 같음)해야 쓸 수 있다.',
        items: [
          { term: '합집합 (∪)', en: 'Union', desc: '두 릴레이션의 튜플을 합친다. 중복 튜플은 한 번만 남는다.', tip: '결과 카디널리티 ≤ 두 릴레이션 카디널리티의 합' },
          { term: '교집합 (∩)', en: 'Intersection', desc: '두 릴레이션에 공통으로 있는 튜플만 남긴다.' },
          { term: '차집합 (−)', en: 'Difference', desc: '첫 번째 릴레이션에는 있고 두 번째 릴레이션에는 없는 튜플만 남긴다.' },
          {
            term: '교차곱 (×)',
            en: 'Cartesian Product',
            desc: '두 릴레이션의 튜플을 가능한 모든 쌍으로 짝짓는다.',
            tip: '결과 차수 = 두 차수의 합, 결과 카디널리티 = 두 카디널리티의 곱',
          },
        ],
      },
      {
        id: 'join-kind',
        title: '조인의 종류',
        items: [
          { term: '세타 조인 (θ-Join)', en: 'Theta Join', desc: '=, ≠, <, >, ≤, ≥ 같은 비교 연산자로 조건을 걸어 조인한다.' },
          { term: '동등 조인', en: 'Equi Join', desc: '세타 조인 중 = 조건만 쓴 조인. 결과에 공통 속성이 중복해서 나타난다.' },
          { term: '자연 조인', en: 'Natural Join', desc: '동등 조인 결과에서 중복된 공통 속성을 하나만 남긴 조인.', tip: '동등 조인은 공통 속성이 두 번, 자연 조인은 한 번' },
          {
            term: '외부 조인',
            en: 'Outer Join',
            desc: '조인 조건에 맞지 않는 튜플도 버리지 않고 NULL을 채워 결과에 남긴다. 왼쪽·오른쪽·완전 외부 조인이 있다.',
          },
        ],
      },
      {
        id: 'key',
        title: '키 (Key)',
        note: '유일성: 키 값으로 튜플을 하나로 구별할 수 있다. 최소성: 키를 이루는 속성 중 하나라도 빼면 유일성이 깨진다.',
        items: [
          {
            term: '슈퍼키',
            en: 'Super Key',
            desc: '튜플을 유일하게 구별할 수 있는 속성 또는 속성들의 집합. 유일성은 만족하지만 최소성은 요구하지 않는다.',
            tip: '후보키는 모두 슈퍼키이지만, 슈퍼키가 모두 후보키는 아니다',
          },
          { term: '후보키', en: 'Candidate Key', desc: '튜플을 유일하게 구별하는 속성 집합 중 유일성과 최소성을 모두 만족하는 키.' },
          { term: '기본키', en: 'Primary Key', desc: '후보키 중에서 대표로 고른 키. NULL 값을 가질 수 없고 중복될 수 없다.' },
          { term: '대체키', en: 'Alternate Key', desc: '후보키 중 기본키로 고르지 않고 남은 키. 보조키라고도 한다.' },
          {
            term: '외래키',
            en: 'Foreign Key',
            desc: '다른 릴레이션의 기본키를 참조하는 속성 또는 속성 집합. 릴레이션 사이의 관계를 표현한다.',
            tip: '외래키 값은 참조하는 기본키 값 중 하나이거나 NULL',
          },
        ],
      },
      {
        id: 'integrity',
        title: '무결성 (Integrity)',
        note: '데이터베이스에 저장된 값이 실제 값과 일치하고 정확하도록 지키는 제약 조건.',
        items: [
          { term: '개체 무결성', en: 'Entity Integrity', desc: '기본키를 이루는 속성은 NULL 값이나 중복 값을 가질 수 없다.' },
          {
            term: '참조 무결성',
            en: 'Referential Integrity',
            desc: '외래키 값은 NULL이거나, 참조하는 릴레이션의 기본키 값과 같아야 한다. 참조할 수 없는 외래키 값을 가질 수 없다.',
            tip: '부모 행을 지울 때 CASCADE · RESTRICT · SET NULL로 처리 방법을 정한다',
          },
          {
            term: '도메인 무결성',
            en: 'Domain Integrity',
            desc: '속성 값은 그 속성에 정의된 도메인(형식·범위)에 속한 값이어야 한다.',
            tip: '예: 학년은 1~4만, 성별은 남·여만',
          },
          { term: '사용자 정의 무결성', en: 'User-Defined Integrity', desc: '속성 값들이 사용자가 정의한 업무 규칙(제약 조건)에 맞아야 한다.' },
          { term: 'NULL 무결성', desc: '특정 속성 값은 NULL이 될 수 없도록 정한 규정(NOT NULL).' },
          { term: '고유 무결성', desc: '특정 속성에 대해 각 튜플이 서로 다른 값을 가져야 한다는 규정(UNIQUE).' },
          { term: '키 무결성', desc: '한 릴레이션에는 적어도 하나의 키가 있어야 한다는 규정.' },
        ],
      },
    ],
  },
  {
    id: 'routing',
    title: '라우팅 프로토콜',
    intro: '라우팅 프로토콜은 범위(AS 안이냐 밖이냐)와 경로 계산 방식(거리 벡터냐 링크 상태냐)으로 나눈다. OSPF · RIP · BGP의 특징이 자주 나온다.',
    groups: [
      {
        id: 'routing-scope',
        title: '라우팅의 구분',
        items: [
          { term: '정적 라우팅', en: 'Static Routing', desc: '관리자가 경로를 직접 지정한다. 네트워크가 바뀌어도 자동으로 갱신되지 않는다.' },
          { term: '동적 라우팅', en: 'Dynamic Routing', desc: '라우터끼리 라우팅 프로토콜로 정보를 주고받아 경로를 자동으로 계산하고 갱신한다.' },
          { term: '자율 시스템', en: 'AS, Autonomous System', desc: '하나의 관리 정책 아래 운영되는 라우터와 네트워크의 묶음. 예: 한 ISP나 기업의 네트워크.' },
          { term: 'IGP', en: 'Interior Gateway Protocol', desc: '하나의 자율 시스템(AS) 안에서 쓰는 라우팅 프로토콜. RIP, OSPF, IGRP, EIGRP.' },
          {
            term: 'EGP',
            en: 'Exterior Gateway Protocol',
            desc: '서로 다른 자율 시스템(AS) 사이에서 쓰는 라우팅 프로토콜. 대표가 BGP.',
            tip: 'IGP는 AS 안, EGP는 AS 사이',
          },
        ],
      },
      {
        id: 'routing-algo',
        title: '경로 계산 방식',
        items: [
          {
            term: '거리 벡터',
            en: 'Distance Vector',
            desc: '이웃 라우터와 자기 라우팅 테이블 전체를 주기적으로 주고받고, 거리(홉 수)와 방향으로 경로를 정한다. 벨만-포드 알고리즘을 쓴다.',
            tip: '구조가 단순하지만 수렴이 느리고 라우팅 루프(무한 카운트) 문제가 생길 수 있다',
          },
          {
            term: '링크 상태',
            en: 'Link State',
            desc: '링크 상태 정보를 네트워크의 모든 라우터에 알리고(플러딩), 각 라우터가 전체 지도를 그려 최단 경로를 계산한다. 다익스트라 알고리즘을 쓴다.',
            tip: '변화가 있을 때만 갱신 정보를 보내 수렴이 빠르다',
          },
        ],
      },
      {
        id: 'routing-protocol',
        title: '주요 라우팅 프로토콜',
        items: [
          {
            term: 'RIP',
            en: 'Routing Information Protocol',
            desc: '거리 벡터 방식의 IGP. 홉 수(거쳐 가는 라우터 수)로 경로를 고르며 최대 15홉까지 쓸 수 있다(16은 도달 불가). 30초마다 라우팅 정보를 보낸다.',
            tip: '소규모 네트워크용. UDP 520번 포트',
          },
          {
            term: 'OSPF',
            en: 'Open Shortest Path First',
            desc: '링크 상태 방식의 IGP. 다익스트라 알고리즘으로 비용(대역폭 기반)이 가장 적은 경로를 계산한다. 네트워크를 영역(Area)으로 나눠 대규모 네트워크에 쓴다.',
            tip: 'RIP 같은 홉 수 제한이 없고, 변화가 있을 때만 갱신',
          },
          {
            term: 'IGRP',
            en: 'Interior Gateway Routing Protocol',
            desc: '시스코가 만든 거리 벡터 방식의 IGP. 대역폭·지연 등을 함께 따져 경로를 고른다. RIP의 홉 수 제한을 보완했다.',
          },
          { term: 'EIGRP', en: 'Enhanced IGRP', desc: 'IGRP를 개선한 시스코의 프로토콜. 거리 벡터와 링크 상태의 장점을 섞은 하이브리드 방식이다.' },
          {
            term: 'BGP',
            en: 'Border Gateway Protocol',
            desc: '서로 다른 자율 시스템(AS) 사이에서 쓰는 대표적인 EGP. 경로 벡터 방식으로 AS 경로 정보를 주고받는다.',
            tip: '인터넷 백본(ISP 사이)에서 사용. TCP 179번 포트',
          },
        ],
      },
    ],
  },
]
