import { Canvas } from '@react-three/fiber';
import { IsometricCamera } from '../camera/IsometricCamera';
import { PlayerController } from '../player/PlayerController';
import { FarmMap } from '../../components/FarmMap';
import { Floor } from '../world/Floor';
import { StaticProps } from '../world/StaticProps';
import { TileMap } from '../world/TileMap';
import { Daylight } from './Daylight';
import { TimeAdvancer } from '../../systems/time/TimeAdvancer';
import { NpcView } from '../../systems/npc/NpcView';

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
      <FarmMap layoutId="marisa" />
      <StaticProps />
      <NpcView />
      <Floor />
      <PlayerController />
    </Canvas>
  );
}
