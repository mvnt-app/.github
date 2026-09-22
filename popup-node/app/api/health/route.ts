import { vapidPublicKey } from "@/lib/push";
import { testAgentsEnabled } from "@/lib/session";
import { databaseUrl, listNodes, storageMissingMessage, storageReady } from "@/lib/store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function shortError(error: unknown) {
  const message = error instanceof Error ? error.message : "연결 실패";
  return message.replace(/postgres(?:ql)?:\/\/\S+/gi, "postgres://…").slice(0, 180);
}

export async function GET() {
  const url = databaseUrl();
  const database = url ? "postgres" : process.env.VERCEL ? "missing" : "file";
  let ok = storageReady();
  let error = ok ? "" : storageMissingMessage();
  if (ok && url) {
    try {
      await listNodes();
    } catch (reason) {
      ok = false;
      error = shortError(reason);
    }
  }
  const push = Boolean(await vapidPublicKey());
  return Response.json({
    ok,
    database,
    testAgents: testAgentsEnabled(),
    push,
    ...(error ? { error } : {}),
  });
}
