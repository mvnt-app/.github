import type { Band } from "./types";

// 키 없을 때의 매칭. 임베딩이 있으면 이 점수는 쓰지 않는다.
// 강: 질문의 주제를 답이 다 덮음. 중: 절반. 약: '사람' 같은 얇은 겹침만.
export const THEME_BAND = { strong: 0.72, mid: 0.42, weak: 0.22 };

// text-embedding-3-small 초깃값. 짧은 한국어는 몰려서, 행사 전에 문장 몇 십 개로 다시 자른다.
export const EMBED_BAND = { strong: 0.58, mid: 0.47, weak: 0.38 };

const THEMES: Record<string, string[]> = {
  cloth: ["텍스타일", "원단", "옷의 결", "옷"],
  body: ["안무", "디렉션", "장면", "몸을"],
  night: ["밤 공연", "밤"],
  bind: ["같은 결", "묶이"],
  space: ["조명", "설치", "사운드", "전시"],
  future: ["미래", "도시"],
  // IMAGINE 영어 세계. A·B는 bioluminescent까지 겹쳐 강, 15는 world만 겹쳐 중.
  // 18의 달빛 사회에는 이 단어가 없다.
  world: ["world"],
  glow: ["bioluminescent"],
};

const SOFT = ["아티스트"];

function themesOf(text: string): Set<string> {
  const t = text.toLowerCase();
  const set = new Set<string>();
  for (const [name, words] of Object.entries(THEMES)) {
    if (words.some((word) => t.includes(word.toLowerCase()))) set.add(name);
  }
  return set;
}

function themeScore(question: string, answer: string): number {
  const left = themesOf(question);
  const right = themesOf(answer);
  if (!left.size || !right.size) return 0;
  let inter = 0;
  for (const name of left) if (right.has(name)) inter += 1;
  if (!inter) return 0;
  const coverage = inter / left.size;
  const union = left.size + right.size - inter;
  const jaccard = inter / union;
  return 0.75 * coverage + 0.25 * jaccard;
}

function softScore(question: string, answer: string): number {
  const hit = SOFT.some((word) => question.includes(word) && answer.includes(word));
  return hit ? 0.3 : 0;
}

function bag(text: string): Map<string, number> {
  const compact = text.toLowerCase().replace(/[^\p{L}\p{N}]/gu, "");
  const counts = new Map<string, number>();
  for (let i = 0; i < compact.length - 1; i += 1) {
    const key = compact.slice(i, i + 2);
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  return counts;
}

function lexical(question: string, answer: string): number {
  const a = bag(question);
  const b = bag(answer);
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (const value of a.values()) na += value * value;
  for (const value of b.values()) nb += value * value;
  const [small, large] = a.size < b.size ? [a, b] : [b, a];
  for (const [key, value] of small) {
    const other = large.get(key);
    if (other) dot += value * other;
  }
  if (!na || !nb) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

export function scoreText(question: string, answer: string): number {
  if (!question.trim() || !answer.trim()) return 0;
  const lex = lexical(question, answer);
  // 문장이 거의 같을 때만 글자 겹침을 쓴다. 짧은 겹침은 약/중을 흔든다.
  const lexBoost = lex >= 0.55 ? lex : 0;
  return Math.min(1, Math.max(themeScore(question, answer), softScore(question, answer), lexBoost));
}

export function bestTarget(mine: string, answers: string[], targets: readonly number[]) {
  let score = 0;
  let index = -1;
  for (const target of targets) {
    const next = scoreText(mine, answers[target] ?? "");
    if (next > score) {
      score = next;
      index = target;
    }
  }
  return { score, index };
}

export function cosineVec(a: number[], b: number[]): number {
  let dot = 0;
  let na = 0;
  let nb = 0;
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i += 1) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  if (!na || !nb) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

export function bandOf(score: number, mode: "theme" | "embed"): Band | null {
  const table = mode === "embed" ? EMBED_BAND : THEME_BAND;
  if (score >= table.strong) return "strong";
  if (score >= table.mid) return "mid";
  if (score >= table.weak) return "weak";
  return null;
}

export function bestAnswer(
  question: string,
  answers: string[],
  mode: "theme" | "embed",
  vectors?: { question: number[] | null; answers: (number[] | null)[] },
): { score: number; index: number } {
  let score = 0;
  let index = -1;
  answers.forEach((answer, i) => {
    if (!answer.trim()) return;
    let next = 0;
    if (mode === "embed" && vectors?.question && vectors.answers[i]) {
      next = cosineVec(vectors.question, vectors.answers[i] as number[]);
    } else if (mode === "theme") {
      next = scoreText(question, answer);
    }
    if (next > score) {
      score = next;
      index = i;
    }
  });
  return { score, index };
}
