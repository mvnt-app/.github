import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import * as webpush from "web-push";
import type { PushSub } from "./types";

type Keys = { publicKey: string; privateKey: string; subject: string };

const file = path.join(process.cwd(), "data", "vapid.json");

async function loadKeys(): Promise<Keys | null> {
  if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
    return {
      publicKey: process.env.VAPID_PUBLIC_KEY,
      privateKey: process.env.VAPID_PRIVATE_KEY,
      subject: process.env.VAPID_SUBJECT || "mailto:node@localhost",
    };
  }
  if (process.env.VERCEL) return null;
  try {
    const saved = JSON.parse(await readFile(file, "utf8")) as Keys;
    if (saved.publicKey && saved.privateKey) {
      return { ...saved, subject: saved.subject || "mailto:node@localhost" };
    }
  } catch {
    // 없으면 아래에서 만든다.
  }
  const made = webpush.generateVAPIDKeys();
  const keys: Keys = {
    publicKey: made.publicKey,
    privateKey: made.privateKey,
    subject: process.env.VAPID_SUBJECT || "mailto:node@localhost",
  };
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, JSON.stringify(keys, null, 2));
  return keys;
}

export async function vapidPublicKey() {
  const keys = await loadKeys();
  return keys?.publicKey ?? null;
}

export async function sendPush(sub: PushSub, payload: { title: string; body: string; url: string }) {
  const keys = await loadKeys();
  if (!keys) return { sent: false as const, gone: false as const };
  webpush.setVapidDetails(keys.subject, keys.publicKey, keys.privateKey);
  try {
    await webpush.sendNotification(sub, JSON.stringify(payload), { TTL: 60 * 60 });
    return { sent: true as const, gone: false as const };
  } catch (error) {
    const status = (error as { statusCode?: number }).statusCode;
    return { sent: false as const, gone: status === 404 || status === 410 };
  }
}
