import { Keyboard, Zap, Flame, Play, Volume2, MapPin } from "lucide-react";
import type { ScoreEntry } from "../game/storage";
import { ScoreTable } from "./ScoreTable";
import { DccLogo } from "./DccLogo";
import { LEVELS } from "../game/levels";

interface Props {
  scores: ScoreEntry[];
  onStart: () => void;
}

function HowCard({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex-1 min-w-[150px] border border-white/10 bg-black/40 backdrop-blur-sm rounded-lg px-4 py-3 text-center">
      <div className="mx-auto mb-2 flex h-8 w-8 items-center justify-center rounded-full border border-ecto/30 text-ecto">
        {icon}
      </div>
      <div className="font-type text-[11px] tracking-[0.24em] text-moon mb-1">{title}</div>
      <div className="font-type text-xs leading-relaxed text-ash/90">{children}</div>
    </div>
  );
}

export function StartScreen({ scores, onStart }: Props) {
  const best = scores[0]?.score ?? 0;
  return (
    <div className="absolute inset-0 z-50 overflow-y-auto">
      <div className="min-h-full flex flex-col items-center justify-center gap-5 px-4 py-10 text-center">
        {/* DCC badge */}
        <div className="animate-rise rise-1 flex flex-col items-center gap-2">
          <DccLogo size={54} />
          <div className="font-type text-[9px] sm:text-[10px] tracking-[0.3em] text-ash/70">
            PARANORMAL FIELD UNIT 7 · VIDYA MANDIR CAMPUS
          </div>
        </div>

        {/* title */}
        <div className="animate-rise rise-2">
          <h1 className="font-horror text-blood glow-blood animate-flicker text-[17vw] leading-[0.95] sm:text-8xl md:text-9xl select-none">
            DCC&nbsp;COP
          </h1>
          <div className="mt-3 font-type text-moon glow-moon tracking-[0.42em] text-[10px] sm:text-sm">
            THE HAUNTING OF VIDYA MANDIR
          </div>
        </div>

        {/* story */}
        <div className="animate-rise rise-3 max-w-xl border-x-2 border-blood/40 bg-black/50 backdrop-blur-sm rounded-lg px-5 py-4">
          <p className="font-type text-[13px] sm:text-sm leading-relaxed text-[#d8d2bc]">
            Raat ke 3 baj rahe hain. Vidya Mandir ki classrooms se cheekhein aa rahi hain —
            aur principal Sharma-ji ghar tak nahi pahunche. Tum ho DCC ka aakhri cop,
            aur tumhari bandook <span className="text-ecto">shabdon</span> se chalti hai
            <span className="animate-caret text-blood">▌</span>
          </p>
          <p className="mt-2 font-type text-[11px] sm:text-xs text-ash/80">
            Type the word a ghost carries to shoot it down. Indian bhoots do not die twice
            — so don't miss.
          </p>
        </div>

        {/* how to play */}
        <div className="animate-rise rise-4 flex w-full max-w-2xl flex-wrap justify-center gap-2.5">
          <HowCard icon={<Keyboard className="h-4 w-4" />} title="TYPE TO FIRE">
            Every letter is a bullet. Finish a word to kill the ghost carrying it.
          </HowCard>
          <HowCard icon={<Zap className="h-4 w-4" />} title="ADVANCE & RELOAD">
            Har kill pe tum aage badhte ho. Mag khatam hua to rifle khud reload hogi.
          </HowCard>
          <HowCard icon={<Flame className="h-4 w-4" />} title="3 LIVES">
            Anything that crosses the red line takes one. The bhoot tod-fod squad shows no mercy.
          </HowCard>
        </div>

        {/* location route */}
        <div className="animate-rise rise-4 w-full max-w-2xl">
          <div className="mb-2 flex items-center justify-center gap-2 font-type text-[10px] tracking-[0.3em] text-ash/70">
            <MapPin className="h-3 w-3 text-blood" />
            TONIGHT'S PATROL ROUTE
          </div>
          <div className="flex flex-wrap items-center justify-center gap-1.5">
            {LEVELS.map((l, i) => (
              <div key={l.key} className="flex items-center gap-1.5">
                <div className="rounded border border-white/10 bg-black/45 px-2.5 py-1.5 backdrop-blur-sm">
                  <div className="font-type text-[9px] tracking-[0.16em] text-moon/90">
                    {l.name}
                  </div>
                  <div className="font-type text-[8px] tracking-[0.2em] text-ash/50">
                    RAAT {i + 1}
                  </div>
                </div>
                {i < LEVELS.length - 1 && <span className="text-ash/30 text-xs">→</span>}
              </div>
            ))}
          </div>
        </div>

        {/* start */}
        <div className="animate-rise rise-5 flex flex-col items-center gap-2">
          <button
            onClick={onStart}
            autoFocus
            className="btn-horror group rounded-lg px-8 py-3.5 text-sm sm:text-base flex items-center gap-3"
          >
            <Play className="h-4 w-4 transition-transform group-hover:scale-125" />
            BEGIN NIGHT PATROL
          </button>
          <div className="font-type text-[10px] tracking-[0.3em] text-ash/60 animate-pulse-glow">
            OR PRESS ANY KEY
            {best > 0 && <span className="ml-3 text-moon/70">BEST: {best.toLocaleString()}</span>}
          </div>
        </div>

        {/* high scores */}
        <div className="animate-rise rise-5 w-full max-w-md">
          <div className="mb-2 flex items-center justify-center gap-2 font-type text-[10px] tracking-[0.34em] text-ash/70">
            <span className="h-px w-8 bg-white/15" />
            WALL OF FALLEN COPS
            <span className="h-px w-8 bg-white/15" />
          </div>
          <ScoreTable entries={scores} />
        </div>

        <div className="flex items-center gap-2 font-type text-[9px] tracking-[0.28em] text-ash/50">
          <Volume2 className="h-3 w-3" />
          HEADPHONES RECOMMENDED · ESC TO PAUSE
        </div>
      </div>
    </div>
  );
}
