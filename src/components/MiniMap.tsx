import { useEffect, useRef } from "react";
import type { Engine } from "../game/engine";
import { LEVELS } from "../game/levels";
import { KINDS } from "../game/words";

interface Props {
  engineRef: React.RefObject<Engine | null>;
  night: number;
  location: string;
  active: boolean;
}

const W = 148;
const H = 118;

export function MiniMap({ engineRef, night, location, active }: Props) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!active) return;
    const cv = ref.current;
    if (!cv) return;
    const ctx = cv.getContext("2d")!;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    cv.width = W * dpr;
    cv.height = H * dpr;
    ctx.scale(dpr, dpr);
    let raf = 0;
    let t = 0;

    const draw = () => {
      raf = requestAnimationFrame(draw);
      const eng = engineRef.current;
      if (!eng) return;
      t += 0.016;

      ctx.clearRect(0, 0, W, H);
      // radar cone background
      ctx.fillStyle = "rgba(4,10,14,0.82)";
      ctx.beginPath();
      ctx.moveTo(W / 2, H - 6);
      ctx.lineTo(W - 6, 8);
      ctx.lineTo(6, 8);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = "rgba(108,255,150,0.35)";
      ctx.lineWidth = 1;
      ctx.stroke();

      // depth rings
      ctx.strokeStyle = "rgba(108,255,150,0.14)";
      for (let i = 1; i <= 3; i++) {
        const k = i / 3;
        const y = H - 6 - k * (H - 14);
        const halfW = 3 + k * (W / 2 - 8);
        ctx.beginPath();
        ctx.moveTo(W / 2 - halfW, y);
        ctx.lineTo(W / 2 + halfW, y);
        ctx.stroke();
      }
      // sweep line
      const sweep = (t * 0.55) % 1;
      const sy = H - 6 - sweep * (H - 14);
      const shw = 3 + sweep * (W / 2 - 8);
      const grad = ctx.createLinearGradient(0, sy - 10, 0, sy + 4);
      grad.addColorStop(0, "rgba(108,255,150,0)");
      grad.addColorStop(1, "rgba(108,255,150,0.3)");
      ctx.fillStyle = grad;
      ctx.fillRect(W / 2 - shw, sy - 10, shw * 2, 14);

      // ghost blips
      for (const b of eng.getRadar()) {
        const y = H - 6 - (1 - b.d) * (H - 14);
        const halfW = 3 + (1 - b.d) * (W / 2 - 8);
        const x = W / 2 + b.x * halfW;
        const spec = KINDS[b.kind];
        const pulse = 0.6 + 0.4 * Math.sin(t * 7 + b.x * 5);
        ctx.fillStyle = `rgba(${spec.glow},${pulse})`;
        ctx.beginPath();
        ctx.arc(x, y, b.locked ? 4 : 2.8, 0, Math.PI * 2);
        ctx.fill();
        if (b.locked) {
          ctx.strokeStyle = "rgba(255,70,80,0.95)";
          ctx.lineWidth = 1.4;
          ctx.beginPath();
          ctx.arc(x, y, 6.5, 0, Math.PI * 2);
          ctx.stroke();
        }
      }

      // player marker
      ctx.fillStyle = "#4fd8ff";
      ctx.beginPath();
      ctx.moveTo(W / 2, H - 10);
      ctx.lineTo(W / 2 - 4.5, H - 3);
      ctx.lineTo(W / 2 + 4.5, H - 3);
      ctx.closePath();
      ctx.fill();
    };
    draw();
    return () => cancelAnimationFrame(raf);
  }, [engineRef, active]);

  if (!active) return null;
  const idx = (night - 1) % LEVELS.length;

  return (
    <div className="pointer-events-none absolute bottom-3 left-3 z-30 sm:bottom-5 sm:left-5">
      <div className="rounded-lg border border-ecto/25 bg-black/55 p-2 backdrop-blur-sm">
        <div className="mb-1 flex items-center justify-between gap-2">
          <span className="font-type text-[8px] tracking-[0.22em] text-ecto/85">
            DCC RADAR
          </span>
          <span className="font-type text-[8px] tracking-[0.16em] text-ash/60">
            {location}
          </span>
        </div>
        <canvas ref={ref} style={{ width: W, height: H }} className="block" />
        {/* route progress */}
        <div className="mt-1.5 flex items-center gap-[3px]">
          {LEVELS.map((l, i) => (
            <span
              key={l.key}
              className={`h-[3px] flex-1 rounded-full ${
                i < idx
                  ? "bg-ecto/70"
                  : i === idx
                    ? "bg-blood shadow-[0_0_6px_rgba(255,47,63,0.9)]"
                    : "bg-white/12"
              }`}
            />
          ))}
        </div>
        <div className="mt-1 text-center font-type text-[8px] tracking-[0.2em] text-ash/55">
          AREA {idx + 1}/{LEVELS.length}
        </div>
      </div>
    </div>
  );
}
