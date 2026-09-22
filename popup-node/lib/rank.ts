import { cachedVector, embedEnabled } from "./embed";
import { bandOf, cosineVec, scoreText } from "./match";
import { SLOT_TARGETS } from "./prompts";
import type { Band, NodeRecord } from "./types";

export type Hit = {
  questionIndex: number;
  theirIndex: number;
  band: Band;
  score: number;
  answer: string;
};

async function pairScore(mine: string, theirs: string, mode: "theme" | "embed") {
  if (mode === "embed") {
    const left = await cachedVector(mine);
    const right = await cachedVector(theirs);
    if (left && right) return cosineVec(left, right);
  }
  return scoreText(mine, theirs);
}

export async function rankAgainst(
  me: NodeRecord,
  other: NodeRecord,
  selected: number[],
): Promise<{ score: number; band: Band | null; hits: Hit[]; mode: "theme" | "embed" }> {
  let mode: "theme" | "embed" = embedEnabled() ? "embed" : "theme";
  const answers = other.slots.map((slot) => slot.answer);

  async function collect(use: "theme" | "embed") {
    const hits: Hit[] = [];
    for (const questionIndex of selected) {
      const mine = me.slots[questionIndex]?.answer ?? "";
      if (mine.trim().length < 2) continue;
      let score = 0;
      let theirIndex = -1;
      for (const target of SLOT_TARGETS[questionIndex] ?? []) {
        const next =
          use === "theme" ? scoreText(mine, answers[target] ?? "") : await pairScore(mine, answers[target] ?? "", use);
        if (next > score) {
          score = next;
          theirIndex = target;
        }
      }
      const band = bandOf(score, use);
      if (!band || theirIndex < 0) continue;
      hits.push({
        questionIndex,
        theirIndex,
        band,
        score,
        answer: answers[theirIndex] ?? "",
      });
    }
    hits.sort((a, b) => b.score - a.score);
    return hits;
  }

  try {
    const hits = await collect(mode);
    const top = hits[0];
    return { score: top?.score ?? 0, band: top?.band ?? null, hits, mode };
  } catch {
    mode = "theme";
    const hits = await collect(mode);
    const top = hits[0];
    return { score: top?.score ?? 0, band: top?.band ?? null, hits, mode };
  }
}
