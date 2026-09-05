import { useEffect, useRef, useState } from "react";
import { Skull, RotateCcw, Home, PenLine, Trophy } from "lucide-react";
import type { RunStats } from "../game/engine";
import type { ScoreEntry } from "../game/storage";
import { ScoreTable } from "./ScoreTable";

interface Props {
  stats: RunStats;
  scores: ScoreEntry[];
  qualifies: boolean;
  isNewBest: boolean;
  onSave: (name: string) => void;
  onRestart: () => void;
  onMenu: () => void;
}

function StatBlock({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="border border-white/10 bg-black/40 backdrop-blur-sm rounded-lg px-3 py-2.5">
      <div className="font-type text-[9px] tracking-[0.28em] text-ash/60">{label}</div>
      <div
        className={`font-type mt-0.5 tabular-nums ${
          value.length > 9 ? "text-[11px] sm:text-xs pt-1.5" : "text-lg sm:text-xl"
        } ${accent ? "text-ecto glow-ecto" : "text-moon"}`}
      >
        {value}
      </div>
    </div>
  );
}

export function GameOverScreen({
  stats,
  scores,
  qualifies,
  isNewBest,
  onSave,
  onRestart,
  onMenu,
}: Props) {
  const [name, setName] = useState("");
  const [saved, setSaved] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (qualifies && !saved) {
      const t = setTimeout(() => inputRef.current?.focus(), 450);
      return () => clearTimeout(t);
    }
  }, [qualifies, saved]);

  const submit = () => {
    const n = name.trim().toUpperCase().slice(0, 10) || "GHOST COP";
    onSave(n);
    setSaved(true);
    inputRef.current?.blur();
  };

  return (
    <div className="absolute inset-0 z-50 overflow-y-auto bg-black/55 backdrop-blur-[2px]">
      <div className="min-h-full flex flex-col items-center justify-center gap-5 px-4 py-10 text-center">
        {/* heading */}
        <div className="animate-rise rise-1 flex flex-col items-center gap-2">
          <Skull className="h-9 w-9 text-blood animate-pulse-glow" />
          <h2 className="font-horror text-blood glow-blood text-3xl sm:text-5xl leading-tight">
            THE SCHOOL
            <br />
            KEEPS YOU
          </h2>
          <p className="font-type text-xs sm:text-sm tracking-[0.24em] text-ash/85">
            Ab tum bhi Vidya Mandir ke register mein ho.
          </p>
        </div>

        {/* stats */}
        <div className="animate-rise rise-2 grid w-full max-w-lg grid-cols-2 sm:grid-cols-3 gap-2">
          <StatBlock label="FINAL SCORE" value={stats.score.toLocaleString()} accent />
          <StatBlock label="GHOSTS GUNNED" value={String(stats.kills)} />
          <StatBlock label="RAAT SURVIVED" value={String(stats.night)} />
          <StatBlock label="BEST COMBO" value={String(stats.bestCombo)} />
          <StatBlock label="ACCURACY" value={`${stats.accuracy}%`} />
          <StatBlock label="LAST SEEN" value={stats.location} accent={isNewBest} />
        </div>

        {/* name entry or table */}
        <div className="animate-rise rise-3 w-full max-w-md">
          {qualifies && !saved ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                submit();
              }}
              className="border border-ecto/40 bg-black/50 backdrop-blur-sm rounded-lg p-4"
            >
              <div className="flex items-center justify-center gap-2 mb-3 font-type text-[11px] tracking-[0.3em] text-ecto glow-ecto">
                <PenLine className="h-4 w-4" />
                YOU MADE THE WALL — ETCH YOUR NAME
              </div>
              <div className="flex gap-2 justify-center">
                <input
                  ref={inputRef}
                  value={name}
                  onChange={(e) => setName(e.target.value.replace(/[^a-zA-Z0-9 ]/g, ""))}
                  onKeyDown={(e) => e.stopPropagation()}
                  maxLength={10}
                  placeholder="NAAM LIKHO"
                  className="w-44 rounded border border-white/20 bg-black/60 px-3 py-2 font-type text-sm tracking-[0.24em] text-moon placeholder:text-ash/40 outline-none focus:border-ecto/60 uppercase"
                />
                <button
                  type="submit"
                  className="btn-horror btn-ecto rounded px-4 py-2 text-xs"
                >
                  ETCH
                </button>
              </div>
            </form>
          ) : (
            <ScoreTable
              entries={scores}
              highlight={
                saved
                  ? {
                      name: (name.trim().toUpperCase() || "GHOST COP").slice(0, 10),
                      score: stats.score,
                    }
                  : qualifies
                    ? { name: "", score: stats.score }
                    : null
              }
            />
          )}
        </div>

        {/* actions */}
        <div className="animate-rise rise-4 flex flex-wrap items-center justify-center gap-3">
          <button
            onClick={onRestart}
            className="btn-horror btn-ecto rounded-lg px-6 py-3 text-sm flex items-center gap-2"
          >
            <RotateCcw className="h-4 w-4" />
            PATROL AGAIN
          </button>
          <button
            onClick={onMenu}
            className="btn-horror rounded-lg px-6 py-3 text-sm flex items-center gap-2"
          >
            <Home className="h-4 w-4" />
            STATION (MENU)
          </button>
        </div>

        <div className="font-type text-[9px] tracking-[0.3em] text-ash/50 flex items-center gap-2">
          <Trophy className="h-3 w-3" />
          PRESS ENTER FOR INSTANT REDEPLOY
        </div>
      </div>
    </div>
  );
}
