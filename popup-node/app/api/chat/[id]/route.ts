import { threadMessages } from "@/lib/feed";
import { sendPush } from "@/lib/push";
import { readSessionId } from "@/lib/session";
import { publicNode } from "@/lib/slots";
import { addMessage, getNode, listMessages, markRead, saveNode, storageMissingMessage, storageReady } from "@/lib/store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_request: Request, ctx: Ctx) {
  if (!storageReady()) return Response.json({ error: storageMissingMessage() }, { status: 503 });
  const { id } = await ctx.params;
  const meId = await readSessionId();
  const me = meId ? await getNode(meId) : null;
  if (!me) return Response.json({ error: "노드가 없습니다." }, { status: 401 });
  const other = await getNode(id);
  if (!other || other.id === me.id) return Response.json({ error: "상대 노드가 없습니다." }, { status: 404 });
  const messages = threadMessages(me.id, other.id, await listMessages());
  await markRead(me.id, other.id, new Date().toISOString());
  return Response.json({
    me: publicNode(me),
    other: publicNode(other),
    messages,
  });
}

export async function POST(request: Request, ctx: Ctx) {
  if (!storageReady()) return Response.json({ error: storageMissingMessage() }, { status: 503 });
  const { id } = await ctx.params;
  const meId = await readSessionId();
  const me = meId ? await getNode(meId) : null;
  if (!me) return Response.json({ error: "노드가 없습니다." }, { status: 401 });
  const other = await getNode(id);
  if (!other || other.id === me.id) return Response.json({ error: "상대 노드가 없습니다." }, { status: 404 });
  const body = (await request.json().catch(() => null)) as { body?: unknown } | null;
  const text = String(body?.body ?? "").trim().slice(0, 400);
  if (!text) return Response.json({ error: "빈 메시지는 보내지 않습니다." }, { status: 400 });
  const message = {
    id: crypto.randomUUID(),
    from: me.id,
    to: other.id,
    body: text,
    at: new Date().toISOString(),
  };
  await addMessage(message);
  await markRead(me.id, other.id, message.at);
  if (other.push) {
    const result = await sendPush(other.push, {
      title: `NODE ${me.code}`,
      body: text,
      url: `/chat/${me.id}`,
    });
    if (result.gone) {
      other.push = null;
      await saveNode(other);
    }
  }
  return Response.json({ message });
}
