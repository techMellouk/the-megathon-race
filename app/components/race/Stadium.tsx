'use client'
import { useMemo } from "react";
import * as THREE from "three";
import { UNIFORM_SAMPLES, ROAD_WIDTH } from "./trackPath";
import Crowd from "./Crowd";

// A full stadium bowl that encloses the circuit: a raked seating slope (filled
// with a crowd texture so it reads as packed even between the 3D spectators),
// retaining/back walls, glowing gold rails and a ring of MEGATHON ad boards.

const GOLD = "#f2b53a";
const GOLD_BRIGHT = "#ffd06a";
const HALF = ROAD_WIDTH / 2;

type Edge = { offset: number; y: number };

/** Build a quad-strip ribbon around the loop between two profile edges. */
function buildStrip(a: Edge, b: Edge, side: number, uRepeat: number, vRepeat = 1): THREE.BufferGeometry {
  const N = UNIFORM_SAMPLES.length;
  const pos: number[] = [];
  const uv: number[] = [];
  const idx: number[] = [];
  for (let i = 0; i <= N; i++) {
    const s = UNIFORM_SAMPLES[i % N];
    const nx = s.tz * side;
    const nz = -s.tx * side;
    pos.push(s.x + nx * a.offset, a.y, s.z + nz * a.offset);
    pos.push(s.x + nx * b.offset, b.y, s.z + nz * b.offset);
    const u = (i / N) * uRepeat;
    uv.push(u, 0, u, vRepeat);
  }
  for (let i = 0; i < N; i++) {
    const a0 = i * 2;
    const b0 = i * 2 + 1;
    const a1 = i * 2 + 2;
    const b1 = i * 2 + 3;
    idx.push(a0, b0, a1, b0, b1, a1);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  return geo;
}

function makeCrowdTex(): THREE.Texture | null {
  if (typeof document === "undefined") return null;
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 256;
  const ctx = c.getContext("2d");
  if (!ctx) return null;
  ctx.fillStyle = "#09080a";
  ctx.fillRect(0, 0, 256, 256);
  const palette = ["#ffd06a", "#f2b53a", "#d7d2c6", "#9a7b3a", "#fff4d6", "#b0353b", "#3a6ea5", "#2f8f57"];
  for (let i = 0; i < 2600; i++) {
    ctx.fillStyle = palette[(Math.random() * palette.length) | 0];
    ctx.globalAlpha = 0.45 + Math.random() * 0.55;
    ctx.fillRect(Math.random() * 256, Math.random() * 256, 3, 3);
  }
  ctx.globalAlpha = 1;
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

function makePennantTex(): THREE.Texture | null {
  if (typeof document === "undefined") return null;
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 128;
  const ctx = c.getContext("2d");
  if (!ctx) return null;
  ctx.clearRect(0, 0, 256, 128);
  // top string
  ctx.fillStyle = "#d7c9a8";
  ctx.fillRect(0, 0, 256, 8);
  // alternating triangular pennants hanging down
  const cols = [GOLD_BRIGHT, "#fff4d6", GOLD, "#c0922f"];
  const w = 32;
  for (let i = 0; i < 256 / w; i++) {
    ctx.fillStyle = cols[i % cols.length];
    ctx.beginPath();
    ctx.moveTo(i * w + 2, 8);
    ctx.lineTo((i + 1) * w - 2, 8);
    ctx.lineTo(i * w + w / 2, 118);
    ctx.closePath();
    ctx.fill();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.anisotropy = 4;
  return tex;
}

function makeAdTex(): THREE.Texture | null {
  if (typeof document === "undefined") return null;
  const c = document.createElement("canvas");
  c.width = 512;
  c.height = 128;
  const ctx = c.getContext("2d");
  if (!ctx) return null;
  ctx.fillStyle = "#0c0a07";
  ctx.fillRect(0, 0, 512, 128);
  ctx.fillStyle = GOLD_BRIGHT;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = "900 64px 'Arial Narrow', Impact, sans-serif";
  ctx.fillText("MEGATHON", 256, 70);
  ctx.fillStyle = GOLD;
  ctx.fillRect(0, 8, 512, 5);
  ctx.fillRect(0, 115, 512, 5);
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.anisotropy = 8;
  return tex;
}

export default function Stadium() {
  const crowdTex = useMemo(() => makeCrowdTex(), []);
  const adTex = useMemo(() => makeAdTex(), []);
  const pennantTex = useMemo(() => makePennantTex(), []);

  const frontWall = useMemo(() => buildStrip({ offset: HALF + 10.5, y: 0 }, { offset: HALF + 11, y: 3.6 }, 1, 1), []);
  const frontRail = useMemo(() => buildStrip({ offset: HALF + 10.2, y: 3.6 }, { offset: HALF + 11.3, y: 4.05 }, 1, 1), []);
  const seating = useMemo(() => buildStrip({ offset: HALF + 11, y: 3.7 }, { offset: HALF + 43.5, y: 25.2 }, 1, 150, 9), []);
  const backWall = useMemo(() => buildStrip({ offset: HALF + 43.5, y: 25.2 }, { offset: HALF + 45.6, y: 40 }, 1, 60, 3), []);
  const topRim = useMemo(() => buildStrip({ offset: HALF + 45.4, y: 40 }, { offset: HALF + 46.3, y: 40.4 }, 1, 1), []);
  const adBoards = useMemo(() => buildStrip({ offset: HALF + 7.5, y: 0.3 }, { offset: HALF + 7.5, y: 3.5 }, 1, 34), []);
  // Pennant bunting strung around the infield edge.
  const bunting = useMemo(() => buildStrip({ offset: HALF + 2.5, y: 4.7 }, { offset: HALF + 2.5, y: 2.9 }, -1, 52), []);

  return (
    <group>
      <mesh geometry={frontWall}>
        <meshStandardMaterial color="#100d09" side={THREE.DoubleSide} metalness={0.3} roughness={0.8} />
      </mesh>
      <mesh geometry={frontRail}>
        <meshStandardMaterial
          color={GOLD}
          emissive={GOLD}
          emissiveIntensity={0.55}
          side={THREE.DoubleSide}
          metalness={0.5}
          roughness={0.4}
        />
      </mesh>

      <mesh geometry={seating}>
        <meshStandardMaterial
          map={crowdTex ?? undefined}
          color={crowdTex ? "#ffffff" : "#161310"}
          side={THREE.DoubleSide}
          roughness={1}
          metalness={0}
        />
      </mesh>

      <mesh geometry={backWall}>
        <meshStandardMaterial color="#0b0a07" side={THREE.DoubleSide} metalness={0.35} roughness={0.7} />
      </mesh>
      <mesh geometry={topRim}>
        <meshBasicMaterial color={GOLD_BRIGHT} side={THREE.DoubleSide} toneMapped={false} />
      </mesh>

      <mesh geometry={adBoards}>
        <meshBasicMaterial map={adTex ?? undefined} color={adTex ? "#ffffff" : GOLD} side={THREE.DoubleSide} toneMapped={false} />
      </mesh>

      {pennantTex ? (
        <mesh geometry={bunting}>
          <meshBasicMaterial
            map={pennantTex}
            side={THREE.DoubleSide}
            transparent
            alphaTest={0.4}
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>
      ) : null}

      <Crowd />
    </group>
  );
}
