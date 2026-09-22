import { readSessionId } from "@/lib/session";
import { getNode, saveNode } from "@/lib/store";
import type { PushSub } from "@/lib/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  const id = await readSessionId();
  const node = id ? await getNode(id) : null;
  if (!node) return Response.json({ error: "노드가 없습니다." }, { status: 401 });
  const body = (await request.json().catch(() => null)) as PushSub | null;
  if (!body?.endpoint || !body.keys?.p256dh || !body.keys?.auth) {
    return Response.json({ error: "구독 정보가 없습니다." }, { status: 400 });
  }
  node.push = { endpoint: body.endpoint, keys: { p256dh: body.keys.p256dh, auth: body.keys.auth } };
  await saveNode(node);
  return Response.json({ ok: true });
}
