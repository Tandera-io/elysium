import { Scene } from '../engine/scene/Scene';
import { Hotbar } from '../ui/Hotbar';
import { InventoryPanel } from '../ui/InventoryPanel';
import { NPCDialogue } from '../components/NPCDialogue';
import { NPCDialog } from '../components/NPCDialog';
import { QuestPanel } from '../ui/QuestPanel';
import { InteractPrompt } from '../systems/npc/InteractPrompt';
import { NPCShopModal } from '../engine/ui/NPCShopModal';
import { useLightingOverlay } from '../stores/timeStore';

export function GameScreen() {
  const overlay = useLightingOverlay();

  return (
    <>
      <Scene />
      {/* DOM-level atmospheric overlay — complements the 3D Daylight system */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          backgroundColor: overlay.color,
          opacity: overlay.opacity,
          pointerEvents: 'none',
          zIndex: 10,
          transition: 'background-color 3s ease, opacity 3s ease',
        }}
      />
      <InventoryPanel />
      <QuestPanel />
      <Hotbar />
      <InteractPrompt />
      <NPCDialog />
      <NPCDialogue />
      <NPCShopModal />
    </>
  );
}
