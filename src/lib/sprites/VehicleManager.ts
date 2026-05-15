import { SpriteEntity, StateMap, SpriteSheetConfig, HitFx } from "./SpriteEntity";
import { ParticleSystem } from "./ParticleSystem";

export type VehicleKind = "scooter" | "car" | "bus";

const SHEETS: Record<VehicleKind, { src: string; cols: number; rows: number }> = {
  scooter: { src: "/assets/sprites/scooter-sprite-sheet.png", cols: 5, rows: 2 },
  car: { src: "/assets/sprites/car-sprite-sheet.png", cols: 4, rows: 2 },
  bus: { src: "/assets/sprites/cota-bus-sprite-sheet.png", cols: 4, rows: 2 },
};

const SCOOTER_STATES: StateMap = {
  idle: { frames: [0], durationMs: 500, loop: true, bobY: { amplitude: 1, periodMs: 1800 } },
  move: { frames: [5, 6], durationMs: 150, loop: true },
  brake: { frames: [7, 8], durationMs: 120, loop: false },
  boost: { frames: [9], durationMs: 80, loop: true, shakeX: 1.5 },
  hit: { frames: [7], durationMs: 100, loop: false },
};

const CAR_STATES: StateMap = {
  idle: { frames: [0], durationMs: 2000, loop: true, bobY: { amplitude: 2, periodMs: 2000 } },
  move: { frames: [1], durationMs: 120, loop: true },
  brake: { frames: [2], durationMs: 100, loop: false },
  reverse: { frames: [3], durationMs: 200, loop: true, driftX: 30 },
  turnLeft: { frames: [5], durationMs: 1000, loop: false },
  turnRight: { frames: [6], durationMs: 1000, loop: false },
  hit: { frames: [7], durationMs: 100, loop: false },
};

const BUS_STATES: StateMap = {
  idle: { frames: [0], durationMs: 2500, loop: true, bobY: { amplitude: 1, periodMs: 2500 } },
  move: { frames: [1], durationMs: 160, loop: true, swayX: { amplitude: 1.5, periodMs: 600 } },
  brake: { frames: [2], durationMs: 140, loop: false },
  doorOpen: { frames: [3], durationMs: 1000, loop: false },
  turnLeft: { frames: [5], durationMs: 1000, loop: false },
  turnRight: { frames: [6], durationMs: 1000, loop: false },
  hit: { frames: [7], durationMs: 200, loop: false, shakeX: 8 },
};

const HIT_FX: Record<VehicleKind, HitFx> = {
  scooter: {
    flashColor: "#ffffff", flashCycles: 3, shakeIntensity: 4, shakeDurationMs: 300,
    burstColor: "#FFB800", starCount: 4, totalDurationMs: 350,
  },
  car: {
    flashColor: "#FF8A1E", flashCycles: 2, shakeIntensity: 6, shakeDurationMs: 300,
    burstColor: "#FFB800", starCount: 4, totalDurationMs: 400,
  },
  bus: {
    flashColor: "#FF8A1E", flashCycles: 4, shakeIntensity: 8, shakeDurationMs: 800,
    burstColor: "#FFB800", starCount: 6, totalDurationMs: 600,
  },
};

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

export type VehicleSpawn = {
  kind: VehicleKind;
  x: number;
  y: number;
  scale?: number;
  facing?: 1 | -1;
  initialState?: string;
};

export class VehicleManager {
  sheets: Partial<Record<VehicleKind, SpriteSheetConfig>> = {};
  vehicles: Array<SpriteEntity & { kind: VehicleKind; id: number }> = [];
  particles = new ParticleSystem();
  private _shake = { intensity: 0, remaining: 0, duration: 0 };
  private _flash = { color: "#ffffff", alpha: 0, decay: 0 };
  private _id = 0;

  async load() {
    const entries = await Promise.all(
      (Object.keys(SHEETS) as VehicleKind[]).map(async (k) => {
        const cfg = SHEETS[k];
        const image = await loadImage(cfg.src);
        return [k, { image, cols: cfg.cols, rows: cfg.rows }] as const;
      }),
    );
    for (const [k, cfg] of entries) this.sheets[k] = cfg;
  }

  spawn(spec: VehicleSpawn) {
    const sheet = this.sheets[spec.kind];
    if (!sheet) throw new Error(`Sheet not loaded: ${spec.kind}`);
    const states =
      spec.kind === "scooter" ? SCOOTER_STATES : spec.kind === "car" ? CAR_STATES : BUS_STATES;
    const ent = new SpriteEntity({
      sheet,
      states,
      initialState: spec.initialState ?? "idle",
      position: { x: spec.x, y: spec.y },
      scale: spec.scale ?? 0.5,
      facing: spec.facing ?? 1,
      hitFx: HIT_FX[spec.kind],
    }) as SpriteEntity & { kind: VehicleKind; id: number };
    ent.kind = spec.kind;
    ent.id = ++this._id;
    ent.onHitComplete = () => {
      // default returns to idle (handled by SpriteEntity)
    };
    this.vehicles.push(ent);
    return ent;
  }

  hit(vehicleId: number) {
    const v = this.vehicles.find((x) => x.id === vehicleId);
    if (!v || v.isHitting()) return;
    v.triggerHit();
    const fx = HIT_FX[v.kind];
    this.particles.hitBurst(v.position.x, v.position.y, {
      count: fx.starCount,
      colors: [fx.burstColor, "#FF6B00"],
    });
    this.screenShake(fx.shakeIntensity, fx.shakeDurationMs);
    this.flashOverlay(fx.flashColor, 0.35, fx.totalDurationMs);
  }

  screenShake(intensity: number, duration: number) {
    this._shake.intensity = Math.max(this._shake.intensity, intensity);
    this._shake.remaining = Math.max(this._shake.remaining, duration);
    this._shake.duration = Math.max(this._shake.duration, duration);
  }

  flashOverlay(color: string, alpha: number, duration: number) {
    this._flash.color = color;
    this._flash.alpha = alpha;
    this._flash.decay = alpha / Math.max(1, duration);
  }

  update(dt: number) {
    for (const v of this.vehicles) v.update(dt);
    this.particles.update(dt);
    if (this._shake.remaining > 0) this._shake.remaining -= dt;
    if (this._flash.alpha > 0) this._flash.alpha = Math.max(0, this._flash.alpha - this._flash.decay * dt);
  }

  render(ctx: CanvasRenderingContext2D, viewW: number, viewH: number) {
    ctx.save();
    if (this._shake.remaining > 0 && this._shake.duration > 0) {
      const t = this._shake.remaining / this._shake.duration;
      const ox = (Math.random() * 2 - 1) * this._shake.intensity * t;
      ctx.translate(ox, 0);
    }
    // vehicles (middle layer)
    for (const v of this.vehicles) v.render(ctx);
    // particles (top)
    this.particles.render(ctx);
    ctx.restore();

    if (this._flash.alpha > 0) {
      ctx.save();
      ctx.globalAlpha = this._flash.alpha;
      ctx.fillStyle = this._flash.color;
      ctx.fillRect(0, 0, viewW, viewH);
      ctx.restore();
    }
  }
}
