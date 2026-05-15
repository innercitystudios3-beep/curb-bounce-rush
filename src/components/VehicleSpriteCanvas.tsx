import { useEffect, useRef, useImperativeHandle, forwardRef } from "react";
import { VehicleManager, VehicleSpawn } from "@/lib/sprites/VehicleManager";

export type VehicleSpriteCanvasHandle = {
  manager: VehicleManager | null;
};

type Props = {
  width: number;
  height: number;
  spawns?: VehicleSpawn[];
  className?: string;
};

/**
 * Renders a transparent canvas overlay running the VehicleManager loop.
 * Uses 2x DPR for crisp retina rendering.
 */
export const VehicleSpriteCanvas = forwardRef<VehicleSpriteCanvasHandle, Props>(
  ({ width, height, spawns = [], className }, ref) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const managerRef = useRef<VehicleManager | null>(null);

    useImperativeHandle(ref, () => ({ get manager() { return managerRef.current; } }), []);

    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      const ctx = canvas.getContext("2d")!;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const mgr = new VehicleManager();
      managerRef.current = mgr;
      let raf = 0;
      let last = performance.now();
      let cancelled = false;

      mgr.load().then(() => {
        if (cancelled) return;
        for (const s of spawns) mgr.spawn(s);
        const loop = (now: number) => {
          const dt = Math.min(64, now - last);
          last = now;
          mgr.update(dt);
          ctx.clearRect(0, 0, width, height);
          mgr.render(ctx, width, height);
          raf = requestAnimationFrame(loop);
        };
        raf = requestAnimationFrame(loop);
      });

      return () => {
        cancelled = true;
        cancelAnimationFrame(raf);
        managerRef.current = null;
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [width, height]);

    return (
      <canvas
        ref={canvasRef}
        className={className}
        style={{ width, height, pointerEvents: "none" }}
      />
    );
  },
);
VehicleSpriteCanvas.displayName = "VehicleSpriteCanvas";
