import { blendBand, themeHits } from "./match";
import { SEEDS } from "./seed";

const [a, b, c, d] = SEEDS;
const answers = (node: (typeof SEEDS)[number]) => node.slots.map((slot) => slot.answer);
const mine = answers(a);

const bAll = themeHits(mine, answers(b), [0, 1, 2]);
const cAll = themeHits(mine, answers(c), [0, 1, 2]);
const dAll = themeHits(mine, answers(d), [0, 1, 2]);
const seekOnly = themeHits(mine, answers(b), [0]);

if (bAll.hits.length !== 3 || bAll.hits.some((hit) => hit.band !== "strong")) {
  throw new Error(`B는 세 칸 모두 강이어야 한다. ${JSON.stringify(bAll)}`);
}
if (bAll.hits[0]?.theirIndex !== 1 || bAll.hits[1]?.theirIndex !== 0 || bAll.hits[2]?.theirIndex !== 2) {
  throw new Error(`B는 SEEK↔OFFER, IMAGINE끼리여야 한다. ${JSON.stringify(bAll.hits)}`);
}
if (bAll.band !== "strong") throw new Error(`B 전체는 강. ${JSON.stringify(bAll)}`);

if (cAll.band !== "mid" || cAll.hits.length !== 1 || cAll.hits[0]?.questionIndex !== 2) {
  throw new Error(`15는 IMAGINE에서만 중이어야 한다. ${JSON.stringify(cAll)}`);
}
if (dAll.band !== "weak" || dAll.hits.length !== 1 || dAll.hits[0]?.questionIndex !== 0 || dAll.hits[0]?.theirIndex !== 1) {
  throw new Error(`18은 SEEK↔OFFER에서만 약이어야 한다. ${JSON.stringify(dAll)}`);
}
if (seekOnly.hits[0]?.band !== "strong" || seekOnly.band !== "strong") {
  throw new Error(`질문 하나만 보면 그 칸 밝기를 유지한다. ${JSON.stringify(seekOnly)}`);
}
if (blendBand(["weak", "weak"], 3) !== "weak") throw new Error("약한 겹침 두 개는 약으로 남긴다.");
if (blendBand(["strong"], 3) !== "mid") throw new Error("세 질문 중 한 곳만 강하면 중이다.");
if (blendBand(["strong", "weak"], 3) !== "strong") throw new Error("강이 있고 다른 곳도 겹치면 강이다.");
if (blendBand(["mid", "mid", "weak"], 3) !== "strong") throw new Error("중간이 두 곳이면 강이다.");

console.log("match ok", {
  b: bAll.hits.map((hit) => `${hit.questionIndex}->${hit.theirIndex}:${hit.band}`),
  c: { band: cAll.band, slot: cAll.hits[0]?.questionIndex, score: Number(cAll.score.toFixed(3)) },
  d: { band: dAll.band, slot: dAll.hits[0]?.questionIndex, score: Number(dAll.score.toFixed(3)) },
});
