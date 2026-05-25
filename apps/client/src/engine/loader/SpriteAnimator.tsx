import { useFrame, useLoader } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import { Mesh, NearestFilter, type Texture, TextureLoader } from 'three';

interface SpriteAnimatorProps {
  /** Array of PNG paths under public/, frame order = animation order. */
  frames: readonly string[];
  /** Frames per second when playing. */
  fps?: number;
  /** True to advance frames; false to lock to frame 0 (idle). */
  playing?: boolean;
  height?: number;
  yOffset?: number;
  billboard?: boolean;
  pixelated?: boolean;
}

/**
 * Renders an animated 2D sprite as a billboarded plane. Frame textures are all
 * loaded up-front via useLoader; we swap mesh.material.map every tick.
 */
export function SpriteAnimator({
  frames,
  fps = 6,
  playing = true,
  height = 1.6,
  yOffset = 0,
  billboard = true,
  pixelated = true,
}: SpriteAnimatorProps) {
  // Load every frame. useLoader is fine with arrays.
  const paths = useMemo(() => frames.map((f) => `/${f}`), [frames]);
  const textures = useLoader(TextureLoader, paths) as Texture[];

  useMemo(() => {
    for (const t of textures) {
      if (pixelated) {
        t.magFilter = NearestFilter;
        t.minFilter = NearestFilter;
      }
      t.needsUpdate = true;
    }
  }, [textures, pixelated]);

  const meshRef = useRef<Mesh>(null);
  const frameIndex = useRef(0);
  const elapsed = useRef(0);

  const first = textures[0];
  const aspect = first?.image ? first.image.width / first.image.height : 1;
  const width = height * aspect;

  useFrame(({ camera }, delta) => {
    const mesh = meshRef.current;
    if (!mesh) return;
    if (billboard) {
      mesh.rotation.y = Math.atan2(
        camera.position.x - mesh.position.x,
        camera.position.z - mesh.position.z,
      );
    }
    if (playing && textures.length > 1) {
      elapsed.current += delta;
      const frameDur = 1 / fps;
      while (elapsed.current >= frameDur) {
        elapsed.current -= frameDur;
        frameIndex.current = (frameIndex.current + 1) % textures.length;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (mesh.material as any).map = textures[frameIndex.current];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (mesh.material as any).needsUpdate = true;
      }
    } else if (!playing && frameIndex.current !== 0) {
      // Reset to idle frame when motion stops
      frameIndex.current = 0;
      elapsed.current = 0;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (mesh.material as any).map = textures[0];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (mesh.material as any).needsUpdate = true;
    }
  });

  if (!first) return null;
  return (
    <mesh ref={meshRef} position={[0, height / 2 + yOffset, 0]}>
      <planeGeometry args={[width, height]} />
      <meshStandardMaterial map={first} transparent alphaTest={0.5} depthWrite />
    </mesh>
  );
}
