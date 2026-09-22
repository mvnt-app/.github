import { vapidPublicKey } from "@/lib/push";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const publicKey = await vapidPublicKey();
  return Response.json({ publicKey });
}
