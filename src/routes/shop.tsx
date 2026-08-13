import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useAscend, SHOP_ITEMS, RARITY_COLORS, getShopItemsByCategory, buyItem, equipItem, unequipItem, type ShopCategory } from "@/lib/ascend-store";
import { sounds } from "@/lib/sounds";

export const Route = createFileRoute("/shop")({ component: Shop });

const CATEGORIES: { key: ShopCategory; label: string; icon: string }[] = [
  { key: "frame", label: "Frames", icon: "🖼️" },
  { key: "avatar", label: "Avatars", icon: "🎭" },
  { key: "theme", label: "Themes", icon: "🎨" },
  { key: "badge", label: "Badges", icon: "🎖️" },
];

function ShopItemCard({ itemId }: { itemId: string }) {
  const state = useAscend();
  const [feedback, setFeedback] = useState<string | null>(null);
  const item = SHOP_ITEMS.find((i) => i.id === itemId)!;
  const owned = state.ownedItems.includes(itemId);
  const equipped = state.equippedItems[item.category] === itemId;
  const canAfford = state.coins >= item.price;

  const handleBuy = () => {
    const result = buyItem(itemId);
    if (result.ok) { sounds.levelUp(); setFeedback("Purchased!"); setTimeout(() => setFeedback(null), 1500); }
    else { sounds.error(); setFeedback(result.error); setTimeout(() => setFeedback(null), 1500); }
  };

  const handleEquip = () => {
    const result = equipItem(itemId);
    if (result.ok) { sounds.buttonPress(); setFeedback("Equipped!"); setTimeout(() => setFeedback(null), 1500); }
  };

  const handleUnequip = () => {
    unequipItem(item.category);
    sounds.buttonPress();
    setFeedback("Unequipped");
    setTimeout(() => setFeedback(null), 1500);
  };

  return (
    <div className={`bg-gradient-to-br ${RARITY_COLORS[item.rarity]} border rounded-2xl p-3 sm:p-4`}>
      <div className="flex items-start gap-2.5 sm:gap-3">
        <div className="size-12 sm:size-14 rounded-xl bg-black/30 grid place-items-center text-2xl shrink-0">{item.icon}</div>
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-sm truncate">{item.name}</h3>
          <p className="text-[10px] text-zinc-500 mt-0.5 leading-relaxed line-clamp-2">{item.desc}</p>
          <p className={`text-[9px] font-bold uppercase tracking-widest mt-1 ${item.rarity === "legendary" ? "text-ascend-gold" : item.rarity === "epic" ? "text-ascend-violet" : item.rarity === "rare" ? "text-sky-400" : "text-zinc-500"}`}>
            {item.rarity}
          </p>
        </div>
      </div>

      <div className="mt-3">
        {feedback ? (
          <p className="text-xs font-bold text-center text-ascend-gold py-2">{feedback}</p>
        ) : equipped ? (
          <button onClick={handleUnequip} className="w-full text-xs font-bold bg-white/10 border border-white/20 text-zinc-200 py-2.5 rounded-xl active:scale-95 transition-transform">
            ✅ Equipped — Tap to remove
          </button>
        ) : owned ? (
          <button onClick={handleEquip} className="w-full text-xs font-bold bg-ascend-violet/20 border border-ascend-violet/30 text-ascend-violet py-2.5 rounded-xl active:scale-95 transition-transform">
            Equip
          </button>
        ) : (
          <button
            onClick={handleBuy}
            disabled={!canAfford}
            className="w-full text-xs font-bold bg-ascend-gold/15 border border-ascend-gold/30 text-ascend-gold py-2.5 rounded-xl active:scale-95 transition-transform disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
          >
            <span>🪙 {item.price}</span>
            {!canAfford && <span className="text-zinc-500">— Not enough</span>}
          </button>
        )}
      </div>
    </div>
  );
}

function Shop() {
  const state = useAscend();
  const [activeCat, setActiveCat] = useState<ShopCategory>("frame");
  const items = getShopItemsByCategory(activeCat);

  return (
    <div className="pt-2 pb-4">
      <div className="flex items-start justify-between mb-4 sm:mb-6 gap-2">
        <div className="min-w-0">
          <h1 className="font-display text-xl sm:text-2xl font-black tracking-tighter">Rewards Shop</h1>
          <p className="text-xs text-zinc-500 mt-1">Spend your hard-earned coins</p>
        </div>
        <div className="flex items-center gap-1.5 sm:gap-2 bg-ascend-gold/10 border border-ascend-gold/30 rounded-full px-3 sm:px-4 py-1.5 sm:py-2 shrink-0">
          <span className="text-base sm:text-lg">🪙</span>
          <span className="font-display font-black text-base sm:text-lg text-ascend-gold">{state.coins}</span>
        </div>
      </div>

      {/* Category tabs */}
      <div className="flex gap-2 mb-4 sm:mb-6 overflow-x-auto no-scrollbar -mx-1 px-1">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.key}
            onClick={() => { setActiveCat(cat.key); sounds.buttonPress(); }}
            className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl border whitespace-nowrap transition-all active:scale-95 ${activeCat === cat.key ? "bg-ascend-violet/20 border-ascend-violet/40 text-white" : "bg-white/[0.03] border-white/5 text-zinc-400"}`}
          >
            <span>{cat.icon}</span>
            <span className="text-xs font-bold">{cat.label}</span>
          </button>
        ))}
      </div>

      {/* Items grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {items.map((item) => (
          <ShopItemCard key={item.id} itemId={item.id} />
        ))}
      </div>

      {/* Earn coins hint */}
      <div className="mt-6 sm:mt-8 bg-white/[0.03] border border-white/5 rounded-2xl p-4 text-center">
        <p className="text-xs text-zinc-500">
          Earn coins by completing quests. Higher difficulty = more coins.
        </p>
      </div>
    </div>
  );
}
