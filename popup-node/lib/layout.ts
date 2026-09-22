export type Point = { x: number; y: number };

const CENTER = { x: 500, y: 500 };

// 처음 여덟 자리는 고정. 그 다음부터는 나선이라 사람이 늘어도 겹치지 않는다.
const OTHERS = [
  { x: 86, y: -42 },
  { x: 168, y: -8 },
  { x: 232, y: 48 },
  { x: 176, y: 112 },
  { x: 72, y: 124 },
  { x: -16, y: 92 },
  { x: 280, y: -64 },
  { x: -48, y: -24 },
];

export function placeStars(
  self: { id: string; code: number },
  others: { id: string; code: number }[],
): Map<string, Point> {
  const points = new Map<string, Point>();
  points.set(self.id, { ...CENTER });
  const ordered = [...others].sort((a, b) => a.code - b.code);
  ordered.forEach((node, index) => {
    if (index < OTHERS.length) {
      points.set(node.id, { x: CENTER.x + OTHERS[index].x, y: CENTER.y + OTHERS[index].y });
      return;
    }
    const n = index - OTHERS.length;
    const angle = n * 2.399963;
    const radius = 300 + n * 22;
    points.set(node.id, {
      x: CENTER.x + Math.cos(angle) * radius,
      y: CENTER.y + Math.sin(angle) * radius,
    });
  });
  return points;
}

export function chainOf<T extends Point>(points: T[]): T[] {
  if (points.length < 2) return points;
  const cx = points.reduce((sum, point) => sum + point.x, 0) / points.length;
  const cy = points.reduce((sum, point) => sum + point.y, 0) / points.length;
  return [...points].sort(
    (a, b) => Math.atan2(a.y - cy, a.x - cx) - Math.atan2(b.y - cy, b.x - cx),
  );
}

export type Cam = { x: number; y: number; s: number };

export function fitCam(stars: Point[], width: number, height: number): Cam {
  if (!stars.length || width < 10 || height < 10) return { x: 0, y: 0, s: 1 };
  const pad = 72;
  const minX = Math.min(...stars.map((star) => star.x)) - pad;
  const maxX = Math.max(...stars.map((star) => star.x)) + pad;
  const minY = Math.min(...stars.map((star) => star.y)) - pad;
  const maxY = Math.max(...stars.map((star) => star.y)) + pad;
  const s = Math.min(width / Math.max(120, maxX - minX), height / Math.max(90, maxY - minY), 1.5);
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  return { s, x: width / 2 - cx * s, y: height / 2 - cy * s };
}

export function zoomCam(cam: Cam, px: number, py: number, factor: number): Cam {
  const s = Math.min(2.8, Math.max(0.35, cam.s * factor));
  const wx = (px - cam.x) / cam.s;
  const wy = (py - cam.y) / cam.s;
  return { s, x: px - wx * s, y: py - wy * s };
}
