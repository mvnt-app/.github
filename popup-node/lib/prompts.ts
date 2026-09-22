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
    guide: "What kind of world do you want to live in?",
    placeholder:
      "What does it look like? How do people live there? What kind of technology, nature, or relationships exist?",
  },
] as const;

export const IMAGINE_WORLDS = [
  "A peaceful ecological valley, something like a hidden world shaped by wind, ruins, and nature",
  "A luminous night world with bioluminescent plants and a quiet mystical atmosphere",
  "Floating islands and airborne cities surrounded by clouds and gardens",
  "A future-medieval world where ancient forms and advanced tools coexist",
  "A world that feels like a sacred forest civilization",
  "A moonlit society built around care, beauty, and autonomy",
] as const;

export const IMAGINE_COPY = {
  question: "What kind of world do you want to live in?",
  note: "It can be an idea, a feeling, a scene, a landscape, a city, a village, or a way of life.",
  optional: "Optional — describe it in your own words:",
} as const;

// 선호 짝. SEEK는 상대 OFFER, OFFER는 상대 SEEK, IMAGINE은 미래끼리.
// 점수가 더 높으면 다른 칸과도 겹친다. 차이는 lib/match.ts pickIndex.
export const SLOT_TARGETS: readonly (readonly number[])[] = [
  [1, 0],
  [0, 1],
  [2],
];

export function emptySlots() {
  return PROMPTS.map((prompt) => ({ question: prompt.key, answer: "" }));
}
