export type GhostKind = "bhoot" | "chudail" | "pishach" | "aatma";

export interface KindSpec {
  label: string;
  vy: number; // base descent speed px/s (before scale & night multiplier)
  size: number; // relative body size
  body: string;
  shade: string;
  glow: string; // rgba used for halo
  eye: string;
  accent: string; // hair / horns / sparkle color
  bonus: number; // extra score on kill
}

export const KINDS: Record<GhostKind, KindSpec> = {
  bhoot: {
    label: "BHOOT",
    vy: 26,
    size: 1.0,
    body: "#dcecfb",
    shade: "#9db8da",
    glow: "150, 205, 255",
    eye: "#0a0c14",
    accent: "#eaf4ff",
    bonus: 0,
  },
  chudail: {
    label: "CHUDAIL",
    vy: 36,
    size: 0.94,
    body: "#a9e07b",
    shade: "#639a3f",
    glow: "140, 255, 120",
    eye: "#ff3b3b",
    accent: "#0d1f06",
    bonus: 25,
  },
  pishach: {
    label: "PISHACH",
    vy: 17,
    size: 1.48,
    body: "#c08cf0",
    shade: "#7746ad",
    glow: "190, 120, 255",
    eye: "#ffd23c",
    accent: "#e9e0c2",
    bonus: 60,
  },
  aatma: {
    label: "SUNEHRAA AATMA",
    vy: 64,
    size: 0.68,
    body: "#ffe08a",
    shade: "#e8a83c",
    glow: "255, 210, 90",
    eye: "#241800",
    accent: "#fff6d8",
    bonus: 120,
  },
};

/** word banks — all latin-script, typeable on any keyboard */
const T1 = [
  "PRET", "RAAT", "JINN", "MAUT", "BURI", "TALA", "KHOF", "KUAN", "TONA", "JADU",
  "MAYA", "KOHRA", "WAIL", "HOWL", "TOMB", "GHOUL", "GRAVE", "SKULL", "BONES",
  "CURSE", "DEMON", "BLOOD", "EERIE", "CREEP", "BHOOT", "KHOON", "SAAYA", "DAYAN",
  "KAALA", "NAZAR", "TOTKA", "LAASH", "KABRA", "JHADU", "AAHAT", "VIDYA", "CHABI",
  "MOOT",
];
const T2 = [
  "KANKAL", "SHRAAP", "MANTRA", "CHEEKH", "CHUREL", "BETALA", "RAKSHAS", "DARINDA",
  "SHAITAN", "KAKSHA", "PUSTAK", "HAWELI", "PURAANI", "PISHACH", "MRITYU", "JANGAL",
  "SANNATA", "ANGAARE", "MARHAM", "DARAWNA", "COFFIN", "SHADOW", "SPIRIT", "WRAITH",
  "TERROR", "PHANTOM", "HAUNTED", "WHISPER", "SEANCE", "CORPSE", "RITUAL", "BANSHEE",
];
const T3 = [
  "TAAWEEZ", "SHAMSHAN", "MOMBATTI", "SHIKSHAK", "SHAITAANI", "KHOFNAAK", "HAUNTINGS",
  "MIDNIGHT", "DARKNESS", "SKELETON", "ECTOPLASM", "POSSESSED", "PRET-AATMA".replace("-", ""),
  "PATHSHALA", "KABRISTAN", "NAAGMANI", "VIDYALAYA", "BURI-NAAZAR".replace("-", ""),
];
const T4 = [
  "POLTERGEIST", "APPARITION", "POSSESSION", "DEMONOLOGY", "ANTARANTMA", "PRETLOK",
];

const BONUS = ["SONA", "GOLD", "MOTI", "CHANDI", "KHAZANA"];

export const NIGHT_LINES = [
  "The roll call begins.",
  "The corridor starts whispering.",
  "No assembly tomorrow.",
  "The principal never left.",
  "Class 6-B is on the roof again.",
  "The school owns the night now.",
];

export function nightLine(night: number): string {
  return NIGHT_LINES[Math.min(night - 1, NIGHT_LINES.length - 1)];
}

export function nightQuota(night: number): number {
  return 8 + night * 3;
}
export function spawnInterval(night: number): number {
  return Math.max(0.72, 2.35 - night * 0.16);
}
export function maxOnScreen(night: number): number {
  return Math.min(3 + Math.floor((night - 1) / 2), 7);
}
export function speedMul(night: number): number {
  return 1 + (night - 1) * 0.11;
}

function pickTier(night: number): string[] {
  const r = Math.random();
  if (night <= 1) return T1;
  if (night <= 3) return r < 0.78 ? T2 : T1;
  if (night <= 4) return r < 0.62 ? T2 : r < 0.9 ? T3 : T1;
  if (night <= 6) return r < 0.58 ? T3 : r < 0.85 ? T2 : T1;
  return r < 0.5 ? T4 : r < 0.8 ? T3 : T2;
}

export function pickWord(
  kind: GhostKind,
  night: number,
  used: Set<string>
): string {
  let pool: string[];
  if (kind === "aatma") pool = BONUS;
  else if (kind === "pishach") pool = pickTier(night).filter((w) => w.length >= 6);
  else pool = pickTier(night);

  if (pool.length === 0) pool = T2;
  const fresh = pool.filter((w) => !used.has(w));
  const src = fresh.length ? fresh : pool;
  return src[Math.floor(Math.random() * src.length)];
}

export function pickKind(night: number): GhostKind {
  const r = Math.random();
  if (night >= 2 && r < 0.055) return "aatma";
  if (night >= 3 && r < 0.135) return "pishach";
  if (night >= 2 ? r < 0.38 : r < 0.16) return "chudail";
  return "bhoot";
}

export const ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII", "XIII", "XIV", "XV"];
export function raatName(night: number): string {
  return `RAAT ${ROMAN[Math.min(night - 1, ROMAN.length - 1)]}`;
}
