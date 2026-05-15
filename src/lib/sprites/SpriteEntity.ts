// Lightweight sprite-sheet animation entity. Vanilla canvas, no deps.

export type FrameSpec = {
  frames: number[];
  durationMs: number;
  loop: boolean;
  // optional per-state visual modifiers handled by the renderer
  shakeX?: number; // ± px applied to draw position each frame
  driftX?: number; // px/sec horizontal drift
  bobY?: { amplitude: number; periodMs: number }; // vertical sin bob
  swayX?: { amplitude: number; periodMs: number };
  wheelSpin?: boolean; // CSS-equivalent — handled as a slight skew/rotation
};

export type StateMap = Record<string, FrameSpec>;

export type SpriteSheetConfig = {
  image: HTMLImageElement;
  cols: number;
  rows: number;
};

export type HitFx = {
  flashColor: string;
  flashCycles: number;
  shakeIntensity: number;
  shakeDurationMs: number;
  burstColor: string;
  starCount: number;
  totalDurationMs: number;
};

export class SpriteEntity {
  sheet: SpriteSheetConfig;
  states: StateMap;
  currentState: string;
  frameIndex = 0;
  frameTimer = 0;
  elapsedInState = 0;
  position: { x: number; y: number };
  velocity: { x: number; y: number } = { x: 0, y: 0 };
  scale = 1;
  facing: 1 | -1 = 1;
  hitFx?: HitFx;
  onHitComplete?: () => void;
  private _hitting = false;
  private _flashTimer = 0;
  private _flashOn = false;
  private _flashesLeft = 0;
  private _shakeOffsetX = 0;
  private _shakeRemaining = 0;

  constructor(opts: {
    sheet: SpriteSheetConfig;
    states: StateMap;
    initialState: string;
    position: { x: number; y: number };
    scale?: number;
    facing?: 1 | -1;
    hitFx?: HitFx;
  }) {
    this.sheet = opts.sheet;
    this.states = opts.states;
    this.currentState = opts.initialState;
    this.position = opts.position;
    this.scale = opts.scale ?? 1;
    this.facing = opts.facing ?? 1;
    this.hitFx = opts.hitFx;
  }

  get frameWidth() {
    return this.sheet.image.naturalWidth / this.sheet.cols;
  }
  get frameHeight() {
    return this.sheet.image.naturalHeight / this.sheet.rows;
  }

  setState(name: string) {
    if (this._hitting && name !== "hit") return; // non-interruptible
    if (this.currentState === name) return;
    this.currentState = name;
    this.frameIndex = 0;
    this.frameTimer = 0;
    this.elapsedInState = 0;
  }

  triggerHit() {
    if (this._hitting) return;
    this._hitting = true;
    this.currentState = "hit";
    this.frameIndex = 0;
    this.frameTimer = 0;
    this.elapsedInState = 0;
    if (this.hitFx) {
      this._flashesLeft = this.hitFx.flashCycles;
      this._flashTimer = 0;
      this._flashOn = true;
      this._shakeRemaining = this.hitFx.shakeDurationMs;
    }
  }

  update(dt: number) {
    const spec = this.states[this.currentState];
    if (!spec) return;
    this.frameTimer += dt;
    this.elapsedInState += dt;

    while (this.frameTimer >= spec.durationMs) {
      this.frameTimer -= spec.durationMs;
      if (this.frameIndex < spec.frames.length - 1) {
        this.frameIndex++;
      } else if (spec.loop) {
        this.frameIndex = 0;
      }
    }

    // hit lifecycle
    if (this._hitting && this.hitFx) {
      this._flashTimer += dt;
      const flashStep = this.hitFx.totalDurationMs / Math.max(1, this.hitFx.flashCycles * 2);
      if (this._flashTimer >= flashStep && this._flashesLeft > 0) {
        this._flashTimer = 0;
        this._flashOn = !this._flashOn;
        if (!this._flashOn) this._flashesLeft--;
      }
      if (this._shakeRemaining > 0) {
        this._shakeRemaining -= dt;
        const t = Math.max(0, this._shakeRemaining / this.hitFx.shakeDurationMs);
        this._shakeOffsetX = (Math.random() * 2 - 1) * this.hitFx.shakeIntensity * t;
      } else {
        this._shakeOffsetX = 0;
      }
      if (this.elapsedInState >= this.hitFx.totalDurationMs) {
        this._hitting = false;
        this._flashesLeft = 0;
        this._shakeOffsetX = 0;
        this.onHitComplete?.();
        this.setState("idle");
      }
    }

    // physics modifiers
    if (spec.driftX) this.position.x += (spec.driftX * dt) / 1000;
  }

  isHitting() {
    return this._hitting;
  }

  render(ctx: CanvasRenderingContext2D, x?: number, y?: number) {
    const spec = this.states[this.currentState];
    if (!spec) return;
    const fIdx = spec.frames[this.frameIndex] ?? spec.frames[0];
    const col = fIdx % this.sheet.cols;
    const row = Math.floor(fIdx / this.sheet.cols);
    const fw = this.frameWidth;
    const fh = this.frameHeight;

    let drawX = (x ?? this.position.x) + this._shakeOffsetX;
    let drawY = y ?? this.position.y;

    if (spec.bobY) {
      drawY += Math.sin((this.elapsedInState / spec.bobY.periodMs) * Math.PI * 2) * spec.bobY.amplitude;
    }
    if (spec.swayX) {
      drawX += Math.sin((this.elapsedInState / spec.swayX.periodMs) * Math.PI * 2) * spec.swayX.amplitude;
    }
    if (spec.shakeX) {
      drawX += (Math.random() * 2 - 1) * spec.shakeX;
    }

    const w = fw * this.scale;
    const h = fh * this.scale;

    ctx.save();
    ctx.translate(drawX, drawY);
    if (this.facing === -1) ctx.scale(-1, 1);
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(this.sheet.image, col * fw, row * fh, fw, fh, -w / 2, -h / 2, w, h);

    if (this._hitting && this._flashOn && this.hitFx) {
      ctx.globalCompositeOperation = "source-atop";
      ctx.fillStyle = this.hitFx.flashColor;
      ctx.globalAlpha = 0.55;
      ctx.fillRect(-w / 2, -h / 2, w, h);
    }
    ctx.restore();
  }
}
