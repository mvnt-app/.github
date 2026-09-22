import { rankAgainst } from "@/lib/rank";
import { readSessionId } from "@/lib/session";
import { isFilled } from "@/lib/slots";
import { getNode, listNodes, storageReady } from "@/lib/store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  if (!storageReady()) {
    return Response.json({ error: "DATABASE_URL이 없습니다." }, { status: 503 });
  }
  const id = await readSessionId();
  const me = id ? await getNode(id) : null;
  if (!me) return Response.json({ error: "노드가 없습니다." }, { status: 401 });

  const url = new URL(request.url);
  const rawOn = url.searchParams.get("on");
  const on =
    rawOn === null
      ? [0, 1, 2]
      : rawOn
          .split(",")
          .filter((part) => part === "0" || part === "1" || part === "2")
          .map((part) => Number(part));
  // 토글이 전부 꺼진 상태. 화면의 토글은 그대로 두고, 밝기만 세 질문으로 매긴다.
  const showEveryFilled = rawOn !== null && on.length === 0;
  const selected = showEveryFilled ? [0, 1, 2] : on;

  const nodes = await listNodes();
  const stars = [];
  let mode: "theme" | "embed" = "theme";
  for (const node of nodes) {
    if (node.id === me.id || !isFilled(node.slots)) continue;
    const ranked = await rankAgainst(me, node, selected);
    mode = ranked.mode;
    if (!ranked.band) {
      if (!showEveryFilled) continue;
      stars.push({
        id: node.id,
        code: node.code,
        name: node.name,
        score: 0,
        band: "dim",
        slots: node.slots,
        hits: [],
      });
      continue;
    }
    stars.push({
      id: node.id,
      code: node.code,
      name: node.name,
      score: ranked.score,
      band: ranked.band,
      slots: node.slots,
      hits: ranked.hits.map((hit) => ({
        questionIndex: hit.questionIndex,
        theirIndex: hit.theirIndex,
        band: hit.band,
        score: hit.score,
        answer: hit.answer,
      })),
    });
  }

  return Response.json({
    matcher: mode,
    me: { id: me.id, code: me.code, name: me.name, slots: me.slots },
    stars,
  });
}
