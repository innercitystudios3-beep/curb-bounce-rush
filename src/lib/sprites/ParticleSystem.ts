export type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  alpha: number;
  size: number;
  decay: number;
  color: string;
  shape: "circle" | "star";
};

export class ParticleSystem {
  particles: Particle[] = [];

  hitBurst(x: number, y: number, opts?: { count?: number; colors?: string[]; shape?: "circle" | "star" }) {
    const count = opts?.count ?? 6;
    const colors = opts?.colors ?? ["#FFB800", "#FF6B00"];
    const shape = opts?.shape ?? "star";
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.4;
      const speed = 80 + Math.random() * 140;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 40,
        alpha: 1,
        size: 4 + Math.random() * 6,
        decay: 1 / 500, // fade over ~500ms
        color: colors[i % colors.length],
        shape,
      });
    }
  }

  update(dt: number) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += (p.vx * dt) / 1000;
      p.y += (p.vy * dt) / 1000;
      p.vy += (250 * dt) / 1000; // gravity
      p.alpha -= p.decay * dt;
      if (p.alpha <= 0) this.particles.splice(i, 1);
    }
  }

  render(ctx: CanvasRenderingContext2D) {
    for (const p of this.particles) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, p.alpha);
      ctx.fillStyle = p.color;
      if (p.shape === "circle") {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // simple 5-point star
        ctx.translate(p.x, p.y);
        ctx.beginPath();
        const spikes = 5;
        const outer = p.size;
        const inner = p.size * 0.45;
        for (let i = 0; i < spikes * 2; i++) {
          const r = i % 2 === 0 ? outer : inner;
          const a = (Math.PI * i) / spikes - Math.PI / 2;
          const px = Math.cos(a) * r;
          const py = Math.sin(a) * r;
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
    }
  }
}
