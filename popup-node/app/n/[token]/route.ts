import { setSessionId } from "@/lib/session";
import { isFilled } from "@/lib/slots";
import { claimTag, storageMissingMessage, storageReady } from "@/lib/store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Ctx = { params: Promise<{ token: string }> };

export async function GET(request: Request, ctx: Ctx) {
  if (!storageReady()) {
    return new Response(storageMissingMessage(), { status: 503 });
  }
  const { token } = await ctx.params;
  if (!/^[\w-]{1,64}$/.test(token)) {
    return new Response("태그 토큰은 영문, 숫자, _, - 만 1~64자입니다.", { status: 400 });
  }
  const node = await claimTag(token);
  await setSessionId(node.id);
  const next = isFilled(node.slots) ? "/map" : "/join";
  return Response.redirect(new URL(next, request.url));
}
