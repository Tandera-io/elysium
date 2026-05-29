import { useNPCShopStore } from '../../systems/npc/NPCShop';

export function NPCShopModal() {
  const openShopId = useNPCShopStore((s) => s.openShopId);
  const closeShop = useNPCShopStore((s) => s.closeShop);

  if (!openShopId) return null;

  return (
    <div className="pointer-events-auto absolute inset-0 flex items-center justify-center bg-black/60 z-50">
      <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 w-80 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-slate-100 font-bold text-lg">Loja de {openShopId}</h2>
          <button
            onClick={closeShop}
            className="text-slate-400 hover:text-slate-100 text-xl leading-none"
          >
            ×
          </button>
        </div>
        <p className="text-slate-400 text-sm">Loja em construção. Volte em breve!</p>
        <button
          onClick={closeShop}
          className="bg-slate-700 hover:bg-slate-600 text-slate-100 rounded-lg px-4 py-2 text-sm"
        >
          Fechar
        </button>
      </div>
    </div>
  );
}
