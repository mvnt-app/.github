import { IMAGINE_WORLDS } from "./prompts";

const WORDS_LIMIT = 500;

export function composeImagine(selected: readonly string[], words: string): string {
  const chosen = new Set(selected);
  const lines = IMAGINE_WORLDS.filter((world) => chosen.has(world));
  const free = words.replace(/\r\n/g, "\n").trim().slice(0, WORDS_LIMIT);
  if (lines.length && free) return `${lines.join("\n")}\n\n${free}`;
  if (lines.length) return lines.join("\n");
  return free;
}

export function parseImagine(answer: string): { selected: string[]; words: string } {
  const text = answer.replace(/\r\n/g, "\n").trim();
  if (!text) return { selected: [], words: "" };
  const known = new Set<string>(IMAGINE_WORLDS);
  const chunks = text.split(/\n\n+/);
  const head = chunks[0] ?? "";
  const rest = chunks.slice(1).join("\n\n").trim();
  const selected: string[] = [];
  const stray: string[] = [];
  for (const line of head.split("\n")) {
    const item = line.trim();
    if (!item) continue;
    if (known.has(item)) {
      if (!selected.includes(item)) selected.push(item);
    } else stray.push(item);
  }
  if (!selected.length) return { selected: [], words: text };
  const words = [stray.join("\n"), rest].filter((part) => part.trim()).join("\n\n").trim();
  return { selected, words };
}

export function imagineReady(answer: string) {
  const { selected, words } = parseImagine(answer);
  return selected.length > 0 || words.trim().length >= 2;
}
