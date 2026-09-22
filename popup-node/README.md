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
| `DATABASE_URL` | `data/store.json` | Postgres. Vercel에서는 필수. |
| `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` / `VAPID_SUBJECT` | 로컬은 `data/vapid.json` 자동 생성 | 배포에 직접 넣는다. `npx web-push generate-vapid-keys` |
| `OPENAI_API_KEY` | 말뭉치로 약·중·강 | `text-embedding-3-small` 코사인 |
| `OPENAI_EMBEDDING_MODEL` | `text-embedding-3-small` | 다른 임베딩 모델 |
| `ENABLE_TEST_AGENTS` | 켜짐 | `false` 면 A/B 입구가 사라진다. 행사 직전. |

Vercel에 `DATABASE_URL`이 없으면 API는 503이다. 서버리스 디스크에 json이 남지 않기 때문이다.

## Vercel

1. Neon 또는 Supabase에서 Postgres를 만들고 풀러 연결 문자열을 복사한다.
2. `cd popup-node && npx web-push generate-vapid-keys`
3. Vercel 프로젝트의 Root Directory를 `popup-node`로 둔다.
4. Environment Variables: `DATABASE_URL`, `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT=mailto:you@example.com`, `ENABLE_TEST_AGENTS=true`, 선택 `OPENAI_API_KEY`.
5. 배포 후 폰 두 대 또는 일반 창과 시크릿 창에서 A, B로 들어간다.
6. 아이폰은 공유 → 홈 화면에 추가 → 그 아이콘으로 다시 연 뒤에야 탭을 닫아도 푸시가 온다. 안드로이드 크롬은 브라우저에서도 된다. 홈 화면 추가는 가입 화면과 맵에 있다.
7. 행사 전에는 `ENABLE_TEST_AGENTS=false`.

짧은 한국어 임베딩 점수는 한쪽으로 몰린다. 키를 켠 뒤에는 문장 몇 십 개로 `EMBED_BAND`를 다시 자른다. 키 없을 때의 기준은 `lib/match.ts`의 `THEME_BAND`.
