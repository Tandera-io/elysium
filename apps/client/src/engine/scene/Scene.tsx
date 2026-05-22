import { Canvas } from '@react-three/fiber';
import { IsometricCamera } from '../camera/IsometricCamera';
import { PlayerController } from '../player/PlayerController';
import { Floor } from '../world/Floor';
import { TileMap } from '../world/TileMap';

interface SceneProps {
  /** Optional ambient light intensity (0–1). */
  ambient?: number;
  /** Optional sun intensity. */
  sun?: number;
}

export function Scene({ ambient = 0.6, sun = 1.1 }: SceneProps) {
  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      gl={{ antialias: true }}
      style={{ position: 'absolute', inset: 0 }}
    >
      <color attach="background" args={['#7fbfe6']} />
      <fog attach="fog" args={['#7fbfe6', 80, 160]} />
      <IsometricCamera />
      <ambientLight intensity={ambient} />
      <directionalLight
        position={[20, 40, 10]}
        intensity={sun}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-left={-30}
        shadow-camera-right={30}
        shadow-camera-top={30}
        shadow-camera-bottom={-30}
        shadow-camera-near={1}
        shadow-camera-far={120}
      />
      <TileMap />
      <Floor />
      <PlayerController />
    </Canvas>
  );
}
