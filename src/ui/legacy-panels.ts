import { TILE, TILE_NAMES } from '../systems/world.ts';
import type { TileGrid } from '../types/world.ts';
import type { Player } from '../types/entities.ts';
import type { Npc, QuestState } from '../types/npc.ts';
import type { ItemId, ItemDef, InventorySlot, GroundItem, Equipment } from '../types/items.ts';
import { ITEM_DEFS } from '../types/items.ts';
import type { CombatState } from '../types/combat.ts';
import { spawnFloatingText } from '../systems/combat.ts';
import { PLAYER_BASE_MAXHP, PLAYER_BASE_ATK, PLAYER_BASE_ATK_COOLDOWN } from '../entities/player.ts';

// Everything in this file is a straight port of game-window.html's NPC/quest,
// inventory/equipment, shop, and drag-and-drop UI code - deliberately NOT
// redesigned this round. It's the one module allowed to own its own
// module-level-shaped mutable state (via closures in initLegacyPanels), since
// splitting it further into a "real" items/quest system is future work.

export interface LegacyPanelsDeps {
  player: Player;
  map: TileGrid;
  combatState: CombatState;
}

export interface LegacyPanelsHandle {
  npcs: Npc[];
  groundItems: GroundItem[];
  isNpcAt: (x: number, y: number) => boolean;
  npcAt: (x: number, y: number) => Npc | undefined;
  groundItemAt: (x: number, y: number) => GroundItem | undefined;
  tryPickupGroundItems: (x: number, y: number) => void;
  spawnGroundItem: (x: number, y: number, itemId: ItemId, qty: number) => void;
  interactWithNpc: (npc: Npc) => void;
  isPlayerRanged: () => boolean;
  getPlayerRange: () => number;
  isMapOpen: () => boolean;
  getNpcQuestMarker: (npc: Npc) => boolean;
  updateHud: () => void;
  setBossDefeated: () => void;
}

type SlotRef = { kind: 'inv'; idx: number } | { kind: 'equip'; key: 'weapon' | 'armor' };

const NPC_COLOR = '#e0c34a';
const NPC_EDGE = '#8a6b1f';
const MERCHANT_COLOR = '#8a5fc2';
const MERCHANT_EDGE = '#4f3a75';

const SHOP_STOCK: Array<{ itemId: ItemId; price: number }> = [
  { itemId: 'potion_minor', price: 8 },
  { itemId: 'potion_greater', price: 16 },
];

const QUEST_REWARD_GOLD = 50;
const INVENTORY_SIZE = 8;
const SHOP_DEFAULT_HINT = 'Click your inventory below to sell an item.';

export function initLegacyPanels(deps: LegacyPanelsDeps): LegacyPanelsHandle {
  const { player, map, combatState } = deps;

  // ---- npc & quest state ----
  const npcs: Npc[] = [
    { id: 'elder', tileX: 6, tileY: 3, px: 6 * TILE, py: 3 * TILE, name: 'Elder Rowan', kind: 'quest', color: NPC_COLOR, edge: NPC_EDGE },
    { id: 'merchant', tileX: 9, tileY: 14, px: 9 * TILE, py: 14 * TILE, name: 'Trader Mira', kind: 'shop', color: MERCHANT_COLOR, edge: MERCHANT_EDGE },
  ];
  function npcAt(x: number, y: number): Npc | undefined {
    return npcs.find((n) => n.tileX === x && n.tileY === y);
  }
  function isNpcAt(x: number, y: number): boolean {
    return !!npcAt(x, y);
  }

  let questState: QuestState = 'not_started';
  let bossDefeated = false;
  let gold = 0;

  // ---- items / inventory / equipment ----
  const inventory: InventorySlot[] = new Array(INVENTORY_SIZE).fill(null);
  inventory[0] = { itemId: 'sword_iron', qty: 1 };
  inventory[1] = { itemId: 'bow_wood', qty: 1 };
  const equipment: Equipment = { weapon: null, armor: null };

  const groundItems: GroundItem[] = [
    { x: 5, y: 8, itemId: 'potion_minor', qty: 1 },
    { x: 4, y: 13, itemId: 'armor_hide', qty: 1 },
  ];

  function addItemToInventory(itemId: ItemId, qty: number): boolean {
    const def = ITEM_DEFS[itemId];
    if (def.stackable) {
      for (const slot of inventory) {
        if (slot && slot.itemId === itemId && slot.qty < (def.maxStack ?? Infinity)) {
          const room = (def.maxStack ?? Infinity) - slot.qty;
          const add = Math.min(room, qty);
          slot.qty += add;
          qty -= add;
          if (qty <= 0) {
            renderInventoryUI();
            return true;
          }
        }
      }
    }
    while (qty > 0) {
      const idx = inventory.findIndex((s) => s === null);
      if (idx === -1) {
        renderInventoryUI();
        return false;
      }
      const putQty = def.stackable ? Math.min(qty, def.maxStack ?? qty) : 1;
      inventory[idx] = { itemId, qty: putQty };
      qty -= putQty;
    }
    renderInventoryUI();
    return true;
  }

  function spawnGroundItem(x: number, y: number, itemId: ItemId, qty: number): void {
    groundItems.push({ x, y, itemId, qty });
  }

  function groundItemAt(x: number, y: number): GroundItem | undefined {
    return groundItems.find((g) => g.x === x && g.y === y);
  }

  function tryPickupGroundItems(x: number, y: number): void {
    for (let i = groundItems.length - 1; i >= 0; i--) {
      const g = groundItems[i];
      if (g.x === x && g.y === y) {
        if (addItemToInventory(g.itemId, g.qty)) {
          spawnFloatingText(combatState, player, '+' + ITEM_DEFS[g.itemId].name, '#f0e6d2', performance.now());
          groundItems.splice(i, 1);
        }
      }
    }
  }

  function recalcPlayerStats(): void {
    const newMaxHp = PLAYER_BASE_MAXHP + (equipment.armor ? ITEM_DEFS[equipment.armor].hpBonus || 0 : 0);
    const hpDelta = newMaxHp - player.maxHp;
    player.maxHp = newMaxHp;
    player.hp = Math.max(1, Math.min(newMaxHp, player.hp + Math.max(0, hpDelta)));
    const weaponDef = equipment.weapon ? ITEM_DEFS[equipment.weapon] : null;
    player.atkDamage = PLAYER_BASE_ATK + (weaponDef ? weaponDef.atkBonus || 0 : 0);
    player.atkCooldown = (weaponDef && weaponDef.atkCooldown) || PLAYER_BASE_ATK_COOLDOWN;
    updateHud();
  }

  function isPlayerRanged(): boolean {
    return !!(equipment.weapon && ITEM_DEFS[equipment.weapon].ranged);
  }
  function getPlayerRange(): number {
    return equipment.weapon && ITEM_DEFS[equipment.weapon].ranged ? ITEM_DEFS[equipment.weapon].range ?? 1 : 1;
  }

  function useInventorySlot(idx: number): void {
    const slot = inventory[idx];
    if (!slot) return;
    const def = ITEM_DEFS[slot.itemId];
    if (def.type === 'consumable') {
      if (player.hp >= player.maxHp) return;
      player.hp = Math.min(player.maxHp, player.hp + (def.heal ?? 0));
      spawnFloatingText(combatState, player, '+' + def.heal, '#8fe38f', performance.now());
      slot.qty -= 1;
      if (slot.qty <= 0) inventory[idx] = null;
      updateHud();
    } else {
      const key = def.type as 'weapon' | 'armor';
      const prev = equipment[key];
      equipment[key] = slot.itemId;
      inventory[idx] = prev ? { itemId: prev, qty: 1 } : null;
      recalcPlayerStats();
    }
    renderInventoryUI();
  }

  function unequip(key: 'weapon' | 'armor'): void {
    const itemId = equipment[key];
    if (!itemId) return;
    if (addItemToInventory(itemId, 1)) {
      equipment[key] = null;
      recalcPlayerStats();
    }
    renderInventoryUI();
  }

  function useFirstConsumable(): void {
    const idx = inventory.findIndex((s) => s && ITEM_DEFS[s.itemId].type === 'consumable');
    if (idx !== -1) useInventorySlot(idx);
  }

  function describeItem(def: ItemDef): string {
    if (def.type === 'consumable') return def.name + ' — heals ' + def.heal + ' hp';
    if (def.type === 'weapon') return def.name + ' — +' + def.atkBonus + ' attack' + (def.ranged ? ' (ranged, ' + def.range + ' tiles)' : '');
    if (def.type === 'armor') return def.name + ' — +' + def.hpBonus + ' max hp';
    return def.name;
  }

  // ---- shop ----
  let shopOpen = false;
  function sellItemFromSlot(idx: number): void {
    const slot = inventory[idx];
    if (!slot) return;
    const def = ITEM_DEFS[slot.itemId];
    const price = def.value || 1;
    gold += price;
    slot.qty -= 1;
    if (slot.qty <= 0) inventory[idx] = null;
    spawnFloatingText(combatState, player, '+' + price + 'g', '#ffd76b', performance.now());
    updateHud();
    renderInventoryUI();
  }
  function buyShopItem(itemId: ItemId, price: number): void {
    if (gold < price) {
      flashShopHint('Not enough gold.');
      return;
    }
    if (!addItemToInventory(itemId, 1)) {
      flashShopHint('Inventory is full.');
      return;
    }
    gold -= price;
    updateHud();
    renderInventoryUI();
  }

  function interactWithNpc(n: Npc): void {
    if (n.kind === 'shop') openShop(n);
    else talkToNpc(n);
  }

  function talkToNpc(n: Npc): void {
    let text: string;
    if (questState === 'not_started') {
      text = "A monstrous square has been terrorizing these lands. Will you slay it for me? ...I'll take that as a yes. Good luck, traveler.";
      questState = 'active';
    } else if (questState === 'active') {
      if (bossDefeated) {
        gold += QUEST_REWARD_GOLD;
        questState = 'completed';
        text = "You've truly slain the beast! Thank you, hero. Please, take this gold as my gratitude. (+" + QUEST_REWARD_GOLD + ' gold)';
      } else {
        text = "The beast still stalks these lands. Return to me once it's slain.";
      }
    } else {
      text = 'Thank you again for your help. The land is safer because of you.';
    }
    dialogueNameEl.textContent = n.name;
    dialogueTextEl.textContent = text;
    dialoguePanel.style.display = 'block';
    updateHud();
  }

  function getNpcQuestMarker(n: Npc): boolean {
    return n.kind === 'quest' && (questState === 'not_started' || (questState === 'active' && bossDefeated));
  }

  // ---- HUD ----
  const statHp = document.getElementById('stat-hp')!;
  const statPos = document.getElementById('stat-pos')!;
  const statTile = document.getElementById('stat-tile')!;
  const statFacing = document.getElementById('stat-facing')!;
  const statTarget = document.getElementById('stat-target')!;
  const statGold = document.getElementById('stat-gold')!;

  function updateHud(): void {
    statHp.textContent = player.hp + ' / ' + player.maxHp;
    statPos.textContent = player.tileX + ', ' + player.tileY;
    statTile.textContent = TILE_NAMES[map[player.tileY][player.tileX]];
    statFacing.textContent = player.dir;
    statTarget.textContent = player.attackTarget ? (player.attackTarget.isBoss ? 'boss (' : 'enemy (') + Math.max(0, player.attackTarget.hp) + ' hp)' : 'none';
    statGold.textContent = String(gold);
  }

  // ---- inventory UI (DOM panel) ----
  const invPanel = document.getElementById('inventory-panel')!;
  const invGrid = document.getElementById('inv-grid')!;
  const invDesc = document.getElementById('inv-desc')!;
  const invToggleBtn = document.getElementById('inv-toggle-btn')!;
  const equipWeaponEl = document.getElementById('equip-weapon')!;
  const equipArmorEl = document.getElementById('equip-armor')!;

  let invOpen = false;
  function setInvOpen(v: boolean): void {
    invOpen = v;
    invPanel.style.display = v ? 'block' : 'none';
    if (!v) closeShop();
  }
  invToggleBtn.addEventListener('click', () => setInvOpen(!invOpen));

  // ---- dialogue UI (DOM panel) ----
  const dialoguePanel = document.getElementById('dialogue-panel')! as HTMLElement;
  const dialogueNameEl = document.getElementById('dialogue-name')!;
  const dialogueTextEl = document.getElementById('dialogue-text')!;
  const dialogueCloseBtn = document.getElementById('dialogue-close')!;
  function closeDialogue(): void {
    dialoguePanel.style.display = 'none';
  }
  dialogueCloseBtn.addEventListener('click', closeDialogue);

  // ---- shop UI (DOM panel) ----
  const shopPanel = document.getElementById('shop-panel')! as HTMLElement;
  const shopTitleEl = document.getElementById('shop-title')!;
  const shopBuyRow = document.getElementById('shop-buy-row')!;
  const shopHintEl = document.getElementById('shop-hint')!;
  const shopCloseBtn = document.getElementById('shop-close')!;

  function flashShopHint(msg: string): void {
    shopHintEl.textContent = msg;
    setTimeout(() => {
      if (shopOpen) shopHintEl.textContent = SHOP_DEFAULT_HINT;
    }, 1500);
  }

  function renderShopUI(): void {
    shopBuyRow.innerHTML = '';
    SHOP_STOCK.forEach(({ itemId, price }) => {
      const def = ITEM_DEFS[itemId];
      const cell = document.createElement('div');
      cell.className = 'shop-slot';
      const icon = document.createElement('div');
      icon.className = 'inv-icon';
      icon.style.background = def.color;
      icon.style.borderColor = def.edge;
      cell.appendChild(icon);
      const priceLabel = document.createElement('span');
      priceLabel.className = 'shop-price';
      priceLabel.textContent = price + 'g';
      cell.appendChild(priceLabel);
      cell.title = def.name + ' — buy for ' + price + ' gold';
      cell.addEventListener('click', () => buyShopItem(itemId, price));
      shopBuyRow.appendChild(cell);
    });
  }

  function openShop(n: Npc): void {
    shopOpen = true;
    setInvOpen(true);
    shopTitleEl.textContent = n.name + "'s wares";
    shopHintEl.textContent = SHOP_DEFAULT_HINT;
    renderShopUI();
    shopPanel.style.display = 'block';
  }
  function closeShop(): void {
    shopOpen = false;
    shopPanel.style.display = 'none';
  }
  shopCloseBtn.addEventListener('click', closeShop);

  // ---- world map toggle ----
  const worldMapOverlay = document.getElementById('world-map-overlay')! as HTMLElement;
  const worldMapCloseBtn = document.getElementById('world-map-close')!;
  const mapToggleBtn = document.getElementById('map-toggle-btn')!;
  let mapOpen = false;
  function setMapOpen(v: boolean): void {
    mapOpen = v;
    worldMapOverlay.style.display = v ? 'flex' : 'none';
  }
  mapToggleBtn.addEventListener('click', () => setMapOpen(!mapOpen));
  worldMapCloseBtn.addEventListener('click', () => setMapOpen(false));

  window.addEventListener('keydown', (e) => {
    if (e.key === 'i' || e.key === 'I') setInvOpen(!invOpen);
    if (e.key === 'q' || e.key === 'Q') useFirstConsumable();
    if (e.key === 'm' || e.key === 'M') setMapOpen(!mapOpen);
    if (e.key === 'Escape') {
      closeDialogue();
      closeShop();
      setMapOpen(false);
    }
  });

  // ---- drag and drop between slots ----
  let dragSource: SlotRef | null = null;
  const refsEqual = (a: SlotRef | null, b: SlotRef | null): boolean =>
    !!a && !!b && a.kind === b.kind && (a.kind === 'inv' && b.kind === 'inv' ? a.idx === b.idx : a.kind === 'equip' && b.kind === 'equip' ? a.key === b.key : false);

  function getSlotItem(ref: SlotRef): InventorySlot {
    if (ref.kind === 'inv') return inventory[ref.idx];
    return equipment[ref.key] ? { itemId: equipment[ref.key]!, qty: 1 } : null;
  }
  function setSlotItem(ref: SlotRef, item: InventorySlot): void {
    if (ref.kind === 'inv') inventory[ref.idx] = item;
    else equipment[ref.key] = item ? item.itemId : null;
  }
  function slotAcceptsType(ref: SlotRef, type: string): boolean {
    if (ref.kind === 'inv') return true;
    return ref.key === type;
  }

  function handleDrop(source: SlotRef, target: SlotRef): void {
    if (refsEqual(source, target)) return;
    const sourceItem = getSlotItem(source);
    if (!sourceItem) return;
    const sourceDef = ITEM_DEFS[sourceItem.itemId];
    if (!slotAcceptsType(target, sourceDef.type)) return;

    const targetItem = getSlotItem(target);
    if (targetItem && !slotAcceptsType(source, ITEM_DEFS[targetItem.itemId].type)) return;

    // dropping onto a matching stack merges quantities instead of swapping
    if (targetItem && targetItem.itemId === sourceItem.itemId && sourceDef.stackable) {
      const room = (sourceDef.maxStack ?? Infinity) - targetItem.qty;
      if (room > 0) {
        const move = Math.min(room, sourceItem.qty);
        targetItem.qty += move;
        sourceItem.qty -= move;
        setSlotItem(source, sourceItem.qty > 0 ? sourceItem : null);
        finalizeDragChange(source, target);
        return;
      }
    }

    setSlotItem(source, targetItem || null);
    setSlotItem(target, sourceItem);
    finalizeDragChange(source, target);
  }

  function finalizeDragChange(source: SlotRef, target: SlotRef): void {
    if (source.kind === 'equip' || target.kind === 'equip') recalcPlayerStats();
    renderInventoryUI();
  }

  function wireDrag(el: HTMLElement, ref: SlotRef, occupied: boolean): void {
    el.draggable = !!occupied;
    el.addEventListener('dragstart', (e) => {
      dragSource = ref;
      e.dataTransfer!.effectAllowed = 'move';
      el.classList.add('dragging');
    });
    el.addEventListener('dragend', () => {
      el.classList.remove('dragging');
      dragSource = null;
    });
    el.addEventListener('dragover', (e) => {
      if (!dragSource) return;
      e.preventDefault();
      (e as DragEvent).dataTransfer!.dropEffect = 'move';
    });
    el.addEventListener('dragenter', () => {
      if (dragSource) el.classList.add('drag-hover');
    });
    el.addEventListener('dragleave', () => el.classList.remove('drag-hover'));
    el.addEventListener('drop', (e) => {
      e.preventDefault();
      e.stopPropagation();
      el.classList.remove('drag-hover');
      if (dragSource) handleDrop(dragSource, ref);
      dragSource = null;
    });
  }

  // dropping an item outside the panel entirely tosses it onto the ground at the player's feet
  function dropItemOnGround(source: SlotRef): void {
    const item = getSlotItem(source);
    if (!item) return;
    setSlotItem(source, null);
    spawnGroundItem(player.tileX, player.tileY, item.itemId, item.qty);
    spawnFloatingText(combatState, player, 'dropped ' + ITEM_DEFS[item.itemId].name, '#f0e6d2', performance.now());
    if (source.kind === 'equip') recalcPlayerStats();
    renderInventoryUI();
  }

  // the panel itself absorbs drops that land in the gaps between slots, so those
  // don't get mistaken for "outside the panel" and dumped on the ground
  invPanel.addEventListener('dragover', (e) => {
    if (dragSource) e.preventDefault();
  });
  invPanel.addEventListener('drop', (e) => {
    e.preventDefault();
    e.stopPropagation();
    dragSource = null;
  });

  window.addEventListener('dragover', (e) => {
    if (dragSource) e.preventDefault();
  });
  window.addEventListener('drop', (e) => {
    if (!dragSource) return;
    e.preventDefault();
    dropItemOnGround(dragSource);
    dragSource = null;
  });

  function renderEquipSlot(el: HTMLElement, itemId: ItemId | null, key: 'weapon' | 'armor'): void {
    el.innerHTML = '<span class="equip-label">' + (key === 'weapon' ? 'Weapon' : 'Armor') + '</span>';
    if (itemId) {
      const def = ITEM_DEFS[itemId];
      const icon = document.createElement('div');
      icon.className = 'inv-icon';
      icon.style.background = def.color;
      icon.style.borderColor = def.edge;
      el.appendChild(icon);
      el.title = def.name + ' (equipped) — click or drag out to unequip';
      el.onclick = () => unequip(key);
      el.style.cursor = 'pointer';
    } else {
      el.title = 'Empty';
      el.onclick = null;
      el.style.cursor = 'default';
    }
    wireDrag(el, { kind: 'equip', key }, !!itemId);
  }

  function renderInventoryUI(): void {
    invGrid.innerHTML = '';
    inventory.forEach((slot, idx) => {
      const cell = document.createElement('div');
      cell.className = 'inv-slot';
      if (slot) {
        const def = ITEM_DEFS[slot.itemId];
        cell.classList.add('filled');
        const icon = document.createElement('div');
        icon.className = 'inv-icon';
        icon.style.background = def.color;
        icon.style.borderColor = def.edge;
        cell.appendChild(icon);
        if (slot.qty > 1) {
          const qty = document.createElement('span');
          qty.className = 'inv-qty';
          qty.textContent = String(slot.qty);
          cell.appendChild(qty);
        }
        cell.title = def.name;
        cell.addEventListener('click', () => {
          shopOpen ? sellItemFromSlot(idx) : useInventorySlot(idx);
        });
        cell.addEventListener('mouseenter', () => {
          invDesc.textContent = shopOpen ? describeItem(def) + ' — sell for ' + (def.value || 1) + 'g' : describeItem(def);
        });
      }
      wireDrag(cell, { kind: 'inv', idx }, !!slot);
      invGrid.appendChild(cell);
    });
    renderEquipSlot(equipWeaponEl, equipment.weapon, 'weapon');
    renderEquipSlot(equipArmorEl, equipment.armor, 'armor');
  }

  updateHud();
  renderInventoryUI();

  return {
    npcs,
    groundItems,
    isNpcAt,
    npcAt,
    groundItemAt,
    tryPickupGroundItems,
    spawnGroundItem,
    interactWithNpc,
    isPlayerRanged,
    getPlayerRange,
    isMapOpen: () => mapOpen,
    getNpcQuestMarker,
    updateHud,
    setBossDefeated: () => {
      bossDefeated = true;
    },
  };
}
