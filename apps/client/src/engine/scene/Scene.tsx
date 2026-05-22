import { Canvas } from '@react-three/fiber';
import { IsometricCamera } from '../camera/IsometricCamera';
import { PlayerController } from '../player/PlayerController';
import { FarmField } from '../world/FarmField';
import { Floor } from '../world/Floor';
import { TileMap } from '../world/TileMap';
import { Daylight } from './Daylight';
import { TimeAdvancer } from '../../systems/time/TimeAdvancer';

export function Scene() {
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
      <Daylight />
      <TimeAdvancer />
      <TileMap />
      <FarmField />
      <Floor />
      <PlayerController />
    </Canvas>
  );
}
