export type Slot = {
  question: string;
  answer: string;
};

export type NodeKind = "agent" | "guest" | "prop";

export type PushSub = {
  endpoint: string;
  keys: { p256dh: string; auth: string };
};

export type NodeRecord = {
  id: string;
  code: number;
  name: string;
  kind: NodeKind;
  tag: string | null;
  slots: Slot[];
  push: PushSub | null;
  createdAt: string;
};

export type Message = {
  id: string;
  from: string;
  to: string;
  body: string;
  at: string;
};

export type Band = "weak" | "mid" | "strong";

export type Bag = {
  nodes: NodeRecord[];
  messages: Message[];
  reads: Record<string, string>;
  vectors: Record<string, number[]>;
};
