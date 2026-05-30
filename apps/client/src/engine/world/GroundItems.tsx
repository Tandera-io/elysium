import { useGroundItemStore } from '../../systems/groundItems/groundItemStore';

const ITEM_COLOR: Record<string, string> = {
  seed_wheat: '#e8c34a',
  seed_tomato: '#d34a3a',
  seed_corn: '#f0a030',
  wheat: '#c2c44a',
  tomato: '#d34a3a',
  pumpkin: '#e8862a',
  corn: '#e6c44a',
  strawberry: '#d44a4a',
};

/** Renders floating colored pips for each item lying on the ground. */
export function GroundItems() {
  const items = useGroundItemStore((s) => s.items);

  return (
    <group>
      {items.map((item) => (
        <mesh key={item.id} position={[item.tileX - 25 + 0.5, 0.18, item.tileZ - 25 + 0.5]}>
          <boxGeometry args={[0.28, 0.12, 0.28]} />
          <meshStandardMaterial color={ITEM_COLOR[item.itemId] ?? '#aaaaaa'} />
        </mesh>
      ))}
    </group>
  );
}
