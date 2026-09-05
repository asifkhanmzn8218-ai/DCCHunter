import * as THREE from "three";
import {
  GhostKind,
  KINDS,
  pickKind,
  pickWord,
  nightQuota,
  spawnInterval,
  maxOnScreen,
  speedMul,
} from "./words";
import { AudioBus } from "./audio";
import { LEVELS, LevelInstance, LevelSpec, levelForNight } from "./levels";
import { dccEmblemTex, disposeObject, radialTex } from "./assets";
import {
  ZombieParts,
  animateZombie,
  buildZombie,
  disposeZombieCaches,
  zombieMaterials,
} from "./zombie";

export interface HudState {
  score: number;
  combo: number;
  mult: number;
  lives: number;
  night: number;
  kills: number;
  quota: number;
  killsNight: number;
  bestCombo: number;
  muted: boolean;
  ammo: number;
  magSize: number;
  reloading: boolean;
  location: string;
}

export interface RunStats {
  score: number;
  kills: number;
  night: number;
  bestCombo: number;
  accuracy: number;
  location: string;
}

export interface EngineCallbacks {
  onHud: (h: HudState) => void;
  onNight: (night: number, location: string, tagline: string) => void;
  onGameOver: (s: RunStats) => void;
  onDamageFx?: (type: "escape") => void;
}

type State = "idle" | "run" | "paused" | "transit" | "dying" | "over";

interface LabelSprite {
  sprite: THREE.Sprite;
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  texture: THREE.CanvasTexture;
}

interface GhostEnt {
  id: number;
  kind: GhostKind;
  word: string;
  typed: number;
  group: THREE.Group;
  parts: ZombieParts;
  mats: THREE.Material[];
  shadow: THREE.Sprite;
  label: LabelSprite;
  baseX: number;
  x: number;
  y: number;
  z: number;
  hover: number;
  vz: number;
  scale: number;
  seed: number;
  dead: boolean;
  freshT: number;
  flashT: number;
  attackT: number;
  trailT: number;
}

const LABEL_W = 256;
const LABEL_H = 64;
const MAG_SIZE = 14;
const RELOAD_TIME = 0.95;
const STEP = 2.3;

export class Engine {
  audio = new AudioBus();
  fontsLoaded = false;

  private canvas: HTMLCanvasElement;
  private cb: EngineCallbacks;
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera: THREE.PerspectiveCamera;
  private clock = new THREE.Clock();

  private state: State = "idle";
  private ghosts: GhostEnt[] = [];
  private dyingGhosts: { g: GhostEnt; t: number }[] = [];
  private streaks: {
    mesh: THREE.Mesh;
    from: THREE.Vector3;
    to: THREE.Vector3;
    t: number;
    active: boolean;
  }[] = [];
  private rings: { sprite: THREE.Sprite; t: number; active: boolean }[] = [];
  private ftexts: { sprite: THREE.Sprite; tex: THREE.CanvasTexture; t: number }[] = [];
  private bats: { sprite: THREE.Sprite; vx: number; seed: number }[] = [];
  private usedWords = new Set<string>();
  private gid = 0;
  private lockedId = 0;

  private score = 0;
  private combo = 0;
  private lives = 3;
  private night = 1;
  private kills = 0;
  private killsNight = 0;
  private bestCombo = 0;
  private hits = 0;
  private misses = 0;
  private spawnT = 0;
  private spawnQueue: number[] = [];
  private spawnPause = 0;

  // rail movement
  private advance = 0;
  private advanceTarget = 0;
  private walkPhase = 0;
  private stepFlag = false;

  // weapon
  private ammo = MAG_SIZE;
  private reloading = false;
  private reloadT = 0;
  private inputBuffer: string[] = [];

  private time = 0;
  private trauma = 0;
  private recoil = 0;
  private boltT = -1;
  private thunderAt = -1;
  private nextBolt = 9;
  private nextBat = 5;
  private heartAt = 0;
  private blinkPhase = false;
  private blinkT = 0;
  private dyingT = 0;
  private transitT = 0;
  private transitSwapped = false;
  private hudKey = "";

  // level
  private level!: LevelInstance;
  private spec!: LevelSpec;

  // rail front line (advances with the player, ghosts spawn ahead of it)
  private frontLine = 0;

  // shared geo/mats
  private fireTex!: THREE.CanvasTexture;
  private ringTex!: THREE.CanvasTexture;
  private softTex!: THREE.CanvasTexture;
  private batTex!: THREE.CanvasTexture;
  private glowMats = new Map<GhostKind, THREE.SpriteMaterial>();
  private shadowMat!: THREE.SpriteMaterial;
  private extrasMats = new Map<string, THREE.Material>();

  // scene bits
  private skyGroup = new THREE.Group();
  private ambient!: THREE.AmbientLight;
  private hemi!: THREE.HemisphereLight;
  private fill!: THREE.DirectionalLight;
  private torch!: THREE.SpotLight;
  private moon!: THREE.DirectionalLight;
  private travelLight!: THREE.PointLight;
  private flickerLight!: THREE.PointLight;
  private muzzleLight!: THREE.PointLight;
  private rifle!: THREE.Group;
  private rifleMag!: THREE.Mesh;
  private rifleBolt!: THREE.Mesh;
  private muzzle!: THREE.Object3D;
  private muzzleFlashSpr!: THREE.Sprite;
  private gunSwing = 0;
  private fadeMesh!: THREE.Mesh;
  private fadeMat!: THREE.MeshBasicMaterial;

  // particles
  private P = 460;
  private pGeo!: THREE.BufferGeometry;
  private pPos!: Float32Array;
  private pCol!: Float32Array;
  private pVel!: Float32Array;
  private pLife!: Float32Array;
  private pMax!: Float32Array;
  private pBase!: Float32Array;
  private pGrav!: Float32Array;
  private pHead = 0;

  private tmpV = new THREE.Vector3();
  private tmpV2 = new THREE.Vector3();

  constructor(canvas: HTMLCanvasElement, cb: EngineCallbacks) {
    this.canvas = canvas;
    this.cb = cb;
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      powerPreference: "high-performance",
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.8));
    this.renderer.setClearColor(0x04070f, 1);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.45;

    this.camera = new THREE.PerspectiveCamera(70, 1, 0.1, 240);
    this.camera.position.set(0, 1.6, 0);
    this.camera.rotation.order = "YXZ";
    this.scene.add(this.camera);
    this.scene.fog = new THREE.FogExp2(0x04070f, 0.03);

    this.buildShared();
    this.buildSky();
    this.buildLights();
    this.buildRifle();
    this.buildParticles();
    this.buildFx();
    this.loadLevel(1);

    this.resize();
    window.addEventListener("resize", this.resize);
    this.clock.start();
    this.renderer.setAnimationLoop(this.loop);
  }

  destroy() {
    this.renderer.setAnimationLoop(null);
    window.removeEventListener("resize", this.resize);
    disposeObject(this.scene);
    disposeZombieCaches();
    this.renderer.dispose();
  }

  /** live radar blips for the minimap: x = -1..1 across, y = 0..1 depth */
  getRadar(): { x: number; d: number; kind: GhostKind; locked: boolean }[] {
    const camZ = this.camera.position.z;
    const half = Math.max(4, this.spec?.spread ?? 8) * 0.75;
    const out: { x: number; d: number; kind: GhostKind; locked: boolean }[] = [];
    for (const g of this.ghosts) {
      if (g.dead) continue;
      const d = (camZ - g.z) / 26;
      if (d < -0.05 || d > 1.1) continue;
      out.push({
        x: THREE.MathUtils.clamp(g.x / half, -1, 1),
        d: THREE.MathUtils.clamp(d, 0, 1),
        kind: g.kind,
        locked: g.id === this.lockedId,
      });
    }
    return out;
  }

  /** 0..1 progress through the current location */
  getProgress() {
    return Math.min(1, this.killsNight / nightQuota(this.night));
  }

  /* ══════════ shared assets ══════════ */
  private buildShared() {
    this.fireTex = radialTex(128, [
      [0, "rgba(255,244,214,1)"],
      [0.35, "rgba(255,190,110,0.85)"],
      [1, "rgba(255,130,50,0)"],
    ]);
    this.softTex = radialTex(64, [
      [0, "rgba(255,255,255,0.9)"],
      [1, "rgba(255,255,255,0)"],
    ]);
    const rc = document.createElement("canvas");
    rc.width = rc.height = 128;
    const rg = rc.getContext("2d")!;
    rg.strokeStyle = "rgba(255,255,255,0.9)";
    rg.lineWidth = 7;
    rg.beginPath();
    rg.arc(64, 64, 52, 0, Math.PI * 2);
    rg.stroke();
    rg.strokeStyle = "rgba(255,255,255,0.3)";
    rg.lineWidth = 16;
    rg.beginPath();
    rg.arc(64, 64, 46, 0, Math.PI * 2);
    rg.stroke();
    this.ringTex = new THREE.CanvasTexture(rc);
    this.ringTex.colorSpace = THREE.SRGBColorSpace;

    const bc = document.createElement("canvas");
    bc.width = 64;
    bc.height = 32;
    const bg = bc.getContext("2d")!;
    bg.fillStyle = "rgba(5,7,12,1)";
    bg.beginPath();
    bg.moveTo(2, 22);
    bg.quadraticCurveTo(14, 2, 30, 16);
    bg.quadraticCurveTo(32, 20, 34, 16);
    bg.quadraticCurveTo(50, 2, 62, 22);
    bg.quadraticCurveTo(48, 14, 40, 22);
    bg.quadraticCurveTo(34, 28, 32, 26);
    bg.quadraticCurveTo(30, 28, 24, 22);
    bg.quadraticCurveTo(16, 14, 2, 22);
    bg.fill();
    this.batTex = new THREE.CanvasTexture(bc);

    for (const kind of Object.keys(KINDS) as GhostKind[]) {
      const spec = KINDS[kind];
      this.glowMats.set(
        kind,
        new THREE.SpriteMaterial({
          map: radialTex(128, [
            [0, `rgba(${spec.glow},0.85)`],
            [0.5, `rgba(${spec.glow},0.28)`],
            [1, `rgba(${spec.glow},0)`],
          ]),
          transparent: true,
          opacity: 0.6,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        })
      );
    }
    this.shadowMat = new THREE.SpriteMaterial({
      map: radialTex(64, [
        [0, "rgba(0,0,0,0.62)"],
        [1, "rgba(0,0,0,0)"],
      ]),
      transparent: true,
      depthWrite: false,
    });
    this.extrasMats.set("eyeBlack", new THREE.MeshBasicMaterial({ color: 0x05060a }));
    this.extrasMats.set("eyeRed", new THREE.MeshBasicMaterial({ color: 0xff2a2a, toneMapped: false }));
    this.extrasMats.set("horn", new THREE.MeshLambertMaterial({ color: 0xd8cf9f }));
    this.extrasMats.set("hair", new THREE.MeshLambertMaterial({ color: 0x0b1408 }));
  }

  private buildSky() {
    const starN = 400;
    const sp = new Float32Array(starN * 3);
    for (let i = 0; i < starN; i++) {
      const th = Math.random() * Math.PI * 2;
      const ph = Math.random() * Math.PI * 0.45;
      sp[i * 3] = Math.cos(th) * Math.cos(ph) * 160;
      sp[i * 3 + 1] = Math.sin(ph) * 160 + 6;
      sp[i * 3 + 2] = Math.sin(th) * Math.cos(ph) * 160;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(sp, 3));
    this.skyGroup.add(
      new THREE.Points(
        geo,
        new THREE.PointsMaterial({
          color: 0x93a5c8,
          size: 1.5,
          sizeAttenuation: false,
          fog: false,
          transparent: true,
          opacity: 0.85,
        })
      )
    );
    const moonSpr = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: radialTex(256, [
          [0, "rgba(244,230,176,1)"],
          [0.28, "rgba(238,222,160,0.9)"],
          [0.32, "rgba(238,222,160,0.22)"],
          [1, "rgba(238,222,160,0)"],
        ]),
        transparent: true,
        fog: false,
        depthWrite: false,
        toneMapped: false,
      })
    );
    moonSpr.scale.set(36, 36, 1);
    moonSpr.position.set(30, 34, -120);
    this.skyGroup.add(moonSpr);
    this.scene.add(this.skyGroup);
  }

  private buildLights() {
    this.ambient = new THREE.AmbientLight(0x5a6f9c, 1.5);
    this.scene.add(this.ambient);
    // sky/ground bounce so nothing is ever pitch black
    this.hemi = new THREE.HemisphereLight(0x8fa9dd, 0x2a2438, 1.15);
    this.scene.add(this.hemi);
    this.moon = new THREE.DirectionalLight(0xaec6f5, 1.4);
    this.moon.position.set(-16, 26, -12);
    this.scene.add(this.moon);
    // fill light from the front so ghosts' faces read clearly
    this.fill = new THREE.DirectionalLight(0xdfe8ff, 0.55);
    this.fill.position.set(2, 4, 6);
    this.camera.add(this.fill);
    // these ride along with the player
    this.travelLight = new THREE.PointLight(0xbcd6ff, 3.2, 34, 1.4);
    this.travelLight.position.set(0, 0.5, 0.5);
    this.camera.add(this.travelLight);
    // torch cone pointing where the player looks
    this.torch = new THREE.SpotLight(0xe8f2ff, 6.5, 42, 0.72, 0.55, 1.2);
    this.torch.position.set(0.1, 0.05, 0.2);
    this.torch.target.position.set(0, -0.15, -14);
    this.camera.add(this.torch);
    this.camera.add(this.torch.target);
    this.flickerLight = new THREE.PointLight(0xffc98a, 1.1, 22, 1.6);
    this.flickerLight.position.set(0.5, 1.6, -7);
    this.camera.add(this.flickerLight);
    this.muzzleLight = new THREE.PointLight(0xffc890, 0, 26, 1.7);
    this.scene.add(this.muzzleLight);
  }

  /* ══════════ rifle with reload animation ══════════ */
  private buildRifle() {
    const g = new THREE.Group();
    const steel = new THREE.MeshLambertMaterial({ color: 0x232c40 });
    const dark = new THREE.MeshLambertMaterial({ color: 0x151b28 });
    const wood = new THREE.MeshLambertMaterial({ color: 0x4a3018 });

    const body = new THREE.Mesh(new THREE.BoxGeometry(0.085, 0.1, 0.5), steel);
    body.position.z = -0.05;
    g.add(body);
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.52, 8), dark);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, 0.035, -0.52);
    g.add(barrel);
    const handguard = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.07, 0.26), wood);
    handguard.position.set(0, 0.02, -0.36);
    g.add(handguard);
    const stock = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.11, 0.28), wood);
    stock.position.set(0, -0.03, 0.31);
    g.add(stock);
    const grip = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.15, 0.08), dark);
    grip.position.set(0, -0.12, 0.12);
    grip.rotation.x = 0.36;
    g.add(grip);
    // sights
    const rear = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.035, 0.03), dark);
    rear.position.set(0, 0.085, -0.02);
    g.add(rear);
    const front = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.045, 0.02), dark);
    front.position.set(0, 0.09, -0.72);
    g.add(front);
    // charging bolt (animates on reload)
    this.rifleBolt = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.03, 0.09), new THREE.MeshLambertMaterial({ color: 0x8b97ad }));
    this.rifleBolt.position.set(0.055, 0.05, -0.02);
    g.add(this.rifleBolt);
    // magazine (drops out on reload)
    this.rifleMag = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.19, 0.1), dark);
    this.rifleMag.position.set(0, -0.13, -0.06);
    this.rifleMag.rotation.x = -0.14;
    g.add(this.rifleMag);
    // DCC emblem decal on the receiver
    const decal = new THREE.Mesh(
      new THREE.PlaneGeometry(0.075, 0.075),
      new THREE.MeshBasicMaterial({ map: dccEmblemTex("#4fd8ff"), transparent: true })
    );
    decal.position.set(0.045, 0.005, 0.06);
    decal.rotation.y = Math.PI / 2;
    g.add(decal);

    this.muzzle = new THREE.Object3D();
    this.muzzle.position.set(0, 0.035, -0.8);
    g.add(this.muzzle);

    this.muzzleFlashSpr = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: this.fireTex,
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        depthTest: false,
        toneMapped: false,
      })
    );
    this.muzzleFlashSpr.scale.set(0.34, 0.34, 1);
    this.muzzleFlashSpr.position.copy(this.muzzle.position);
    g.add(this.muzzleFlashSpr);

    g.position.set(0.2, -0.22, -0.42);
    g.rotation.y = -0.04;
    this.rifle = g;
    this.camera.add(g);

    // fade-to-black quad for level transitions
    this.fadeMat = new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0,
      depthTest: false,
      depthWrite: false,
      fog: false,
    });
    this.fadeMesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), this.fadeMat);
    this.fadeMesh.position.z = -0.12;
    this.fadeMesh.renderOrder = 999;
    this.fadeMesh.visible = false;
    this.camera.add(this.fadeMesh);
  }

  /* ══════════ particles + fx ══════════ */
  private buildParticles() {
    this.pGeo = new THREE.BufferGeometry();
    this.pPos = new Float32Array(this.P * 3);
    this.pCol = new Float32Array(this.P * 3);
    this.pVel = new Float32Array(this.P * 3);
    this.pLife = new Float32Array(this.P);
    this.pMax = new Float32Array(this.P);
    this.pBase = new Float32Array(this.P * 3);
    this.pGrav = new Float32Array(this.P);
    for (let i = 0; i < this.P; i++) this.pPos[i * 3 + 1] = -999;
    this.pGeo.setAttribute("position", new THREE.BufferAttribute(this.pPos, 3));
    this.pGeo.setAttribute("color", new THREE.BufferAttribute(this.pCol, 3));
    const pts = new THREE.Points(
      this.pGeo,
      new THREE.PointsMaterial({
        size: 0.32,
        map: this.softTex,
        vertexColors: true,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
    );
    pts.frustumCulled = false;
    this.scene.add(pts);
  }

  private burst(
    x: number, y: number, z: number,
    rgb: [number, number, number],
    n: number, speed: number, life: number, grav = 3.2
  ) {
    for (let i = 0; i < n; i++) {
      const idx = this.pHead;
      this.pHead = (this.pHead + 1) % this.P;
      const th = Math.random() * Math.PI * 2;
      const ph = Math.acos(Math.random() * 2 - 1);
      const v = speed * (0.4 + Math.random() * 0.7);
      this.pPos[idx * 3] = x;
      this.pPos[idx * 3 + 1] = y;
      this.pPos[idx * 3 + 2] = z;
      this.pVel[idx * 3] = Math.sin(ph) * Math.cos(th) * v;
      this.pVel[idx * 3 + 1] = Math.abs(Math.cos(ph)) * v * 0.7 + 0.4;
      this.pVel[idx * 3 + 2] = Math.sin(ph) * Math.sin(th) * v;
      this.pLife[idx] = this.pMax[idx] = life * (0.6 + Math.random() * 0.7);
      this.pBase[idx * 3] = rgb[0];
      this.pBase[idx * 3 + 1] = rgb[1];
      this.pBase[idx * 3 + 2] = rgb[2];
      this.pGrav[idx] = grav;
    }
  }

  private buildFx() {
    for (let i = 0; i < 10; i++) {
      const mat = new THREE.MeshBasicMaterial({
        color: 0xc6ffdc,
        transparent: true,
        opacity: 0.95,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        toneMapped: false,
      });
      const m = new THREE.Mesh(new THREE.BoxGeometry(0.016, 0.016, 1), mat);
      m.visible = false;
      this.scene.add(m);
      this.streaks.push({ mesh: m, from: new THREE.Vector3(), to: new THREE.Vector3(), t: 0, active: false });
    }
    for (let i = 0; i < 5; i++) {
      const s = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: this.ringTex,
          transparent: true,
          opacity: 0,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
          toneMapped: false,
        })
      );
      s.visible = false;
      s.renderOrder = 5;
      this.scene.add(s);
      this.rings.push({ sprite: s, t: 0, active: false });
    }
  }

  private fireStreak(from: THREE.Vector3, to: THREE.Vector3) {
    const s = this.streaks.find((x) => !x.active) ?? this.streaks[0];
    s.active = true;
    s.t = 0;
    s.from.copy(from);
    s.to.copy(to);
    s.mesh.visible = true;
  }

  private fireRing(x: number, y: number, z: number, color: string) {
    const r = this.rings.find((v) => !v.active) ?? this.rings[0];
    r.active = true;
    r.t = 0;
    r.sprite.visible = true;
    r.sprite.position.set(x, y, z);
    r.sprite.scale.set(0.3, 0.3, 1);
    (r.sprite.material as THREE.SpriteMaterial).color.set(color);
  }

  private ftext(text: string, color: string, x: number, y: number, z: number, big = false) {
    const c = document.createElement("canvas");
    c.width = 256;
    c.height = 64;
    const g = c.getContext("2d")!;
    g.font = `${big ? 44 : 34}px "Special Elite", monospace`;
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.shadowColor = color;
    g.shadowBlur = 14;
    g.fillStyle = color;
    g.fillText(text, 128, 32);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    const spr = new THREE.Sprite(
      new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, depthTest: false, toneMapped: false })
    );
    spr.renderOrder = 20;
    const w = big ? 2.4 : 1.8;
    spr.scale.set(w, w / 4, 1);
    spr.position.set(x, y, z);
    this.scene.add(spr);
    this.ftexts.push({ sprite: spr, tex, t: 0 });
  }

  /* ══════════ level loading ══════════ */
  private loadLevel(night: number) {
    if (this.level) {
      this.scene.remove(this.level.group);
      disposeObject(this.level.group);
    }
    const spec = levelForNight(night);
    this.spec = spec;
    const len = nightQuota(night) * STEP + 30;
    this.level = spec.build(len);
    this.scene.add(this.level.group);

    (this.scene.fog as THREE.FogExp2).color.setHex(spec.fogColor);
    (this.scene.fog as THREE.FogExp2).density = spec.fogDensity;
    this.renderer.setClearColor(spec.fogColor, 1);
    this.ambient.color.setHex(spec.ambientColor);
    this.ambient.intensity = spec.ambientIntensity;
    this.hemi.color.setHex(spec.outdoor ? 0x8fa9dd : spec.ambientColor);
    this.hemi.intensity = spec.outdoor ? 1.2 : 0.95;
    this.moon.intensity = spec.moonIntensity;
    this.travelLight.color.setHex(spec.travelColor);
    this.travelLight.intensity = spec.travelIntensity;
    this.travelLight.distance = spec.travelDistance;
    this.torch.color.setHex(spec.outdoor ? 0xe8f2ff : spec.travelColor);
    this.torch.intensity = spec.outdoor ? 5.5 : 7;
    this.torch.distance = spec.travelDistance + 14;
    this.fill.color.setHex(spec.travelColor);
    this.flickerLight.color.setHex(spec.travelColor);
    this.skyGroup.visible = spec.outdoor;
  }

  /* ══════════ ghosts ══════════ */
  private makeLabel(): LabelSprite {
    const canvas = document.createElement("canvas");
    canvas.width = LABEL_W;
    canvas.height = LABEL_H;
    const ctx = canvas.getContext("2d")!;
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    const sprite = new THREE.Sprite(
      new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false, depthTest: false, toneMapped: false })
    );
    sprite.renderOrder = 15;
    return { sprite, canvas, ctx, texture };
  }

  private drawLabel(l: LabelSprite, word: string, typed: number, locked: boolean, kind: GhostKind) {
    const { ctx } = l;
    ctx.clearRect(0, 0, LABEL_W, LABEL_H);
    const spec = KINDS[kind];
    ctx.fillStyle = "rgba(4,7,12,0.8)";
    ctx.fillRect(4, 3, LABEL_W - 8, 42);
    ctx.strokeStyle = locked ? "rgba(255,74,84,0.95)" : `rgba(${spec.glow},0.5)`;
    ctx.lineWidth = 2;
    ctx.strokeRect(4, 3, LABEL_W - 8, 42);
    ctx.font = '32px "Special Elite", ui-monospace, monospace';
    ctx.textBaseline = "middle";
    ctx.textAlign = "left";
    const cw = ctx.measureText("M").width;
    const startX = (LABEL_W - cw * word.length) / 2;
    for (let i = 0; i < word.length; i++) {
      ctx.fillStyle = i < typed ? "#87ffa6" : "#ece8d6";
      ctx.fillText(word[i], startX + cw * i, 24);
    }
    if (locked && typed < word.length && this.blinkPhase) {
      ctx.fillStyle = "rgba(255,84,94,0.95)";
      ctx.fillRect(startX + cw * typed, 37, cw - 2, 3);
    }
    if (kind !== "bhoot") {
      ctx.font = '13px "Special Elite", ui-monospace, monospace';
      ctx.textAlign = "center";
      ctx.fillStyle = `rgba(${spec.glow},0.85)`;
      ctx.fillText(spec.label, LABEL_W / 2, 54);
    }
    l.texture.needsUpdate = true;
  }

  private spawn() {
    const k = pickKind(this.night);
    const word = pickWord(k, this.night, this.usedWords);
    this.usedWords.add(word);
    const spec = KINDS[k];
    const scale = spec.size * (0.92 + Math.random() * 0.18);

    const parts = buildZombie(k, this.glowMats.get(k)!.map!);
    const group = parts.group;
    const mats = zombieMaterials(parts);

    // contact shadow on the floor
    const shadow = new THREE.Sprite(this.shadowMat.clone());
    shadow.scale.set(1.5, 0.7, 1);
    shadow.position.y = -0.9;
    shadow.material.opacity = 0;
    group.add(shadow);

    const label = this.makeLabel();
    label.sprite.position.y = 1.25;
    group.add(label.sprite);

    // stand the zombie ON the floor (feet ≈ -0.9 in local space)
    const hover = 0.94 * scale;
    group.scale.setScalar(scale);
    const bx = (Math.random() - 0.5) * this.spec.spread;
    // spawn at a FIXED world position ahead of the current front line
    const z = this.frontLine - 15 - Math.random() * 10;
    group.position.set(bx, hover, z);
    this.scene.add(group);

    const g: GhostEnt = {
      id: ++this.gid,
      kind: k,
      word,
      typed: 0,
      group,
      parts,
      mats,
      shadow,
      label,
      baseX: bx,
      x: bx,
      y: hover,
      z,
      hover,
      vz: (spec.vy / 26) * 1.06 * (0.85 + Math.random() * 0.3) * speedMul(this.night),
      scale,
      seed: Math.random() * 90,
      dead: false,
      freshT: 0,
      flashT: 0,
      attackT: -1,
      trailT: Math.random() * 0.2,
    };
    this.drawLabel(label, word, 0, false, k);
    this.ghosts.push(g);
  }

  /** fade every material of a zombie together */
  private setGhostOpacity(g: GhostEnt, k: number) {
    const v = THREE.MathUtils.clamp(k, 0, 1);
    for (const m of g.mats) {
      m.transparent = true;
      m.opacity = v * (m === g.parts.auraMat ? 0.55 : 1);
    }
    for (const em of g.parts.eyeMats) em.opacity = v;
    g.shadow.material.opacity = v * 0.75;
    g.label.sprite.material.opacity = v;
  }

  private removeGhost(g: GhostEnt) {
    this.scene.remove(g.group);
    for (const m of g.mats) m.dispose();
    g.shadow.material.dispose();
    g.label.texture.dispose();
    g.label.sprite.material.dispose();
  }

  private clearGhosts() {
    for (const g of this.ghosts) this.removeGhost(g);
    this.ghosts = [];
    for (const d of this.dyingGhosts) this.removeGhost(d.g);
    this.dyingGhosts = [];
    this.usedWords.clear();
    this.lockedId = 0;
  }

  /* ══════════ public api ══════════ */
  startRun() {
    this.clearGhosts();
    for (const f of this.ftexts) {
      this.scene.remove(f.sprite);
      f.tex.dispose();
    }
    this.ftexts = [];
    this.score = 0;
    this.combo = 0;
    this.lives = 3;
    this.night = 1;
    this.kills = 0;
    this.killsNight = 0;
    this.bestCombo = 0;
    this.hits = 0;
    this.misses = 0;
    this.trauma = 0;
    this.advance = 0;
    this.advanceTarget = 0;
    this.frontLine = 0;
    this.camera.position.z = 0;
    this.ammo = MAG_SIZE;
    this.reloading = false;
    this.inputBuffer = [];
    this.spawnPause = 0;
    this.spawnT = 1.4;
    this.spawnQueue = [0.12, 0.75];
    this.fadeMat.opacity = 0;
    this.fadeMesh.visible = false;
    this.loadLevel(1);
    this.state = "run";
    this.audio.nightBell();
    this.emitHud(true);
    this.cb.onNight(1, this.spec.name, this.spec.tagline);
  }

  stopToIdle() {
    this.clearGhosts();
    this.trauma = 0;
    this.state = "idle";
  }

  setPaused(p: boolean) {
    if (p && (this.state === "run" || this.state === "transit")) this.state = "paused";
    else if (!p && this.state === "paused") this.state = "run";
  }

  get paused() {
    return this.state === "paused";
  }

  typeChar(ch: string) {
    if (this.state !== "run") return;
    const L = ch.toUpperCase();
    if (L.length !== 1 || L < "A" || L > "Z") return;
    if (this.reloading) {
      if (this.inputBuffer.length < 8) this.inputBuffer.push(L);
      return;
    }
    this.resolveChar(L);
  }

  private resolveChar(L: string) {
    const locked = this.locked();
    if (locked && locked.word[locked.typed] === L) {
      this.hit(locked);
      return;
    }
    let best: GhostEnt | null = null;
    for (const gh of this.ghosts) {
      if (gh.dead || gh.attackT >= 0 || gh.word[gh.typed] !== L) continue;
      if (!best || gh.typed > best.typed || (gh.typed === best.typed && gh.z > best.z)) best = gh;
    }
    if (best) {
      this.lockedId = best.id;
      this.hit(best);
    } else {
      this.misfire();
    }
  }

  private locked(): GhostEnt | undefined {
    if (this.lockedId === 0) return undefined;
    return this.ghosts.find((g) => g.id === this.lockedId && !g.dead && g.attackT < 0);
  }

  private startReload() {
    this.reloading = true;
    this.reloadT = 0;
    this.audio.reload();
    this.emitHud();
  }

  private hit(g: GhostEnt) {
    this.hits++;
    g.typed++;
    g.flashT = 1;
    this.score += 2;
    this.recoil = 1;
    this.trauma = Math.min(1, this.trauma + 0.055);
    this.ammo = Math.max(0, this.ammo - 1);
    this.audio.shoot();

    this.muzzle.getWorldPosition(this.tmpV);
    const aim = this.tmpV2.set(g.x, g.y + 1.32 * g.scale, g.z);
    this.fireStreak(this.tmpV, aim);
    this.burst(aim.x, aim.y, aim.z, [0.55, 1, 0.68], 5, 2.6, 0.35, 1.5);
    this.muzzleLight.position.copy(this.tmpV);
    this.muzzleLight.intensity = 5;
    this.muzzleFlashSpr.material.opacity = 1;
    // eject a brass casing
    this.burst(this.tmpV.x, this.tmpV.y, this.tmpV.z, [1, 0.75, 0.3], 1, 1.6, 0.5, 6);
    this.drawLabel(g.label, g.word, g.typed, true, g.kind);

    if (g.typed >= g.word.length) this.kill(g);
    else if (this.ammo <= 0) this.startReload();
    this.emitHud();
  }

  private misfire() {
    this.misses++;
    if (this.combo >= 4) this.ftext("GUN JAM!", "#ff5c66", 0.6, 1.5, this.camera.position.z - 3.4);
    this.combo = 0;
    this.audio.jam();
    this.trauma = Math.min(1, this.trauma + 0.1);
    this.emitHud();
  }

  private rgbOf(k: GhostKind): [number, number, number] {
    const p = KINDS[k].glow.split(",").map((s) => parseFloat(s) / 255);
    return [p[0], p[1], p[2]];
  }

  private kill(g: GhostEnt) {
    g.dead = true;
    this.usedWords.delete(g.word);
    if (this.lockedId === g.id) this.lockedId = 0;
    const spec = KINDS[g.kind];
    const gained = (g.word.length * 10 + spec.bonus) * this.mult();
    this.score += gained;
    this.combo++;
    this.bestCombo = Math.max(this.bestCombo, this.combo);
    this.kills++;
    this.killsNight++;

    const big = g.kind === "pishach";
    this.trauma = Math.min(1, this.trauma + (big ? 0.42 : 0.24));
    this.audio.kill(big);

    const rgb = this.rgbOf(g.kind);
    this.burst(g.x, g.y + 0.2, g.z, rgb, big ? 30 : 18, big ? 5.4 : 4, 0.6);
    this.burst(g.x, g.y + 0.2, g.z, [1, 1, 1], 8, 2.4, 0.4);
    this.fireRing(g.x, g.y + 0.2, g.z, spec.body);
    this.muzzleLight.position.set(g.x, g.y + 0.4, g.z + 1);
    this.muzzleLight.intensity = 6;
    this.ftext(`+${gained}`, g.kind === "aatma" ? "#ffd76b" : "#8dffa0", g.x, g.y + 1.7 * g.scale, g.z, big);

    if (g.kind === "aatma") {
      if (this.lives < 3) {
        this.lives++;
        this.audio.lifeUp();
        this.ftext("+1 LIFE", "#ffe9a8", g.x, g.y + 2.2 * g.scale, g.z);
      } else {
        this.score += 250;
        this.ftext("+250", "#ffe9a8", g.x, g.y + 2.2 * g.scale, g.z);
      }
    }

    this.dyingGhosts.push({ g, t: 0 });
    this.ghosts = this.ghosts.filter((x) => x !== g);

    // ── ADVANCE: har kill ke baad player aage badhta hai ──
    if (this.killsNight >= nightQuota(this.night)) {
      this.beginTransit();
    } else {
      this.advanceTarget += STEP;
      // push the spawn line forward too, but the ghosts already in the
      // world stay exactly where they are — so you really gain ground
      this.frontLine = -this.advanceTarget;
      // top up the magazine on a clean kill
      if (!this.reloading && this.ammo < MAG_SIZE * 0.4) this.startReload();
    }
    this.emitHud();
  }

  private beginTransit() {
    this.state = "transit";
    this.transitT = 0;
    this.transitSwapped = false;
    this.advanceTarget += 9;
    this.audio.doorSlam();
    this.fadeMesh.visible = true;
  }

  private escape(g: GhostEnt) {
    g.dead = true;
    this.usedWords.delete(g.word);
    if (this.lockedId === g.id) this.lockedId = 0;
    this.combo = 0;
    this.lives--;
    this.trauma = 1;
    this.audio.escaped();
    this.cb.onDamageFx?.("escape");
    this.burst(g.x, 1.5, this.camera.position.z - 1.4, [1, 0.3, 0.3], 24, 5, 0.6);
    this.removeGhost(g);
    this.ghosts = this.ghosts.filter((x) => x !== g);
    if (this.lives <= 0) {
      this.state = "dying";
      this.dyingT = 0;
      this.audio.gameOver();
    }
    this.emitHud();
  }

  private mult() {
    return 1 + Math.min(4, Math.floor(this.combo / 4));
  }

  private emitHud(force = false) {
    const quota = nightQuota(this.night);
    const key = [
      this.score, this.combo, this.lives, this.night, this.kills, this.killsNight,
      quota, this.bestCombo, this.audio.muted, this.ammo, this.reloading, this.spec?.name,
    ].join("|");
    if (!force && key === this.hudKey) return;
    this.hudKey = key;
    this.cb.onHud({
      score: this.score,
      combo: this.combo,
      mult: this.mult(),
      lives: this.lives,
      night: this.night,
      kills: this.kills,
      quota,
      killsNight: this.killsNight,
      bestCombo: this.bestCombo,
      muted: this.audio.muted,
      ammo: this.ammo,
      magSize: MAG_SIZE,
      reloading: this.reloading,
      location: this.spec?.name ?? "",
    });
  }

  emitMute() {
    this.hudKey = "";
    this.emitHud(true);
  }

  /* ══════════ loop ══════════ */
  private resize = () => {
    const w = this.canvas.clientWidth || window.innerWidth;
    const h = this.canvas.clientHeight || window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h, false);
    const d = 0.12;
    const fh = 2 * Math.tan((this.camera.fov * Math.PI) / 360) * d * 1.2;
    this.fadeMesh.scale.set(fh * this.camera.aspect, fh, 1);
  };

  private loop = () => {
    const dt = Math.min(this.clock.getDelta(), 0.05);
    if (this.state !== "paused") this.update(dt);
    this.renderer.render(this.scene, this.camera);
  };

  private update(dt: number) {
    this.time += dt;
    this.level.update(this.time, dt);

    if (this.fontsLoaded) {
      this.fontsLoaded = false;
      for (const g of this.ghosts)
        this.drawLabel(g.label, g.word, g.typed, g.id === this.lockedId, g.kind);
    }
    this.blinkT += dt;
    if (this.blinkT > 0.42) {
      this.blinkT = 0;
      this.blinkPhase = !this.blinkPhase;
      const lg = this.locked();
      if (lg) this.drawLabel(lg.label, lg.word, lg.typed, true, lg.kind);
    }

    this.trauma = Math.max(0, this.trauma - dt * 1.6);
    this.recoil = Math.max(0, this.recoil - dt * 8);
    this.muzzleLight.intensity = Math.max(0, this.muzzleLight.intensity - dt * 26);
    this.muzzleFlashSpr.material.opacity = Math.max(0, this.muzzleFlashSpr.material.opacity - dt * 12);

    /* ---- rail advance (walking) ---- */
    const prevZ = this.camera.position.z;
    this.advance += (this.advanceTarget - this.advance) * Math.min(1, dt * 3.2);
    const moving = Math.abs(this.advanceTarget - this.advance) > 0.05;
    if (moving) {
      this.walkPhase += dt * 7.5;
      const s = Math.sin(this.walkPhase);
      if (s > 0.9 && !this.stepFlag) {
        this.stepFlag = true;
        this.audio.step(this.walkPhase % (Math.PI * 4) < Math.PI * 2);
      } else if (s < 0) this.stepFlag = false;
    }
    const bob = moving ? Math.sin(this.walkPhase) * 0.035 : 0;
    const sway = moving ? Math.cos(this.walkPhase * 0.5) * 0.02 : 0;

    /* ---- camera shake + bob ---- */
    const t2 = this.trauma * this.trauma;
    this.camera.position.set(
      sway + (Math.random() - 0.5) * 2 * t2 * 0.12,
      1.6 + bob + Math.sin(this.time * 1.15) * 0.012 + (Math.random() - 0.5) * 2 * t2 * 0.1,
      -this.advance
    );
    this.camera.rotation.x = -0.015 + Math.sin(this.time * 0.9) * 0.004 + this.recoil * 0.02;
    this.camera.rotation.z = (Math.random() - 0.5) * t2 * 0.02 + sway * 0.3;
    void prevZ;

    /* ---- rifle: sway, recoil, reload animation ---- */
    const lg = this.locked();
    const swingTarget = lg
      ? THREE.MathUtils.clamp(Math.atan2(lg.x - this.camera.position.x, this.camera.position.z - lg.z) * 0.55, -0.14, 0.14)
      : 0;
    this.gunSwing += (swingTarget - this.gunSwing) * Math.min(1, dt * 9);

    let rx = this.recoil * 0.16;
    let ry = -this.gunSwing;
    let rz = 0;
    let px = 0.2;
    let py = -0.22 - bob * 0.35;
    let pz = -0.42 + this.recoil * 0.06;
    let magY = -0.13;
    let magVisible = true;
    let boltZ = -0.02;

    if (this.reloading) {
      this.reloadT += dt;
      const p = this.reloadT / RELOAD_TIME;
      // tilt the rifle in toward the player
      const tilt = Math.sin(Math.min(1, p * 1.6) * Math.PI) ;
      rx += tilt * 0.55;
      rz += tilt * 0.42;
      px += tilt * 0.045;
      py -= tilt * 0.055;
      if (p < 0.3) {
        // mag drops out
        const k = p / 0.3;
        magY = -0.13 - k * 0.34;
        magVisible = k < 0.92;
      } else if (p < 0.62) {
        // fresh mag slides in
        const k = (p - 0.3) / 0.32;
        magY = -0.13 - (1 - k) * 0.34;
      } else if (p < 0.85) {
        // charging handle pulled & released
        const k = (p - 0.62) / 0.23;
        boltZ = -0.02 + Math.sin(k * Math.PI) * 0.085;
      }
      if (this.reloadT >= RELOAD_TIME) {
        this.reloading = false;
        this.ammo = MAG_SIZE;
        this.audio.reloadDone();
        const buf = this.inputBuffer;
        this.inputBuffer = [];
        for (const ch of buf) {
          if (this.ammo <= 0) break;
          this.resolveChar(ch);
        }
        this.emitHud();
      }
    }
    this.rifle.rotation.set(rx, ry - 0.04, rz);
    this.rifle.position.set(px, py, pz);
    this.rifleMag.position.y = magY;
    this.rifleMag.visible = magVisible;
    this.rifleBolt.position.z = boltZ;

    /* ---- lightning ---- */
    this.nextBolt -= dt;
    if (this.nextBolt <= 0) {
      this.nextBolt = 8 + Math.random() * 14;
      this.boltT = 0;
      this.thunderAt = this.time + 0.5 + Math.random() * 1.2;
    }
    if (this.boltT >= 0) {
      this.boltT += dt;
      const b = this.boltT;
      let inten = 0;
      if (b < 0.08) inten = b / 0.08;
      else if (b < 0.16) inten = 1 - (b - 0.08) / 0.08;
      else if (b < 0.22) inten = 0.9;
      else if (b < 0.5) inten = 0.9 * (1 - (b - 0.22) / 0.28);
      else this.boltT = -1;
      const boost = this.spec.outdoor ? 2.6 : 0.9;
      this.ambient.intensity = this.spec.ambientIntensity + inten * boost;
      this.moon.intensity = this.spec.moonIntensity + inten * 1.8;
    }
    if (this.thunderAt > 0 && this.time >= this.thunderAt) {
      this.thunderAt = -1;
      this.audio.thunder();
    }

    /* ---- flicker light ---- */
    const fl = Math.sin(this.time * 29) * Math.sin(this.time * 7.1);
    this.flickerLight.intensity = (this.spec.outdoor ? 0.5 : 1.15) * (Math.random() < 0.025 ? 0.1 : 0.7 + 0.3 * Math.abs(fl));

    /* ---- bats (outdoor only) ---- */
    if (this.spec.outdoor) {
      this.nextBat -= dt;
      if (this.nextBat <= 0 && this.bats.length < 3) {
        this.nextBat = 6 + Math.random() * 9;
        const dir = Math.random() < 0.5 ? 1 : -1;
        const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.batTex, transparent: true, fog: false }));
        s.scale.set(1.4, 0.7, 1);
        s.position.set(dir > 0 ? -22 : 22, 8 + Math.random() * 8, this.camera.position.z - 24 - Math.random() * 20);
        this.scene.add(s);
        this.bats.push({ sprite: s, vx: dir * (6 + Math.random() * 4), seed: Math.random() * 9 });
      }
    }
    for (const b of this.bats) {
      b.sprite.position.x += b.vx * dt;
      b.sprite.position.y += Math.sin(this.time * 6 + b.seed) * 0.6 * dt;
      b.sprite.material.rotation = Math.sin(this.time * 9 + b.seed) * 0.22;
    }
    this.bats = this.bats.filter((b) => {
      if (Math.abs(b.sprite.position.x) > 26) {
        this.scene.remove(b.sprite);
        b.sprite.material.dispose();
        return false;
      }
      return true;
    });

    /* ---- streaks / rings / texts ---- */
    for (const s of this.streaks) {
      if (!s.active) continue;
      s.t += dt / 0.085;
      if (s.t >= 1) {
        s.active = false;
        s.mesh.visible = false;
        continue;
      }
      const prog = Math.min(1, s.t * 1.4);
      const tail = Math.max(0, prog - 0.34);
      this.tmpV.lerpVectors(s.from, s.to, tail);
      this.tmpV2.lerpVectors(s.from, s.to, prog);
      const len = this.tmpV.distanceTo(this.tmpV2);
      s.mesh.position.copy(this.tmpV).lerp(this.tmpV2, 0.5);
      s.mesh.scale.set(1, 1, Math.max(0.01, len));
      s.mesh.lookAt(this.tmpV2);
      (s.mesh.material as THREE.MeshBasicMaterial).opacity = 0.95 * (1 - s.t);
    }
    for (const r of this.rings) {
      if (!r.active) continue;
      r.t += dt / 0.45;
      if (r.t >= 1) {
        r.active = false;
        r.sprite.visible = false;
        continue;
      }
      const sc = 0.3 + r.t * 3.2;
      r.sprite.scale.set(sc, sc, 1);
      r.sprite.material.opacity = 0.85 * (1 - r.t);
    }
    this.ftexts = this.ftexts.filter((f) => {
      f.t += dt / 1.15;
      if (f.t >= 1) {
        this.scene.remove(f.sprite);
        f.tex.dispose();
        f.sprite.material.dispose();
        return false;
      }
      f.sprite.position.y += dt * 0.85;
      f.sprite.material.opacity = 1 - f.t * f.t;
      return true;
    });

    /* ---- particles ---- */
    for (let i = 0; i < this.P; i++) {
      if (this.pLife[i] <= 0) continue;
      this.pLife[i] -= dt;
      if (this.pLife[i] <= 0) {
        this.pPos[i * 3 + 1] = -999;
        continue;
      }
      this.pVel[i * 3 + 1] -= this.pGrav[i] * dt;
      this.pPos[i * 3] += this.pVel[i * 3] * dt;
      this.pPos[i * 3 + 1] += this.pVel[i * 3 + 1] * dt;
      this.pPos[i * 3 + 2] += this.pVel[i * 3 + 2] * dt;
      const k = this.pLife[i] / this.pMax[i];
      this.pCol[i * 3] = this.pBase[i * 3] * k;
      this.pCol[i * 3 + 1] = this.pBase[i * 3 + 1] * k;
      this.pCol[i * 3 + 2] = this.pBase[i * 3 + 2] * k;
    }
    this.pGeo.attributes.position.needsUpdate = true;
    this.pGeo.attributes.color.needsUpdate = true;

    /* ---- level transition ---- */
    if (this.state === "transit") {
      this.transitT += dt;
      const p = this.transitT;
      if (p < 0.8) {
        this.fadeMat.opacity = Math.min(1, p / 0.8);
      } else if (!this.transitSwapped) {
        // swap the whole world behind the black screen
        this.transitSwapped = true;
        this.clearGhosts();
        this.night++;
        this.killsNight = 0;
        this.advance = 0;
        this.advanceTarget = 0;
        this.frontLine = 0;
        this.walkPhase = 0;
        this.camera.position.z = 0;
        this.ammo = MAG_SIZE;
        this.reloading = false;
        this.inputBuffer = [];
        this.loadLevel(this.night);
        this.audio.nightBell();
        this.cb.onNight(this.night, this.spec.name, this.spec.tagline);
        this.emitHud(true);
      } else if (p < 1.75) {
        this.fadeMat.opacity = Math.max(0, 1 - (p - 0.95) / 0.8);
      } else {
        this.fadeMat.opacity = 0;
        this.fadeMesh.visible = false;
        this.spawnPause = 0.35;
        this.spawnT = 0.3;
        this.spawnQueue = [0.1];
        this.state = "run";
        this.emitHud(true);
      }
    }

    if (this.state === "idle" || this.state === "over") return;

    const dying = this.state === "dying";
    if (dying) this.dyingT += dt;
    const running = this.state === "run";

    /* ---- spawning ---- */
    if (running) {
      if (this.spawnQueue.length) {
        this.spawnQueue[0] -= dt;
        if (this.spawnQueue[0] <= 0) {
          this.spawnQueue.shift();
          this.spawn();
        }
      }
      if (this.spawnPause > 0) this.spawnPause -= dt;
      else {
        this.spawnT -= dt;
        const alive = this.ghosts.filter((g) => !g.dead).length;
        if (this.spawnT <= 0 && alive < maxOnScreen(this.night)) {
          this.spawn();
          this.spawnT = spawnInterval(this.night) * (0.7 + Math.random() * 0.6);
        }
      }
    }

    /* ---- ghosts ---- */
    const camZ = this.camera.position.z;
    for (const g of this.ghosts) {
      if (g.dead) continue;
      if (g.attackT >= 0) {
        g.attackT += dt;
        const k = g.attackT / 0.5;
        g.x += (this.camera.position.x - g.x) * Math.min(1, dt * 6);
        g.y += (1.15 - g.y) * Math.min(1, dt * 6);
        g.z += (camZ + 0.7 - g.z) * Math.min(1, dt * 8);
        g.group.scale.setScalar(g.scale * (1 + k * 0.8));
        this.trauma = Math.min(1, this.trauma + dt * 1.4);
        if (g.attackT > 0.5) this.escape(g);
      } else if (g.freshT < 1) {
        g.freshT = Math.min(1, g.freshT + dt / 1.1);
        const e = 1 - Math.pow(1 - g.freshT, 3);
        g.y = g.hover - 1.5 + e * 1.5;
        this.setGhostOpacity(g, e);
      } else {
        g.z += g.vz * dt * (dying ? 2.6 : 1);
        g.y = g.hover + Math.abs(Math.sin(this.time * 3.1 + g.seed)) * 0.035;
        if (dying && g.z > camZ + 1) {
          this.removeGhost(g);
          g.dead = true;
          continue;
        }
        if (running && g.z > camZ - 2.5) g.attackT = 0;
      }

      g.x = g.baseX + Math.sin(this.time * 0.65 + g.seed) * 0.55;
      g.group.position.set(g.x, g.y, g.z);
      g.group.rotation.y = Math.atan2(this.camera.position.x - g.x, camZ - g.z);

      // shambling zombie animation — faster as they close in
      const near = THREE.MathUtils.clamp(1 - (camZ - g.z) / 16, 0, 1);
      animateZombie(g.parts, this.time, g.seed, g.attackT >= 0 ? 1 : near);

      if (g.flashT > 0) {
        g.flashT = Math.max(0, g.flashT - dt * 6);
        const boost = 0.5 + g.flashT * 3;
        g.parts.skinMat.emissiveIntensity = boost;
        g.parts.clothMat.emissiveIntensity = boost * 0.5;
      }
      const kk = THREE.MathUtils.clamp((camZ - g.z) / 13, 1, 2.1);
      g.label.sprite.scale.set(2.1 * kk, 0.52 * kk, 1);

      g.trailT += dt;
      if (g.trailT > 0.22 && g.freshT >= 1) {
        g.trailT = 0;
        const rgb = this.rgbOf(g.kind);
        this.burst(
          g.x + (Math.random() - 0.5) * 0.5, g.y - 0.7 * g.scale, g.z,
          [rgb[0] * 0.4, rgb[1] * 0.4, rgb[2] * 0.4], 1, 0.45, 0.7, -0.4
        );
      }
    }
    this.ghosts = this.ghosts.filter((g) => !g.dead);

    this.dyingGhosts = this.dyingGhosts.filter((d) => {
      d.t += dt / 0.34;
      if (d.t >= 1) {
        this.removeGhost(d.g);
        return false;
      }
      this.setGhostOpacity(d.g, 1 - d.t);
      d.g.group.scale.setScalar(d.g.scale * (1 + d.t * 0.55));
      d.g.group.position.y += dt * 1.1;
      d.g.group.rotation.z += dt * 1.4;
      return true;
    });

    if (this.lives === 1 && running) {
      this.heartAt -= dt;
      if (this.heartAt <= 0) {
        this.heartAt = 1.9;
        this.audio.heartbeat();
      }
    }

    if (dying && this.dyingT > 1.35) {
      this.state = "over";
      const acc = this.hits + this.misses > 0
        ? Math.round((this.hits / (this.hits + this.misses)) * 100)
        : 100;
      this.cb.onGameOver({
        score: this.score,
        kills: this.kills,
        night: this.night,
        bestCombo: this.bestCombo,
        accuracy: acc,
        location: this.spec.name,
      });
    }
  }
}

export { LEVELS };
