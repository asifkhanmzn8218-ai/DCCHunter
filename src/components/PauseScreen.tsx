import { Play, RotateCcw, Home, Volume2, VolumeX, Ghost } from "lucide-react";

interface Props {
  muted: boolean;
  onResume: () => void;
  onRestart: () => void;
  onMenu: () => void;
  onToggleMute: () => void;
}

export function PauseScreen({ muted, onResume, onRestart, onMenu, onToggleMute }: Props) {
  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-sm px-4">
      <div className="flex flex-col items-center gap-6 text-center">
        <div className="flex flex-col items-center gap-3">
          <Ghost className="h-10 w-10 text-ecto animate-pulse-glow" />
          <h2 className="font-horror text-moon glow-moon text-4xl sm:text-5xl tracking-wide">
            PAUSED
          </h2>
          <p className="font-type text-xs tracking-[0.28em] text-ash/85">
            The ghosts are holding their breath…
          </p>
        </div>

        <div className="flex flex-col gap-2.5 w-64">
          <button
            onClick={onResume}
            autoFocus
            className="btn-horror btn-ecto rounded-lg px-6 py-3 text-sm flex items-center justify-center gap-2"
          >
            <Play className="h-4 w-4" /> RESUME SHIFT (ESC)
          </button>
          <button
            onClick={onRestart}
            className="btn-horror rounded-lg px-6 py-3 text-sm flex items-center justify-center gap-2"
          >
            <RotateCcw className="h-4 w-4" /> RESTART NIGHT
          </button>
          <button
            onClick={onToggleMute}
            className="btn-horror rounded-lg px-6 py-3 text-sm flex items-center justify-center gap-2"
          >
            {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            {muted ? "UNMUTE SOUNDS" : "MUTE SOUNDS"}
          </button>
          <button
            onClick={onMenu}
            className="btn-horror rounded-lg px-6 py-3 text-sm flex items-center justify-center gap-2"
          >
            <Home className="h-4 w-4" /> ABANDON PATROL
          </button>
        </div>
      </div>
    </div>
  );
}
