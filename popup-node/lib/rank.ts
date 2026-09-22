import { cachedVector, embedEnabled } from "./embed";
import { bandOf, blendBand, cosineVec, pickIndex, scoreText } from "./match";
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
  const answers = [0, 1, 2].map((index) => other.slots[index]?.answer ?? "");

  async function collect(use: "theme" | "embed") {
    const hits: Hit[] = [];
    for (const questionIndex of selected) {
      const mine = me.slots[questionIndex]?.answer ?? "";
      if (mine.trim().length < 2) continue;
      const scores: number[] = [];
      for (const answer of answers) {
        scores.push(use === "theme" ? scoreText(mine, answer) : await pairScore(mine, answer, use));
      }
      const theirIndex = pickIndex(scores, SLOT_TARGETS[questionIndex] ?? []);
      if (theirIndex < 0) continue;
      const score = scores[theirIndex] ?? 0;
      const band = bandOf(score, use);
      if (!band) continue;
      hits.push({
        questionIndex,
        theirIndex,
        band,
        score,
        answer: answers[theirIndex] ?? "",
      });
    }
    hits.sort((a, b) => a.questionIndex - b.questionIndex);
    return hits;
  }

  function pack(hits: Hit[], use: "theme" | "embed") {
    const score = hits.reduce((max, hit) => Math.max(max, hit.score), 0);
    return {
      score,
      band: blendBand(
        hits.map((hit) => hit.band),
        selected.length,
      ),
      hits,
      mode: use,
    };
  }

  try {
    return pack(await collect(mode), mode);
  } catch {
    mode = "theme";
    return pack(await collect(mode), mode);
  }
}
