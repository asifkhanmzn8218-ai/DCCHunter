import { Flame, Pause, Volume2, VolumeX, Keyboard, MapPin, RefreshCw } from "lucide-react";
import type { HudState } from "../game/engine";
import { raatName } from "../game/words";
import { DccLogo } from "./DccLogo";

interface Props {
  hud: HudState;
  onPause: () => void;
  onMute: () => void;
  touchHint: boolean;
}

function AmmoBar({ ammo, magSize, reloading }: { ammo: number; magSize: number; reloading: boolean }) {
  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center gap-1.5 font-type text-[10px] tracking-[0.24em]">
        {reloading ? (
          <span className="flex items-center gap-1.5 text-blood glow-blood">
            <RefreshCw className="h-3 w-3 animate-spin" />
            RELOADING…
          </span>
        ) : (
          <span className={ammo <= 3 ? "text-blood glow-blood" : "text-ash/70"}>
            AMMO {String(ammo).padStart(2, "0")}/{magSize}
          </span>
        )}
      </div>
      <div className="flex gap-[3px]">
        {Array.from({ length: magSize }).map((_, i) => (
          <span
            key={i}
            className={`h-3 w-[3px] rounded-sm transition-all duration-150 ${
              reloading
                ? "bg-blood/40"
                : i < ammo
                  ? "bg-moon shadow-[0_0_5px_rgba(244,230,176,0.8)]"
                  : "bg-white/12"
            }`}
          />
        ))}
      </div>
    </div>
  );
}

export function HUD({ hud, onPause, onMute, touchHint }: Props) {
  return (
    <>
      {/* top bar */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-30 flex items-start justify-between gap-2 p-3 sm:p-5">
        {/* score + DCC badge */}
        <div>
          <div className="mb-1.5 opacity-80">
            <DccLogo size={26} showText={false} />
          </div>
          <div className="font-type text-[10px] tracking-[0.32em] text-ash/70">SCORE</div>
          <div
            key={hud.score}
            className="animate-pop font-type text-2xl sm:text-3xl text-ecto glow-ecto tabular-nums"
          >
            {hud.score.toLocaleString()}
          </div>
          <div className="font-type text-[10px] tracking-[0.2em] text-ash/60 mt-0.5">
            {hud.kills} GHOSTS GUNNED
          </div>
        </div>

        {/* night + location + progress */}
        <div className="flex flex-col items-center pt-0.5">
          <div className="font-horror text-blood text-base sm:text-xl glow-blood animate-flicker">
            {raatName(hud.night)}
          </div>
          <div className="mt-1 flex items-center gap-1 font-type text-[9px] sm:text-[10px] tracking-[0.24em] text-moon/85">
            <MapPin className="h-3 w-3" />
            {hud.location}
          </div>
          <div className="mt-1.5 h-[3px] w-24 sm:w-32 rounded-full bg-white/10 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blood to-orange-400 transition-all duration-500"
              style={{ width: `${Math.min(100, (hud.killsNight / hud.quota) * 100)}%` }}
            />
          </div>
          <div className="font-type text-[9px] tracking-[0.22em] text-ash/60 mt-1">
            {hud.killsNight}/{hud.quota} TO NEXT AREA
          </div>
        </div>

        {/* lives + combo + ammo */}
        <div className="flex flex-col items-end gap-1.5">
          <div className="flex items-center gap-1.5">
            {[0, 1, 2].map((i) => (
              <Flame
                key={i}
                className={`h-5 w-5 ${
                  i < hud.lives
                    ? "text-orange-400 animate-torch drop-shadow-[0_0_6px_rgba(255,140,40,0.8)]"
                    : "text-white/10"
                }`}
              />
            ))}
          </div>
          {hud.combo >= 2 && (
            <div
              key={hud.combo}
              className="animate-pop font-type text-sm sm:text-base text-blood glow-blood"
            >
              COMBO {hud.combo} <span className="text-moon glow-moon">×{hud.mult}</span>
            </div>
          )}
          <AmmoBar ammo={hud.ammo} magSize={hud.magSize} reloading={hud.reloading} />
        </div>
      </div>

      {/* crosshair */}
      <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center">
        <div className="relative h-8 w-8 opacity-50">
          <span className="absolute left-1/2 top-0 h-2.5 w-px -translate-x-1/2 bg-ecto" />
          <span className="absolute left-1/2 bottom-0 h-2.5 w-px -translate-x-1/2 bg-ecto" />
          <span className="absolute top-1/2 left-0 w-2.5 h-px -translate-y-1/2 bg-ecto" />
          <span className="absolute top-1/2 right-0 w-2.5 h-px -translate-y-1/2 bg-ecto" />
          <span className="absolute left-1/2 top-1/2 h-[3px] w-[3px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-blood" />
        </div>
      </div>

      {touchHint && (
        <div className="pointer-events-none absolute inset-x-0 bottom-[130px] z-30 flex justify-center px-4">
          <div className="animate-pulse-glow flex items-center gap-2 rounded-full border border-ecto/30 bg-black/60 px-4 py-2 font-type text-[11px] tracking-[0.18em] text-ecto backdrop-blur-sm">
            <Keyboard className="h-4 w-4" />
            TYPE THE GHOST'S WORD TO SHOOT
          </div>
        </div>
      )}

      <div className="absolute bottom-3 right-3 z-30 flex gap-2 sm:bottom-5 sm:right-5">
        <button onClick={onMute} aria-label="Toggle sound" className="btn-horror rounded-full p-2.5">
          {hud.muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
        </button>
        <button onClick={onPause} aria-label="Pause" className="btn-horror rounded-full p-2.5">
          <Pause className="h-4 w-4" />
        </button>
      </div>
    </>
  );
}
