/**
 * @m3rcena/eco
 * Complete TypeScript Type Definitions for the Ultimate Discord Economy Engine.
 *
 * @copyright 2026 M3rcena Development. All rights reserved.
 * @license Apache-2.0
 */

import { ColorResolvable } from "discord.js";

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
  category: "consumable" | "upgrade" | "collectible" | "tool" | "crate" | "role" | string;
  rarity?: "common" | "uncommon" | "rare" | "epic" | "legendary" | "mythic";
  stock?: number;
  maxPurchases?: number;
  consumable?: boolean;
  resaleValue?: number;
  roleRewardId?: string;
  usableEffect?: "shield" | "cooldown_reset" | "gamble_luck" | "xp_boost" | "crate_key" | string;
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
  heistsCompleted?: number;
  stockTrades?: number;
}

// ----------------------------------------------------------------------------
// Stock & Crypto Market Types
// ----------------------------------------------------------------------------
export type StockMarketTrend = "BULL" | "BEAR" | "STABLE" | "VOLATILE" | "CRASH" | "MOON";

export interface StockConfig {
  symbol: string;
  name: string;
  category: "TECH" | "CRYPTO" | "FINANCE" | "MINING" | "ENERGY" | string;
  basePrice: number;
  currentPrice: number;
  high24h: number;
  low24h: number;
  change24h: number; // percentage, e.g. +14.5 or -8.2
  history: number[]; // Array of last 10-20 prices for sparkline chart
  volatility: number; // 0.01 to 0.15
  dividendYield?: number; // 0.01 to 0.05
  description: string;
}

export interface UserStockPosition {
  symbol: string;
  shares: number;
  totalInvested: number;
  averageBuyPrice: number;
  lastTradeTimestamp: number;
}

export interface StockTradeResult {
  success: boolean;
  action: "BUY" | "SELL";
  symbol: string;
  shares: number;
  pricePerShare: number;
  totalAmount: number;
  userWallet: number;
  sharesRemaining: number;
  profitOrLoss?: number;
  error?: string;
}

// ----------------------------------------------------------------------------
// Heists & Crime Syndicates Types
// ----------------------------------------------------------------------------
export type HeistRole = "HACKER" | "DRIVER" | "DEMOLITIONIST" | "MUSCLE";

export interface HeistTarget {
  id: string;
  name: string;
  difficulty: "EASY" | "MEDIUM" | "HARD" | "IMPOSSIBLE";
  minLevel: number;
  minCrew: number;
  maxCrew: number;
  baseBountyMin: number;
  baseBountyMax: number;
  failureBail: number;
  description: string;
  successRate: number; // 0.35 to 0.85
}

export interface HeistCrewMember {
  userId: string;
  username: string;
  role: HeistRole;
  ready: boolean;
}

export interface HeistSession {
  id: string;
  guildId?: string;
  initiatorId: string;
  target: HeistTarget;
  crew: HeistCrewMember[];
  phase: "LOBBY" | "PLANNING" | "EXECUTION" | "ESCAPE" | "CONCLUDED";
  createdAt: number;
  success?: boolean;
  totalLoot?: number;
  lootSplit?: Record<string, number>;
  log: string[];
}

export interface HeistResult {
  success: boolean;
  targetName: string;
  totalLoot: number;
  crewCount: number;
  sharePerPlayer: number;
  finePerPlayer?: number;
  log: string[];
}

// ----------------------------------------------------------------------------
// Pets & Companions Types
// ----------------------------------------------------------------------------
export interface PetConfig {
  id: string;
  name: string;
  species: string;
  rarity: "common" | "rare" | "epic" | "legendary" | "mythic";
  buyCost: number;
  description: string;
  emoji: string;
  workMultiplierBonus: number; // e.g. 0.15 for +15%
  crimeProtectionBonus: number; // e.g. 0.10 for +10%
  luckBonus: number; // e.g. 0.05
}

export interface UserPet {
  id: string;
  petId: string;
  name: string;
  species: string;
  level: number;
  xp: number;
  hunger: number; // 0 - 100
  happiness: number; // 0 - 100
  acquiredAt: number;
  isExpeditionActive: boolean;
  expeditionReturnsAt?: number;
  expeditionReward?: {
    coins: number;
    xp: number;
    foundItem?: string;
  };
}

export interface PetExpeditionResult {
  coins: number;
  xp: number;
  petLevel: number;
}

// ----------------------------------------------------------------------------
// Skill Tree & Prestige Types
// ----------------------------------------------------------------------------
export interface SkillTree {
  hustler: number; // +5% work salary per rank (max 10)
  mastermind: number; // -4% crime failure chance per rank (max 10)
  highRoller: number; // +$15,000 bank capacity per rank (max 10)
  fortune: number; // +2% casino luck per rank (max 10)
  tycoon: number; // +10% passive business income per rank (max 10)
  availablePoints: number;
}

export interface Prestige {
  rank: number;
  starEmoji: string;
  globalMultiplier: number;
  totalResets: number;
  lastPrestigeAt?: number;
}

// ----------------------------------------------------------------------------
// Loot Crates Types
// ----------------------------------------------------------------------------
export type CrateTier = "common" | "rare" | "epic" | "legendary" | "mythic";

export interface CrateReward {
  tier: CrateTier;
  coins: number;
  xp: number;
  item?: ShopItem;
  shares?: { symbol: string; count: number };
  announcement: string;
}

// ----------------------------------------------------------------------------
// Real Economy: Bank Vault Tiers, Credit Score, Loans & Municipal Taxes
// ----------------------------------------------------------------------------
export interface BankVaultTier {
  tier: number; // 1 to 6
  name: string;
  capacity: number;
  upgradeCost: number;
  interestRate: number; // e.g. 0.01 for 1% daily interest
  robberyDefense: number; // 0 to 1 defense chance
  perks: string[];
}

export type CreditRating = "POOR" | "FAIR" | "GOOD" | "VERY_GOOD" | "EXCELLENT";

export interface CreditScoreData {
  score: number; // 300 to 850 (default 650)
  rating: CreditRating;
  loansRepaid: number;
  defaultsCount: number;
  taxesPaid: number;
  lastScoreUpdate?: number;
}

export type LoanTier = "starter" | "business" | "commercial" | "whale";

export interface LoanOffer {
  tier: LoanTier;
  name: string;
  principal: number;
  interestRate: number;
  totalDue: number;
  minCreditScore: number;
  durationHours: number;
  description: string;
}

export interface UserLoan {
  id: string;
  tier: LoanTier;
  name: string;
  principal: number;
  totalDue: number;
  remainingDue: number;
  takenAt: number;
  dueAt: number;
  status: "active" | "paid" | "defaulted";
}

export type BillType = "utility" | "rent" | "vault_maintenance" | "syndicate_tribute" | "wealth_tax";

export interface MunicipalBill {
  id: string;
  type: BillType;
  title: string;
  amount: number;
  issuedAt: number;
  dueAt: number;
  isPaid: boolean;
}

// ----------------------------------------------------------------------------
// User Account Model
// ----------------------------------------------------------------------------
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
  stocks?: UserStockPosition[];
  pets?: UserPet[];
  skills?: SkillTree;
  prestige?: Prestige;
  bankTier?: number;
  creditScore?: CreditScoreData;
  loans?: UserLoan[];
  bills?: MunicipalBill[];
  lastInterestClaimedAt?: number;
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

// ----------------------------------------------------------------------------
// Weky-Style Customizability Options
// ----------------------------------------------------------------------------
export interface EcoCustomMessages {
  workSuccess?: string;
  dailyClaimed?: string;
  weeklyClaimed?: string;
  monthlyClaimed?: string;
  hourlyClaimed?: string;
  begSuccess?: string;
  begFailed?: string;
  crimeSuccess?: string;
  crimeFailed?: string;
  robSuccess?: string;
  robFailed?: string;
  robShieldBlocked?: string;
  depositSuccess?: string;
  withdrawSuccess?: string;
  levelUp?: string;
  prestigeAchieved?: string;
  heistSuccess?: string;
  heistFailed?: string;
  stockBuySuccess?: string;
  stockSellSuccess?: string;
  crateOpen?: string;
}

export interface EcoCustomEmojis {
  wallet?: string;
  bank?: string;
  netWorth?: string;
  gems?: string;
  streak?: string;
  level?: string;
  shield?: string;
  stockBull?: string;
  stockBear?: string;
  pet?: string;
  crate?: string;
  heist?: string;
}

export interface EcoManagerOptions {
  currencySymbol?: string;
  currencyName?: string;
  secondaryCurrencySymbol?: string;
  secondaryCurrencyName?: string;
  embedColor?: ColorResolvable | number | string;
  mode?: "guild" | "global";
  defaultBankCapacity?: number;
  defaultWalletBalance?: number;
  bankInterestRate?: number; // e.g. 0.01 for 1% daily interest
  transactionFeePercentage?: number; // e.g. 0.02 for 2% transfer fee
  storage?: any;
  bridge?: any; // M3rcenaBridge instance
  customMessages?: Partial<EcoCustomMessages>;
  emojis?: Partial<EcoCustomEmojis>;
  stockMarketTickIntervalMs?: number; // default 60000 (1 min)
  initialStocks?: StockConfig[];
  initialHeistTargets?: HeistTarget[];
  initialPets?: PetConfig[];
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
