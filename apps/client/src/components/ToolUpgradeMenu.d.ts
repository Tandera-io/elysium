import { FC } from 'react';

interface ToolUpgradeMenuProps {
  open: boolean;
  onClose: () => void;
}

declare const ToolUpgradeMenu: FC<ToolUpgradeMenuProps>;
export default ToolUpgradeMenu;
