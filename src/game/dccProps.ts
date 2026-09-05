import * as THREE from "three";
import { makeCanvas, texFrom, dccEmblemTex } from "./assets";

const cache: Record<string, THREE.Texture> = {};
function once(key: string, make: () => THREE.Texture) {
  if (!cache[key]) cache[key] = make();
  return cache[key];
}

/* ══════ textures ══════ */

/** vertical wall poster — DCC courses */
export function dccPosterTex(variant = 0) {
  return once(`poster${variant}`, () => {
    const { c, g } = makeCanvas(256, 384);
    const bgs = ["#0d1a2b", "#141026", "#0a1f1c"];
    const accents = ["#4fd8ff", "#ff7ad9", "#6cff96"];
    const acc = accents[variant % 3];
    g.fillStyle = bgs[variant % 3];
    g.fillRect(0, 0, 256, 384);
    const grad = g.createLinearGradient(0, 0, 0, 384);
    grad.addColorStop(0, "rgba(255,255,255,0.1)");
    grad.addColorStop(1, "rgba(0,0,0,0.5)");
    g.fillStyle = grad;
    g.fillRect(0, 0, 256, 384);
    g.strokeStyle = acc;
    g.lineWidth = 4;
    g.strokeRect(8, 8, 240, 368);
    // hexagon emblem
    g.save();
    g.translate(128, 96);
    g.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = (Math.PI / 3) * i - Math.PI / 2;
      const x = Math.cos(a) * 54;
      const y = Math.sin(a) * 54;
      i ? g.lineTo(x, y) : g.moveTo(x, y);
    }
    g.closePath();
    g.fillStyle = "#080f1c";
    g.fill();
    g.strokeStyle = acc;
    g.lineWidth = 4;
    g.stroke();
    g.fillStyle = "#eef7ff";
    g.font = 'bold 40px "Special Elite", monospace';
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.fillText("DCC", 0, 2);
    g.restore();
    g.textAlign = "center";
    g.fillStyle = "#f0f6ff";
    g.font = '27px "Special Elite", monospace';
    g.fillText("DIGITAL", 128, 186);
    g.fillText("CAREER", 128, 216);
    g.fillStyle = acc;
    g.fillText("CENTER", 128, 246);
    g.fillStyle = "rgba(230,240,255,0.65)";
    g.font = '15px "Special Elite", monospace';
    const lines = [
      ["COMPUTER COURSES", "ADMISSION OPEN"],
      ["TALLY · DTP · C++", "100% PLACEMENT"],
      ["O LEVEL · CCC", "NIGHT BATCH"],
    ][variant % 3];
    g.fillText(lines[0], 128, 288);
    g.fillText(lines[1], 128, 310);
    g.fillStyle = acc;
    g.font = '13px "Special Elite", monospace';
    g.fillText("VIDYA MANDIR CAMPUS", 128, 348);
    // grime + peeling corner
    for (let i = 0; i < 70; i++) {
      g.fillStyle = `rgba(0,0,0,${Math.random() * 0.4})`;
      g.fillRect(Math.random() * 256, Math.random() * 384, 3 + Math.random() * 30, 2 + Math.random() * 8);
    }
    g.fillStyle = "rgba(0,0,0,0.75)";
    g.beginPath();
    g.moveTo(256, 384);
    g.lineTo(190, 384);
    g.lineTo(256, 300);
    g.closePath();
    g.fill();
    return texFrom(c);
  });
}

/** small brass desk nameplate */
export function dccPlateTex() {
  return once("plate", () => {
    const { c, g } = makeCanvas(256, 64);
    const grad = g.createLinearGradient(0, 0, 0, 64);
    grad.addColorStop(0, "#7a6a3c");
    grad.addColorStop(0.5, "#c8b271");
    grad.addColorStop(1, "#5c4f2c");
    g.fillStyle = grad;
    g.fillRect(0, 0, 256, 64);
    g.strokeStyle = "#3a3018";
    g.lineWidth = 3;
    g.strokeRect(3, 3, 250, 58);
    g.fillStyle = "#20180a";
    g.font = 'bold 25px "Special Elite", monospace';
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.fillText("DCC · DIGITAL CAREER", 128, 24);
    g.font = '17px "Special Elite", monospace';
    g.fillText("CENTER — LAB 3", 128, 47);
    for (let i = 0; i < 30; i++) {
      g.fillStyle = `rgba(0,0,0,${Math.random() * 0.3})`;
      g.fillRect(Math.random() * 256, Math.random() * 64, 8, 2);
    }
    return texFrom(c);
  });
}

/** glowing shop board (canteen / cyber cafe strip) */
export function dccShopTex(name: string, accent = "#ff7ad9") {
  return once(`shop${name}`, () => {
    const { c, g } = makeCanvas(512, 128);
    g.fillStyle = "#0a0f18";
    g.fillRect(0, 0, 512, 128);
    g.strokeStyle = accent;
    g.lineWidth = 5;
    g.shadowColor = accent;
    g.shadowBlur = 24;
    g.strokeRect(8, 8, 496, 112);
    g.fillStyle = "#f4faff";
    g.font = '46px "Special Elite", monospace';
    g.textAlign = "left";
    g.textBaseline = "middle";
    g.fillText(name, 28, 58);
    g.shadowBlur = 12;
    g.fillStyle = accent;
    g.font = '19px "Special Elite", monospace';
    g.fillText("A DCC — DIGITAL CAREER CENTER UNIT", 30, 98);
    g.shadowBlur = 0;
    for (let i = 0; i < 40; i++) {
      g.fillStyle = `rgba(0,0,0,${Math.random() * 0.45})`;
      g.fillRect(Math.random() * 512, Math.random() * 128, 4 + Math.random() * 40, 3);
    }
    return texFrom(c);
  });
}

/** CRT monitor screen showing the DCC logo */
export function dccScreenTex() {
  return once("screen", () => {
    const { c, g } = makeCanvas(256, 192);
    g.fillStyle = "#04120f";
    g.fillRect(0, 0, 256, 192);
    g.strokeStyle = "#6cff96";
    g.lineWidth = 3;
    g.shadowColor = "#6cff96";
    g.shadowBlur = 18;
    g.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = (Math.PI / 3) * i - Math.PI / 2;
      const x = 128 + Math.cos(a) * 44;
      const y = 78 + Math.sin(a) * 44;
      i ? g.lineTo(x, y) : g.moveTo(x, y);
    }
    g.closePath();
    g.stroke();
    g.fillStyle = "#c8ffd8";
    g.font = 'bold 34px "Special Elite", monospace';
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.fillText("DCC", 128, 78);
    g.shadowBlur = 8;
    g.font = '15px "Special Elite", monospace';
    g.fillText("DIGITAL CAREER CENTER", 128, 142);
    g.fillStyle = "rgba(108,255,150,0.75)";
    g.font = '12px "Special Elite", monospace';
    g.fillText("> SYSTEM HAUNTED_", 128, 168);
    g.shadowBlur = 0;
    // scanlines
    g.fillStyle = "rgba(0,0,0,0.35)";
    for (let y = 0; y < 192; y += 3) g.fillRect(0, y, 256, 1);
    return texFrom(c);
  });
}

/* ══════ mesh helpers ══════ */

const lam = (c: number) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.9 });

/** flat wall poster (works on either side wall) */
export function addPoster(
  parent: THREE.Object3D,
  x: number, y: number, z: number, ry: number,
  variant = 0, scale = 1
) {
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(0.78 * scale, 1.17 * scale),
    new THREE.MeshStandardMaterial({
      map: dccPosterTex(variant),
      roughness: 0.95,
      emissive: 0xffffff,
      emissiveMap: dccPosterTex(variant),
      emissiveIntensity: 0.4,
    })
  );
  m.position.set(x, y, z);
  m.rotation.y = ry;
  m.rotation.z = (Math.random() - 0.5) * 0.06;
  parent.add(m);
  return m;
}

/** glowing DCC shop board above a stall */
export function addShopBoard(
  parent: THREE.Object3D,
  name: string,
  x: number, y: number, z: number, ry: number,
  w = 3.2,
  accent = "#ff7ad9"
) {
  const tex = dccShopTex(name, accent);
  const board = new THREE.Mesh(
    new THREE.PlaneGeometry(w, w / 4),
    new THREE.MeshBasicMaterial({ map: tex, toneMapped: false })
  );
  board.position.set(x, y, z);
  board.rotation.y = ry;
  parent.add(board);
  const box = new THREE.Mesh(new THREE.BoxGeometry(w + 0.14, w / 4 + 0.14, 0.12), lam(0x0c111c));
  box.position.set(x - Math.sin(ry) * 0.07, y, z - Math.cos(ry) * 0.07);
  box.rotation.y = ry;
  parent.add(box);
  return board;
}

/** desk nameplate on a small wedge */
export function addDeskPlate(parent: THREE.Object3D, x: number, y: number, z: number, ry = 0) {
  const g = new THREE.Group();
  const plate = new THREE.Mesh(
    new THREE.PlaneGeometry(0.5, 0.125),
    new THREE.MeshStandardMaterial({
      map: dccPlateTex(),
      roughness: 0.45,
      metalness: 0.65,
      emissive: 0xffe6a0,
      emissiveMap: dccPlateTex(),
      emissiveIntensity: 0.22,
    })
  );
  plate.position.y = 0.06;
  plate.rotation.x = -0.28;
  g.add(plate);
  const stand = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.03, 0.11), lam(0x2b2416));
  g.add(stand);
  g.position.set(x, y, z);
  g.rotation.y = ry;
  parent.add(g);
  return g;
}

/** CRT computer on a desk with a glowing DCC screen */
export function addDccComputer(parent: THREE.Object3D, x: number, y: number, z: number, ry = 0) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.4, 0.42), lam(0x2b2c28));
  body.position.y = 0.2;
  g.add(body);
  const screenMat = new THREE.MeshBasicMaterial({
    map: dccScreenTex(),
    toneMapped: false,
    transparent: true,
  });
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.35, 0.27), screenMat);
  screen.position.set(0, 0.21, 0.212);
  g.add(screen);
  const kb = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.03, 0.16), lam(0x33342f));
  kb.position.set(0, 0.015, 0.36);
  g.add(kb);
  g.position.set(x, y, z);
  g.rotation.y = ry;
  parent.add(g);
  return { group: g, screenMat };
}

/** free-standing DCC pylon sign with its own light */
export function addDccPylon(parent: THREE.Object3D, x: number, z: number, h = 3.4) {
  const g = new THREE.Group();
  const pole = new THREE.Mesh(new THREE.BoxGeometry(0.16, h, 0.16), lam(0x161d2a));
  pole.position.y = h / 2;
  g.add(pole);
  const panelTex = dccEmblemTex("#4fd8ff");
  for (const s of [0, Math.PI]) {
    const p = new THREE.Mesh(
      new THREE.PlaneGeometry(1.15, 1.15),
      new THREE.MeshBasicMaterial({ map: panelTex, toneMapped: false })
    );
    p.position.set(Math.sin(s) * 0.09, h + 0.5, Math.cos(s) * 0.09);
    p.rotation.y = s;
    g.add(p);
  }
  const box = new THREE.Mesh(new THREE.BoxGeometry(1.25, 1.25, 0.16), lam(0x0d1420));
  box.position.y = h + 0.5;
  g.add(box);
  g.position.set(x, 0, z);
  parent.add(g);
  const light = new THREE.PointLight(0x4fd8ff, 1.5, 9, 1.8);
  light.position.set(x, h + 0.5, z);
  parent.add(light);
  return g;
}
