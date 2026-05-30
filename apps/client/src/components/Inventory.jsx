/**
 * Inventory.jsx
 *
 * Thin wrapper around InventoryPanel that exposes the inventory UI
 * without requiring TypeScript consumers to import the TS component.
 *
 * Props:
 *   open {boolean} — whether the inventory panel is visible
 *
 * Example:
 *   import { Inventory } from './components/Inventory.jsx';
 *   <Inventory open={inventoryOpen} />
 */
import { InventoryPanel } from '../ui/InventoryPanel';

export function Inventory({ open }) {
  return <InventoryPanel open={open} />;
}
