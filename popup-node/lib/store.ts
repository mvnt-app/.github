import { mkdir, readFile, rename, writeFile } from "fs/promises";
import path from "path";
import postgres from "postgres";
import { testAgentsEnabled } from "./flags";
import { emptySlots } from "./prompts";
import { materializeSeed, patchSeedSlots, SEEDS } from "./seed";
import type { Bag, Message, NodeRecord, Slot } from "./types";

function blankGuest(code: number, name: string, slots: Slot[], tag: string | null): NodeRecord {
  return {
    id: crypto.randomUUID(),
    code,
    name,
    kind: "guest",
    tag,
    slots,
    push: null,
    createdAt: new Date().toISOString(),
  };
}

const dataDir = path.join(process.cwd(), "data");
const storeFile = path.join(dataDir, "store.json");

type GlobalStore = {
  lock?: Promise<unknown>;
  sql?: ReturnType<typeof postgres>;
  pgReady?: Promise<void>;
};

const g = globalThis as typeof globalThis & { __popupNode?: GlobalStore };
if (!g.__popupNode) g.__popupNode = {};

// Vercel Storage(Neon)는 DATABASE_URL을 넣고, 예전 Postgres 연결은 POSTGRES_URL을 넣는다.
export function databaseUrl() {
  const raw = process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.POSTGRES_PRISMA_URL || "";
  return raw.trim();
}

export function storageMissingMessage() {
  return "저장소가 연결되지 않았습니다. Vercel Storage에서 Postgres를 이 프로젝트에 연결한 뒤 다시 배포하세요.";
}

function usePg() {
  return Boolean(databaseUrl());
}

export function storageReady() {
  if (process.env.VERCEL && !databaseUrl()) return false;
  return true;
}

function emptyBag(): Bag {
  return { nodes: [], messages: [], reads: {}, vectors: {} };
}

function lock<T>(fn: () => Promise<T>): Promise<T> {
  const prev = g.__popupNode?.lock ?? Promise.resolve();
  const run = prev.then(fn, fn);
  g.__popupNode!.lock = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

async function readBag(): Promise<Bag> {
  try {
    const raw = await readFile(storeFile, "utf8");
    const bag = JSON.parse(raw) as Bag;
    bag.nodes ||= [];
    bag.messages ||= [];
    bag.reads ||= {};
    bag.vectors ||= {};
    return bag;
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === "ENOENT") return emptyBag();
    throw error;
  }
}

async function writeBag(bag: Bag) {
  await mkdir(dataDir, { recursive: true });
  const tmp = `${storeFile}.tmp`;
  await writeFile(tmp, JSON.stringify(bag));
  await rename(tmp, storeFile);
}

function seedInto(bag: Bag) {
  if (!testAgentsEnabled()) return false;
  let added = false;
  for (const seed of SEEDS) {
    const index = bag.nodes.findIndex((node) => node.id === seed.id);
    if (index < 0) {
      bag.nodes.push(materializeSeed(seed));
      added = true;
      continue;
    }
    const node = bag.nodes[index];
    const next = patchSeedSlots(node.slots, seed.slots);
    if (next) {
      node.slots = next;
      added = true;
    }
  }
  return added;
}

function nextCode(nodes: NodeRecord[]) {
  return nodes.reduce((max, node) => Math.max(max, node.code), 10) + 1;
}

async function withFile<T>(fn: (bag: Bag, dirty: () => void) => T | Promise<T>): Promise<T> {
  return lock(async () => {
    const bag = await readBag();
    let dirty = seedInto(bag);
    const mark = () => {
      dirty = true;
    };
    const result = await fn(bag, mark);
    if (dirty) await writeBag(bag);
    return result;
  });
}

function sqlClient() {
  if (!g.__popupNode!.sql) {
    const url = databaseUrl();
    const local = /localhost|127\.0\.0\.1/.test(url);
    g.__popupNode!.sql = postgres(url, {
      max: 1,
      prepare: false,
      ssl: local ? false : "require",
      idle_timeout: 20,
      connect_timeout: 10,
    });
  }
  return g.__popupNode!.sql;
}

async function ensurePg() {
  if (!g.__popupNode!.pgReady) {
    g.__popupNode!.pgReady = (async () => {
      const sql = sqlClient();
      await sql.unsafe(`
        create table if not exists node_person (
          id text primary key,
          code integer not null unique,
          name text not null,
          kind text not null,
          tag text,
          slots jsonb not null,
          push jsonb,
          created_at timestamptz not null
        );
        create unique index if not exists node_person_tag on node_person (tag) where tag is not null;
        create table if not exists node_message (
          id text primary key,
          from_id text not null,
          to_id text not null,
          body text not null,
          at timestamptz not null
        );
        create index if not exists node_message_at on node_message (at);
        create table if not exists node_read (
          reader text not null,
          other text not null,
          at timestamptz not null,
          primary key (reader, other)
        );
        create table if not exists node_vector (
          k text primary key,
          v jsonb not null
        );
      `);
      if (!testAgentsEnabled()) return;
      for (const seed of SEEDS) {
        const node = materializeSeed(seed);
        await sql`
          insert into node_person (id, code, name, kind, tag, slots, push, created_at)
          values (
            ${node.id},
            ${node.code},
            ${node.name},
            ${node.kind},
            ${node.tag},
            ${sql.json(node.slots as unknown as postgres.JSONValue)},
            ${null},
            ${node.createdAt}
          )
          on conflict (id) do nothing
        `;
        const rows = await sql<{ slots: Slot[] }[]>`select slots from node_person where id = ${node.id} limit 1`;
        const next = patchSeedSlots(rows[0]?.slots, node.slots);
        if (next) {
          await sql`
            update node_person
            set slots = ${sql.json(next as unknown as postgres.JSONValue)}
            where id = ${node.id}
          `;
        }
      }
    })().catch((error) => {
      g.__popupNode!.pgReady = undefined;
      throw error;
    });
  }
  return g.__popupNode!.pgReady;
}

type PersonRow = {
  id: string;
  code: number;
  name: string;
  kind: NodeRecord["kind"];
  tag: string | null;
  slots: Slot[];
  push: NodeRecord["push"];
  created_at: Date | string;
};

function rowToNode(row: PersonRow): NodeRecord {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    kind: row.kind,
    tag: row.tag,
    slots: row.slots,
    push: row.push,
    createdAt: new Date(row.created_at).toISOString(),
  };
}

async function requireStorage() {
  if (!storageReady()) {
    throw new Error(storageMissingMessage());
  }
  if (usePg()) await ensurePg();
}

export async function listNodes(): Promise<NodeRecord[]> {
  await requireStorage();
  if (!usePg()) {
    return withFile((bag) => bag.nodes.map((node) => structuredClone(node)));
  }
  const rows = await sqlClient()<PersonRow[]>`select * from node_person order by code asc`;
  return rows.map(rowToNode);
}

export async function getNode(id: string): Promise<NodeRecord | null> {
  const nodes = await listNodes();
  return nodes.find((node) => node.id === id) ?? null;
}

export async function saveNode(node: NodeRecord): Promise<NodeRecord> {
  await requireStorage();
  if (!usePg()) {
    return withFile((bag, dirty) => {
      const index = bag.nodes.findIndex((item) => item.id === node.id);
      if (index >= 0) bag.nodes[index] = node;
      else bag.nodes.push(node);
      dirty();
      return node;
    });
  }
  const sql = sqlClient();
  await sql`
    insert into node_person (id, code, name, kind, tag, slots, push, created_at)
    values (
      ${node.id},
      ${node.code},
      ${node.name},
      ${node.kind},
      ${node.tag},
      ${sql.json(node.slots as unknown as postgres.JSONValue)},
      ${node.push ? sql.json(node.push as unknown as postgres.JSONValue) : null},
      ${node.createdAt}
    )
    on conflict (id) do update set
      name = excluded.name,
      slots = excluded.slots,
      push = excluded.push,
      tag = excluded.tag
  `;
  return node;
}

export async function createGuest(name: string, slots: Slot[]): Promise<NodeRecord> {
  await requireStorage();
  if (!usePg()) {
    return withFile((bag, dirty) => {
      const node = blankGuest(nextCode(bag.nodes), name, slots, null);
      bag.nodes.push(node);
      dirty();
      return node;
    });
  }
  const sql = sqlClient();
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const codeRows = await sql<{ c: number }[]>`select coalesce(max(code), 10) + 1 as c from node_person`;
    const node = blankGuest(codeRows[0].c, name, slots, null);
    try {
      await saveNode(node);
      return node;
    } catch (error) {
      if (attempt === 2) throw error;
    }
  }
  throw new Error("노드를 만들지 못했습니다.");
}

export async function claimTag(token: string): Promise<NodeRecord> {
  await requireStorage();
  if (!usePg()) {
    return withFile((bag, dirty) => {
      const found = bag.nodes.find((node) => node.tag === token);
      if (found) return structuredClone(found);
      const node: NodeRecord = {
        id: crypto.randomUUID(),
        code: nextCode(bag.nodes),
        name: "손님",
        kind: "guest",
        tag: token,
        slots: emptySlots(),
        push: null,
        createdAt: new Date().toISOString(),
      };
      bag.nodes.push(node);
      dirty();
      return node;
    });
  }
  const sql = sqlClient();
  const existing = await sql<PersonRow[]>`select * from node_person where tag = ${token} limit 1`;
  if (existing[0]) return rowToNode(existing[0]);
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const codeRows = await sql<{ c: number }[]>`select coalesce(max(code), 10) + 1 as c from node_person`;
    const node: NodeRecord = {
      id: crypto.randomUUID(),
      code: codeRows[0].c,
      name: "손님",
      kind: "guest",
      tag: token,
      slots: emptySlots(),
      push: null,
      createdAt: new Date().toISOString(),
    };
    try {
      await saveNode(node);
      return node;
    } catch (error) {
      const again = await sql<PersonRow[]>`select * from node_person where tag = ${token} limit 1`;
      if (again[0]) return rowToNode(again[0]);
      if (attempt === 2) throw error;
    }
  }
  throw new Error("태그를 열지 못했습니다.");
}

export async function addMessage(message: Message) {
  await requireStorage();
  if (!usePg()) {
    await withFile((bag, dirty) => {
      bag.messages.push(message);
      dirty();
    });
    return;
  }
  await sqlClient()`
    insert into node_message (id, from_id, to_id, body, at)
    values (${message.id}, ${message.from}, ${message.to}, ${message.body}, ${message.at})
  `;
}

export async function listMessages(): Promise<Message[]> {
  await requireStorage();
  if (!usePg()) {
    return withFile((bag) => bag.messages.map((message) => ({ ...message })));
  }
  const rows = await sqlClient()<
    { id: string; from_id: string; to_id: string; body: string; at: Date }[]
  >`select id, from_id, to_id, body, at from node_message order by at asc limit 5000`;
  return rows.map((row) => ({
    id: row.id,
    from: row.from_id,
    to: row.to_id,
    body: row.body,
    at: new Date(row.at).toISOString(),
  }));
}

export async function getReads(reader: string): Promise<Record<string, string>> {
  await requireStorage();
  if (!usePg()) {
    return withFile((bag) => {
      const out: Record<string, string> = {};
      const prefix = `${reader}:`;
      for (const [key, value] of Object.entries(bag.reads)) {
        if (key.startsWith(prefix)) out[key.slice(prefix.length)] = value;
      }
      return out;
    });
  }
  const rows = await sqlClient()<{ other: string; at: Date }[]>`
    select other, at from node_read where reader = ${reader}
  `;
  const out: Record<string, string> = {};
  for (const row of rows) out[row.other] = new Date(row.at).toISOString();
  return out;
}

export async function markRead(reader: string, other: string, at: string) {
  await requireStorage();
  if (!usePg()) {
    await withFile((bag, dirty) => {
      bag.reads[`${reader}:${other}`] = at;
      dirty();
    });
    return;
  }
  await sqlClient()`
    insert into node_read (reader, other, at)
    values (${reader}, ${other}, ${at})
    on conflict (reader, other) do update set at = excluded.at
  `;
}

export async function getVector(key: string): Promise<number[] | null> {
  await requireStorage();
  if (!usePg()) {
    return withFile((bag) => bag.vectors[key] ?? null);
  }
  const rows = await sqlClient()<{ v: number[] }[]>`select v from node_vector where k = ${key} limit 1`;
  return rows[0]?.v ?? null;
}

export async function setVector(key: string, vector: number[]) {
  await requireStorage();
  if (!usePg()) {
    await withFile((bag, dirty) => {
      bag.vectors[key] = vector;
      dirty();
    });
    return;
  }
  const sql = sqlClient();
  await sql`
    insert into node_vector (k, v)
    values (${key}, ${sql.json(vector as unknown as postgres.JSONValue)})
    on conflict (k) do update set v = excluded.v
  `;
}
