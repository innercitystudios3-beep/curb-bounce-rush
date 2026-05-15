import { useEffect, useRef, useImperativeHandle, forwardRef } from "react";
import { VehicleManager, VehicleKind } from "@/lib/sprites/VehicleManager";

export type RoadObstacle = {
  id: number;
  type: VehicleKind; // "scooter" | "car" | "bus"
  position: number; // 0-100 % of road width (left edge -10..110)
  lane: number;     // 0..1 (0 = far/back, 1 = near/front)
};

export type RoadVehicleLayerHandle = {
  hit: (obstacleId: number) => void;
};

type Props = {
  obstaclesRef: React.MutableRefObject<RoadObstacle[]>;
  className?: string;
};

/**
 * Single canvas layer that renders sprite-animated vehicles
 * driven by the existing obstacle state (no duplicate spawn loops).
 *
 * - Sizes itself to its parent (road container) via ResizeObserver.
 * - Each obstacle gets one SpriteEntity; positions are mirrored every frame.
 * - All sprite anim runs on a single rAF loop alongside the rest of the game.
 */
export const RoadVehicleLayer = forwardRef<RoadVehicleLayerHandle, Props>(
  ({ obstaclesRef, className }, ref) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const wrapRef = useRef<HTMLDivElement>(null);
    const managerRef = useRef<VehicleManager | null>(null);
    const entityByIdRef = useRef<Map<number, ReturnType<VehicleManager["spawn"]>>>(new Map());
    const sizeRef = useRef({ w: 0, h: 0 });
    const dprRef = useRef(1);

    useImperativeHandle(ref, () => ({
      hit: (obstacleId: number) => {
        const ent = entityByIdRef.current.get(obstacleId);
        if (!ent || !managerRef.current) return;
        managerRef.current.hit(ent.id);
      },
    }), []);

    useEffect(() => {
      const canvas = canvasRef.current;
      const wrap = wrapRef.current;
      if (!canvas || !wrap) return;

      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      dprRef.current = dpr;
      const ctx = canvas.getContext("2d")!;

      const resize = () => {
        const r = wrap.getBoundingClientRect();
        sizeRef.current = { w: r.width, h: r.height };
        canvas.width = Math.max(1, Math.floor(r.width * dpr));
        canvas.height = Math.max(1, Math.floor(r.height * dpr));
        canvas.style.width = `${r.width}px`;
        canvas.style.height = `${r.height}px`;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      };
      resize();
      const ro = new ResizeObserver(resize);
      ro.observe(wrap);

      const mgr = new VehicleManager();
      managerRef.current = mgr;
      let raf = 0;
      let last = performance.now();
      let cancelled = false;

      mgr.load().then(() => {
        if (cancelled) return;
        const loop = (now: number) => {
          const dt = Math.min(64, now - last);
          last = now;

          // Sync entities ↔ obstacles
          const obstacles = obstaclesRef.current;
          const liveIds = new Set<number>();
          const { w, h } = sizeRef.current;

          for (const obs of obstacles) {
            liveIds.add(obs.id);
            let ent = entityByIdRef.current.get(obs.id);
            const px = (obs.position / 100) * w;
            // bottomPct (within road) = 6 + lane*70  →  y from top
            const bottomPct = 6 + obs.lane * 70;
            const py = h - (bottomPct / 100) * h;
            // depth-based scale matches the prior CSS scaling
            const depthScale = 0.45 + obs.lane * 0.75;
            // base sprite scales (frame heights vary): tame to ~road height
            const baseScale =
              obs.type === "bus" ? 0.55 :
              obs.type === "car" ? 0.5 : 0.42;
            const finalScale = baseScale * depthScale;

            if (!ent) {
              ent = mgr.spawn({
                kind: obs.type,
                x: px,
                y: py,
                scale: finalScale,
                facing: 1,
                initialState: "move",
              });
              entityByIdRef.current.set(obs.id, ent);
            } else {
              ent.position.x = px;
              ent.position.y = py;
              ent.scale = finalScale;
              if (!ent.isHitting() && ent.currentState !== "move") ent.setState("move");
            }
          }

          // Despawn entities for removed obstacles
          for (const [id, ent] of entityByIdRef.current) {
            if (!liveIds.has(id)) {
              const idx = mgr.vehicles.indexOf(ent);
              if (idx !== -1) mgr.vehicles.splice(idx, 1);
              entityByIdRef.current.delete(id);
            }
          }

          mgr.update(dt);
          ctx.clearRect(0, 0, w, h);
          mgr.render(ctx, w, h);
          raf = requestAnimationFrame(loop);
        };
        raf = requestAnimationFrame(loop);
      });

      return () => {
        cancelled = true;
        cancelAnimationFrame(raf);
        ro.disconnect();
        managerRef.current = null;
        entityByIdRef.current.clear();
      };
    }, [obstaclesRef]);

    return (
      <div ref={wrapRef} className={`absolute inset-0 ${className ?? ""}`} style={{ pointerEvents: "none" }}>
        <canvas ref={canvasRef} style={{ display: "block", width: "100%", height: "100%" }} />
      </div>
    );
  },
);
RoadVehicleLayer.displayName = "RoadVehicleLayer";
