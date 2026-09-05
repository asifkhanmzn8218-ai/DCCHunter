import * as THREE from "three";

export function makeCanvas(w: number, h: number) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return { c, g: c.getContext("2d")! };
}

export function texFrom(c: HTMLCanvasElement, repeat?: [number, number]) {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  if (repeat) {
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(repeat[0], repeat[1]);
  }
  return t;
}

export function radialTex(size: number, stops: [number, string][]) {
  const { c, g } = makeCanvas(size, size);
  const grad = g.createRadialGradient(size / 2, size / 2, 1, size / 2, size / 2, size / 2);
  for (const [o, col] of stops) grad.addColorStop(o, col);
  g.fillStyle = grad;
  g.fillRect(0, 0, size, size);
  return texFrom(c);
}

/* ---------------- DCC — Digital Career Center ---------------- */

/** Square emblem: hexagon + DCC monogram. Used on rifle, badge, props. */
export function dccEmblemTex(glow = "#4fd8ff") {
  const { c, g } = makeCanvas(256, 256);
  g.fillStyle = "#070b14";
  g.fillRect(0, 0, 256, 256);
  const hex = (r: number) => {
    g.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = (Math.PI / 3) * i - Math.PI / 2;
      const x = 128 + Math.cos(a) * r;
      const y = 128 + Math.sin(a) * r;
      i ? g.lineTo(x, y) : g.moveTo(x, y);
    }
    g.closePath();
  };
  g.fillStyle = "#0d1526";
  hex(112);
  g.fill();
  g.shadowColor = glow;
  g.shadowBlur = 26;
  g.strokeStyle = glow;
  g.lineWidth = 7;
  hex(112);
  g.stroke();
  hex(88);
  g.lineWidth = 2.5;
  g.strokeStyle = "rgba(255,255,255,0.35)";
  g.stroke();
  g.shadowBlur = 18;
  g.fillStyle = "#eaf6ff";
  g.font = 'bold 74px "Special Elite", monospace';
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.fillText("DCC", 128, 116);
  g.shadowBlur = 0;
  g.fillStyle = glow;
  g.font = '17px "Special Elite", monospace';
  g.fillText("EST. 2007", 128, 168);
  return texFrom(c);
}

/** Wide signboard: DCC emblem + full name. Hung in every location. */
export function dccBannerTex(sub = "DIGITAL CAREER CENTER", glow = "#4fd8ff", grime = true) {
  const { c, g } = makeCanvas(1024, 256);
  g.fillStyle = "#080d18";
  g.fillRect(0, 0, 1024, 256);
  const grad = g.createLinearGradient(0, 0, 0, 256);
  grad.addColorStop(0, "rgba(80,110,160,0.22)");
  grad.addColorStop(1, "rgba(0,0,0,0.4)");
  g.fillStyle = grad;
  g.fillRect(0, 0, 1024, 256);
  g.strokeStyle = glow;
  g.lineWidth = 6;
  g.shadowColor = glow;
  g.shadowBlur = 22;
  g.strokeRect(12, 12, 1000, 232);

  // emblem
  const cx = 140;
  const cy = 128;
  g.beginPath();
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 3) * i - Math.PI / 2;
    const x = cx + Math.cos(a) * 82;
    const y = cy + Math.sin(a) * 82;
    i ? g.lineTo(x, y) : g.moveTo(x, y);
  }
  g.closePath();
  g.fillStyle = "#0c1424";
  g.fill();
  g.lineWidth = 5;
  g.stroke();
  g.fillStyle = "#eaf6ff";
  g.font = 'bold 62px "Special Elite", monospace';
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.fillText("DCC", cx, cy);

  // text
  g.textAlign = "left";
  g.shadowBlur = 16;
  g.fillStyle = "#f2f7ff";
  g.font = '62px "Special Elite", monospace';
  g.fillText("DIGITAL CAREER", 250, 96);
  g.fillStyle = glow;
  g.fillText("CENTER", 250, 162);
  g.shadowBlur = 0;
  g.fillStyle = "rgba(210,225,245,0.6)";
  g.font = '22px "Special Elite", monospace';
  g.fillText(sub === "DIGITAL CAREER CENTER" ? "PARANORMAL FIELD UNIT · VIDYA MANDIR CAMPUS" : sub, 252, 208);

  if (grime) {
    for (let i = 0; i < 90; i++) {
      g.fillStyle = `rgba(0,0,0,${Math.random() * 0.4})`;
      const w = 4 + Math.random() * 60;
      g.fillRect(Math.random() * 1024, Math.random() * 256, w, 2 + Math.random() * 12);
    }
    g.strokeStyle = "rgba(0,0,0,0.55)";
    g.lineWidth = 3;
    for (let i = 0; i < 6; i++) {
      g.beginPath();
      const x = Math.random() * 1024;
      g.moveTo(x, 0);
      g.lineTo(x + (Math.random() - 0.5) * 120, 256);
      g.stroke();
    }
  }
  return texFrom(c);
}

/* ---------------- environment textures ---------------- */

export function tileFloorTex(base: string, line: string, dots = 300) {
  const { c, g } = makeCanvas(256, 256);
  g.fillStyle = base;
  g.fillRect(0, 0, 256, 256);
  g.strokeStyle = line;
  g.lineWidth = 3;
  g.strokeRect(0, 0, 128, 128);
  g.strokeRect(128, 128, 128, 128);
  g.strokeRect(0, 0, 256, 256);
  for (let i = 0; i < dots; i++) {
    g.fillStyle = `rgba(255,255,255,${Math.random() * 0.05})`;
    g.fillRect(Math.random() * 256, Math.random() * 256, 2, 2);
  }
  return c;
}

export function plasterWallTex(base: string, crackCol = "rgba(0,0,0,0.5)") {
  const { c, g } = makeCanvas(256, 256);
  g.fillStyle = base;
  g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 200; i++) {
    g.fillStyle = `rgba(${Math.random() * 40},${Math.random() * 40},${Math.random() * 50},0.25)`;
    g.fillRect(Math.random() * 256, Math.random() * 256, 3 + Math.random() * 20, 3 + Math.random() * 8);
  }
  g.strokeStyle = crackCol;
  g.lineWidth = 2;
  for (let i = 0; i < 7; i++) {
    g.beginPath();
    let x = Math.random() * 256;
    let y = Math.random() * 256;
    g.moveTo(x, y);
    for (let k = 0; k < 5; k++) {
      x += (Math.random() - 0.5) * 60;
      y += Math.random() * 40;
      g.lineTo(x, y);
    }
    g.stroke();
  }
  return c;
}

export function bookshelfTex() {
  const { c, g } = makeCanvas(256, 256);
  g.fillStyle = "#160f08";
  g.fillRect(0, 0, 256, 256);
  const cols = ["#6b2b22", "#2c4a63", "#5c5124", "#4a2352", "#23503a", "#7a3520", "#3a3f5c"];
  for (let shelf = 0; shelf < 4; shelf++) {
    const y0 = shelf * 64;
    g.fillStyle = "#241708";
    g.fillRect(0, y0 + 56, 256, 8);
    let x = 3;
    while (x < 250) {
      const w = 6 + Math.random() * 13;
      const h = 34 + Math.random() * 20;
      g.fillStyle = cols[(Math.random() * cols.length) | 0];
      g.fillRect(x, y0 + 56 - h, w, h);
      g.fillStyle = "rgba(0,0,0,0.35)";
      g.fillRect(x + w - 2, y0 + 56 - h, 2, h);
      g.fillStyle = "rgba(255,240,200,0.13)";
      g.fillRect(x + 1, y0 + 56 - h + 5, w - 3, 2);
      x += w + 1 + Math.random() * 2;
    }
  }
  g.fillStyle = "rgba(0,0,0,0.4)";
  for (let i = 0; i < 60; i++)
    g.fillRect(Math.random() * 256, Math.random() * 256, 8 + Math.random() * 30, 3);
  return c;
}

export function lockerTex() {
  const { c, g } = makeCanvas(128, 256);
  g.fillStyle = "#1b2a33";
  g.fillRect(0, 0, 128, 256);
  for (let i = 0; i < 2; i++) {
    const x = i * 64;
    g.fillStyle = "#22343f";
    g.fillRect(x + 3, 4, 58, 248);
    g.strokeStyle = "#0d161c";
    g.lineWidth = 3;
    g.strokeRect(x + 3, 4, 58, 248);
    g.fillStyle = "#0d161c";
    for (let v = 0; v < 4; v++) g.fillRect(x + 14, 22 + v * 7, 36, 3);
    g.fillStyle = "#95a7b0";
    g.fillRect(x + 48, 128, 7, 14);
    g.fillStyle = "rgba(120,40,20,0.35)";
    g.fillRect(x + 6, 150 + Math.random() * 60, 40 + Math.random() * 15, 30);
  }
  return c;
}

export function classDoorTex(nameplate: string) {
  const { c, g } = makeCanvas(128, 256);
  g.fillStyle = "#2a1d10";
  g.fillRect(0, 0, 128, 256);
  g.strokeStyle = "#150e07";
  g.lineWidth = 5;
  g.strokeRect(8, 8, 112, 240);
  g.fillStyle = "#1d1309";
  g.fillRect(18, 24, 92, 84);
  g.fillStyle = "rgba(90,180,120,0.22)";
  g.fillRect(22, 28, 84, 76);
  g.fillStyle = "rgba(0,0,0,0.75)";
  for (let i = 0; i < 5; i++)
    g.fillRect(22, 30 + i * 15, 84, 2);
  g.fillRect(18, 130, 92, 100);
  g.fillStyle = "#c8b98a";
  g.fillRect(30, 150, 68, 26);
  g.fillStyle = "#181008";
  g.font = 'bold 20px "Special Elite", monospace';
  g.textAlign = "center";
  g.fillText(nameplate, 64, 169);
  g.fillStyle = "#b9c4cc";
  g.beginPath();
  g.arc(100, 190, 5, 0, Math.PI * 2);
  g.fill();
  return c;
}

export function chalkboardTex(text: string) {
  const { c, g } = makeCanvas(512, 256);
  g.fillStyle = "#101c16";
  g.fillRect(0, 0, 512, 256);
  for (let i = 0; i < 400; i++) {
    g.fillStyle = `rgba(220,235,225,${Math.random() * 0.05})`;
    g.fillRect(Math.random() * 512, Math.random() * 256, 20, 3);
  }
  g.strokeStyle = "#3d2a17";
  g.lineWidth = 14;
  g.strokeRect(7, 7, 498, 242);
  g.fillStyle = "rgba(235,245,238,0.82)";
  g.font = '46px "Special Elite", monospace';
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.fillText(text, 256, 118);
  g.strokeStyle = "rgba(235,245,238,0.5)";
  g.lineWidth = 3;
  g.beginPath();
  g.moveTo(120, 158);
  g.lineTo(392, 158);
  g.stroke();
  return c;
}

export function curtainTex(base: string, shade: string) {
  const { c, g } = makeCanvas(256, 256);
  g.fillStyle = base;
  g.fillRect(0, 0, 256, 256);
  for (let x = 0; x < 256; x += 16) {
    const grad = g.createLinearGradient(x, 0, x + 16, 0);
    grad.addColorStop(0, shade);
    grad.addColorStop(0.5, base);
    grad.addColorStop(1, shade);
    g.fillStyle = grad;
    g.fillRect(x, 0, 16, 256);
  }
  return c;
}

export function noiseGroundTex(base: string, spot: string) {
  const { c, g } = makeCanvas(256, 256);
  g.fillStyle = base;
  g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 900; i++) {
    g.fillStyle = Math.random() < 0.5 ? spot : "rgba(255,255,255,0.03)";
    g.fillRect(Math.random() * 256, Math.random() * 256, 2 + Math.random() * 4, 2);
  }
  return c;
}

export function disposeObject(root: THREE.Object3D) {
  root.traverse((o) => {
    const m = o as THREE.Mesh;
    if (m.geometry) m.geometry.dispose();
    const mat = m.material as THREE.Material | THREE.Material[] | undefined;
    const kill = (x: THREE.Material) => {
      const anyM = x as unknown as { map?: THREE.Texture };
      anyM.map?.dispose();
      x.dispose();
    };
    if (Array.isArray(mat)) mat.forEach(kill);
    else if (mat) kill(mat);
    const s = o as THREE.Sprite;
    if (s.isSprite) {
      s.material.map?.dispose();
      s.material.dispose();
    }
  });
}
