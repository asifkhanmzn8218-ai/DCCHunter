export interface ScoreEntry {
  name: string;
  score: number;
  kills: number;
  night: number;
  combo: number;
  date: number;
}

const KEY = "dcc-cop-scores-v1";
const MAX = 5;

export function loadScores(): ScoreEntry[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw) as ScoreEntry[];
    if (!Array.isArray(arr)) return [];
    return arr
      .filter((e) => typeof e?.score === "number" && typeof e?.name === "string")
      .sort((a, b) => b.score - a.score)
      .slice(0, MAX);
  } catch {
    return [];
  }
}

export function qualifies(score: number): boolean {
  if (score <= 0) return false;
  const list = loadScores();
  return list.length < MAX || score > list[list.length - 1].score;
}

export function isBest(score: number): boolean {
  const list = loadScores();
  return list.length > 0 && score > list[0].score;
}

export function addScore(entry: Omit<ScoreEntry, "date">): ScoreEntry[] {
  const list = loadScores();
  list.push({ ...entry, date: Date.now() });
  list.sort((a, b) => b.score - a.score);
  const final = list.slice(0, MAX);
  try {
    localStorage.setItem(KEY, JSON.stringify(final));
  } catch {
    /* private mode */
  }
  return final;
}

export function bestScore(): number {
  return loadScores()[0]?.score ?? 0;
}
