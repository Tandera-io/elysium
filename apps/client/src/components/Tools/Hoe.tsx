import { useRef, useEffect, useState, Suspense } from 'react';
import { useFrame, useLoader } from '@react-three/fiber';
import { NearestFilter, TextureLoader } from 'three';
import type { Mesh, MeshStandardMaterial } from 'three';
import { useToolStore } from '../../store/toolStore';
import { TOOL_SPRITES } from '../../content/assets';
import { useFarmStore } from '../../systems/farming/farmStore';
import { tileToWorld, DEFAULT_GRID, type GridConfig } from '../../engine/world/WorldGrid';
import type { TileCoord } from '../../engine/world/WorldGrid';

// ─── DOM component ────────────────────────────────────────────────────────────

interface HoeProps {
  /** Compact mode renders just the icon — used inside inventory slots. */
  compact?: boolean;
}

/**
 * Hoe DOM component — renders the hoe item with equip interaction.
 * When compact=true, embeds as a single icon inside an inventory slot.
 * Clicking equips the hoe and enables tile-tilling on the farm (see Floor.tsx).
 */
export function Hoe({ compact = false }: HoeProps) {
  const isEquipped = useToolStore((s) => s.current === 'hoe');
  const setTool = useToolStore((s) => s.set);

  if (compact) {
    return (
      <span
        role="button"
        tabIndex={0}
        aria-label="Enxada — clique para equipar"
        onClick={() => setTool('hoe')}
        onKeyDown={(e) => e.key === 'Enter' && setTool('hoe')}
        className={`text-xl leading-none cursor-pointer select-none ${
          isEquipped ? 'drop-shadow-[0_0_4px_rgba(251,191,36,0.9)]' : ''
        }`}
      >
        ⛏️
      </span>
    );
  }

  return (
    <button
      onClick={() => setTool('hoe')}
      className={`flex flex-col items-center gap-1 px-3 py-2 rounded-lg border text-sm transition ${
        isEquipped
          ? 'border-amber-400 bg-amber-500/20 text-amber-300'
          : 'border-slate-600 bg-slate-800 text-slate-200 hover:bg-slate-700'
      }`}
      title="Enxada [2] — revire o solo para plantar"
    >
      <span aria-hidden className="text-2xl">
        ⛏️
      </span>
      <span className="text-xs font-mono">Enxada</span>
      {isEquipped && <span className="text-[10px] text-amber-400">equipada</span>}
    </button>
  );
}

// ─── R3F overlay component ─────────────────────────────────────────────────────

/** Duration of one hoe-swing arc in seconds. */
const SWING_DURATION = 0.4;

interface HoeSwingProps {
  tile: TileCoord;
  onDone: () => void;
  grid: GridConfig;
}

/**
 * Single-use R3F mesh: renders the hoe sprite above a freshly tilled tile and
 * plays a quick swing arc (raised → hits dirt) before calling onDone.
 */
function HoeSwing({ tile, onDone, grid }: HoeSwingProps) {
  const texture = useLoader(TextureLoader, `/${TOOL_SPRITES.hoe}`);
  const meshRef = useRef<Mesh>(null);
  const elapsed = useRef(0);
  const done = useRef(false);

  texture.magFilter = NearestFilter;
  texture.minFilter = NearestFilter;
  texture.needsUpdate = true;

  const world = tileToWorld(tile, grid);

  useFrame((_, delta) => {
    if (done.current) return;
    elapsed.current += delta;
    const t = Math.min(elapsed.current / SWING_DURATION, 1);

    const mesh = meshRef.current;
    if (mesh) {
      // Swing from raised (-60°) to striking (+20°)
      const startAngle = -Math.PI / 3;
      const endAngle = Math.PI / 9;
      mesh.rotation.z = startAngle + (endAngle - startAngle) * t;

      // Fade out in the last 25%
      const mat = mesh.material as MeshStandardMaterial;
      mat.opacity = t > 0.75 ? 1 - (t - 0.75) / 0.25 : 1;
    }

    if (t >= 1) {
      done.current = true;
      onDone();
    }
  });

  return (
    <mesh
      ref={meshRef}
      position={[world.x + 0.1, 0.75, world.z - 0.15]}
      rotation={[-Math.PI / 4, 0, -Math.PI / 3]}
    >
      <planeGeometry args={[0.55, 0.55]} />
      <meshStandardMaterial
        map={texture}
        transparent
        alphaTest={0.05}
        opacity={1}
        depthWrite={false}
      />
    </mesh>
  );
}

interface HoeOverlayProps {
  grid?: GridConfig;
}

/**
 * HoeOverlay — place once inside the R3F <Canvas> alongside <FarmField />.
 * Watches the farm store for newly tilled tiles and spawns a HoeSwing
 * animation overlay on each one. The overlay removes itself when done.
 */
export function HoeOverlay({ grid = DEFAULT_GRID }: HoeOverlayProps) {
  const [swinging, setSwinging] = useState<Map<string, TileCoord>>(new Map());
  const tiles = useFarmStore((s) => s.tiles);
  const prevTilesRef = useRef<typeof tiles>({});

  useEffect(() => {
    const prev = prevTilesRef.current;
    const toAdd: Array<[string, TileCoord]> = [];

    for (const [key, tile] of Object.entries(tiles)) {
      const prevTile = prev[key];
      const wasEmpty = !prevTile || prevTile.kind === 'empty';
      const isNowTilled = tile.kind === 'tilled';
      // Trigger when an empty tile just became tilled
      if (isNowTilled && wasEmpty) {
        const [xs, zs] = key.split(',');
        toAdd.push([key, { x: Number(xs), z: Number(zs) }]);
      }
    }

    if (toAdd.length > 0) {
      setSwinging((prev) => {
        const next = new Map(prev);
        for (const [k, c] of toAdd) next.set(k, c);
        return next;
      });
    }

    prevTilesRef.current = tiles;
  }, [tiles]);

  return (
    <>
      {Array.from(swinging.entries()).map(([key, coord]) => (
        <Suspense key={key} fallback={null}>
          <HoeSwing
            tile={coord}
            grid={grid}
            onDone={() =>
              setSwinging((prev) => {
                const next = new Map(prev);
                next.delete(key);
                return next;
              })
            }
          />
        </Suspense>
      ))}
    </>
  );
}
