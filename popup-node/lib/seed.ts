import { IMAGINE_WORLDS } from "./prompts";
import type { NodeRecord, Slot } from "./types";

type Seed = Omit<NodeRecord, "push" | "createdAt">;

const [valley, night, , , forest, moon] = IMAGINE_WORLDS;

function worlds(...picks: string[]) {
  const chosen = new Set(picks);
  return IMAGINE_WORLDS.filter((world) => chosen.has(world)).join("\n");
}

// SEEK 형식으로 바꾸기 전의 IMAGINE 시드. 이 문장만 새 세계로 바꾼다.
export const LEGACY_IMAGINE = new Set<string>([
  "설명 없이 같은 결로 묶이는 밤",
  "설명 없이 같은 결의 사람들이 한 밤에 묶이는 미래",
  "같은 결의 사람만 남는 도시",
  "아홉 시에 집에 가는 평범한 하루",
]);

// A·B는 서로 채팅하는 테스트 계정. 15·18은 밝기만 보여주는 노드라 로그인할 수 없다.
// SEEK는 상대 OFFER와, OFFER는 상대 SEEK와, IMAGINE은 같은 세계끼리 겹치게 고정했다.
// A·B는 밤 세계와 숲을 같이 고르고, 15는 골짜기만, 18은 달빛 사회만 고른다.
export const SEEDS: Seed[] = [
  {
    id: "a",
    code: 11,
    name: "에이전트 A",
    kind: "agent",
    tag: null,
    slots: [
      { question: "SEEK", answer: "밤 공연에 옷의 결을 같이 짤 텍스타일 아티스트" },
      { question: "OFFER", answer: "몸을 쓰는 안무와 짧은 장면 디렉션" },
      { question: "IMAGINE", answer: worlds(night, forest) },
    ],
  },
  {
    id: "b",
    code: 12,
    name: "에이전트 B",
    kind: "agent",
    tag: null,
    slots: [
      { question: "SEEK", answer: "몸과 장면을 같이 짤 안무가" },
      { question: "OFFER", answer: "밤 공연에 올릴 텍스타일과 옷의 결, 가까이 보이는 원단" },
      { question: "IMAGINE", answer: worlds(night, forest) },
    ],
  },
  {
    id: "c",
    code: 15,
    name: "노드 15",
    kind: "prop",
    tag: null,
    slots: [
      { question: "SEEK", answer: "전시에 같이할 사운드" },
      { question: "OFFER", answer: "작은 조명과 공간 설치" },
      { question: "IMAGINE", answer: valley },
    ],
  },
  {
    id: "d",
    code: 18,
    name: "노드 18",
    kind: "prop",
    tag: null,
    slots: [
      { question: "SEEK", answer: "날씨 맑은 주말 산책" },
      { question: "OFFER", answer: "가끔 아티스트 친구의 피아노를 들어 준다" },
      { question: "IMAGINE", answer: moon },
    ],
  },
];

// 시드 a·b·c·d만. 예전 질문 형식이면 슬롯을 통째로 되돌리고,
// IMAGINE이 예전 한국어 시드 문장이면 그 칸만 새 세계로 바꾼다.
export function patchSeedSlots(slots: Slot[] | null | undefined, seedSlots: Slot[]): Slot[] | null {
  const current = Array.isArray(slots) ? slots : [];
  if (current[0]?.question !== "SEEK") return seedSlots.map((slot) => ({ ...slot }));
  const imagine = current[2]?.answer?.trim() ?? "";
  if (!LEGACY_IMAGINE.has(imagine)) return null;
  const next = current.map((slot) => ({ question: slot.question, answer: slot.answer }));
  while (next.length < 3) next.push({ question: "IMAGINE", answer: "" });
  next[2] = { ...seedSlots[2] };
  return next;
}

export function materializeSeed(seed: Seed): NodeRecord {
  return {
    ...seed,
    slots: seed.slots.map((slot) => ({ ...slot })),
    push: null,
    createdAt: new Date().toISOString(),
  };
}
