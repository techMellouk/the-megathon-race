'use client'
import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Sparkles, Stars } from "@react-three/drei";
import * as THREE from "three";
import Track from "./Track";
import Arena from "./Arena";
import Stadium from "./Stadium";
import PlayerCar from "./PlayerCar";
import OpponentCar from "./OpponentCar";
import { usePlayerControls } from "./usePlayerControls";
import type { LeaderboardEntry, RacePhase } from "./useRaceState";
import {
  TRACK_LENGTH,
  TOTAL_LAPS,
  pointAtDistance,
  progressFromPosition,
  headingFromTangent,
} from "./trackPath";

// --- Car physics tuning (velocity-vector arcade model with grip + drag) ---
const ENGINE_ACCEL = 75; // throttle force
const BRAKE_ACCEL = 120; // braking force
const REVERSE_ACCEL = 38;
const AIR_DRAG = 0.004; // ~v^2 air resistance -> natural top speed
const ROLL_DRAG = 0.25; // linear rolling resistance
const MAX_SPEED = 112; // hard clamp
const STEER_RATE = 2.0; // rad/s at speed
const GRIP = 3.2; // how fast lateral slide is killed (higher = more grip)

// --- Chase camera (low + close, looking ahead down the track) ---
const CAM_DIST = 18;
const CAM_HEIGHT = 8.5;
const LOOK_AHEAD = 7;

type PlayerSim = {
  posX: number;
  posZ: number;
  heading: number;
  vx: number;
  vz: number;
  forwardSpeed: number;
  lap: number;
  progress: number;
  prevProgress: number;
  finished: boolean;
  finishTime: number | null;
};

type OppSim = {
  id: string;
  label: string;
  color: string;
  speed: number;
  lane: number;
  dist: number;
  finished: boolean;
  finishTime: number | null;
};

type Props = {
  modelId?: string;
  phase: RacePhase;
  onReport: (next: { rank: number; lap: number; speed: number }) => void;
  onFinish: (board: LeaderboardEntry[]) => void;
};

// Two searchlights mounted high that slowly sweep across the arena for vibe.
function SweepLights() {
  const targetA = useMemo(() => new THREE.Object3D(), []);
  const targetB = useMemo(() => new THREE.Object3D(), []);
  const lightA = useRef<THREE.SpotLight>(null);
  const lightB = useRef<THREE.SpotLight>(null);

  useEffect(() => {
    if (lightA.current) lightA.current.target = targetA;
    if (lightB.current) lightB.current.target = targetB;
  }, [targetA, targetB]);

  useFrame((state) => {
    const e = state.clock.elapsedTime;
    targetA.position.set(Math.sin(e * 0.35) * 120, 0, Math.cos(e * 0.27) * 85);
    targetA.updateMatrixWorld();
    targetB.position.set(Math.sin(e * 0.31 + 2.2) * 120, 0, Math.cos(e * 0.34 + 1) * 85);
    targetB.updateMatrixWorld();
  });

  return (
    <>
      <primitive object={targetA} />
      <primitive object={targetB} />
      <spotLight
        ref={lightA}
        position={[150, 95, 130]}
        angle={0.34}
        penumbra={0.9}
        intensity={1100}
        distance={560}
        decay={1.15}
        color="#ffe6b0"
      />
      <spotLight
        ref={lightB}
        position={[-150, 95, -120]}
        angle={0.34}
        penumbra={0.9}
        intensity={1100}
        distance={560}
        decay={1.15}
        color="#ffd79a"
      />
    </>
  );
}

const OPPONENTS: Omit<OppSim, "dist" | "finished" | "finishTime">[] = [
  { id: "cpu-1", label: "Rival 1", color: "#e2b007", speed: 86, lane: -5 },
  { id: "cpu-2", label: "Rival 2", color: "#22a55b", speed: 92, lane: 5 },
  { id: "cpu-3", label: "Rival 3", color: "#7c3aed", speed: 80, lane: -1.5 },
];
const START_OFFSETS = [6, 10, 2];

export default function RaceScene({ modelId, phase, onReport, onFinish }: Props) {
  const controls = usePlayerControls();
  const { camera } = useThree();

  const playerRef = useRef<THREE.Group>(null);
  const playerLeanRef = useRef<THREE.Group>(null);
  const oppRefs = useRef<(THREE.Group | null)[]>([]);
  const clockRef = useRef(0);
  const reportedFinish = useRef(false);
  const phaseRef = useRef<RacePhase>(phase);
  phaseRef.current = phase;

  const sim = useRef<{ player: PlayerSim; opponents: OppSim[] } | null>(null);
  if (!sim.current) {
    const s0 = pointAtDistance(0);
    const startProgress = progressFromPosition(s0.x, s0.z);
    sim.current = {
      player: {
        posX: s0.x,
        posZ: s0.z,
        heading: headingFromTangent(s0.tx, s0.tz),
        vx: 0,
        vz: 0,
        forwardSpeed: 0,
        lap: 0,
        progress: startProgress,
        prevProgress: startProgress,
        finished: false,
        finishTime: null,
      },
      opponents: OPPONENTS.map((o, i) => ({
        ...o,
        dist: START_OFFSETS[i] ?? i * 4,
        finished: false,
        finishTime: null,
      })),
    };
  }

  const opponentColors = useMemo(() => OPPONENTS.map((o) => o.color), []);
  const camPos = useMemo(() => new THREE.Vector3(), []);
  const lookAt = useMemo(() => new THREE.Vector3(), []);

  useEffect(() => {
    const p = sim.current!.player;
    camera.position.set(
      p.posX - Math.sin(p.heading) * CAM_DIST,
      CAM_HEIGHT,
      p.posZ - Math.cos(p.heading) * CAM_DIST,
    );
    camera.lookAt(p.posX, 2.5, p.posZ);
  }, [camera]);

  function computeRanking() {
    const s = sim.current!;
    const entries = [
      {
        id: "player",
        label: "You",
        isPlayer: true,
        finished: s.player.finished,
        finishTime: s.player.finishTime,
        cum: s.player.lap + s.player.progress,
      },
      ...s.opponents.map((o) => ({
        id: o.id,
        label: o.label,
        isPlayer: false,
        finished: o.finished,
        finishTime: o.finishTime,
        cum: o.dist / TRACK_LENGTH,
      })),
    ];
    entries.sort((a, b) => {
      if (a.finished && b.finished) return (a.finishTime ?? 0) - (b.finishTime ?? 0);
      if (a.finished) return -1;
      if (b.finished) return 1;
      return b.cum - a.cum;
    });
    return entries;
  }

  useFrame((_, rawDelta) => {
    const s = sim.current!;
    const player = s.player;
    const dt = Math.min(rawDelta, 0.05);
    const racing = phaseRef.current === "racing";
    const c = controls.current;

    let steerInput = 0;

    if (racing) {
      clockRef.current += dt;

      // Forward unit vector from heading.
      let fx = Math.sin(player.heading);
      let fz = Math.cos(player.heading);
      const forwardSpeed = player.vx * fx + player.vz * fz;

      // Longitudinal acceleration.
      let accel = 0;
      if (c.throttle) accel += ENGINE_ACCEL;
      if (c.brake) accel -= forwardSpeed > 0.5 ? BRAKE_ACCEL : REVERSE_ACCEL;
      player.vx += fx * accel * dt;
      player.vz += fz * accel * dt;

      // Air + rolling resistance opposing motion.
      let speed = Math.hypot(player.vx, player.vz);
      if (speed > 0.0001) {
        const dragMag = Math.min(
          (AIR_DRAG * speed * speed + ROLL_DRAG * speed) * dt,
          speed,
        );
        player.vx -= (player.vx / speed) * dragMag;
        player.vz -= (player.vz / speed) * dragMag;
      }

      // Steering (scaled by speed, reversed when going backwards).
      steerInput = (c.left ? 1 : 0) - (c.right ? 1 : 0);
      const speedFactor = Math.min(speed / 12, 1);
      const dir = forwardSpeed >= 0 ? 1 : -1;
      player.heading += steerInput * STEER_RATE * dt * speedFactor * dir;

      // Tire grip: kill most of the lateral velocity each frame.
      fx = Math.sin(player.heading);
      fz = Math.cos(player.heading);
      const vForward = player.vx * fx + player.vz * fz;
      const latx = player.vx - fx * vForward;
      const latz = player.vz - fz * vForward;
      const keep = Math.exp(-GRIP * dt);
      player.vx = fx * vForward + latx * keep;
      player.vz = fz * vForward + latz * keep;

      // Clamp top speed.
      speed = Math.hypot(player.vx, player.vz);
      if (speed > MAX_SPEED) {
        player.vx = (player.vx / speed) * MAX_SPEED;
        player.vz = (player.vz / speed) * MAX_SPEED;
      }

      player.forwardSpeed = player.vx * fx + player.vz * fz;
      player.posX += player.vx * dt;
      player.posZ += player.vz * dt;

      // Lap tracking via progress wrap.
      const p = progressFromPosition(player.posX, player.posZ);
      const dp = p - player.prevProgress;
      if (dp < -0.5) player.lap += 1;
      else if (dp > 0.5) player.lap -= 1;
      player.prevProgress = p;
      player.progress = p;

      if (!player.finished && player.lap >= TOTAL_LAPS) {
        player.finished = true;
        player.finishTime = clockRef.current;
      }

      for (const o of s.opponents) {
        if (!o.finished) {
          o.dist += o.speed * dt;
          if (o.dist >= TOTAL_LAPS * TRACK_LENGTH) {
            o.finished = true;
            o.finishTime = clockRef.current;
          }
        }
      }
    }

    // Apply transforms every frame (so the grid is visible during countdown).
    if (playerRef.current) {
      playerRef.current.position.set(player.posX, 0, player.posZ);
      playerRef.current.rotation.y = player.heading;
    }
    if (playerLeanRef.current) {
      const speedFactor = Math.min(Math.hypot(player.vx, player.vz) / 12, 1);
      const targetRoll = -steerInput * 0.1 * speedFactor;
      playerLeanRef.current.rotation.z +=
        (targetRoll - playerLeanRef.current.rotation.z) * Math.min(1, dt * 8);
    }
    s.opponents.forEach((o, i) => {
      const g = oppRefs.current[i];
      if (!g) return;
      const sample = pointAtDistance(o.dist);
      const nx = sample.tz;
      const nz = -sample.tx;
      g.position.set(sample.x + nx * o.lane, 0, sample.z + nz * o.lane);
      g.rotation.y = headingFromTangent(sample.tx, sample.tz);
    });

    // Chase camera.
    const fx = Math.sin(player.heading);
    const fz = Math.cos(player.heading);
    camPos.set(player.posX - fx * CAM_DIST, CAM_HEIGHT, player.posZ - fz * CAM_DIST);
    camera.position.lerp(camPos, 1 - Math.pow(0.0015, dt));
    lookAt.set(player.posX + fx * LOOK_AHEAD, 2.5, player.posZ + fz * LOOK_AHEAD);
    camera.lookAt(lookAt);

    // HUD + finish.
    const ranking = computeRanking();
    const rank = ranking.findIndex((e) => e.isPlayer) + 1;
    const displayLap = Math.max(1, Math.min(player.lap + 1, TOTAL_LAPS));
    const displaySpeed = Math.round(Math.abs(player.forwardSpeed) * 2.2);
    onReport({ rank, lap: displayLap, speed: displaySpeed });

    if (player.finished && !reportedFinish.current) {
      reportedFinish.current = true;
      onFinish(
        ranking.map((e) => ({
          id: e.id,
          label: e.label,
          isPlayer: e.isPlayer,
          finished: e.finished,
          finishTime: e.finishTime,
        })),
      );
    }
  });

  return (
    <>
      <color attach="background" args={["#0a0806"]} />
      <fog attach="fog" args={["#160f08", 220, 720]} />

      <Stars radius={520} depth={120} count={2600} factor={7} saturation={0} fade speed={0.5} />

      <hemisphereLight args={["#5a4a2a", "#08060a", 0.7]} />
      <ambientLight intensity={0.32} />
      <directionalLight color="#ffe2ac" position={[90, 150, 50]} intensity={1.4} />
      <directionalLight color="#b88a3a" position={[-80, 60, -40]} intensity={0.5} />
      <SweepLights />

      <Track />
      <Arena />
      <Stadium />

      <Sparkles count={150} scale={[440, 70, 340]} position={[0, 34, 0]} size={9} speed={0.4} color="#ffd06a" opacity={0.7} noise={1.4} />
      <Sparkles count={90} scale={[440, 22, 340]} position={[0, 12, 0]} size={5} speed={0.25} color="#fff0c0" opacity={0.5} />

      <group ref={playerRef}>
        <group ref={playerLeanRef}>
          <PlayerCar modelId={modelId} color="#2f6bff" />
        </group>
      </group>

      {OPPONENTS.map((o, i) => (
        <group
          key={o.id}
          ref={(el) => {
            oppRefs.current[i] = el;
          }}
        >
          <OpponentCar color={opponentColors[i]} />
        </group>
      ))}
    </>
  );
}
