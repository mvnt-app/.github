export const PROMPTS = [
  {
    key: "SEEK",
    title: "I SEEK",
    ko: "찾고 있는 것",
    guide: "같이할 프로젝트, 필요한 아티스트",
    placeholder: "밤 공연에 옷의 결을 같이 짤 텍스타일 아티스트",
  },
  {
    key: "OFFER",
    title: "I OFFER",
    ko: "내놓을 수 있는 것",
    guide: "손, 기술, 시간, 자리",
    placeholder: "몸을 쓰는 안무와 짧은 장면",
  },
  {
    key: "IMAGINE",
    title: "I IMAGINE",
    ko: "같이 살고 싶은 미래",
    guide: "같은 결로 묶이고 싶은 다른 하루",
    placeholder: "설명 없이 같은 결로 묶이는 밤",
  },
] as const;

// SEEK는 상대의 OFFER(없으면 SEEK)와, OFFER는 상대의 SEEK와, IMAGINE은 미래끼리.
export const SLOT_TARGETS: readonly (readonly number[])[] = [
  [1, 0],
  [0, 1],
  [2],
];

export function emptySlots() {
  return PROMPTS.map((prompt) => ({ question: prompt.key, answer: "" }));
}
