import { createHash } from "crypto";
import { getVector, setVector } from "./store";

export function vectorKey(text: string) {
  return createHash("sha256").update(text.trim()).digest("hex").slice(0, 24);
}

export function embedEnabled() {
  return Boolean(process.env.OPENAI_API_KEY);
}

export async function embedText(text: string): Promise<number[]> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("OPENAI_API_KEY가 없습니다.");
  const model = process.env.OPENAI_EMBEDDING_MODEL || "text-embedding-3-small";
  const response = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ model, input: text.slice(0, 2000) }),
  });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`임베딩 실패 ${response.status} ${body.slice(0, 180)}`);
  }
  const json = (await response.json()) as { data: { embedding: number[] }[] };
  return json.data[0].embedding;
}

export async function cachedVector(text: string): Promise<number[] | null> {
  const trimmed = text.trim();
  if (!trimmed || !embedEnabled()) return null;
  const key = vectorKey(trimmed);
  const cached = await getVector(key);
  if (cached) return cached;
  const vector = await embedText(trimmed);
  await setVector(key, vector);
  return vector;
}
