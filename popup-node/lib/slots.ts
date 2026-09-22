import { composeImagine, imagineReady, parseImagine } from "./imagine";
import { PROMPTS } from "./prompts";
import type { Slot } from "./types";

const SHORT = 180;

function asRecord(item: unknown): { answer: string; selected?: string[]; words?: string } {
  if (typeof item === "string") return { answer: item };
  if (!item || typeof item !== "object") return { answer: "" };
  const row = item as { answer?: unknown; selected?: unknown; words?: unknown };
  return {
    answer: String(row.answer ?? ""),
    selected: Array.isArray(row.selected) ? row.selected.map((value) => String(value)) : undefined,
    words: typeof row.words === "string" ? row.words : undefined,
  };
}

function imagineAnswer(item: unknown): string | null {
  const row = asRecord(item);
  const parsed = parseImagine(row.answer);
  const selected = row.selected ?? parsed.selected;
  const words = row.words ?? parsed.words;
  const answer = composeImagine(selected, words);
  if (!imagineReady(answer)) return null;
  return answer;
}

export function cleanSlots(input: unknown): Slot[] | null {
  if (!Array.isArray(input) || input.length !== 3) return null;
  const slots: Slot[] = [];
  for (let index = 0; index < 3; index += 1) {
    if (index === 2) {
      const answer = imagineAnswer(input[index]);
      if (!answer) return null;
      slots.push({ question: PROMPTS[index].key, answer });
      continue;
    }
    const answer = asRecord(input[index]).answer.trim().slice(0, SHORT);
    if (answer.length < 2) return null;
    slots.push({ question: PROMPTS[index].key, answer });
  }
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
