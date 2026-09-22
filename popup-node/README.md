# popup-node

2026-09-22. NFC 옷 팝업에서 사람마다 문장 세 개를 받고, 같은 결만 별처럼 밝히려고 만든 로컬 프로토타입.

세 문장은 고정이다.

- **SEEK** — 찾고 있는 것. 같이할 프로젝트, 필요한 아티스트.
- **OFFER** — 내놓을 수 있는 것.
- **IMAGINE** — 같이 살고 싶은 세계. 예시 여섯 개 중 여러 개를 고르거나, 자기 말로 적거나, 둘 다 한다. 고른 줄은 줄바꿈으로 잇고, 자기 말이 있으면 빈 줄 뒤에 붙인다. `question`은 `IMAGINE`.

SEEK는 상대의 OFFER와, OFFER는 상대의 SEEK와, IMAGINE은 미래끼리 겹친다. 밝기는 약 / 중 / 강. 노드를 누르면 그 문장이 나오고, 채팅할 수 있다.

## 로컬 실행

```bash
cd popup-node
npm install
npm run dev
```

브라우저에서 http://localhost:3000

1. 탭 하나에서 **에이전트 A · 11**. 알림을 허용한다.
2. 다른 탭(또는 시크릿)에서 **에이전트 B · 12**.
3. A의 맵에서 12가 강하게 켜지는지 본다. SEEK / OFFER / IMAGINE 버튼을 끄면 하늘이 바뀐다.
4. 12를 누르고 답을 본 뒤 채팅한다. B 탭을 다른 창으로 가리면 A가 보낸 말이 알림으로 온다.
5. 별자리는 드래그로 밀고, 확대/축소/맞춤 또는 핀치·휠로 당긴다.
6. 상단 종은 안 읽은 말이 있을 때 점이 찍힌다. 누르면 받은 말 목록.

NFC는 URL이다. 태그에는 `http://localhost:3000/n/coat-01` 처럼 넣는다. 같은 토큰을 다시 열면 같은 노드다. 문장이 비어 있으면 작성 화면으로 간다.

초기화는 `popup-node/data/store.json` 과 `data/vapid.json` 을 지우면 된다. 시드 A(11), B(12), 15, 18이 다시 들어온다.

`npm run check` 는 시드 밝기(B 강, 15 중, 18 약)가 깨지지 않았는지 본다.

## 환경 변수

로컬은 `.env` 없이 된다. 예시는 `.env.example`.

| 이름 | 없을 때 | 있을 때 |
|---|---|---|
| `DATABASE_URL` | `data/store.json` | Postgres. 없으면 `POSTGRES_URL`, 그다음 `POSTGRES_PRISMA_URL`. Vercel에서는 필수. |
| `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` / `VAPID_SUBJECT` | 로컬은 `data/vapid.json` 자동 생성 | 배포에 직접 넣는다. 채팅 자체에는 없어도 된다. `npx web-push generate-vapid-keys` |
| `OPENAI_API_KEY` | 말뭉치로 약·중·강 | `text-embedding-3-small` 코사인. 두 사람 테스트에는 비워 둔다. |
| `OPENAI_EMBEDDING_MODEL` | `text-embedding-3-small` | 다른 임베딩 모델 |
| `ENABLE_TEST_AGENTS` | 로컬은 켜짐, Vercel은 꺼짐 | `true` 면 배포에도 A/B와 시드 11·12·15·18이 보인다. `false` 면 로컬에서도 끈다. |

Vercel에 Postgres 주소가 없으면 API는 503이다. 서버리스 디스크에 json이 남지 않기 때문이다. 배포가 됐는지 보려면 `https://도메인/api/health` 를 연다. `ok: true`, `database: "postgres"` 이면 저장이 붙은 것이다.

## Vercel에 두 사람

저장은 Vercel Storage의 Postgres면 된다. 사람 둘의 문장과 채팅이라 크기가 작다. 직접 만든 데이터베이스 주소를 붙여도 되고, 대시보드에서 연결 버튼만 눌러도 된다.

1. Vercel에서 이 저장소로 프로젝트를 만든다. **Root Directory** 는 `popup-node`.
2. 프로젝트 → **Storage** → **Create** → Postgres (Neon). 방금 만든 프로젝트에 Connect. 그러면 `DATABASE_URL` 또는 `POSTGRES_URL` 이 들어간다. 값을 복사해 다시 넣을 필요는 없다. 풀러 주소를 쓰고, `DATABASE_URL_UNPOOLED` 는 코드가 읽지 않는다.
3. 테스트 노드 11, 12, 15, 18은 배포에서 알아서 꺼진다. 따로 `ENABLE_TEST_AGENTS` 를 넣지 않는다. 라이브에서 그 노드를 보려면 `true` 로 둔다.
4. 탭을 닫아도 폰에 알림을 띄울 때만 푸시 키를 넣는다. `cd popup-node && npx web-push generate-vapid-keys` 로 나온 값을 `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT=mailto:본인메일` 에 넣는다. 채팅은 키가 없어도 된다. 사이트를 켜 두면 1~2초 안에 말이 들어온다.
5. Storage를 연결한 뒤 **Redeploy**. 환경 변수는 다음 배포부터 적용된다.
6. `https://도메인/api/health` 에서 `ok` 가 true 인지 본다. false 이면 Storage 연결이 배포에 안 붙은 것이다. `testAgents` 는 false, `database` 는 `postgres` 여야 한다.

그다음 폰 두 대, 또는 한 컴퓨터의 일반 창과 시크릿 창.

1. 주소만 연다. **노드 만들기**.
2. 이름, SEEK, OFFER를 적고 IMAGINE에서 세계를 하나 이상 고른 뒤 들어간다. 알림은 거절해도 저장된다.
3. 다른 사람도 같은 주소에서 노드를 만든다.
4. 별자리에 상대 번호가 뜬다. 문장이 겹치면 약·중·강으로 밝고, 거의 안 겹쳐도 희미한 점으로 남는다. 점을 누르면 양쪽 글이 나오고 **채팅하기**가 있다.
5. 같은 브라우저를 새로고침해도 그 노드로 돌아온다. 쿠키는 60일이다. 쿠키를 지우면 새 노드가 된다.
6. 문장을 고치려면 내 빈 고리를 누르고 **질문 고치기**.

아이폰 사파리는 탭을 닫으면 웹 푸시가 안 된다. 공유 → 홈 화면에 추가 → 그 아이콘으로 다시 연 뒤에야 닫아도 푸시가 온다. 그 안내는 가입 화면에만 있다. 안드로이드 크롬은 브라우저에서도 푸시가 된다.

짧은 한국어 임베딩 점수는 한쪽으로 몰린다. 키를 켠 뒤에는 문장 몇 십 개로 `EMBED_BAND`를 다시 자른다. 키 없을 때의 기준은 `lib/match.ts`의 `THEME_BAND`.
