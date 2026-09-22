import type { Message, NodeRecord } from "./types";

export type Thread = {
  otherId: string;
  code: number;
  name: string;
  lastBody: string;
  lastAt: string;
  unread: number;
};

export type Incoming = {
  id: string;
  fromId: string;
  fromCode: number;
  body: string;
  at: string;
};

export function buildFeed(
  me: string,
  nodes: NodeRecord[],
  messages: Message[],
  reads: Record<string, string>,
) {
  const grouped = new Map<string, Message[]>();
  for (const message of messages) {
    const other = message.from === me ? message.to : message.to === me ? message.from : null;
    if (!other) continue;
    const list = grouped.get(other) ?? [];
    list.push(message);
    grouped.set(other, list);
  }

  const threads: Thread[] = [];
  const incoming: Incoming[] = [];
  let unreadCount = 0;

  for (const [otherId, list] of grouped) {
    list.sort((a, b) => a.at.localeCompare(b.at));
    const last = list[list.length - 1];
    const readAt = reads[otherId] ?? "";
    const unreadList = list.filter((message) => message.to === me && message.at > readAt);
    unreadCount += unreadList.length;
    const node = nodes.find((item) => item.id === otherId);
    for (const message of unreadList) {
      incoming.push({
        id: message.id,
        fromId: message.from,
        fromCode: node?.code ?? 0,
        body: message.body,
        at: message.at,
      });
    }
    threads.push({
      otherId,
      code: node?.code ?? 0,
      name: node?.name ?? "노드",
      lastBody: last.body,
      lastAt: last.at,
      unread: unreadList.length,
    });
  }

  threads.sort((a, b) => b.lastAt.localeCompare(a.lastAt));
  incoming.sort((a, b) => a.at.localeCompare(b.at));
  return { threads, incoming, unreadCount };
}

export function threadMessages(me: string, other: string, messages: Message[]) {
  return messages
    .filter(
      (message) =>
        (message.from === me && message.to === other) ||
        (message.from === other && message.to === me),
    )
    .sort((a, b) => a.at.localeCompare(b.at));
}
