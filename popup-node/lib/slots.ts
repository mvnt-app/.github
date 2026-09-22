import { PROMPTS } from "./prompts";
import type { Slot } from "./types";

export function cleanSlots(input: unknown): Slot[] | null {
  if (!Array.isArray(input) || input.length !== 3) return null;
  const slots = input.map((item, index) => {
    const row = item as { answer?: unknown } | string;
    const answer = String(typeof row === "string" ? row : (row?.answer ?? "")).trim().slice(0, 180);
    return { question: PROMPTS[index].key, answer };
  });
  if (slots.some((slot) => slot.answer.length < 2)) return null;
  return slots;
}

export function isFilled(slots: Slot[]) {
  return slots.some((slot) => slot.answer.trim().length >= 2);
}

export function publicNode(node: {
  id: string;
  code: number;
  name: string;
  kind: string;
  slots: Slot[];
}) {
  return {
    id: node.id,
    code: node.code,
    name: node.name,
    kind: node.kind,
    slots: node.slots,
  };
}
