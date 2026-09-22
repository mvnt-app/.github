import { buildFeed } from "@/lib/feed";
import { readSessionId } from "@/lib/session";
import { getNode, getReads, listMessages, listNodes, storageMissingMessage, storageReady } from "@/lib/store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  if (!storageReady()) {
    return Response.json({ error: storageMissingMessage() }, { status: 503 });
  }
  const id = await readSessionId();
  const me = id ? await getNode(id) : null;
  if (!me) return Response.json({ unreadCount: 0, incoming: [], threads: [] });
  const [nodes, messages, reads] = await Promise.all([
    listNodes(),
    listMessages(),
    getReads(me.id),
  ]);
  const feed = buildFeed(me.id, nodes, messages, reads);
  return Response.json(feed);
}
