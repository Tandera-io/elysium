import { useFrame, useLoader } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import { Mesh, NearestFilter, TextureLoader } from 'three';

interface BillboardSpriteProps {
  /** Absolute or root-relative path to the PNG (e.g. "sprites/cache/abc.png"). */
  path: string;
  /** Sprite scale in world units (height). Width follows aspect of the PNG. */
  height?: number;
  /** Vertical offset from the parent origin. */
  yOffset?: number;
  /** When true, sprite faces the camera every frame; otherwise fixed Y rotation. */
  billboard?: boolean;
  /** Nearest-neighbor filter to keep pixels crisp (pixel art). */
  pixelated?: boolean;
}

/**
 * Renders a 2D PNG as a textured plane in the 3D scene. Optionally rotates to
 * face the camera each frame (billboarding). This is the bridge that lets us
 * keep R3F + isometric camera while using pixel-art assets in the Stardew style.
 */
export function BillboardSprite({
  path,
  height = 1.6,
  yOffset = 0,
  billboard = true,
  pixelated = true,
}: BillboardSpriteProps) {
  const texture = useLoader(TextureLoader, `/${path}`);
  const meshRef = useRef<Mesh>(null);

  // Configure texture sampling for crisp pixel art
  useMemo(() => {
    if (pixelated) {
      texture.magFilter = NearestFilter;
      texture.minFilter = NearestFilter;
    }
    texture.needsUpdate = true;
  }, [texture, pixelated]);

  const aspect = texture.image ? texture.image.width / texture.image.height : 1;
  const width = height * aspect;

  useFrame(({ camera }) => {
    const mesh = meshRef.current;
    if (!mesh || !billboard) return;
    // Rotate Y so the sprite faces the camera horizontally. We keep the sprite
    // upright (no X tilt) so it always reads as a "standing" character even in iso.
    mesh.rotation.y = Math.atan2(
      camera.position.x - mesh.position.x,
      camera.position.z - mesh.position.z,
    );
  });

  return (
    <mesh ref={meshRef} position={[0, height / 2 + yOffset, 0]}>
      <planeGeometry args={[width, height]} />
      <meshStandardMaterial map={texture} transparent alphaTest={0.5} depthWrite />
    </mesh>
  );
}
