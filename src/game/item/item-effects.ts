import { ItemId } from '#/types/item-id';

export type MajorStatus = 'brn' | 'frz' | 'par' | 'psn' | 'slp' | 'tox';
export type BattleStat = 'atk' | 'def' | 'spa' | 'spd' | 'spe' | 'accuracy' | 'evasion';
export type Volatile = 'confusion' | 'attract';

// ---- effects shared by both scenes ------------------------------------
export type HealHp = { kind: 'heal-hp'; amount: number | 'full' };
export type CureStatus = { kind: 'cure-status'; statuses: MajorStatus[] | 'all' };
export type RestorePp = { kind: 'restore-pp'; amount: number | 'full'; moves: 'one' | 'all' };
export type Revive = { kind: 'revive'; fraction: number };
export type ReviveAll = { kind: 'revive-all'; fraction: number };

export type SharedEffect = HealHp | CureStatus | RestorePp | Revive | ReviveAll;

// ---- overworld-only effects -------------------------------------------
export type Escape = { kind: 'escape' };
export type Repel = { kind: 'repel'; steps: number };
export type EncounterRate = { kind: 'encounter-rate'; multiplier: number };

export type OverworldEffect =
  | SharedEffect
  | Escape
  | Repel
  | EncounterRate
  | { kind: 'composite'; effects: OverworldEffect[] };

// ---- battle-only effects ----------------------------------------------
export type Boost = { kind: 'boost'; boosts: Partial<Record<BattleStat, number>> };
export type Catch = { kind: 'catch'; rate: number | 'master' };
export type Flee = { kind: 'flee' };
export type CureVolatile = { kind: 'cure-volatile'; volatiles: Volatile[] };

export type BattleEffect =
  | SharedEffect
  | Boost
  | Catch
  | Flee
  | CureVolatile
  | { kind: 'composite'; effects: BattleEffect[] };

/** An item may behave differently, or only be usable, in one of the two scenes. */
export type ItemEffects = {
  overworld?: OverworldEffect;
  battle?: BattleEffect;
  /** Overrides the scraped `consumable` attribute (key items set this to false). */
  consumable?: boolean;
};

// ---- helpers used by the table ----------------------------------------
const heal = (amount: number | 'full'): HealHp => ({ kind: 'heal-hp', amount });
const cure = (statuses: MajorStatus[] | 'all'): CureStatus => ({ kind: 'cure-status', statuses });
const restorePp = (amount: number | 'full', moves: 'one' | 'all'): RestorePp =>
  ({ kind: 'restore-pp', amount, moves });
const revive = (fraction: number): Revive => ({ kind: 'revive', fraction });

const healFull = heal('full');
const cureAll = cure('all');
const cureConfusion: CureVolatile = { kind: 'cure-volatile', volatiles: ['confusion'] };

const both = (effect: SharedEffect): ItemEffects => ({ overworld: effect, battle: effect });

// ---- the table --------------------------------------------------------
// Only a representative subset is filled in for now. Items that are not in
// this table are simply "not usable" from the bag. The table is the source of
// truth: the scraped attributes are incomplete (e.g. Escape Rope has none).
export const itemEffects = {
  // Healing
  [ItemId.Potion]: both(heal(20)),
  [ItemId.SuperPotion]: both(heal(50)),
  [ItemId.HyperPotion]: both(heal(200)),
  [ItemId.MaxPotion]: both(healFull),
  [ItemId.FreshWater]: both(heal(50)),
  [ItemId.SodaPop]: both(heal(60)),
  [ItemId.Lemonade]: both(heal(80)),
  [ItemId.MoomooMilk]: both(heal(100)),
  [ItemId.BerryJuice]: both(heal(20)),
  [ItemId.EnergyPowder]: both(heal(50)),
  [ItemId.EnergyRoot]: both(heal(200)),
  [ItemId.FullRestore]: {
    overworld: { kind: 'composite', effects: [healFull, cureAll] },
    battle: { kind: 'composite', effects: [healFull, cureAll, cureConfusion] },
  },

  // Status cures
  [ItemId.Antidote]: both(cure(['psn', 'tox'])),
  [ItemId.BurnHeal]: both(cure(['brn'])),
  [ItemId.IceHeal]: both(cure(['frz'])),
  [ItemId.ParalyzeHeal]: both(cure(['par'])),
  [ItemId.Awakening]: both(cure(['slp'])),
  [ItemId.FullHeal]: {
    overworld: cureAll,
    battle: { kind: 'composite', effects: [cureAll, cureConfusion] },
  },
  [ItemId.HealPowder]: both(cureAll),
  [ItemId.LavaCookie]: {
    overworld: cureAll,
    battle: { kind: 'composite', effects: [cureAll, cureConfusion] },
  },
  [ItemId.OldGateau]: {
    overworld: cureAll,
    battle: { kind: 'composite', effects: [cureAll, cureConfusion] },
  },
  [ItemId.BlueFlute]: { ...both(cure(['slp'])), consumable: false },
  [ItemId.RedFlute]: {
    battle: { kind: 'cure-volatile', volatiles: ['attract'] },
    consumable: false,
  },
  [ItemId.YellowFlute]: {
    battle: { kind: 'cure-volatile', volatiles: ['confusion'] },
    consumable: false,
  },

  // PP recovery
  [ItemId.Ether]: both(restorePp(10, 'one')),
  [ItemId.MaxEther]: both(restorePp('full', 'one')),
  [ItemId.Elixir]: both(restorePp(10, 'all')),
  [ItemId.MaxElixir]: both(restorePp('full', 'all')),

  // Revival
  [ItemId.Revive]: both(revive(0.5)),
  [ItemId.MaxRevive]: both(revive(1)),
  [ItemId.RevivalHerb]: both(revive(1)),
  [ItemId.SacredAsh]: both({ kind: 'revive-all', fraction: 1 }),

  // Balls (battle only)
  [ItemId.PokeBall]: { battle: { kind: 'catch', rate: 1 } },
  [ItemId.GreatBall]: { battle: { kind: 'catch', rate: 1.5 } },
  [ItemId.UltraBall]: { battle: { kind: 'catch', rate: 2 } },
  [ItemId.MasterBall]: { battle: { kind: 'catch', rate: 'master' } },

  // Battle stat boosts
  [ItemId.XAttack]: { battle: { kind: 'boost', boosts: { atk: 1 } } },
  [ItemId.XDefense]: { battle: { kind: 'boost', boosts: { def: 1 } } },
  [ItemId.XSpAtk]: { battle: { kind: 'boost', boosts: { spa: 1 } } },
  [ItemId.XSpDef]: { battle: { kind: 'boost', boosts: { spd: 1 } } },
  [ItemId.XSpeed]: { battle: { kind: 'boost', boosts: { spe: 1 } } },
  [ItemId.XAccuracy]: { battle: { kind: 'boost', boosts: { accuracy: 1 } } },

  // Field items (overworld only)
  [ItemId.EscapeRope]: { overworld: { kind: 'escape' } },
  [ItemId.Repel]: { overworld: { kind: 'repel', steps: 100 } },
  [ItemId.SuperRepel]: { overworld: { kind: 'repel', steps: 200 } },
  [ItemId.MaxRepel]: { overworld: { kind: 'repel', steps: 250 } },
} satisfies Partial<Record<ItemId, ItemEffects>>;

export function getItemEffects(id: ItemId): ItemEffects | null {
  return (itemEffects as Partial<Record<ItemId, ItemEffects>>)[id] ?? null;
}
