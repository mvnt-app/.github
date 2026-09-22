import { SLOT_TARGETS } from "./prompts";
import { SEEDS } from "./seed";
import { bandOf, bestTarget } from "./match";

const [a, b, c, d] = SEEDS;

function rank(mine: string, answers: string[], slot: number) {
  const hit = bestTarget(mine, answers, SLOT_TARGETS[slot]);
  return { ...hit, band: bandOf(hit.score, "theme"), slot };
}

function bestNode(me: (typeof SEEDS)[number], other: (typeof SEEDS)[number]) {
  let top = { score: 0, index: -1, band: null as ReturnType<typeof bandOf>, slot: -1 };
  me.slots.forEach((slot, index) => {
    const hit = rank(slot.answer, other.slots.map((item) => item.answer), index);
    if (hit.score > top.score) top = hit;
  });
  return top;
}

const answers = (node: (typeof SEEDS)[number]) => node.slots.map((slot) => slot.answer);

const bAll = bestNode(a, b);
const cAll = bestNode(a, c);
const dAll = bestNode(a, d);
const perSlot = [0, 1, 2].map((slot) => rank(a.slots[slot].answer, answers(b), slot));
const dSeek = rank(a.slots[0].answer, answers(d), 0);
const dOther = [1, 2].map((slot) => rank(a.slots[slot].answer, answers(d), slot));

if (perSlot.some((hit) => hit.band !== "strong")) {
  throw new Error(`B는 SEEK/OFFER/IMAGINE 모두 강이어야 한다. ${JSON.stringify(perSlot)}`);
}
if (bAll.band !== "strong") throw new Error(`B 전체는 강. ${JSON.stringify(bAll)}`);
if (cAll.band !== "mid" || cAll.slot !== 2) {
  throw new Error(`15는 IMAGINE에서 중이어야 한다. ${JSON.stringify(cAll)}`);
}
if (dAll.band !== "weak" || dAll.slot !== 0 || dSeek.band !== "weak") {
  throw new Error(`18은 SEEK에서만 약이어야 한다. ${JSON.stringify(dAll)} ${JSON.stringify(dOther)}`);
}
if (dOther.some((hit) => hit.band)) {
  throw new Error(`18의 OFFER/IMAGINE은 비어야 한다. ${JSON.stringify(dOther)}`);
}

console.log("match ok", {
  b: perSlot.map((hit) => hit.band),
  c: { band: cAll.band, slot: cAll.slot, score: Number(cAll.score.toFixed(3)) },
  d: { band: dAll.band, slot: dAll.slot, score: Number(dAll.score.toFixed(3)) },
});
