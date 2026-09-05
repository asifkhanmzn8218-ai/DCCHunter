import * as THREE from "three";
import { GhostKind, KINDS } from "./words";
import { makeCanvas, texFrom } from "./assets";

export interface ZombieParts {
  group: THREE.Group;
  torso: THREE.Group;
  head: THREE.Group;
  jaw: THREE.Mesh;
  armL: THREE.Group;
  armR: THREE.Group;
  legL: THREE.Group;
  legR: THREE.Group;
  hair?: THREE.Group;
  eyeMats: THREE.MeshBasicMaterial[];
  skinMat: THREE.MeshStandardMaterial;
  clothMat: THREE.MeshStandardMaterial;
  auraMat: THREE.SpriteMaterial;
  height: number;
}

/* ---------- textures (created once, shared) ---------- */

let skinTexCache: Record<string, THREE.Texture> = {};
let clothTexCache: Record<string, THREE.Texture> = {};

/** rotting, blotchy zombie skin */
function skinTex(base: string, blotch: string, wound: string) {
  const key = base + blotch;
  if (skinTexCache[key]) return skinTexCache[key];
  const { c, g } = makeCanvas(256, 256);
  g.fillStyle = base;
  g.fillRect(0, 0, 256, 256);
  // mottled decay
  for (let i = 0; i < 260; i++) {
    g.globalAlpha = 0.05 + Math.random() * 0.22;
    g.fillStyle = Math.random() < 0.6 ? blotch : "#1b2416";
    const r = 4 + Math.random() * 26;
    g.beginPath();
    g.ellipse(Math.random() * 256, Math.random() * 256, r, r * (0.4 + Math.random()), Math.random() * 3, 0, Math.PI * 2);
    g.fill();
  }
  // veins
  g.globalAlpha = 0.3;
  g.strokeStyle = "#2b1330";
  g.lineWidth = 1.6;
  for (let i = 0; i < 26; i++) {
    g.beginPath();
    let x = Math.random() * 256;
    let y = Math.random() * 256;
    g.moveTo(x, y);
    for (let k = 0; k < 4; k++) {
      x += (Math.random() - 0.5) * 44;
      y += (Math.random() - 0.5) * 44;
      g.lineTo(x, y);
    }
    g.stroke();
  }
  // open wounds
  g.globalAlpha = 0.75;
  for (let i = 0; i < 9; i++) {
    const x = Math.random() * 256;
    const y = Math.random() * 256;
    const r = 5 + Math.random() * 13;
    g.fillStyle = wound;
    g.beginPath();
    g.ellipse(x, y, r, r * 0.62, Math.random() * 3, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = "#2b0708";
    g.beginPath();
    g.ellipse(x, y, r * 0.5, r * 0.3, Math.random() * 3, 0, Math.PI * 2);
    g.fill();
  }
  // grime streaks
  g.globalAlpha = 0.18;
  g.fillStyle = "#0d1208";
  for (let i = 0; i < 40; i++)
    g.fillRect(Math.random() * 256, Math.random() * 256, 2 + Math.random() * 4, 12 + Math.random() * 40);
  g.globalAlpha = 1;
  const t = texFrom(c, [1, 1]);
  skinTexCache[key] = t;
  return t;
}

/** torn, bloodstained school uniform */
function uniformTex(base: string, stripe: string, blood = true) {
  const key = base + stripe + blood;
  if (clothTexCache[key]) return clothTexCache[key];
  const { c, g } = makeCanvas(256, 256);
  g.fillStyle = base;
  g.fillRect(0, 0, 256, 256);
  // weave
  for (let i = 0; i < 256; i += 4) {
    g.fillStyle = "rgba(0,0,0,0.07)";
    g.fillRect(i, 0, 1, 256);
    g.fillRect(0, i, 256, 1);
  }
  // collar / tie stripe
  g.fillStyle = stripe;
  g.fillRect(112, 0, 30, 120);
  g.fillStyle = "rgba(0,0,0,0.25)";
  for (let y = 0; y < 120; y += 16) g.fillRect(112, y, 30, 5);
  // dirt
  for (let i = 0; i < 120; i++) {
    g.fillStyle = `rgba(30,26,14,${Math.random() * 0.35})`;
    const r = 4 + Math.random() * 20;
    g.beginPath();
    g.arc(Math.random() * 256, Math.random() * 256, r, 0, Math.PI * 2);
    g.fill();
  }
  // rips (dark gashes)
  g.strokeStyle = "rgba(0,0,0,0.8)";
  g.lineWidth = 3;
  for (let i = 0; i < 9; i++) {
    g.beginPath();
    let x = Math.random() * 256;
    let y = Math.random() * 256;
    g.moveTo(x, y);
    for (let k = 0; k < 3; k++) {
      x += (Math.random() - 0.5) * 40;
      y += Math.random() * 30;
      g.lineTo(x, y);
    }
    g.stroke();
  }
  if (blood) {
    for (let i = 0; i < 7; i++) {
      const x = Math.random() * 256;
      const y = 60 + Math.random() * 190;
      const grad = g.createRadialGradient(x, y, 1, x, y, 18 + Math.random() * 22);
      grad.addColorStop(0, "rgba(96,8,10,0.9)");
      grad.addColorStop(0.5, "rgba(64,6,8,0.55)");
      grad.addColorStop(1, "rgba(40,4,6,0)");
      g.fillStyle = grad;
      g.beginPath();
      g.arc(x, y, 20 + Math.random() * 22, 0, Math.PI * 2);
      g.fill();
      // drip
      g.fillStyle = "rgba(74,6,8,0.6)";
      g.fillRect(x - 2, y, 4, 14 + Math.random() * 30);
    }
  }
  const t = texFrom(c, [1, 1]);
  clothTexCache[key] = t;
  return t;
}

/* ---------- per-kind palette ---------- */

interface Look {
  skin: [string, string, string];
  cloth: [string, string];
  eye: number;
  emissive: number;
  hair?: number;
  hairLen?: number;
  horns?: boolean;
  aura: string;
}

const LOOKS: Record<GhostKind, Look> = {
  // pale drowned student
  bhoot: {
    skin: ["#9fb3ab", "#6d8a80", "#5d1a1c"],
    cloth: ["#cfd6e2", "#3a4a7a"],
    eye: 0xd9fbff,
    emissive: 0x2a4a52,
    aura: "150,205,255",
  },
  // green rotting chudail with long hair
  chudail: {
    skin: ["#8aa06a", "#59703c", "#5d1a1c"],
    cloth: ["#b9345a", "#6b1030"],
    eye: 0xff2a2a,
    emissive: 0x24421a,
    hair: 0x0b0f08,
    hairLen: 1.15,
    aura: "140,255,120",
  },
  // huge bloated pishach
  pishach: {
    skin: ["#8f6f9c", "#5b3a6b", "#4a0d20"],
    cloth: ["#3b2b4c", "#221732"],
    eye: 0xffd23c,
    emissive: 0x3a2050,
    horns: true,
    aura: "190,120,255",
  },
  // glowing golden spirit-student
  aatma: {
    skin: ["#e8cf94", "#c39a4e", "#7a3a12"],
    cloth: ["#f5e3ae", "#c9a24e"],
    eye: 0xfff3c0,
    emissive: 0x6b5218,
    aura: "255,210,90",
  },
};

/* ---------- shared geometry ---------- */

let G: {
  head: THREE.SphereGeometry;
  jaw: THREE.BoxGeometry;
  eye: THREE.SphereGeometry;
  torso: THREE.CapsuleGeometry;
  hip: THREE.BoxGeometry;
  upperArm: THREE.CapsuleGeometry;
  foreArm: THREE.CapsuleGeometry;
  hand: THREE.BoxGeometry;
  thigh: THREE.CapsuleGeometry;
  shin: THREE.CapsuleGeometry;
  foot: THREE.BoxGeometry;
  hairStrand: THREE.CapsuleGeometry;
  horn: THREE.ConeGeometry;
  rib: THREE.BoxGeometry;
} | null = null;

function geo() {
  if (G) return G;
  G = {
    head: new THREE.SphereGeometry(0.15, 14, 12),
    jaw: new THREE.BoxGeometry(0.15, 0.06, 0.14),
    eye: new THREE.SphereGeometry(0.032, 8, 6),
    torso: new THREE.CapsuleGeometry(0.15, 0.3, 4, 12),
    hip: new THREE.BoxGeometry(0.27, 0.14, 0.17),
    upperArm: new THREE.CapsuleGeometry(0.048, 0.2, 3, 8),
    foreArm: new THREE.CapsuleGeometry(0.04, 0.2, 3, 8),
    hand: new THREE.BoxGeometry(0.075, 0.11, 0.05),
    thigh: new THREE.CapsuleGeometry(0.062, 0.22, 3, 8),
    shin: new THREE.CapsuleGeometry(0.05, 0.22, 3, 8),
    foot: new THREE.BoxGeometry(0.09, 0.055, 0.19),
    hairStrand: new THREE.CapsuleGeometry(0.022, 0.5, 3, 6),
    horn: new THREE.ConeGeometry(0.045, 0.22, 7),
    rib: new THREE.BoxGeometry(0.022, 0.02, 0.13),
  };
  return G;
}

/**
 * Build a realistic zombie-student body.
 * Origin sits at the ghost's mid-body; feet ≈ -0.85, head ≈ +0.78
 */
export function buildZombie(kind: GhostKind, auraTex: THREE.Texture): ZombieParts {
  const look = LOOKS[kind];
  const spec = KINDS[kind];
  const q = geo();

  const skinMat = new THREE.MeshStandardMaterial({
    map: skinTex(look.skin[0], look.skin[1], look.skin[2]),
    color: 0xffffff,
    roughness: 0.86,
    metalness: 0.03,
    emissive: new THREE.Color(look.emissive),
    emissiveIntensity: 0.5,
    transparent: true,
    opacity: 0,
  });
  const clothMat = new THREE.MeshStandardMaterial({
    map: uniformTex(look.cloth[0], look.cloth[1]),
    color: 0xffffff,
    roughness: 0.95,
    metalness: 0,
    emissive: new THREE.Color(look.emissive),
    emissiveIntensity: 0.22,
    transparent: true,
    opacity: 0,
  });
  const boneMat = new THREE.MeshStandardMaterial({
    color: 0xd9d2b6,
    roughness: 0.7,
    transparent: true,
    opacity: 0,
  });
  const eyeMats: THREE.MeshBasicMaterial[] = [];

  const group = new THREE.Group();

  /* ---- torso ---- */
  const torso = new THREE.Group();
  torso.position.y = 0.16;
  group.add(torso);

  const chest = new THREE.Mesh(q.torso, clothMat);
  chest.scale.set(1, 1, 0.72);
  torso.add(chest);

  // exposed ribs poking through the uniform
  for (let i = 0; i < 3; i++) {
    const rib = new THREE.Mesh(q.rib, boneMat);
    rib.position.set(-0.055 + i * 0.014, 0.03 - i * 0.055, 0.108);
    rib.rotation.z = 0.28;
    torso.add(rib);
  }

  const hip = new THREE.Mesh(q.hip, clothMat);
  hip.position.y = -0.26;
  torso.add(hip);

  // shoulders
  const shoulders = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.062, 0.24, 3, 8),
    clothMat
  );
  shoulders.rotation.z = Math.PI / 2;
  shoulders.position.y = 0.17;
  torso.add(shoulders);

  /* ---- head ---- */
  const head = new THREE.Group();
  head.position.y = 0.42;
  torso.add(head);

  const skull = new THREE.Mesh(q.head, skinMat);
  skull.scale.set(1, 1.12, 0.94);
  head.add(skull);

  // sunken brow
  const brow = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.045, 0.06), skinMat);
  brow.position.set(0, 0.055, 0.115);
  head.add(brow);

  // hollow eye sockets (dark) + glowing pupils
  for (const s of [-1, 1]) {
    const socket = new THREE.Mesh(
      new THREE.SphereGeometry(0.048, 8, 6),
      new THREE.MeshBasicMaterial({ color: 0x08080c, transparent: true, opacity: 0 })
    );
    socket.position.set(s * 0.062, 0.012, 0.116);
    socket.scale.z = 0.6;
    head.add(socket);
    (socket.material as THREE.MeshBasicMaterial).userData.isSocket = true;

    const em = new THREE.MeshBasicMaterial({
      color: look.eye,
      toneMapped: false,
      transparent: true,
      opacity: 0,
    });
    eyeMats.push(em);
    const pupil = new THREE.Mesh(q.eye, em);
    pupil.position.set(s * 0.062, 0.012, 0.14);
    head.add(pupil);
  }

  // nose hole
  const nose = new THREE.Mesh(
    new THREE.BoxGeometry(0.03, 0.035, 0.02),
    new THREE.MeshBasicMaterial({ color: 0x0a0a0e, transparent: true, opacity: 0 })
  );
  nose.position.set(0, -0.035, 0.14);
  head.add(nose);

  // hanging jaw (animated)
  const jaw = new THREE.Mesh(q.jaw, skinMat);
  jaw.position.set(0, -0.115, 0.055);
  head.add(jaw);
  // teeth
  const teeth = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.022, 0.02), boneMat);
  teeth.position.set(0, -0.085, 0.115);
  head.add(teeth);
  // dark maw
  const maw = new THREE.Mesh(
    new THREE.BoxGeometry(0.1, 0.06, 0.04),
    new THREE.MeshBasicMaterial({ color: 0x090407, transparent: true, opacity: 0 })
  );
  maw.position.set(0, -0.1, 0.1);
  head.add(maw);

  // hair
  let hairGroup: THREE.Group | undefined;
  if (look.hair !== undefined) {
    hairGroup = new THREE.Group();
    const hairMat = new THREE.MeshStandardMaterial({
      color: look.hair,
      roughness: 1,
      transparent: true,
      opacity: 0,
    });
    const n = 11;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const strand = new THREE.Mesh(q.hairStrand, hairMat);
      const len = (look.hairLen ?? 1) * (0.85 + Math.random() * 0.4);
      strand.scale.y = len;
      strand.position.set(Math.cos(a) * 0.125, -0.2 * len, Math.sin(a) * 0.1 - 0.02);
      strand.rotation.z = Math.cos(a) * 0.3;
      strand.rotation.x = Math.sin(a) * 0.2 - 0.1;
      strand.userData.seed = Math.random() * 6;
      hairGroup.add(strand);
    }
    // top cap
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.152, 12, 8, 0, Math.PI * 2, 0, 1.1), hairMat);
    cap.position.y = 0.015;
    hairGroup.add(cap);
    head.add(hairGroup);
  }
  if (look.horns) {
    const hornMat = new THREE.MeshStandardMaterial({
      color: 0xcfc49a,
      roughness: 0.6,
      transparent: true,
      opacity: 0,
    });
    for (const s of [-1, 1]) {
      const horn = new THREE.Mesh(q.horn, hornMat);
      horn.position.set(s * 0.1, 0.14, -0.01);
      horn.rotation.z = -s * 0.55;
      horn.rotation.x = -0.25;
      head.add(horn);
    }
  }

  /* ---- arms (reaching forward, zombie style) ---- */
  const makeArm = (side: number) => {
    const shoulder = new THREE.Group();
    shoulder.position.set(side * 0.17, 0.14, 0);
    const upper = new THREE.Mesh(q.upperArm, clothMat);
    upper.position.y = -0.13;
    shoulder.add(upper);
    const elbow = new THREE.Group();
    elbow.position.y = -0.26;
    shoulder.add(elbow);
    const fore = new THREE.Mesh(q.foreArm, skinMat);
    fore.position.y = -0.12;
    elbow.add(fore);
    const hand = new THREE.Mesh(q.hand, skinMat);
    hand.position.y = -0.28;
    elbow.add(hand);
    // clawed fingers
    for (let f = 0; f < 3; f++) {
      const fin = new THREE.Mesh(new THREE.BoxGeometry(0.016, 0.06, 0.016), skinMat);
      fin.position.set(-0.022 + f * 0.022, -0.35, 0.01);
      fin.rotation.x = -0.3;
      elbow.add(fin);
    }
    shoulder.userData.elbow = elbow;
    torso.add(shoulder);
    return shoulder;
  };
  const armL = makeArm(-1);
  const armR = makeArm(1);

  /* ---- legs (shambling) ---- */
  const makeLeg = (side: number) => {
    const hipJ = new THREE.Group();
    hipJ.position.set(side * 0.085, -0.3, 0);
    const thigh = new THREE.Mesh(q.thigh, clothMat);
    thigh.position.y = -0.14;
    hipJ.add(thigh);
    const knee = new THREE.Group();
    knee.position.y = -0.29;
    hipJ.add(knee);
    const shin = new THREE.Mesh(q.shin, side < 0 ? skinMat : clothMat);
    shin.position.y = -0.13;
    knee.add(shin);
    const foot = new THREE.Mesh(q.foot, skinMat);
    foot.position.set(0, -0.27, 0.05);
    knee.add(foot);
    hipJ.userData.knee = knee;
    torso.add(hipJ);
    return hipJ;
  };
  const legL = makeLeg(-1);
  const legR = makeLeg(1);

  /* ---- aura + contact shadow ---- */
  const auraMat = new THREE.SpriteMaterial({
    map: auraTex,
    transparent: true,
    opacity: 0,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const aura = new THREE.Sprite(auraMat);
  aura.scale.set(2.6, 3.2, 1);
  aura.position.y = 0.05;
  group.add(aura);

  group.userData.spec = spec;
  return {
    group,
    torso,
    head,
    jaw,
    armL,
    armR,
    legL,
    legR,
    hair: hairGroup,
    eyeMats,
    skinMat,
    clothMat,
    auraMat,
    height: 1.7,
  };
}

/** collect every material that must fade in/out together */
export function zombieMaterials(p: ZombieParts): THREE.Material[] {
  const set = new Set<THREE.Material>();
  p.group.traverse((o) => {
    const m = o as THREE.Mesh;
    if (m.material) {
      const mm = m.material as THREE.Material | THREE.Material[];
      if (Array.isArray(mm)) mm.forEach((x) => set.add(x));
      else set.add(mm);
    }
  });
  set.add(p.auraMat);
  return [...set];
}

/** shambling walk + reaching arms + lolling head */
export function animateZombie(p: ZombieParts, t: number, seed: number, aggression: number) {
  const sp = 3.1 + aggression * 3.4;
  const w = t * sp + seed;
  const sw = Math.sin(w);
  const sw2 = Math.sin(w * 2);

  // lurching torso
  p.torso.position.y = 0.16 + Math.abs(sw2) * 0.035;
  p.torso.rotation.z = sw * 0.07;
  p.torso.rotation.x = 0.12 + Math.sin(w * 0.5) * 0.03;

  // head lolls to one side
  p.head.rotation.z = Math.sin(w * 0.45 + seed) * 0.28 + 0.1;
  p.head.rotation.x = Math.sin(w * 0.7) * 0.1 + 0.08;
  p.head.rotation.y = Math.sin(w * 0.33) * 0.2;

  // jaw chatters / gapes
  p.jaw.rotation.x = 0.18 + Math.abs(Math.sin(w * 1.6)) * 0.42 + aggression * 0.3;
  p.jaw.position.y = -0.115 - Math.abs(Math.sin(w * 1.6)) * 0.03;

  // arms reach out, swaying
  const reach = -1.15 - aggression * 0.55;
  p.armL.rotation.x = reach + Math.sin(w * 0.9) * 0.16;
  p.armR.rotation.x = reach + Math.sin(w * 0.9 + 1.3) * 0.16;
  p.armL.rotation.z = 0.22 + Math.sin(w * 0.6) * 0.1;
  p.armR.rotation.z = -0.22 - Math.sin(w * 0.6 + 0.8) * 0.1;
  (p.armL.userData.elbow as THREE.Group).rotation.x = -0.5 + Math.sin(w * 1.1) * 0.16;
  (p.armR.userData.elbow as THREE.Group).rotation.x = -0.5 + Math.sin(w * 1.1 + 1) * 0.16;

  // dragging legs
  p.legL.rotation.x = sw * 0.5;
  p.legR.rotation.x = -sw * 0.5;
  (p.legL.userData.knee as THREE.Group).rotation.x = Math.max(0, -sw) * 0.6;
  (p.legR.userData.knee as THREE.Group).rotation.x = Math.max(0, sw) * 0.6;

  // hair sway
  if (p.hair) {
    for (const s of p.hair.children) {
      const sd = (s.userData.seed as number) ?? 0;
      if (sd) s.rotation.x = Math.sin(t * 1.9 + sd) * 0.16 - 0.1;
    }
  }
}

export function disposeZombieCaches() {
  Object.values(skinTexCache).forEach((t) => t.dispose());
  Object.values(clothTexCache).forEach((t) => t.dispose());
  skinTexCache = {};
  clothTexCache = {};
}
