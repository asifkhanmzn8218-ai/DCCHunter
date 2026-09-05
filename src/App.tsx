import { useEffect, useRef, useState } from "react";
import { Engine, HudState, RunStats } from "./game/engine";
import { addScore, isBest, loadScores, qualifies, ScoreEntry } from "./game/storage";
import { nightLine, raatName } from "./game/words";
import { HUD } from "./components/HUD";
import { StartScreen } from "./components/StartScreen";
import { GameOverScreen } from "./components/GameOverScreen";
import { PauseScreen } from "./components/PauseScreen";
import { MiniMap } from "./components/MiniMap";

type Screen = "start" | "playing" | "paused" | "over";

const IS_TOUCH =
  typeof window !== "undefined" &&
  (navigator.maxTouchPoints > 0 || "ontouchstart" in window);

const INITIAL_HUD: HudState = {
  score: 0,
  combo: 0,
  mult: 1,
  lives: 3,
  night: 1,
  kills: 0,
  quota: 11,
  killsNight: 0,
  bestCombo: 0,
  muted: false,
  ammo: 14,
  magSize: 14,
  reloading: false,
  location: "MAIN GATE",
};

interface BannerInfo {
  night: number;
  location: string;
  tagline: string;
}

function NightBanner({ info }: { info: BannerInfo }) {
  return (
    <div className="pointer-events-none absolute inset-0 z-40 flex items-center justify-center px-6">
      <div
        key={`${info.night}-${info.location}`}
        className="night-banner flex flex-col items-center text-center"
      >
        <div className="font-horror text-blood glow-blood text-4xl sm:text-6xl">
          {raatName(info.night)}
        </div>
        <div className="mt-2 font-type text-lg sm:text-3xl tracking-[0.3em] text-moon glow-moon">
          {info.location}
        </div>
        <div className="mt-3 font-type text-[11px] sm:text-sm tracking-[0.3em] text-ash/85">
          {info.tagline}
        </div>
        <div className="mt-2 font-type text-[10px] tracking-[0.34em] text-ash/55">
          {nightLine(info.night)}
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const engineRef = useRef<Engine | null>(null);
  const bannerTimer = useRef(0);
  const hintTimer = useRef(0);
  const overAtRef = useRef(0);

  const [screen, setScreen] = useState<Screen>("start");
  const [hud, setHud] = useState<HudState>(INITIAL_HUD);
  const [stats, setStats] = useState<RunStats | null>(null);
  const [scores, setScores] = useState<ScoreEntry[]>(() => loadScores());
  const [qualifiesFlag, setQualifiesFlag] = useState(false);
  const [newBest, setNewBest] = useState(false);
  const [banner, setBanner] = useState<BannerInfo | null>(null);
  const [touchHint, setTouchHint] = useState(false);
  const [dmgKey, setDmgKey] = useState(0);
  const [glFail, setGlFail] = useState(false);

  const screenRef = useRef(screen);
  screenRef.current = screen;

  /* ---------- engine lifecycle ---------- */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let engine: Engine;
    try {
      engine = new Engine(canvas, {
        onHud: (h) => setHud(h),
        onNight: (n, location, tagline) => {
          setBanner({ night: n, location, tagline });
          window.clearTimeout(bannerTimer.current);
          bannerTimer.current = window.setTimeout(() => setBanner(null), 2600);
        },
        onGameOver: (st) => {
          overAtRef.current = Date.now();
          setStats(st);
          setQualifiesFlag(qualifies(st.score));
          setNewBest(st.score > 0 && isBest(st.score));
          setScreen("over");
          inputRef.current?.blur();
        },
        onDamageFx: () => setDmgKey(Date.now()),
      });
    } catch {
      setGlFail(true);
      return;
    }
    engineRef.current = engine;
    setHud((h) => ({ ...h, muted: engine.audio.muted }));

    if (document.fonts) {
      Promise.all([
        document.fonts.load('16px "Special Elite"'),
        document.fonts.load('16px "Nosifer"'),
      ])
        .then(() => {
          engine.fontsLoaded = true;
        })
        .catch(() => undefined);
    }
    return () => {
      window.clearTimeout(bannerTimer.current);
      window.clearTimeout(hintTimer.current);
      engine.destroy();
      engineRef.current = null;
    };
  }, []);

  /* ---------- actions ---------- */
  const focusGameInput = () => {
    inputRef.current?.focus({ preventScroll: true });
  };

  const startGame = () => {
    const e = engineRef.current;
    if (!e) return;
    e.audio.unlock();
    e.startRun();
    setStats(null);
    setScreen("playing");
    focusGameInput();
    if (IS_TOUCH) {
      setTouchHint(true);
      window.clearTimeout(hintTimer.current);
      hintTimer.current = window.setTimeout(() => setTouchHint(false), 5200);
    }
  };

  const pauseGame = () => {
    const e = engineRef.current;
    if (!e) return;
    e.setPaused(true);
    if (e.paused) {
      setScreen("paused");
      inputRef.current?.blur();
    }
  };

  const resumeGame = () => {
    const e = engineRef.current;
    if (!e) return;
    e.setPaused(false);
    setScreen("playing");
    focusGameInput();
  };

  const quitToMenu = () => {
    engineRef.current?.stopToIdle();
    setScreen("start");
    setScores(loadScores());
    inputRef.current?.blur();
  };

  const toggleMute = () => {
    const e = engineRef.current;
    if (!e) return;
    e.audio.unlock();
    e.audio.setMuted(!e.audio.muted);
    e.emitMute();
  };

  const saveScore = (name: string) => {
    if (!stats) return;
    const list = addScore({
      name,
      score: stats.score,
      kills: stats.kills,
      night: stats.night,
      combo: stats.bestCombo,
    });
    setScores(list);
  };

  /* ---------- global keyboard ---------- */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && target.tagName === "INPUT" && target !== inputRef.current) return;
      const scr = screenRef.current;
      const eng = engineRef.current;
      const k = e.key;

      if (scr === "start") {
        if (e.repeat) return;
        if (k.length === 1 || k === "Enter") startGame();
        return;
      }
      if (scr === "playing") {
        if (k === "Escape") {
          pauseGame();
          return;
        }
        if (k === " " || k.startsWith("Arrow")) e.preventDefault();
        if (e.repeat) return;
        if (k.length === 1 && !e.metaKey && !e.ctrlKey && !e.altKey) {
          eng?.typeChar(k);
        }
        return;
      }
      if (scr === "paused") {
        if (k === "Escape") resumeGame();
        return;
      }
      if (scr === "over") {
        if (k === "Enter" && Date.now() - overAtRef.current > 350) startGame();
        if (k === "Escape") quitToMenu();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ---------- touch: wake virtual keyboard ---------- */
  useEffect(() => {
    const onTap = (e: Event) => {
      const t = e.target as HTMLElement | null;
      if (t && t.closest("button,input,a")) return;
      if (screenRef.current === "playing") {
        focusGameInput();
      }
    };
    window.addEventListener("touchend", onTap, { passive: true });
    return () => window.removeEventListener("touchend", onTap);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ---------- auto-pause on tab switch ---------- */
  useEffect(() => {
    const onBlur = () => {
      if (screenRef.current === "playing") pauseGame();
    };
    const onVis = () => {
      if (document.hidden) onBlur();
    };
    window.addEventListener("blur", onBlur);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.removeEventListener("blur", onBlur);
      document.removeEventListener("visibilitychange", onVis);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onGameInput = (e: React.FormEvent<HTMLInputElement>) => {
    const el = e.currentTarget;
    const v = el.value;
    if (!v) return;
    for (const ch of v) engineRef.current?.typeChar(ch);
    el.value = "";
  };

  return (
    <div className="fixed inset-0 overflow-hidden bg-ink font-type">
      {/* 3D game canvas (renders its own haunted sky) */}
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />

      {/* damage flash */}
      {dmgKey > 0 && screen !== "start" && (
        <div key={dmgKey} className="damage-flash pointer-events-none absolute inset-0 z-[35]" />
      )}

      {glFail && (
        <div className="absolute inset-0 z-[60] flex items-center justify-center bg-ink p-6 text-center font-type text-sm text-ash">
          Yaar, is device mein WebGL nahi chal raha. DCC COP ko 3D kaam ke liye
          hardware acceleration chahiye — browser update karke phir aao.
        </div>
      )}

      {/* atmosphere overlays */}
      <div className="vignette" />
      <div className="scanlines" />
      <div className="noise" />

      {/* location banner */}
      {banner !== null && screen === "playing" && <NightBanner info={banner} />}

      {/* HUD */}
      {(screen === "playing" || screen === "paused") && (
        <>
          <HUD
            hud={hud}
            onPause={pauseGame}
            onMute={toggleMute}
            touchHint={touchHint && screen === "playing"}
          />
          <MiniMap
            engineRef={engineRef}
            night={hud.night}
            location={hud.location}
            active={screen === "playing"}
          />
        </>
      )}

      {/* screens */}
      {screen === "start" && <StartScreen scores={scores} onStart={startGame} />}
      {screen === "paused" && (
        <PauseScreen
          muted={hud.muted}
          onResume={resumeGame}
          onRestart={startGame}
          onMenu={quitToMenu}
          onToggleMute={toggleMute}
        />
      )}
      {screen === "over" && stats && (
        <GameOverScreen
          stats={stats}
          scores={scores}
          qualifies={qualifiesFlag}
          isNewBest={newBest}
          onSave={saveScore}
          onRestart={startGame}
          onMenu={quitToMenu}
        />
      )}

      {/* hidden input that wakes the mobile keyboard */}
      <input
        ref={inputRef}
        type="text"
        className="ghost-input"
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="none"
        spellCheck={false}
        aria-hidden="true"
        tabIndex={-1}
        onInput={onGameInput}
      />
    </div>
  );
}
