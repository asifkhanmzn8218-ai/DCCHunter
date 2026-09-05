import * as THREE from "three";
import {
  bookshelfTex,
  chalkboardTex,
  classDoorTex,
  curtainTex,
  dccBannerTex,
  dccEmblemTex,
  lockerTex,
  noiseGroundTex,
  plasterWallTex,
  texFrom,
  tileFloorTex,
} from "./assets";
import {
  addDccComputer,
  addDccPylon,
  addDeskPlate,
  addPoster,
  addShopBoard,
} from "./dccProps";

/** small warm/cool lamp: emissive bulb + real PointLight */
function lamp(
  parent: THREE.Group,
  x: number, y: number, z: number,
  color: number,
  intensity: number,
  dist: number,
  bulbR = 0.14
) {
  const mat = new THREE.MeshBasicMaterial({ color, toneMapped: false });
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(bulbR, 8, 6), mat);
  bulb.position.set(x, y, z);
  parent.add(bulb);
  const light = new THREE.PointLight(color, intensity, dist, 1.7);
  light.position.set(x, y, z);
  parent.add(light);
  return { mat, light, base: intensity };
}

export interface LevelInstance {
  group: THREE.Group;
  update: (t: number, dt: number) => void;
}

export interface LevelSpec {
  key: string;
  name: string;
  tagline: string;
  outdoor: boolean;
  fogColor: number;
  fogDensity: number;
  ambientColor: number;
  ambientIntensity: number;
  moonIntensity: number;
  travelColor: number;
  travelIntensity: number;
  travelDistance: number;
  spread: number;
  hoverY: number;
  build: (len: number) => LevelInstance;
}

const M = {
  lam: (c: number) => new THREE.MeshLambertMaterial({ color: c }),
  basic: (c: number) => new THREE.MeshBasicMaterial({ color: c }),
  emis: (c: number, i = 1) =>
    new THREE.MeshBasicMaterial({ color: c, toneMapped: false, transparent: true, opacity: i }),
};

/** shared: hang a DCC — Digital Career Center board */
function dccBoard(
  parent: THREE.Group,
  x: number,
  y: number,
  z: number,
  w: number,
  ry = 0,
  glow = "#4fd8ff",
  sub?: string
) {
  const tex = dccBannerTex(sub, glow);
  const board = new THREE.Mesh(
    new THREE.PlaneGeometry(w, w / 4),
    new THREE.MeshBasicMaterial({ map: tex, transparent: true })
  );
  board.position.set(x, y, z);
  board.rotation.y = ry;
  parent.add(board);
  const frame = new THREE.Mesh(
    new THREE.BoxGeometry(w + 0.2, w / 4 + 0.2, 0.09),
    M.lam(0x0b111d)
  );
  frame.position.set(x, y, z - Math.cos(ry) * 0.05);
  frame.rotation.y = ry;
  parent.add(frame);
  return board;
}

function flickerPlane(
  parent: THREE.Group,
  geo: THREE.BufferGeometry,
  color: number,
  x: number,
  y: number,
  z: number,
  rx = -Math.PI / 2
) {
  const mat = M.emis(color, 0.9);
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.rotation.x = rx;
  parent.add(m);
  return mat;
}

/* ══════════════ 1. MAIN GATE & COURTYARD ══════════════ */
const gateLevel: LevelSpec = {
  key: "gate",
  name: "MAIN GATE",
  tagline: "Vidya Mandir ka phaatak khula hai…",
  outdoor: true,
  fogColor: 0x070c18,
  fogDensity: 0.016,
  ambientColor: 0x5a6f9c,
  ambientIntensity: 1.55,
  moonIntensity: 1.5,
  travelColor: 0xbcd6ff,
  travelIntensity: 3.2,
  travelDistance: 34,
  spread: 11,
  hoverY: 1.35,
  build(len) {
    const g = new THREE.Group();
    const far = -(len + 26);
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(140, len + 130),
      new THREE.MeshLambertMaterial({
        map: texFrom(noiseGroundTex("#0b1018", "rgba(40,54,80,0.5)"), [18, 18]),
        color: 0x9fb0d4,
      })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.z = -(len / 2) - 20;
    g.add(ground);

    // entry arch with DCC board
    const pillarM = M.lam(0x141b2b);
    for (const s of [-1, 1]) {
      const p = new THREE.Mesh(new THREE.BoxGeometry(1, 6.4, 1), pillarM);
      p.position.set(s * 4.6, 3.2, -2);
      g.add(p);
      const cap = new THREE.Mesh(new THREE.ConeGeometry(0.85, 1.1, 4), pillarM);
      cap.position.set(s * 4.6, 6.9, -2);
      g.add(cap);
    }
    const lintel = new THREE.Mesh(new THREE.BoxGeometry(10.2, 0.8, 1.1), pillarM);
    lintel.position.set(0, 6.6, -2);
    g.add(lintel);
    dccBoard(g, 0, 5.4, -1.4, 7.4, 0, "#4fd8ff");

    // iron gate halves (open)
    const barM = M.lam(0x0e131e);
    for (const s of [-1, 1]) {
      const half = new THREE.Group();
      for (let i = 0; i < 7; i++) {
        const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 4.6, 5), barM);
        bar.position.set(i * 0.5, 2.3, 0);
        half.add(bar);
      }
      const rail = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.12, 0.12), barM);
      rail.position.set(1.5, 4.2, 0);
      half.add(rail);
      half.position.set(s * 4.4, 0, -2);
      half.rotation.y = s * 1.15;
      if (s < 0) half.scale.x = -1;
      g.add(half);
    }

    // school facade far away
    const dark = M.lam(0x0d1424);
    const darker = M.lam(0x080d18);
    const school = new THREE.Group();
    school.position.z = far;
    const main = new THREE.Mesh(new THREE.BoxGeometry(46, 14, 3), dark);
    main.position.y = 7;
    school.add(main);
    const dome = new THREE.Mesh(
      new THREE.SphereGeometry(3.6, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2),
      darker
    );
    dome.position.y = 15.5;
    school.add(dome);
    for (const s of [-1, 1]) {
      const t = new THREE.Mesh(new THREE.BoxGeometry(3.6, 17, 3.2), dark);
      t.position.set(s * 21, 8.5, 0);
      school.add(t);
      const sp = new THREE.Mesh(new THREE.ConeGeometry(2.4, 3.8, 4), darker);
      sp.position.set(s * 21, 18.9, 0);
      school.add(sp);
    }
    const lit: THREE.MeshBasicMaterial[] = [];
    for (let fy = 0; fy < 2; fy++)
      for (let i = 0; i < 7; i++) {
        const on = Math.random() < 0.25;
        const mt = on ? M.emis(0x6cff96, 0.75) : M.basic(0x04060c);
        if (on) lit.push(mt);
        const w = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 2.4), mt);
        w.position.set(-18 + i * 6, 4.2 + fy * 5.6, 1.6);
        school.add(w);
      }
    const door = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 5.2), M.emis(0x1f6b3c, 0.85));
    door.position.set(0, 2.6, 1.62);
    school.add(door);
    g.add(school);

    // trees, columns, benches along the path
    const trunkM = M.lam(0x140f09);
    const leafM = M.lam(0x0a120c);
    const colM = M.lam(0x1a2236);
    const benchM = M.lam(0x121828);
    for (let z = -6; z > -(len + 20); z -= 9) {
      for (const s of [-1, 1]) {
        const t = new THREE.Group();
        const sc = 0.85 + Math.random() * 0.7;
        const tr = new THREE.Mesh(new THREE.CylinderGeometry(0.3 * sc, 0.5 * sc, 6.2 * sc, 6), trunkM);
        tr.position.y = 3.1 * sc;
        t.add(tr);
        for (let i = 0; i < 3; i++) {
          const b = new THREE.Mesh(new THREE.IcosahedronGeometry((1.8 + Math.random()) * sc, 0), leafM);
          b.position.set((Math.random() - 0.5) * 2.4 * sc, (5.4 + Math.random() * 1.6) * sc, (Math.random() - 0.5) * 2.4 * sc);
          t.add(b);
        }
        t.position.set(s * (11 + Math.random() * 4), 0, z + Math.random() * 4);
        g.add(t);

        const h = 1.8 + Math.random() * 3;
        const c = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.36, h, 7), colM);
        c.position.set(s * 6.8, h / 2, z - 4);
        c.rotation.z = (Math.random() - 0.5) * 0.3;
        g.add(c);
      }
      const bn = new THREE.Group();
      const seat = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.15, 0.68), benchM);
      seat.position.y = 0.55;
      bn.add(seat);
      for (const s of [-1, 1]) {
        const leg = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.55, 0.6), benchM);
        leg.position.set(s * 0.9, 0.27, 0);
        bn.add(leg);
      }
      bn.position.set((Math.random() < 0.5 ? -1 : 1) * (4.4 + Math.random() * 1.6), 0, z - 2);
      bn.rotation.y = Math.random() * 3;
      g.add(bn);
    }

    // lamp posts — REAL lights so the path is actually visible
    const lamps: ReturnType<typeof lamp>[] = [];
    for (let z = -8; z > -(len + 16); z -= 11) {
      for (const s of [-1, 1]) {
        const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.1, 4.6, 6), trunkM);
        pole.position.set(s * 8, 2.3, z);
        g.add(pole);
        const arm = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.08, 0.08), trunkM);
        arm.position.set(s * 7.6, 4.55, z);
        g.add(arm);
        lamps.push(lamp(g, s * 7.2, 4.5, z, 0xffb26a, 5.5, 17, 0.2));
      }
    }
    // DCC pylon signs along the driveway
    addDccPylon(g, -6.2, -13);
    addDccPylon(g, 6.2, -31);
    // DCC posters pasted on the boundary wall
    for (let z = -10; z > -(len + 12); z -= 15) {
      addPoster(g, -8.3, 2.1, z, Math.PI / 2, (z / 15) & 1 ? 0 : 2, 1.5);
      addPoster(g, 8.3, 2.1, z - 6, -Math.PI / 2, 1, 1.5);
    }
    // security cabin with a lit DCC shop board
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(2.6, 2.6, 2.4), M.lam(0x18202f));
    cabin.position.set(-7.2, 1.3, -6.5);
    g.add(cabin);
    addShopBoard(g, "DCC SECURITY", -7.2, 2.9, -5.25, 0, 2.5, "#4fd8ff");
    lamp(g, -7.2, 2.1, -5.1, 0x8fd8ff, 2.4, 8, 0.08);

    return {
      group: g,
      update: (t) => {
        for (let i = 0; i < lamps.length; i++) {
          const f = 0.72 + 0.28 * Math.abs(Math.sin(t * (2.6 + i * 0.7)) * Math.sin(t * 5.3 + i));
          const on = Math.random() < 0.012 ? 0.15 : f;
          lamps[i].light.intensity = lamps[i].base * on;
          lamps[i].mat.color.setScalar(0.55 + on * 0.45);
        }
        for (let i = 0; i < lit.length; i++)
          lit[i].opacity = 0.45 + 0.4 * Math.sin(t * 2 + i * 1.7);
      },
    };
  },
};

/* ══════════════ 2. CLASSROOM CORRIDOR ══════════════ */
const corridorLevel: LevelSpec = {
  key: "corridor",
  name: "CLASSROOM CORRIDOR",
  tagline: "Kaksha 6-B ka darwaza khud khul raha hai…",
  outdoor: false,
  fogColor: 0x0a1114,
  fogDensity: 0.026,
  ambientColor: 0x5c7d80,
  ambientIntensity: 1.5,
  moonIntensity: 0.25,
  travelColor: 0xd8fff0,
  travelIntensity: 3.4,
  travelDistance: 26,
  spread: 6.4,
  hoverY: 1.3,
  build(len) {
    const g = new THREE.Group();
    const L = len + 40;
    const HALF = 4.6;
    const floorTex = texFrom(tileFloorTex("#141a20", "rgba(90,110,120,0.35)"), [8, L / 4]);
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(HALF * 2, L),
      new THREE.MeshLambertMaterial({ map: floorTex, color: 0xa8bcc4 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.z = -L / 2 + 8;
    g.add(floor);
    const ceil = new THREE.Mesh(new THREE.PlaneGeometry(HALF * 2, L), M.lam(0x0a0f14));
    ceil.rotation.x = Math.PI / 2;
    ceil.position.set(0, 4.4, -L / 2 + 8);
    g.add(ceil);

    const wallTex = texFrom(plasterWallTex("#28323a"), [L / 8, 1]);
    for (const s of [-1, 1]) {
      const w = new THREE.Mesh(
        new THREE.PlaneGeometry(L, 4.4),
        new THREE.MeshLambertMaterial({ map: wallTex, color: 0x93a6b0 })
      );
      w.position.set(s * HALF, 2.2, -L / 2 + 8);
      w.rotation.y = -s * (Math.PI / 2);
      g.add(w);
      // dado stripe
      const dado = new THREE.Mesh(new THREE.PlaneGeometry(L, 1.1), M.lam(0x14323a));
      dado.position.set(s * (HALF - 0.02), 0.55, -L / 2 + 8);
      dado.rotation.y = -s * (Math.PI / 2);
      g.add(dado);
    }

    // doors, lockers, boards
    const lockTex = lockerTex();
    const rooms = ["6-B", "7-A", "8-C", "9-A", "10-B", "5-D", "LAB", "STAFF"];
    let ri = 0;
    const doorMeshes: THREE.Mesh[] = [];
    for (let z = -4; z > -(len + 26); z -= 7) {
      for (const s of [-1, 1]) {
        if (Math.random() < 0.62) {
          const dt = texFrom(classDoorTex(rooms[ri++ % rooms.length]));
          const d = new THREE.Mesh(
            new THREE.PlaneGeometry(1.5, 3),
            new THREE.MeshLambertMaterial({ map: dt, color: 0xc9d6dd })
          );
          d.position.set(s * (HALF - 0.03), 1.5, z);
          d.rotation.y = -s * (Math.PI / 2);
          g.add(d);
          doorMeshes.push(d);
          // faint green room glow through the pane
          const glow = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 1), M.emis(0x2f7d4c, 0.3));
          glow.position.set(s * (HALF - 0.05), 2.35, z);
          glow.rotation.y = -s * (Math.PI / 2);
          g.add(glow);
        } else {
          const lk = new THREE.Mesh(
            new THREE.BoxGeometry(0.4, 2.1, 1.9),
            new THREE.MeshLambertMaterial({ map: texFrom(lockTex), color: 0xaebfc8 })
          );
          lk.position.set(s * (HALF - 0.22), 1.05, z);
          g.add(lk);
        }
      }
    }
    // chalkboard + DCC notice board
    const cb = new THREE.Mesh(
      new THREE.PlaneGeometry(3.4, 1.7),
      new THREE.MeshLambertMaterial({ map: texFrom(chalkboardTex("KOI ZINDA NAHI")), color: 0xbecfd6 })
    );
    cb.position.set(-HALF + 0.04, 2.4, -13);
    cb.rotation.y = Math.PI / 2;
    g.add(cb);
    dccBoard(g, HALF - 0.05, 2.6, -19, 3.6, -Math.PI / 2, "#6cff96", "COMPUTER LAB · DIGITAL CAREER CENTER");

    // ceiling tubelights — emissive bar + REAL light each
    const tubeGeo = new THREE.PlaneGeometry(0.3, 2.6);
    const tubes: THREE.MeshBasicMaterial[] = [];
    const tubeLights: THREE.PointLight[] = [];
    for (let z = -3; z > -(len + 26); z -= 5) {
      tubes.push(flickerPlane(g, tubeGeo, 0xd8fff0, 0, 4.3, z, Math.PI / 2));
      const hous = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.12, 2.8), M.lam(0x151c22));
      hous.position.set(0, 4.38, z);
      g.add(hous);
      const pl = new THREE.PointLight(0xd6fff2, 3.4, 15, 1.6);
      pl.position.set(0, 4.1, z);
      g.add(pl);
      tubeLights.push(pl);
    }
    // DCC posters + notice boards down the corridor walls
    for (let z = -6; z > -(len + 22); z -= 9) {
      addPoster(g, -HALF + 0.07, 2.3, z, Math.PI / 2, ((-z / 9) | 0) % 3);
      addPoster(g, HALF - 0.07, 2.3, z - 4.5, -Math.PI / 2, (((-z / 9) | 0) + 1) % 3);
    }
    // lit DCC admissions counter built into the wall
    const counter = new THREE.Mesh(new THREE.BoxGeometry(0.5, 1, 2.6), M.lam(0x1d2b33));
    counter.position.set(-HALF + 0.3, 0.5, -25);
    g.add(counter);
    addShopBoard(g, "DCC ADMISSIONS", -HALF + 0.1, 2.7, -25, Math.PI / 2, 2.4, "#6cff96");
    lamp(g, -HALF + 0.7, 2, -25, 0x9effc8, 2.6, 8, 0.07);
    addDeskPlate(g, -HALF + 0.35, 1.02, -25, Math.PI / 2);
    // end door with red exit glow
    const endZ = -(len + 27);
    const ed = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 3.4), M.basic(0x090d10));
    ed.position.set(0, 1.7, endZ);
    g.add(ed);
    const exitSign = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 0.42), M.emis(0xff3b46, 0.9));
    exitSign.position.set(0, 3.7, endZ + 0.1);
    g.add(exitSign);

    return {
      group: g,
      update: (t) => {
        for (let i = 0; i < tubes.length; i++) {
          const n = Math.sin(t * (13 + i * 3.1)) * Math.sin(t * 4.3 + i);
          const v = i % 3 === 0 ? (Math.random() < 0.05 ? 0.12 : 0.6 + 0.4 * Math.abs(n)) : 0.92;
          tubes[i].opacity = v;
          tubeLights[i].intensity = 3.4 * v;
        }
        for (let i = 0; i < doorMeshes.length; i++) {
          if (i % 4 === 0) doorMeshes[i].rotation.z = Math.sin(t * 0.9 + i) * 0.02;
        }
      },
    };
  },
};

/* ══════════════ 3. HAUNTED LIBRARY ══════════════ */
const libraryLevel: LevelSpec = {
  key: "library",
  name: "PURANI LIBRARY",
  tagline: "Kitaabein khud panne palat rahi hain…",
  outdoor: false,
  fogColor: 0x120d06,
  fogDensity: 0.028,
  ambientColor: 0x8a6a38,
  ambientIntensity: 1.45,
  moonIntensity: 0.25,
  travelColor: 0xffd6a0,
  travelIntensity: 3.4,
  travelDistance: 26,
  spread: 6,
  hoverY: 1.3,
  build(len) {
    const g = new THREE.Group();
    const L = len + 40;
    const HALF = 5.2;
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(HALF * 2, L),
      new THREE.MeshLambertMaterial({
        map: texFrom(tileFloorTex("#1a120a", "rgba(120,90,50,0.3)"), [6, L / 5]),
        color: 0xc8a978,
      })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.z = -L / 2 + 8;
    g.add(floor);
    const ceil = new THREE.Mesh(new THREE.PlaneGeometry(HALF * 2, L), M.lam(0x0d0904));
    ceil.rotation.x = Math.PI / 2;
    ceil.position.set(0, 5, -L / 2 + 8);
    g.add(ceil);
    const wallTex = texFrom(plasterWallTex("#3a2a17"), [L / 9, 1]);
    for (const s of [-1, 1]) {
      const w = new THREE.Mesh(
        new THREE.PlaneGeometry(L, 5),
        new THREE.MeshLambertMaterial({ map: wallTex, color: 0xb59468 })
      );
      w.position.set(s * HALF, 2.5, -L / 2 + 8);
      w.rotation.y = -s * (Math.PI / 2);
      g.add(w);
    }

    // bookshelf rows
    const shelfTex = texFrom(bookshelfTex());
    const shelfSide = new THREE.MeshLambertMaterial({ color: 0x2a1c0d });
    const shelfFace = new THREE.MeshLambertMaterial({ map: shelfTex, color: 0xd9c39a });
    const shelfGeo = new THREE.BoxGeometry(0.55, 3.4, 3.6);
    for (let z = -5; z > -(len + 26); z -= 6) {
      for (const s of [-1, 1]) {
        const sh = new THREE.Mesh(shelfGeo, [
          s > 0 ? shelfSide : shelfFace,
          s > 0 ? shelfFace : shelfSide,
          shelfSide, shelfSide, shelfSide, shelfSide,
        ]);
        sh.position.set(s * (HALF - 0.5), 1.7, z);
        sh.rotation.z = (Math.random() - 0.5) * 0.05;
        g.add(sh);
        // inner free-standing shelf
        if (Math.random() < 0.5) {
          const sh2 = new THREE.Mesh(shelfGeo, [
            shelfFace, shelfFace, shelfSide, shelfSide, shelfSide, shelfSide,
          ]);
          sh2.position.set(s * 2.9, 1.7, z - 3);
          g.add(sh2);
        }
      }
    }
    // reading tables + green banker lamps
    const woodM = M.lam(0x2b1d0e);
    const lampMats: THREE.MeshBasicMaterial[] = [];
    for (let z = -8; z > -(len + 20); z -= 13) {
      const tb = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.12, 1.2), woodM);
      tb.position.set(0, 0.78, z);
      g.add(tb);
      for (const s of [-1, 1]) {
        const leg = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.78, 1), woodM);
        leg.position.set(s * 1.1, 0.39, z);
        g.add(leg);
      }
      const lm = M.emis(0x8fffc0, 0.95);
      lampMats.push(lm);
      const shade = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 6), lm);
      shade.position.set(0.7, 1.05, z);
      g.add(shade);
      const bl = new THREE.PointLight(0x9fffcc, 2.6, 11, 1.7);
      bl.position.set(0.7, 1.15, z);
      g.add(bl);
      // DCC computer terminal on every other reading table
      if (((-z / 13) | 0) % 2 === 0) addDccComputer(g, -0.75, 0.84, z, 0.3);
      addDeskPlate(g, 0.1, 0.85, z + 0.42);
      // floating book
      const bk = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.08, 0.36), M.lam(0x6b2b22));
      bk.position.set(-0.6, 1.5, z);
      bk.userData.base = 1.5;
      bk.userData.seed = Math.random() * 6;
      bk.name = "floatbook";
      g.add(bk);
    }
    dccBoard(g, 0, 3.4, -(len + 25), 6.2, 0, "#ffc06a", "LIBRARY WING · DIGITAL CAREER CENTER");
    // chandeliers keeping the aisle readable
    for (let z = -6; z > -(len + 22); z -= 10) {
      lamp(g, 0, 4.3, z, 0xffbe78, 4.6, 16, 0.16);
      const chain = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.7, 4), M.lam(0x1a1208));
      chain.position.set(0, 4.7, z);
      g.add(chain);
    }
    // posters on the end walls between shelves
    for (let z = -9; z > -(len + 18); z -= 18) {
      addPoster(g, -HALF + 0.08, 2.6, z, Math.PI / 2, 2);
      addPoster(g, HALF - 0.08, 2.6, z - 9, -Math.PI / 2, 0);
    }
    const books: THREE.Object3D[] = [];
    g.traverse((o) => o.name === "floatbook" && books.push(o));

    return {
      group: g,
      update: (t) => {
        for (let i = 0; i < lampMats.length; i++)
          lampMats[i].opacity = 0.6 + 0.4 * Math.abs(Math.sin(t * 2.2 + i));
        for (const b of books) {
          const sd = b.userData.seed as number;
          b.position.y = (b.userData.base as number) + Math.sin(t * 1.6 + sd) * 0.25;
          b.rotation.y = t * 0.7 + sd;
          b.rotation.z = Math.sin(t * 1.2 + sd) * 0.3;
        }
      },
    };
  },
};

/* ══════════════ 4. ASSEMBLY HALL ══════════════ */
const hallLevel: LevelSpec = {
  key: "hall",
  name: "ASSEMBLY HALL",
  tagline: "Prarthana abhi bhi chal rahi hai…",
  outdoor: false,
  fogColor: 0x160a11,
  fogDensity: 0.024,
  ambientColor: 0x8e5570,
  ambientIntensity: 1.45,
  moonIntensity: 0.25,
  travelColor: 0xffc0d4,
  travelIntensity: 3.3,
  travelDistance: 28,
  spread: 9,
  hoverY: 1.4,
  build(len) {
    const g = new THREE.Group();
    const L = len + 44;
    const HALF = 9;
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(HALF * 2, L),
      new THREE.MeshLambertMaterial({
        map: texFrom(tileFloorTex("#14090f", "rgba(150,60,90,0.25)"), [10, L / 4]),
        color: 0xb08494,
      })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.z = -L / 2 + 8;
    g.add(floor);
    const ceil = new THREE.Mesh(new THREE.PlaneGeometry(HALF * 2, L), M.lam(0x0a0508));
    ceil.rotation.x = Math.PI / 2;
    ceil.position.set(0, 7, -L / 2 + 8);
    g.add(ceil);
    const wallTex = texFrom(plasterWallTex("#3b1c2b"), [L / 10, 1]);
    for (const s of [-1, 1]) {
      const w = new THREE.Mesh(
        new THREE.PlaneGeometry(L, 7),
        new THREE.MeshLambertMaterial({ map: wallTex, color: 0xa8768c })
      );
      w.position.set(s * HALF, 3.5, -L / 2 + 8);
      w.rotation.y = -s * (Math.PI / 2);
      g.add(w);
    }

    // rows of chairs (instanced for perf)
    const chairGeo = new THREE.BoxGeometry(0.44, 0.08, 0.44);
    const backGeo = new THREE.BoxGeometry(0.44, 0.5, 0.07);
    const chairM = M.lam(0x2a1420);
    const rows = Math.floor((len + 20) / 2.2);
    const perRow = 12;
    const seats = new THREE.InstancedMesh(chairGeo, chairM, rows * perRow);
    const backs = new THREE.InstancedMesh(backGeo, chairM, rows * perRow);
    const dummy = new THREE.Object3D();
    let n = 0;
    for (let r = 0; r < rows; r++) {
      for (let i = 0; i < perRow; i++) {
        const half = perRow / 2;
        const x =
          i < half ? -1.5 - (half - 1 - i) * 0.95 : 1.5 + (i - half) * 0.95;
        const z = -6 - r * 2.2;
        const tilt = Math.random() < 0.12 ? (Math.random() - 0.5) * 0.9 : 0;
        dummy.position.set(x, 0.45, z);
        dummy.rotation.set(0, tilt * 0.6, tilt);
        dummy.updateMatrix();
        seats.setMatrixAt(n, dummy.matrix);
        dummy.position.set(x, 0.72, z + 0.2);
        dummy.updateMatrix();
        backs.setMatrixAt(n, dummy.matrix);
        n++;
      }
    }
    g.add(seats, backs);

    // stage at the far end
    const endZ = -(len + 26);
    const stage = new THREE.Mesh(new THREE.BoxGeometry(HALF * 1.9, 1.2, 6), M.lam(0x22101a));
    stage.position.set(0, 0.6, endZ + 3);
    g.add(stage);
    const curtM = new THREE.MeshLambertMaterial({
      map: texFrom(curtainTex("#5c0f22", "#2a0710"), [4, 1]),
      color: 0xd08ea0,
    });
    for (const s of [-1, 1]) {
      const cu = new THREE.Mesh(new THREE.BoxGeometry(4.6, 6.4, 0.4), curtM);
      cu.position.set(s * 6.2, 3.2, endZ + 1);
      g.add(cu);
    }
    const valance = new THREE.Mesh(new THREE.BoxGeometry(17, 1.6, 0.4), curtM);
    valance.position.set(0, 6.2, endZ + 1);
    g.add(valance);
    dccBoard(g, 0, 3.4, endZ + 0.6, 8, 0, "#ff8fb0", "ANNUAL DAY · DIGITAL CAREER CENTER");
    // podium with DCC plate + reading lamp
    const pod = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.1, 0.7), M.lam(0x2c1a12));
    pod.position.set(-3, 1.75, endZ + 3);
    g.add(pod);
    addDeskPlate(g, -3, 2.32, endZ + 3.3);
    lamp(g, -3, 2.7, endZ + 3.3, 0xffd9a0, 2.2, 8, 0.07);
    // stage wash lights
    lamp(g, -4.5, 5.4, endZ + 5.5, 0xff9ec0, 4.2, 16, 0.12);
    lamp(g, 4.5, 5.4, endZ + 5.5, 0xff9ec0, 4.2, 16, 0.12);
    // DCC posters on the side walls
    for (let z = -8; z > -(len + 18); z -= 13) {
      addPoster(g, -HALF + 0.08, 3, z, Math.PI / 2, 1, 1.6);
      addPoster(g, HALF - 0.08, 3, z - 6, -Math.PI / 2, 2, 1.6);
    }

    // hanging bulbs down the hall
    const bulbs: THREE.MeshBasicMaterial[] = [];
    const bulbObjs: THREE.Object3D[] = [];
    for (let z = -6; z > -(len + 22); z -= 8) {
      for (const s of [-1, 1]) {
        const wire = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 1.6, 4), M.lam(0x101010));
        wire.position.set(s * 5, 6.2, z);
        g.add(wire);
        const bm = M.emis(0xffb060, 0.9);
        bulbs.push(bm);
        const b = new THREE.Mesh(new THREE.SphereGeometry(0.15, 8, 6), bm);
        b.position.set(s * 5, 5.4, z);
        b.userData.bx = s * 5;
        b.userData.seed = Math.random() * 6;
        bulbObjs.push(b);
        g.add(b);
        const pl = new THREE.PointLight(0xffb877, 3.2, 16, 1.6);
        pl.position.set(s * 5, 5.3, z);
        b.userData.light = pl;
        g.add(pl);
      }
    }
    // ceiling fans (slow, creaking)
    const fans: THREE.Object3D[] = [];
    for (let z = -10; z > -(len + 16); z -= 14) {
      const f = new THREE.Group();
      const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.18, 8), M.lam(0x1a1a20));
      f.add(hub);
      for (let i = 0; i < 3; i++) {
        const bl = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.05, 0.34), M.lam(0x24242c));
        bl.position.x = 1.1;
        const pv = new THREE.Group();
        pv.add(bl);
        pv.rotation.y = (i * Math.PI * 2) / 3;
        f.add(pv);
      }
      f.position.set(0, 6.4, z);
      g.add(f);
      fans.push(f);
    }

    return {
      group: g,
      update: (t, dt) => {
        for (let i = 0; i < bulbs.length; i++) {
          const v = 0.5 + 0.5 * Math.abs(Math.sin(t * (2 + i * 0.6)));
          bulbs[i].opacity = v;
        }
        for (const b of bulbObjs) {
          const sd = b.userData.seed as number;
          const x = (b.userData.bx as number) + Math.sin(t * 1.3 + sd) * 0.22;
          b.position.x = x;
          const pl = b.userData.light as THREE.PointLight | undefined;
          if (pl) {
            pl.position.x = x;
            pl.intensity = 3.2 * (0.6 + 0.4 * Math.abs(Math.sin(t * 1.7 + sd)));
          }
        }
        for (let i = 0; i < fans.length; i++) fans[i].rotation.y += dt * (0.6 + i * 0.12);
      },
    };
  },
};

/* ══════════════ 5. ROOFTOP TERRACE ══════════════ */
const roofLevel: LevelSpec = {
  key: "roof",
  name: "TERRACE ROOFTOP",
  tagline: "Yahin se woh neeche giri thi…",
  outdoor: true,
  fogColor: 0x080d1c,
  fogDensity: 0.017,
  ambientColor: 0x5f7bb0,
  ambientIntensity: 1.6,
  moonIntensity: 1.9,
  travelColor: 0xcfe0ff,
  travelIntensity: 3.0,
  travelDistance: 30,
  spread: 9,
  hoverY: 1.4,
  build(len) {
    const g = new THREE.Group();
    const L = len + 40;
    const HALF = 8;
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(HALF * 2, L),
      new THREE.MeshLambertMaterial({
        map: texFrom(noiseGroundTex("#161c26", "rgba(70,90,120,0.4)"), [8, L / 4]),
        color: 0xa6b8d4,
      })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.z = -L / 2 + 8;
    g.add(floor);
    // parapet walls
    const paraM = M.lam(0x1a2333);
    for (const s of [-1, 1]) {
      const p = new THREE.Mesh(new THREE.BoxGeometry(0.4, 1.2, L), paraM);
      p.position.set(s * HALF, 0.6, -L / 2 + 8);
      g.add(p);
      for (let z = 4; z > -(len + 26); z -= 2.2) {
        const post = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.34, 0.34), paraM);
        post.position.set(s * HALF, 1.35, z);
        g.add(post);
      }
    }
    // water tanks
    for (let z = -10; z > -(len + 18); z -= 17) {
      const s = Math.random() < 0.5 ? -1 : 1;
      const legs = new THREE.Mesh(new THREE.BoxGeometry(2, 2.4, 2), M.lam(0x121a26));
      legs.position.set(s * 5.4, 1.2, z);
      g.add(legs);
      const tank = new THREE.Mesh(new THREE.CylinderGeometry(1.15, 1.15, 1.5, 12), M.lam(0x27334a));
      tank.position.set(s * 5.4, 3.1, z);
      g.add(tank);
    }
    // AC units + pipes
    for (let z = -6; z > -(len + 20); z -= 9) {
      const s = Math.random() < 0.5 ? -1 : 1;
      const ac = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.9, 0.8), M.lam(0x1d2632));
      ac.position.set(s * (3 + Math.random() * 2), 0.45, z);
      g.add(ac);
      const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 3.4, 6), M.lam(0x161d28));
      pipe.rotation.z = Math.PI / 2;
      pipe.position.set(s * 6.5, 0.5, z - 2);
      g.add(pipe);
    }
    // clotheslines with swaying sheets
    const sheets: THREE.Object3D[] = [];
    const sheetM = new THREE.MeshLambertMaterial({
      color: 0xdfe6ee,
      transparent: true,
      opacity: 0.55,
      side: THREE.DoubleSide,
    });
    for (let z = -12; z > -(len + 18); z -= 11) {
      const rope = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 12, 4), M.lam(0x2a2418));
      rope.rotation.z = Math.PI / 2;
      rope.position.set(0, 2.4, z);
      g.add(rope);
      for (let i = 0; i < 4; i++) {
        const sh = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 1.7), sheetM);
        sh.position.set(-4 + i * 2.6, 1.55, z);
        sh.userData.seed = Math.random() * 6;
        g.add(sh);
        sheets.push(sh);
      }
    }
    // antenna + DCC hoarding
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.13, 7, 6), M.lam(0x161d28));
    mast.position.set(6.4, 3.5, -(len + 22));
    g.add(mast);
    dccBoard(g, 0, 3.6, -(len + 26), 8.4, 0, "#b9d4ff", "ROOFTOP LAB · DIGITAL CAREER CENTER");
    // rooftop floodlights so the terrace reads clearly
    for (let z = -8; z > -(len + 20); z -= 12) {
      for (const s of [-1, 1]) {
        const post = new THREE.Mesh(new THREE.BoxGeometry(0.12, 2.6, 0.12), M.lam(0x151d29));
        post.position.set(s * 7.2, 1.3, z);
        g.add(post);
        lamp(g, s * 7.2, 2.7, z, 0xcfe0ff, 3.6, 15, 0.13);
      }
    }
    addDccPylon(g, -6.4, -(len + 14), 2.6);
    addPoster(g, 0, 2, -(len + 29), 0, 0, 1.8);
    const redLight = M.emis(0xff2f3f, 1);
    const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 6), redLight);
    beacon.position.set(6.4, 7.1, -(len + 22));
    g.add(beacon);

    return {
      group: g,
      update: (t) => {
        redLight.opacity = Math.sin(t * 3) > 0.4 ? 1 : 0.08;
        for (const s of sheets) {
          const sd = s.userData.seed as number;
          s.rotation.y = Math.sin(t * 1.4 + sd) * 0.5;
          s.rotation.x = Math.sin(t * 1.1 + sd) * 0.12;
        }
      },
    };
  },
};

/* ══════════════ 6. CANTEEN BAZAAR & DCC LAB ══════════════ */
const canteenLevel: LevelSpec = {
  key: "canteen",
  name: "CANTEEN & DCC LAB",
  tagline: "Samose abhi bhi garam hain… kisne banaye?",
  outdoor: false,
  fogColor: 0x0f0c14,
  fogDensity: 0.023,
  ambientColor: 0x7c6a95,
  ambientIntensity: 1.5,
  moonIntensity: 0.3,
  travelColor: 0xffd2f0,
  travelIntensity: 3.4,
  travelDistance: 28,
  spread: 7.6,
  hoverY: 1.32,
  build(len) {
    const g = new THREE.Group();
    const L = len + 42;
    const HALF = 7;
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(HALF * 2, L),
      new THREE.MeshStandardMaterial({
        map: texFrom(tileFloorTex("#1b1a22", "rgba(140,130,160,0.3)"), [10, L / 4]),
        color: 0xc0b8d0,
        roughness: 0.75,
      })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.z = -L / 2 + 8;
    g.add(floor);
    const ceil = new THREE.Mesh(new THREE.PlaneGeometry(HALF * 2, L), M.lam(0x0c0a12));
    ceil.rotation.x = Math.PI / 2;
    ceil.position.set(0, 5.2, -L / 2 + 8);
    g.add(ceil);
    const wallTex = texFrom(plasterWallTex("#39304a"), [L / 9, 1]);
    for (const s of [-1, 1]) {
      const w = new THREE.Mesh(
        new THREE.PlaneGeometry(L, 5.2),
        new THREE.MeshStandardMaterial({ map: wallTex, color: 0xaa9cc0, roughness: 0.95 })
      );
      w.position.set(s * HALF, 2.6, -L / 2 + 8);
      w.rotation.y = -s * (Math.PI / 2);
      g.add(w);
    }

    // ── shop stalls lining both sides, each with a glowing DCC board ──
    const shops = [
      ["DCC CANTEEN", "#ff7ad9"],
      ["DCC CYBER CAFE", "#4fd8ff"],
      ["DCC STATIONERY", "#6cff96"],
      ["DCC XEROX", "#ffc06a"],
      ["DCC BOOK STALL", "#ff7ad9"],
      ["DCC CHAI POINT", "#ffc06a"],
    ];
    const shopLights: ReturnType<typeof lamp>[] = [];
    let si = 0;
    for (let z = -6; z > -(len + 22); z -= 8) {
      for (const s of [-1, 1]) {
        const [nm, acc] = shops[si++ % shops.length];
        // counter
        const counter = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.1, 3.2), M.lam(0x241d31));
        counter.position.set(s * (HALF - 0.55), 0.55, z);
        g.add(counter);
        const top = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.09, 3.3), M.lam(0x3a2f4c));
        top.position.set(s * (HALF - 0.55), 1.14, z);
        g.add(top);
        // awning
        const aw = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.08, 3.4), M.lam(0x50203a));
        aw.position.set(s * (HALF - 0.9), 2.5, z);
        aw.rotation.z = s * 0.18;
        g.add(aw);
        // DCC shop board
        addShopBoard(g, nm, s * (HALF - 0.12), 3.35, z, -s * (Math.PI / 2), 2.9, acc);
        // stall light
        shopLights.push(
          lamp(g, s * (HALF - 1.2), 2.25, z, parseInt(acc.slice(1), 16), 3.2, 11, 0.09)
        );
        // clutter on the counter
        for (let k = 0; k < 3; k++) {
          const jar = new THREE.Mesh(
            new THREE.CylinderGeometry(0.11, 0.11, 0.26, 8),
            M.lam(0x6a5a3a)
          );
          jar.position.set(s * (HALF - 0.55), 1.32, z - 1.1 + k * 1.1);
          g.add(jar);
        }
        addDeskPlate(g, s * (HALF - 0.9), 1.2, z + 1.3, -s * (Math.PI / 2));
      }
    }

    // ── canteen tables down the middle ──
    for (let z = -9; z > -(len + 18); z -= 7) {
      const tbl = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.85, 0.08, 12), M.lam(0x2e2438));
      tbl.position.set(0, 0.76, z);
      g.add(tbl);
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.14, 0.76, 8), M.lam(0x201a28));
      leg.position.set(0, 0.38, z);
      g.add(leg);
      for (let k = 0; k < 4; k++) {
        const a = (k / 4) * Math.PI * 2 + 0.4;
        const st = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.06, 8), M.lam(0x3d2b1f));
        st.position.set(Math.cos(a) * 1.45, 0.5, z + Math.sin(a) * 1.45);
        g.add(st);
        const sl = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.5, 6), M.lam(0x241a12));
        sl.position.set(Math.cos(a) * 1.45, 0.25, z + Math.sin(a) * 1.45);
        g.add(sl);
      }
      // abandoned steel plates
      const plate = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.17, 0.03, 10), M.lam(0x8d97a2));
      plate.position.set(0.3, 0.82, z + 0.2);
      g.add(plate);
    }

    // ── DCC computer lab at the far end ──
    const endZ = -(len + 26);
    const labFloor = new THREE.Mesh(
      new THREE.PlaneGeometry(HALF * 2, 9),
      new THREE.MeshStandardMaterial({ color: 0x1c2634, roughness: 0.7 })
    );
    labFloor.rotation.x = -Math.PI / 2;
    labFloor.position.set(0, 0.02, endZ + 4);
    g.add(labFloor);
    const screenMats: THREE.MeshBasicMaterial[] = [];
    for (let row = 0; row < 2; row++) {
      for (let i = -2; i <= 2; i++) {
        const dz = endZ + 6.5 - row * 3;
        const desk = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.07, 0.7), M.lam(0x2a3242));
        desk.position.set(i * 1.35, 0.76, dz);
        g.add(desk);
        for (const sx of [-0.45, 0.45]) {
          const lg2 = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.76, 0.6), M.lam(0x1d2430));
          lg2.position.set(i * 1.35 + sx, 0.38, dz);
          g.add(lg2);
        }
        const pc = addDccComputer(g, i * 1.35, 0.8, dz, Math.PI);
        screenMats.push(pc.screenMat);
      }
    }
    dccBoard(g, 0, 3.5, endZ, 8.6, 0, "#4fd8ff", "COMPUTER LAB · DIGITAL CAREER CENTER");
    lamp(g, 0, 4.2, endZ + 4, 0x9fd8ff, 5, 20, 0.16);
    addDccPylon(g, -5.4, endZ + 8, 2.4);

    // ── ceiling strip lights the whole way ──
    const strips: ReturnType<typeof lamp>[] = [];
    for (let z = -4; z > -(len + 24); z -= 6) {
      const hous = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.1, 0.3), M.lam(0x1a1622));
      hous.position.set(0, 5.05, z);
      g.add(hous);
      strips.push(lamp(g, 0, 4.9, z, 0xffe0f4, 3.6, 16, 0.1));
    }
    // hanging wires + posters
    for (let z = -10; z > -(len + 20); z -= 16) {
      addPoster(g, -HALF + 0.08, 3.2, z, Math.PI / 2, 0, 1.5);
      addPoster(g, HALF - 0.08, 3.2, z - 8, -Math.PI / 2, 1, 1.5);
    }

    return {
      group: g,
      update: (t) => {
        for (let i = 0; i < strips.length; i++) {
          const v = Math.random() < 0.02 ? 0.2 : 0.75 + 0.25 * Math.abs(Math.sin(t * 3 + i));
          strips[i].light.intensity = strips[i].base * v;
        }
        for (let i = 0; i < shopLights.length; i++)
          shopLights[i].light.intensity =
            shopLights[i].base * (0.7 + 0.3 * Math.sin(t * 2.4 + i * 1.3));
        for (let i = 0; i < screenMats.length; i++)
          screenMats[i].opacity = Math.random() < 0.03 ? 0.35 : 1;
      },
    };
  },
};

export const LEVELS: LevelSpec[] = [
  gateLevel,
  corridorLevel,
  canteenLevel,
  libraryLevel,
  hallLevel,
  roofLevel,
];

export function levelForNight(night: number): LevelSpec {
  return LEVELS[(night - 1) % LEVELS.length];
}

export { dccEmblemTex };
