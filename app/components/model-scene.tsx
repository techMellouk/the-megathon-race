"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import {
  Bounds,
  Center,
  ContactShadows,
  Environment,
  Grid,
  OrbitControls,
  useGLTF,
} from "@react-three/drei";
import { Suspense, useEffect, useMemo, useRef } from "react";
import * as THREE from "three";

type SceneStatus = "generating" | "ready" | "error";

type ModelSceneProps = {
  modelUrl: string | null;
  status: SceneStatus;
};

function LoadingSculpture() {
  const groupRef = useRef<THREE.Group>(null);
  const scanRef = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    const elapsed = clock.getElapsedTime();

    if (groupRef.current) {
      groupRef.current.rotation.x = Math.sin(elapsed * 0.42) * 0.18;
      groupRef.current.rotation.y = elapsed * 0.48;
    }

    if (scanRef.current) {
      scanRef.current.position.y = Math.sin(elapsed * 1.35) * 0.86;
      scanRef.current.scale.setScalar(0.92 + Math.sin(elapsed * 2) * 0.045);
    }
  });

  return (
    <group ref={groupRef} position={[0, 0.12, 0]} scale={0.72}>
      <mesh castShadow>
        <icosahedronGeometry args={[0.92, 2]} />
        <meshStandardMaterial
          color="#e8eef0"
          metalness={0.38}
          opacity={0.24}
          roughness={0.24}
          transparent
          wireframe
        />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[1.32, 0.012, 16, 160]} />
        <meshBasicMaterial color="#ff5f45" transparent opacity={0.8} />
      </mesh>
      <mesh rotation={[0, Math.PI / 2, 0]}>
        <torusGeometry args={[1.18, 0.008, 16, 160]} />
        <meshBasicMaterial color="#62d7ff" transparent opacity={0.58} />
      </mesh>
      <mesh ref={scanRef}>
        <torusGeometry args={[1.05, 0.018, 16, 180]} />
        <meshBasicMaterial color="#ffd26a" transparent opacity={0.82} />
      </mesh>
      <pointLight color="#ff684f" intensity={16} position={[1.8, 1.2, 1.8]} />
      <pointLight color="#69d7ff" intensity={12} position={[-1.6, -0.5, 1.5]} />
    </group>
  );
}

function GeneratedModel({ url }: { url: string }) {
  const gltf = useGLTF(url);
  const scene = useMemo(() => gltf.scene.clone(true), [gltf.scene]);

  useEffect(() => {
    scene.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        object.castShadow = true;
        object.receiveShadow = true;
      }
    });
  }, [scene]);

  return <primitive object={scene} />;
}

export default function ModelScene({ modelUrl, status }: ModelSceneProps) {
  const showModel = status === "ready" && modelUrl;

  return (
    <Canvas
      shadows
      camera={{ fov: 38, position: [0, 1.25, 4.8] }}
      className="model-canvas"
      dpr={[1, 2]}
      gl={{ antialias: true, alpha: true }}
    >
      <fog attach="fog" args={["#0b0d14", 7, 18]} />
      <ambientLight intensity={0.72} />
      <directionalLight castShadow intensity={2.4} position={[4, 5, 4]} />
      <directionalLight intensity={0.85} position={[-4, 2, -3]} />
      <spotLight
        angle={0.45}
        color="#fff3d0"
        intensity={32}
        penumbra={0.8}
        position={[0, 5, 3]}
      />
      <Environment preset="city" />
      <Grid
        cellColor="#242424"
        cellSize={0.62}
        fadeDistance={15}
        fadeStrength={1.45}
        followCamera={false}
        infiniteGrid
        position={[0, -1.18, 0]}
        sectionColor="#4d4d4d"
        sectionSize={3.1}
      />
      <ContactShadows
        blur={2.8}
        far={4.6}
        opacity={0.42}
        position={[0, -1.16, 0]}
        scale={8}
      />
      <Suspense fallback={<LoadingSculpture />}>
        {showModel ? (
          <Bounds fit clip observe margin={2.2}>
            <Center>
              <GeneratedModel url={modelUrl} />
            </Center>
          </Bounds>
        ) : (
          <LoadingSculpture />
        )}
      </Suspense>
      <OrbitControls
        autoRotate={status === "generating"}
        autoRotateSpeed={0.65}
        dampingFactor={0.08}
        enableDamping
        enablePan={false}
        maxDistance={8}
        minDistance={1.7}
      />
    </Canvas>
  );
}
