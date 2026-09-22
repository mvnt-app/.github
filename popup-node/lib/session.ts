import { cookies } from "next/headers";
import { testAgentsEnabled } from "./flags";

export { testAgentsEnabled };

export const COOKIE = "node_id";

export async function readSessionId() {
  const jar = await cookies();
  return jar.get(COOKIE)?.value ?? null;
}

export async function setSessionId(id: string) {
  const jar = await cookies();
  jar.set(COOKIE, id, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 60,
    secure: process.env.NODE_ENV === "production",
  });
}

export async function clearSessionId() {
  const jar = await cookies();
  jar.set(COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 });
}

