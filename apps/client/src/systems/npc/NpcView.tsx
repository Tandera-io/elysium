import { useNpcStore } from './npcStore';

const Y_GROUND = 0.5;

/** Renders each NPC as a tagged capsule placeholder (will swap to GLB in Fase 11). */
export function NpcView() {
  const npcs = useNpcStore((s) => s.npcs);
  return (
    <group>
      {Object.values(npcs).map(({ def, worldPos }) => (
        <group key={def.id} position={[worldPos.x, Y_GROUND, worldPos.z]}>
          <mesh castShadow>
            <capsuleGeometry args={[0.3, 0.6, 4, 8]} />
            <meshStandardMaterial color="#d35a5a" />
          </mesh>
          <mesh position={[0, 0.55, 0]}>
            <sphereGeometry args={[0.08, 8, 8]} />
            <meshStandardMaterial color="#1a1a1a" />
          </mesh>
          {/* Floating name tag */}
          <mesh position={[0, 1.2, 0]} rotation={[0, -Math.PI / 4, 0]}>
            <planeGeometry args={[1.5, 0.3]} />
            <meshBasicMaterial color="#0f172a" transparent opacity={0.7} />
          </mesh>
        </group>
      ))}
    </group>
  );
}
