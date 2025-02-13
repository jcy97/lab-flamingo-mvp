# Research Drawing Application

실시간 협업 기능을 갖춘 연구용 드로잉 애플리케이션입니다. 참여자들이 실시간으로 함께 그림을 그리고 아이디어를 시각화할 수 있습니다.

## 주요 기능

- 실시간 다중 사용자 드로잉
- 실시간 협업 및 동기화
- 드로잉 히스토리 관리
- 세션 관리 및 사용자 인증

## 기술 스택

### Frontend
- [Next.js](https://nextjs.org/)
- [React](https://reactjs.org/)
- [TypeScript](https://www.typescriptlang.org/)

### Backend
- [Node.js](https://nodejs.org/)
- [TypeScript](https://www.typescriptlang.org/)

### 데이터베이스
- [PostgreSQL](https://www.postgresql.org/) - 사용자 데이터 및 메타데이터 저장
- [MongoDB](https://www.mongodb.com/) - 드로잉 데이터 저장
- [Redis](https://redis.io/) - 캐싱 및 실시간 데이터 관리

### 실시간 협업
- [Yjs](https://yjs.dev/) - CRDT 기반 실시간 협업 프레임워크

## 시작하기

### 사전 요구사항

- Node.js 18.0.0 이상
- PostgreSQL 13.0 이상
- MongoDB 5.0 이상
- Redis 6.0 이상

### 설치

1. 레포지토리 클론
```bash
git clone [레포지토리 URL]
cd [프로젝트 디렉토리]
```

2. 의존성 설치
```bash
npm install
```

3. 환경 변수 설정
```bash
cp .env.example .env
```
`.env` 파일을 열어 필요한 환경 변수를 설정하세요.


4. 개발 서버 실행
```bash
npm run dev
```

## 환경 변수 설정 샘플

```env
DATABASE_URL=postgresql://username:password@localhost:5432/dbname
MONGODB_URI=mongodb://localhost:27017/dbname
REDIS_URL=redis://localhost:6379
```

## 프로젝트 구조

```
src/
├── components/     # React 컴포넌트
├── pages/         # Next.js 페이지
├── server/        # tRPC 서버 코드
├── styles/        # CSS/스타일 파일
└── utils/         # 유틸리티 함수
```


## 연락처

sook3427@kookmin.ac.kr
