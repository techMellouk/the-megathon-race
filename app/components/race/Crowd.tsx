'use client'
import { useLayoutEffect, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { UNIFORM_SAMPLES, ROAD_WIDTH, headingFromTangent } from "./trackPath";

// Thousands of cheering spectators rendered as two instanced meshes (bodies +
// heads). The "cheer" bob runs entirely on the GPU via a shader injection, so
// the per-frame cost is one uniform update regardless of crowd size. All the
// per-spectator placement is static and derived from a seeded PRNG, so it is
// computed once at module load.

const ROWS = 9;
const PER_ROW = 150;
const COUNT = ROWS * PER_ROW;

// Raked seating bowl, sitting just outside the trackside flags.
const O_INNER = ROAD_WIDTH / 2 + 12;
const O_OUTER = ROAD_WIDTH / 2 + 43;
const Y_INNER = 4;
const Y_OUTER = 25;

const SHIRTS = [
  "#ffd06a", "#f2b53a", "#e8e2d4", "#c9742e", "#2f8f57",
  "#3a6ea5", "#b0353b", "#ffffff", "#7a5cc0", "#e0b64a",
];

const crowdUniforms = { uTime: { value: 0 } };

const BOB = `
  float bob = max(0.0, sin(uTime * 6.5 + aPhase));
  transformed.y += bob * 0.55;
`;

function bobbingMaterial(base: THREE.MeshStandardMaterialParameters): THREE.MeshStandardMaterial {
  const material = new THREE.MeshStandardMaterial(base);
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = crowdUniforms.uTime;
    shader.vertexShader = `attribute float aPhase;\nuniform float uTime;\n${shader.vertexShader}`;
    shader.vertexShader = shader.vertexShader.replace(
      "#include <begin_vertex>",
      `#include <begin_vertex>\n${BOB}`,
    );
  };
  return material;
}

// Deterministic PRNG so the crowd layout is stable across renders/reloads.
function makeRng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function buildCrowd() {
  const rand = makeRng(0x9e3779b1);
  const phases = new Float32Array(COUNT);
  const matrices = new Float32Array(COUNT * 16);
  const colors = new Float32Array(COUNT * 3);

  const dummy = new THREE.Object3D();
  const col = new THREE.Color();
  const N = UNIFORM_SAMPLES.length;
  let k = 0;

  for (let r = 0; r < ROWS; r++) {
    const f = r / (ROWS - 1);
    const offset = O_INNER + (O_OUTER - O_INNER) * f;
    const y = Y_INNER + (Y_OUTER - Y_INNER) * f;
    for (let p = 0; p < PER_ROW; p++) {
      const t = (p + (r % 2) * 0.5) / PER_ROW; // stagger alternate rows
      const s = UNIFORM_SAMPLES[Math.floor(t * N) % N];
      const nx = s.tz; // outward normal
      const nz = -s.tx;
      const jitter = (rand() - 0.5) * 1.4; // along the row
      const px = s.x + nx * offset - nz * jitter;
      const pz = s.z + nz * offset + nx * jitter;

      dummy.position.set(px, y + (rand() - 0.5) * 0.25, pz);
      dummy.rotation.set(0, headingFromTangent(s.tx, s.tz), 0);
      const sc = 0.85 + rand() * 0.5;
      dummy.scale.set(sc, sc * (0.9 + rand() * 0.35), sc);
      dummy.updateMatrix();
      dummy.matrix.toArray(matrices, k * 16);

      phases[k] = rand() * Math.PI * 2;
      col.set(SHIRTS[(rand() * SHIRTS.length) | 0]);
      colors[k * 3] = col.r;
      colors[k * 3 + 1] = col.g;
      colors[k * 3 + 2] = col.b;
      k++;
    }
  }

  const bodyGeo = new THREE.BoxGeometry(0.7, 1.15, 0.5);
  bodyGeo.translate(0, 0.575, 0); // feet at instance origin
  bodyGeo.setAttribute("aPhase", new THREE.InstancedBufferAttribute(phases, 1));

  const headGeo = new THREE.SphereGeometry(0.32, 8, 8);
  headGeo.translate(0, 1.45, 0); // sit atop the body
  headGeo.setAttribute("aPhase", new THREE.InstancedBufferAttribute(phases, 1));

  return { bodyGeo, headGeo, matrices, colors };
}

const CROWD = buildCrowd();
const bodyMaterial = bobbingMaterial({ roughness: 0.85, metalness: 0 });
const headMaterial = bobbingMaterial({ color: "#d9a06b", roughness: 0.8 });

export default function Crowd() {
  const bodyRef = useRef<THREE.InstancedMesh>(null);
  const headRef = useRef<THREE.InstancedMesh>(null);

  useLayoutEffect(() => {
    for (const mesh of [bodyRef.current, headRef.current]) {
      if (!mesh) continue;
      mesh.instanceMatrix.array.set(CROWD.matrices);
      mesh.instanceMatrix.needsUpdate = true;
    }
    const body = bodyRef.current;
    if (body) {
      body.instanceColor = new THREE.InstancedBufferAttribute(CROWD.colors, 3);
      body.instanceColor.needsUpdate = true;
    }
  }, []);

  useFrame((state) => {
    crowdUniforms.uTime.value = state.clock.elapsedTime;
  });

  return (
    <group>
      <instancedMesh ref={bodyRef} args={[CROWD.bodyGeo, bodyMaterial, COUNT]} frustumCulled={false} />
      <instancedMesh ref={headRef} args={[CROWD.headGeo, headMaterial, COUNT]} frustumCulled={false} />
    </group>
  );
}
