/**
 * @m3rcena/eco
 * Complete TypeScript Type Definitions for the Discord Economy Engine.
 *
 * @copyright 2026 M3rcena Development. All rights reserved.
 * @license Apache-2.0
 */

export interface InventoryItem {
  id: string;
  itemId: string;
  name: string;
  description?: string;
  quantity: number;
  category: string;
  acquiredAt: number;
  metadata?: Record<string, any>;
}

export interface ShopItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category: "consumable" | "upgrade" | "collectible" | "tool" | "role" | string;
  rarity?: "common" | "uncommon" | "rare" | "epic" | "legendary" | "mythic";
  stock?: number;
  maxPurchases?: number;
  consumable?: boolean;
  resaleValue?: number;
  roleRewardId?: string;
  usableEffect?: "shield" | "cooldown_reset" | "gamble_luck" | "xp_boost" | string;
  effectDurationMs?: number;
  effectMagnitude?: number;
}

export interface CareerJob {
  id: string;
  title: string;
  category: string;
  baseSalary: number;
  minLevel: number;
  requiredShiftsForPromotion: number;
  description: string;
  perk?: string;
}

export interface UserCareer {
  jobId: string;
  jobTitle: string;
  level: number;
  shiftsCompleted: number;
  lastPromoted?: number;
}

export interface BusinessConfig {
  id: string;
  name: string;
  category: string;
  baseCost: number;
  baseHourlyRevenue: number;
  upgradeCostMultiplier: number;
  revenueMultiplier: number;
  maxLevel: number;
  description: string;
}

export interface UserBusiness {
  id: string;
  businessId: string;
  name: string;
  level: number;
  employees: number;
  lastCollected: number;
  totalCollected: number;
}

export interface ActiveEffect {
  id: string;
  name: string;
  type: "shield" | "cooldown_reset" | "gamble_luck" | "xp_boost" | string;
  magnitude: number;
  expiresAt: number;
}

export interface UserStats {
  totalEarned: number;
  totalSpent: number;
  totalGambled: number;
  totalGambleWon: number;
  totalRobbed: number;
  timesRobbed: number;
  jobsCompleted: number;
  itemsBought: number;
}

export interface UserAccount {
  userId: string;
  guildId?: string;
  wallet: number;
  bank: number;
  bankCapacity: number;
  xp: number;
  level: number;
  streak: {
    daily: number;
    lastDaily?: number;
    lastWeekly?: number;
    lastMonthly?: number;
    lastHourly?: number;
    lastWork?: number;
    lastBeg?: number;
    lastCrime?: number;
    lastRob?: number;
  };
  career?: UserCareer;
  inventory: InventoryItem[];
  businesses: UserBusiness[];
  activeEffects: ActiveEffect[];
  stats: UserStats;
  createdAt: number;
  updatedAt: number;
}

export interface CasinoBetResult {
  game: "blackjack" | "coinflip" | "roulette" | "slots" | "dice" | "crash" | string;
  betAmount: number;
  outcome: "win" | "lose" | "push";
  payout: number;
  profit: number;
  multiplier: number;
  details: string;
  finalWallet: number;
}

export interface TransferResult {
  success: boolean;
  fromUserId: string;
  toUserId: string;
  amount: number;
  fee: number;
  fromWallet: number;
  toWallet: number;
  error?: string;
}

export interface RobResult {
  success: boolean;
  robberId: string;
  victimId: string;
  amountStolen: number;
  finePaid?: number;
  blockedByShield?: boolean;
  robberWallet: number;
  victimWallet: number;
  message: string;
}

export interface EcoManagerOptions {
  currencySymbol?: string;
  currencyName?: string;
  defaultBankCapacity?: number;
  defaultWalletBalance?: number;
  bankInterestRate?: number; // e.g. 0.01 for 1% daily interest
  transactionFeePercentage?: number; // e.g. 0.02 for 2% transfer fee
  storage?: any;
  bridge?: any; // M3rcenaBridge instance
  cooldowns?: {
    daily?: number;
    weekly?: number;
    monthly?: number;
    hourly?: number;
    work?: number;
    beg?: number;
    crime?: number;
    rob?: number;
  };
}

