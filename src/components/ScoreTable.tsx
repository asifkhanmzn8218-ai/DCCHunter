import { Skull, Trophy } from "lucide-react";
import type { ScoreEntry } from "../game/storage";

interface Props {
  entries: ScoreEntry[];
  highlight?: { name: string; score: number } | null;
  compact?: boolean;
}

export function ScoreTable({ entries, highlight, compact }: Props) {
  if (entries.length === 0) {
    return (
      <div className="font-type text-sm text-ash/60 border border-white/10 rounded-lg px-4 py-5 text-center">
        <Skull className="mx-auto mb-2 h-5 w-5 opacity-60" />
        No cop has returned from Vidya Mandir yet.
        <br />
        Your name could haunt this wall first.
      </div>
    );
  }
  return (
    <div className="border border-white/10 rounded-lg overflow-hidden bg-black/30 backdrop-blur-sm">
      <table className="w-full font-type text-sm">
        <thead>
          <tr
            className={`text-left text-[10px] tracking-[0.25em] text-ash/60 border-b border-white/10 ${
              compact ? "" : ""
            }`}
          >
            <th className="py-2 pl-3 pr-1 font-normal">#</th>
            <th className="py-2 px-1 font-normal">COP</th>
            <th className="py-2 px-1 font-normal text-right">SCORE</th>
            <th className="py-2 px-1 font-normal text-right hidden sm:table-cell">BHOOTS</th>
            <th className="py-2 px-1 pr-3 font-normal text-right">RAAT</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((e, i) => {
            const isYou =
              highlight && e.name === highlight.name && e.score === highlight.score;
            return (
              <tr
                key={`${e.name}-${e.date}-${i}`}
                className={`border-b border-white/5 last:border-0 ${
                  isYou
                    ? "text-ecto glow-ecto bg-ecto/5"
                    : i === 0
                      ? "text-moon"
                      : "text-ash/90"
                }`}
              >
                <td className="py-1.5 pl-3 pr-1 opacity-70">
                  {i === 0 ? <Trophy className="h-3.5 w-3.5 inline -mt-0.5" /> : i + 1}
                </td>
                <td className="py-1.5 px-1 tracking-[0.18em]">
                  {e.name}
                  {isYou && <span className="ml-2 text-[9px] opacity-80">— YOU</span>}
                </td>
                <td className="py-1.5 px-1 text-right">{e.score.toLocaleString()}</td>
                <td className="py-1.5 px-1 text-right hidden sm:table-cell">{e.kills}</td>
                <td className="py-1.5 px-1 pr-3 text-right">{e.night}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
