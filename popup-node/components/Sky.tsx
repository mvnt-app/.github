"use client";

import { useEffect, useRef, useState } from "react";
import { chainOf, fitCam, zoomCam, type Cam, type Point } from "@/lib/layout";

export type SkyStar = Point & {
  id: string;
  code: number;
  band: "self" | "dim" | "weak" | "mid" | "strong";
  selected: boolean;
};

const WORLD = 1000;

function weight(band: SkyStar["band"]) {
  if (band === "strong" || band === "self") return 3;
  if (band === "mid") return 2;
  if (band === "weak") return 1;
  return 0;
}

function lineClass(a: SkyStar, b: SkyStar) {
  const level = Math.min(weight(a.band), weight(b.band));
  if (level >= 3) return "line strong";
  if (level === 2) return "line mid";
  if (level === 1) return "line weak";
  return "line dim";
}

export function Sky({ stars, onPick }: { stars: SkyStar[]; onPick: (id: string) => void }) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const [cam, setCam] = useState<Cam>({ x: 0, y: 0, s: 1 });
  const camRef = useRef(cam);
  camRef.current = cam;
  const moved = useRef(false);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const drag = useRef<{
    id: number;
    x: number;
    y: number;
    ox: number;
    oy: number;
    moved: boolean;
    starId?: string;
  } | null>(null);
  const pinch = useRef<{ dist: number; cam: Cam } | null>(null);
  const starsRef = useRef(stars);
  starsRef.current = stars;
  const layoutKey = stars.map((star) => `${star.id}:${Math.round(star.x)}:${Math.round(star.y)}`).join("|");

  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    moved.current = false;
    setCam(fitCam(starsRef.current, el.clientWidth, el.clientHeight));
  }, [layoutKey]);

  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      const rect = el.getBoundingClientRect();
      const factor = event.deltaY < 0 ? 1.08 : 0.92;
      moved.current = true;
      setCam(zoomCam(camRef.current, event.clientX - rect.left, event.clientY - rect.top, factor));
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  function zoomBy(factor: number) {
    const el = viewportRef.current;
    if (!el) return;
    moved.current = true;
    setCam(zoomCam(camRef.current, el.clientWidth / 2, el.clientHeight / 2, factor));
  }

  function refit() {
    const el = viewportRef.current;
    if (!el) return;
    moved.current = false;
    setCam(fitCam(stars, el.clientWidth, el.clientHeight));
  }

  const chain = chainOf(stars);

  return (
    <div
      className="sky"
      ref={viewportRef}
      onPointerDown={(event) => {
        const el = event.currentTarget;
        el.setPointerCapture(event.pointerId);
        pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
        if (pointers.current.size >= 2) {
          const pts = [...pointers.current.values()];
          pinch.current = {
            dist: Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y) || 1,
            cam: camRef.current,
          };
          drag.current = null;
          return;
        }
        const star = (event.target as HTMLElement).closest?.("[data-star]");
        drag.current = {
          id: event.pointerId,
          x: event.clientX,
          y: event.clientY,
          ox: camRef.current.x,
          oy: camRef.current.y,
          moved: false,
          starId: star instanceof HTMLElement ? star.dataset.star : undefined,
        };
      }}
      onPointerMove={(event) => {
        if (!pointers.current.has(event.pointerId)) return;
        pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
        const el = viewportRef.current;
        if (pointers.current.size >= 2 && pinch.current && el) {
          const pts = [...pointers.current.values()];
          const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y) || 1;
          const rect = el.getBoundingClientRect();
          const mx = (pts[0].x + pts[1].x) / 2 - rect.left;
          const my = (pts[0].y + pts[1].y) / 2 - rect.top;
          moved.current = true;
          setCam(zoomCam(pinch.current.cam, mx, my, dist / pinch.current.dist));
          return;
        }
        const current = drag.current;
        if (!current || current.id !== event.pointerId) return;
        const dx = event.clientX - current.x;
        const dy = event.clientY - current.y;
        if (Math.hypot(dx, dy) > 6) {
          current.moved = true;
          moved.current = true;
        }
        setCam({ x: current.ox + dx, y: current.oy + dy, s: camRef.current.s });
      }}
      onPointerUp={(event) => {
        const dragged = Boolean(drag.current?.moved);
        const pinched = Boolean(pinch.current);
        const id = drag.current?.id === event.pointerId ? drag.current.starId : undefined;
        pointers.current.delete(event.pointerId);
        if (pointers.current.size < 2) pinch.current = null;
        if (drag.current?.id === event.pointerId) drag.current = null;
        if (!dragged && !pinched && id) onPick(id);
      }}
      onPointerCancel={(event) => {
        pointers.current.delete(event.pointerId);
        pinch.current = null;
        drag.current = null;
      }}
    >
      <div
        className="world"
        style={{
          width: WORLD,
          height: WORLD,
          transform: `translate(${cam.x}px, ${cam.y}px) scale(${cam.s})`,
        }}
      >
        <svg className="wires" width={WORLD} height={WORLD} viewBox={`0 0 ${WORLD} ${WORLD}`} aria-hidden>
          {chain.slice(1).map((point, index) => {
            const prev = chain[index];
            return (
              <line
                key={`${prev.id}-${point.id}`}
                x1={prev.x}
                y1={prev.y}
                x2={point.x}
                y2={point.y}
                className={lineClass(prev, point)}
              />
            );
          })}
        </svg>
        {stars.map((star) => (
          <button
            key={star.id}
            type="button"
            className={`star ${star.band}${star.selected ? " on" : ""}`}
            style={{ left: star.x, top: star.y }}
            data-star={star.id}
          >
            <span className="dot" />
            <span className="num">{star.code}</span>
          </button>
        ))}
      </div>
      <div className="zoom">
        <button type="button" onPointerDown={(event) => event.stopPropagation()} onClick={() => zoomBy(1.2)}>
          확대
        </button>
        <button type="button" onPointerDown={(event) => event.stopPropagation()} onClick={() => zoomBy(1 / 1.2)}>
          축소
        </button>
        <button type="button" onPointerDown={(event) => event.stopPropagation()} onClick={refit}>
          맞춤
        </button>
      </div>
    </div>
  );
}
