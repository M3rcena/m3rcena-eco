import http from "node:http";
import { ColorResolvable } from "discord.js";
import { EventEmitter } from "node:events";
import { BridgeAction, BridgePackageRouter, BridgeRequest, BridgeResponse } from "@m3rcena/bridge";
interface InventoryItem {
  id: string;
  itemId: string;
  name: string;
  description?: string;
  quantity: number;
  category: string;
  acquiredAt: number;
  metadata?: Record<string, any>;
}
interface ShopItem {
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
interface CareerJob {
  id: string;
  title: string;
  category: string;
  baseSalary: number;
  minLevel: number;
  requiredShiftsForPromotion: number;
  description: string;
  perk?: string;
}
interface UserCareer {
  jobId: string;
  jobTitle: string;
  level: number;
  shiftsCompleted: number;
  lastPromoted?: number;
}
interface BusinessConfig {
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
interface UserBusiness {
  id: string;
  businessId: string;
  name: string;
  level: number;
  employees: number;
  lastCollected: number;
  totalCollected: number;
}
interface ActiveEffect {
  id: string;
  name: string;
  type: "shield" | "cooldown_reset" | "gamble_luck" | "xp_boost" | string;
  magnitude: number;
  expiresAt: number;
}
interface UserStats {
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
type StockMarketTrend = "BULL" | "BEAR" | "STABLE" | "VOLATILE" | "CRASH" | "MOON";
interface StockConfig {
  symbol: string;
  name: string;
  category: "TECH" | "CRYPTO" | "FINANCE" | "MINING" | "ENERGY" | string;
  basePrice: number;
  currentPrice: number;
  high24h: number;
  low24h: number;
  change24h: number;
  history: number[];
  volatility: number;
  dividendYield?: number;
  description: string;
}
interface UserStockPosition {
  symbol: string;
  shares: number;
  totalInvested: number;
  averageBuyPrice: number;
  lastTradeTimestamp: number;
}
interface StockTradeResult {
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
type HeistRole = "HACKER" | "DRIVER" | "DEMOLITIONIST" | "MUSCLE";
interface HeistTarget {
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
  successRate: number;
}
interface HeistCrewMember {
  userId: string;
  username: string;
  role: HeistRole;
  ready: boolean;
}
interface HeistSession {
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
interface HeistResult {
  success: boolean;
  targetName: string;
  totalLoot: number;
  crewCount: number;
  sharePerPlayer: number;
  finePerPlayer?: number;
  log: string[];
}
interface PetConfig {
  id: string;
  name: string;
  species: string;
  rarity: "common" | "rare" | "epic" | "legendary" | "mythic";
  buyCost: number;
  description: string;
  emoji: string;
  workMultiplierBonus: number;
  crimeProtectionBonus: number;
  luckBonus: number;
}
interface UserPet {
  id: string;
  petId: string;
  name: string;
  species: string;
  level: number;
  xp: number;
  hunger: number;
  happiness: number;
  acquiredAt: number;
  isExpeditionActive: boolean;
  expeditionReturnsAt?: number;
  expeditionReward?: {
    coins: number;
    xp: number;
    foundItem?: string;
  };
}
interface PetExpeditionResult {
  coins: number;
  xp: number;
  petLevel: number;
}
interface SkillTree {
  hustler: number;
  mastermind: number;
  highRoller: number;
  fortune: number;
  tycoon: number;
  availablePoints: number;
}
interface Prestige {
  rank: number;
  starEmoji: string;
  globalMultiplier: number;
  totalResets: number;
  lastPrestigeAt?: number;
}
type CrateTier = "common" | "rare" | "epic" | "legendary" | "mythic";
interface CrateReward {
  tier: CrateTier;
  coins: number;
  xp: number;
  item?: ShopItem;
  shares?: {
    symbol: string;
    count: number;
  };
  announcement: string;
}
interface BankVaultTier {
  tier: number;
  name: string;
  capacity: number;
  upgradeCost: number;
  interestRate: number;
  robberyDefense: number;
  perks: string[];
}
type CreditRating = "POOR" | "FAIR" | "GOOD" | "VERY_GOOD" | "EXCELLENT";
interface CreditScoreData {
  score: number;
  rating: CreditRating;
  loansRepaid: number;
  defaultsCount: number;
  taxesPaid: number;
  lastScoreUpdate?: number;
}
type LoanTier = "starter" | "business" | "commercial" | "whale";
interface LoanOffer {
  tier: LoanTier;
  name: string;
  principal: number;
  interestRate: number;
  totalDue: number;
  minCreditScore: number;
  durationHours: number;
  description: string;
}
interface UserLoan {
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
type BillType = "utility" | "rent" | "vault_maintenance" | "syndicate_tribute" | "wealth_tax";
interface MunicipalBill {
  id: string;
  type: BillType;
  title: string;
  amount: number;
  issuedAt: number;
  dueAt: number;
  isPaid: boolean;
}
interface UserAccount {
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
interface CasinoBetResult {
  game: "blackjack" | "coinflip" | "roulette" | "slots" | "dice" | "crash" | string;
  betAmount: number;
  outcome: "win" | "lose" | "push";
  payout: number;
  profit: number;
  multiplier: number;
  details: string;
  finalWallet: number;
}
interface TransferResult {
  success: boolean;
  fromUserId: string;
  toUserId: string;
  amount: number;
  fee: number;
  fromWallet: number;
  toWallet: number;
  error?: string;
}
interface RobResult {
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
interface EcoCustomMessages {
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
interface EcoCustomEmojis {
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
interface EcoManagerOptions {
  currencySymbol?: string;
  currencyName?: string;
  secondaryCurrencySymbol?: string;
  secondaryCurrencyName?: string;
  embedColor?: ColorResolvable | number | string;
  mode?: "guild" | "global";
  defaultBankCapacity?: number;
  defaultWalletBalance?: number;
  bankInterestRate?: number;
  transactionFeePercentage?: number;
  storage?: any;
  /** Database configuration for SQLite or Prisma ("sqlite" | "prisma" | "json" | "memory") */
  database?: EcoDatabaseConfig;
  bridge?: any;
  /** Whether to log an update notification box in terminal if newer version is available. Default: true */
  notifyUpdates?: boolean;
  customMessages?: Partial<EcoCustomMessages>;
  emojis?: Partial<EcoCustomEmojis>;
  stockMarketTickIntervalMs?: number;
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
type EcoDatabaseConfig = "sqlite" | "memory" | "json" | {
  type: "sqlite";
  path?: string;
} | {
  type: "prisma";
  client: any;
  model?: string;
  autoMigrate?: boolean;
} | {
  type: "json";
  path?: string;
} | {
  type: "memory";
};
/**
 * Strongly-typed events emitted by EcoManager.
 */
interface EcoEvents {
  walletAdd: [event: {
    userId: string;
    amount: number;
    newWallet: number;
    guildId?: string;
  }];
  walletRemove: [event: {
    userId: string;
    amount: number;
    newWallet: number;
    guildId?: string;
  }];
  deposit: [event: {
    userId: string;
    deposited: number;
    wallet: number;
    bank: number;
    guildId?: string;
  }];
  withdraw: [event: {
    userId: string;
    withdrawn: number;
    wallet: number;
    bank: number;
    guildId?: string;
  }];
  transfer: [event: TransferResult & {
    guildId?: string;
  }];
  dailyClaim: [event: {
    userId: string;
    amount: number;
    streak: number;
    isMilestone: boolean;
    guildId?: string;
  }];
  work: [event: {
    userId: string;
    earned: number;
    xp: number;
    job?: CareerJob;
    promoted: boolean;
    guildId?: string;
  }];
  crime: [event: {
    userId: string;
    success: boolean;
    earned?: number;
    fine?: number;
    crimeType?: string;
    guildId?: string;
  }];
  robbery: [event: RobResult & {
    guildId?: string;
  }];
  gamble: [event: CasinoBetResult & {
    userId: string;
    game: string;
    betAmount: number;
    guildId?: string;
  }];
  heist: [result: HeistResult & {
    targetId?: string;
    guildId?: string;
  }];
  shopPurchase: [event: {
    userId: string;
    item: ShopItem;
    quantity: number;
    totalCost: number;
    newWallet: number;
    guildId?: string;
  }];
  shopSell: [event: {
    userId: string;
    item: ShopItem;
    quantity: number;
    revenue: number;
    newWallet: number;
    guildId?: string;
  }];
  businessCollect: [event: {
    userId: string;
    businessId: string;
    amount: number;
    newWallet: number;
    guildId?: string;
  }];
  loanDisbursed: [event: {
    userId: string;
    loan: UserLoan;
    guildId?: string;
  }];
  loanRepaid: [event: {
    userId: string;
    amountPaid: number;
    remainingDue: number;
    isFullyPaid: boolean;
    newCreditScore: number;
    guildId?: string;
  }];
  billsPaid: [event: {
    userId: string;
    totalAmountPaid: number;
    paidCount: number;
    newCreditScore: number;
    guildId?: string;
  }];
  vaultUpgraded: [event: {
    userId: string;
    newTier: BankVaultTier;
    cost: number;
    guildId?: string;
  }];
  crateOpened: [event: {
    userId: string;
    tier: CrateTier;
    rewards: CrateReward[];
    guildId?: string;
  }];
  petAdopted: [event: {
    userId: string;
    pet: UserPet;
    cost: number;
    guildId?: string;
  }];
  stockTrade: [result: StockTradeResult & {
    userId: string;
    guildId?: string;
  }];
  bridgeAction: [action: {
    module: string;
    action: string;
    playerId: string;
    payload: any;
  }];
}
interface EcoStorageAdapter {
  getAccount(userId: string, guildId?: string): Promise<UserAccount | null>;
  saveAccount(account: UserAccount): Promise<void>;
  getTopAccounts(sortBy: "netWorth" | "wallet" | "bank" | "level", limit?: number, guildId?: string): Promise<UserAccount[]>;
  getAllAccounts(guildId?: string): Promise<UserAccount[]>;
}
declare function createDefaultAccount(userId: string, guildId?: string, defaultWallet?: number, defaultBankCap?: number): UserAccount;
declare class MemoryEcoStorage implements EcoStorageAdapter {
  private accounts;
  private makeKey;
  getAccount(userId: string, guildId?: string): Promise<UserAccount | null>;
  saveAccount(account: UserAccount): Promise<void>;
  getTopAccounts(sortBy?: "netWorth" | "wallet" | "bank" | "level", limit?: number, guildId?: string): Promise<UserAccount[]>;
  getAllAccounts(guildId?: string): Promise<UserAccount[]>;
}
declare class JsonEcoStorage implements EcoStorageAdapter {
  private filePath;
  private cache;
  private loaded;
  constructor(filePath?: string);
  private makeKey;
  private ensureLoaded;
  private persist;
  getAccount(userId: string, guildId?: string): Promise<UserAccount | null>;
  saveAccount(account: UserAccount): Promise<void>;
  getTopAccounts(sortBy?: "netWorth" | "wallet" | "bank" | "level", limit?: number, guildId?: string): Promise<UserAccount[]>;
  getAllAccounts(guildId?: string): Promise<UserAccount[]>;
}
declare class BankManager {
  private storage;
  private defaultWallet;
  private defaultBankCap;
  private transactionFee;
  constructor(storage: EcoStorageAdapter, options?: {
    defaultWallet?: number;
    defaultBankCap?: number;
    transactionFee?: number;
  });
  getAccount(userId: string, guildId?: string): Promise<UserAccount>;
  saveAccount(account: UserAccount): Promise<void>;
  /**
   * Deposits cash from wallet into the bank up to bank capacity.
   */
  deposit(userId: string, amount: number | "all", guildId?: string): Promise<{
    success: boolean;
    deposited: number;
    wallet: number;
    bank: number;
    error?: string;
  }>;
  /**
   * Withdraws cash from bank to wallet.
   */
  withdraw(userId: string, amount: number | "all", guildId?: string): Promise<{
    success: boolean;
    withdrawn: number;
    wallet: number;
    bank: number;
    error?: string;
  }>;
  /**
   * Transfers funds from one user's wallet to another.
   */
  transfer(fromUserId: string, toUserId: string, amount: number, guildId?: string): Promise<TransferResult>;
  /**
   * Upgrades bank capacity for a fee.
   */
  upgradeCapacity(userId: string, additionalCapacity: number, cost: number, guildId?: string): Promise<{
    success: boolean;
    newCapacity: number;
    wallet: number;
    error?: string;
  }>;
  /**
   * Adds cash to wallet.
   */
  addWallet(userId: string, amount: number, guildId?: string): Promise<number>;
  /**
   * Removes cash from wallet.
   */
  removeWallet(userId: string, amount: number, guildId?: string): Promise<number>;
  /**
   * Adds or subtracts wallet balance directly (admin/reward action).
   */
  modifyWallet(userId: string, delta: number, guildId?: string): Promise<{
    newBalance: number;
  }>;
}
declare class RewardManager {
  private bank;
  private cooldowns;
  constructor(bank: BankManager, customCooldowns?: Record<string, number>);
  private checkCooldown;
  /**
   * Claims the daily reward with streak multipliers.
   */
  claimDaily(userId: string, guildId?: string): Promise<{
    success: boolean;
    amount: number;
    rewardAmount: number;
    streak: number;
    isMilestone: boolean;
    jackpotMilestone?: boolean;
    remainingMs?: number;
    cooldownRemainingMs?: number;
  }>;
  /**
   * Claims weekly reward bonus.
   */
  claimWeekly(userId: string, guildId?: string): Promise<{
    success: boolean;
    amount: number;
    rewardAmount: number;
    remainingMs?: number;
    cooldownRemainingMs?: number;
  }>;
  /**
   * Claims monthly reward bonus.
   */
  claimMonthly(userId: string, guildId?: string): Promise<{
    success: boolean;
    amount: number;
    rewardAmount: number;
    remainingMs?: number;
    cooldownRemainingMs?: number;
  }>;
  /**
   * Claims hourly allowance.
   */
  claimHourly(userId: string, guildId?: string): Promise<{
    success: boolean;
    amount: number;
    rewardAmount: number;
    remainingMs?: number;
    cooldownRemainingMs?: number;
  }>;
  /**
   * Completes a work shift.
   */
  work(userId: string, guildId?: string, bonusSalary?: number): Promise<{
    success: boolean;
    earned: number;
    earnedAmount: number;
    xp: number;
    xpEarned: number;
    jobTitle: string;
    remainingMs?: number;
    cooldownRemainingMs?: number;
  }>;
  /**
   * Begs for coins from random NPCs.
   */
  beg(userId: string, guildId?: string): Promise<{
    success: boolean;
    earned: number;
    npc: string;
    donor: string;
    quote: string;
    remainingMs?: number;
    cooldownRemainingMs?: number;
  }>;
  /**
   * Attempts an illicit crime for high stakes.
   */
  commitCrime(userId: string, guildId?: string): Promise<{
    success: boolean;
    payout: number;
    earned?: number;
    fine: number;
    message: string;
    remainingMs?: number;
    cooldownRemainingMs?: number;
  }>;
  /**
   * Alias for commitCrime.
   */
  crime(userId: string, guildId?: string): Promise<{
    success: boolean;
    payout: number;
    earned?: number;
    fine: number;
    message: string;
    remainingMs?: number;
    cooldownRemainingMs?: number;
  }>;
  /**
   * Attempts to rob another player's wallet.
   */
  rob(robberId: string, victimId: string, guildId?: string): Promise<RobResult>;
  private checkLevelUp;
}
declare const DEFAULT_JOBS: CareerJob[];
declare class CareerManager {
  private bank;
  private jobs;
  constructor(bank: BankManager, initialJobs?: CareerJob[]);
  /**
   * Returns all available jobs.
   */
  getJobs(): CareerJob[];
  /**
   * Retrieves a job by ID.
   */
  getJob(jobId: string): CareerJob | undefined;
  /**
   * Registers a new custom job.
   */
  registerJob(job: CareerJob): void;
  /**
   * Returns a user's current career.
   */
  getCareer(userId: string, guildId?: string): Promise<UserCareer | null>;
  /**
   * Applies for a job. User must meet the minimum level requirement.
   */
  apply(userId: string, jobId: string, guildId?: string): Promise<{
    success: boolean;
    job?: CareerJob;
    error?: string;
  }>;
  /**
   * Resigns from the current career.
   */
  resign(userId: string, guildId?: string): Promise<{
    success: boolean;
    previousJob?: string;
    error?: string;
  }>;
  /**
   * Records a shift worked and checks for a promotion.
   */
  recordShift(userId: string, guildId?: string): Promise<{
    hasCareer: boolean;
    promoted: boolean;
    newCareerLevel?: number;
    promotionBonus?: number;
    shiftsCompleted?: number;
    job?: CareerJob;
  }>;
  /**
   * Computes salary for a user based on their career and career level.
   */
  calculateSalary(career?: UserCareer): number;
}
declare const DEFAULT_SHOP_ITEMS: ShopItem[];
declare class ShopManager {
  private bank;
  private items;
  constructor(bank: BankManager, initialItems?: ShopItem[]);
  /**
   * Returns all items currently in the shop.
   */
  getItems(): ShopItem[];
  /**
   * Retrieves an item by ID.
   */
  getItem(itemId: string): ShopItem | undefined;
  /**
   * Registers a new item or updates an existing one in the shop catalog.
   */
  registerItem(item: ShopItem): void;
  /**
   * Cleans expired effects from an account.
   */
  private cleanExpiredEffects;
  /**
   * Purchases one or more units of an item.
   */
  buy(userId: string, itemId: string, quantity?: number, guildId?: string): Promise<{
    success: boolean;
    item?: ShopItem;
    quantity: number;
    totalCost: number;
    newWallet: number;
    error?: string;
  }>;
  /**
   * Sells an item from inventory back to the store.
   */
  sell(userId: string, itemId: string, quantity?: number, guildId?: string): Promise<{
    success: boolean;
    item?: ShopItem;
    quantity: number;
    earned: number;
    newWallet: number;
    error?: string;
  }>;
  /**
   * Uses/consumes an item from the user's inventory.
   */
  use(userId: string, itemId: string, guildId?: string): Promise<{
    success: boolean;
    message: string;
    item?: ShopItem;
    effect?: ActiveEffect;
    lotteryWon?: number;
    error?: string;
  }>;
  /**
   * Retrieves active, unexpired effects for a user.
   */
  getActiveEffects(userId: string, guildId?: string): Promise<ActiveEffect[]>;
  /**
   * Checks if a user has a specific effect active.
   */
  hasActiveEffect(userId: string, effectType: string, guildId?: string): Promise<boolean>;
  /**
   * Consumes an active effect (e.g. shield is spent when blocking robbery).
   */
  consumeActiveEffect(userId: string, effectType: string, guildId?: string): Promise<boolean>;
  /**
   * Returns a user's inventory.
   */
  getInventory(userId: string, guildId?: string): Promise<InventoryItem[]>;
}
declare const DEFAULT_BUSINESS_CATALOG: BusinessConfig[];
declare class BusinessManager {
  private bank;
  private catalog;
  private maxAccumulationHours;
  constructor(bank: BankManager, initialCatalog?: BusinessConfig[], maxAccumulationHours?: number);
  /**
   * Returns all available businesses in the catalog.
   */
  getCatalog(): BusinessConfig[];
  /**
   * Retrieves business configuration by ID.
   */
  getBusinessConfig(id: string): BusinessConfig | undefined;
  /**
   * Registers a new custom business.
   */
  registerBusiness(config: BusinessConfig): void;
  /**
   * Calculates the upgrade cost for a business from its current level.
   */
  calculateUpgradeCost(business: UserBusiness): number;
  /**
   * Calculates employee hiring cost for a business.
   */
  calculateEmployeeHiringCost(business: UserBusiness, count: number): number;
  /**
   * Calculates the hourly revenue generated by a business.
   */
  calculateHourlyRevenue(business: UserBusiness): number;
  /**
   * Computes pending unclaimed revenue for a business based on time elapsed.
   */
  calculatePendingRevenue(business: UserBusiness): number;
  /**
   * Retrieves all businesses owned by a user, enriched with pending revenue and stats.
   */
  getUserBusinesses(userId: string, guildId?: string): Promise<Array<{
    business: UserBusiness;
    config: BusinessConfig;
    pendingRevenue: number;
    hourlyRevenue: number;
    upgradeCost: number;
  }>>;
  /**
   * Purchases a new business enterprise.
   */
  buyBusiness(userId: string, businessId: string, guildId?: string): Promise<{
    success: boolean;
    business?: UserBusiness;
    cost: number;
    newWallet: number;
    error?: string;
  }>;
  /**
   * Upgrades an existing business level.
   */
  upgradeBusiness(userId: string, businessId: string, guildId?: string): Promise<{
    success: boolean;
    business?: UserBusiness;
    newLevel: number;
    upgradeCost: number;
    newWallet: number;
    error?: string;
  }>;
  /**
   * Hires additional staff members to boost output.
   */
  hireEmployees(userId: string, businessId: string, count?: number, guildId?: string): Promise<{
    success: boolean;
    business?: UserBusiness;
    totalEmployees: number;
    cost: number;
    newWallet: number;
    error?: string;
  }>;
  /**
   * Collects accumulated passive profits from all owned businesses or a specific business.
   */
  collectRevenue(userId: string, businessId?: string, guildId?: string): Promise<{
    success: boolean;
    collected: number;
    newWallet: number;
    summary: Array<{
      businessId: string;
      name: string;
      amount: number;
    }>;
    error?: string;
  }>;
}
interface Card {
  suit: "♠" | "♥" | "♦" | "♣";
  rank: string;
  value: number;
}
interface BlackjackState {
  gameId: string;
  userId: string;
  guildId?: string;
  betAmount: number;
  deck: Card[];
  playerHand: Card[];
  dealerHand: Card[];
  status: "playing" | "player_bust" | "dealer_bust" | "player_win" | "dealer_win" | "push" | "blackjack";
  payout: number;
  finished: boolean;
}
declare class CasinoManager {
  private bank;
  private shop?;
  private activeBlackjackGames;
  constructor(bank: BankManager, shop?: ShopManager);
  setShopManager(shop: ShopManager): void;
  /**
   * Helper to check for active luck boost effect.
   */
  private getLuckBoost;
  /**
   * Pre-bet validation & deduction.
   */
  private prepareBet;
  /**
   * Post-bet payout & stats recording.
   */
  private finishBet;
  coinflip(userId: string, betAmount: number, choice: "heads" | "tails", guildId?: string): Promise<CasinoBetResult>;
  dice(userId: string, betAmount: number, prediction: "high" | "low" | number, guildId?: string): Promise<CasinoBetResult>;
  slots(userId: string, betAmount: number, guildId?: string): Promise<CasinoBetResult>;
  roulette(userId: string, betAmount: number, betType: "red" | "black" | "green" | "even" | "odd" | number, guildId?: string): Promise<CasinoBetResult>;
  crash(userId: string, betAmount: number, targetMultiplier: number, guildId?: string): Promise<CasinoBetResult>;
  private buildDeck;
  calculateHand(hand: Card[]): {
    total: number;
    isSoft: boolean;
    isBust: boolean;
    isBlackjack: boolean;
  };
  /**
   * Starts an interactive Blackjack game session.
   */
  startBlackjackGame(userId: string, betAmount: number, guildId?: string): Promise<BlackjackState>;
  /**
   * Player draws a card ("hit").
   */
  blackjackHit(gameId: string): Promise<BlackjackState>;
  /**
   * Player stands. Dealer resolves their hand according to standard casino rules (dealer hits until >= 17).
   */
  blackjackStand(gameId: string): Promise<BlackjackState>;
  /**
   * Double down: doubles bet, receives exactly one card, and automatically stands.
   */
  blackjackDouble(gameId: string): Promise<BlackjackState>;
  getActiveBlackjackGame(gameId: string): BlackjackState | undefined;
}
type LeaderboardMetric = "net_worth" | "wallet" | "bank" | "level" | "streak";
interface LeaderboardEntry {
  rank: number;
  userId: string;
  guildId?: string;
  value: number;
  wallet: number;
  bank: number;
  netWorth: number;
  level: number;
  streak: number;
}
declare class LeaderboardManager {
  private storage;
  private shop?;
  private business?;
  constructor(storage: EcoStorageAdapter, shop?: ShopManager, business?: BusinessManager);
  /**
   * Computes a user's total Net Worth across liquid cash, bank savings, business assets, and inventory collectibles.
   */
  calculateNetWorth(account: UserAccount): number;
  /**
   * Generates a ranked leaderboard for the specified metric.
   */
  getLeaderboard(metric?: LeaderboardMetric, limit?: number, guildId?: string): Promise<LeaderboardEntry[]>;
  /**
   * Formats the leaderboard entries into a clean Discord markdown string.
   */
  formatLeaderboard(entries: LeaderboardEntry[], metric?: LeaderboardMetric, currencySymbol?: string): string;
}
declare const DEFAULT_STOCKS: StockConfig[];
declare class StockMarketManager {
  private bank;
  private stocks;
  private marketTrend;
  private lastTick;
  constructor(bank: BankManager, initialStocks?: StockConfig[]);
  getStocks(): StockConfig[];
  getStock(symbol: string): StockConfig | undefined;
  getMarketTrend(): StockMarketTrend;
  /**
   * Ticks the market forward, simulating realistic price fluctuations.
   */
  tickMarket(): void;
  /**
   * Purchases shares of a stock or cryptocurrency.
   */
  buyStock(userId: string, symbol: string, shares: number, guildId?: string): Promise<StockTradeResult>;
  /**
   * Sells shares of an owned stock or cryptocurrency.
   */
  sellStock(userId: string, symbol: string, sharesToSell: number | "all", guildId?: string): Promise<StockTradeResult>;
  /**
   * Retrieves user portfolio valuation and positions.
   */
  getUserPortfolio(userId: string, guildId?: string): Promise<{
    userId: string;
    positions: {
      symbol: string;
      name: string;
      shares: number;
      averageBuyPrice: number;
      currentPrice: number;
      currentValue: number;
      profitOrLoss: number;
      profitOrLossPercentage: number;
    }[];
    totalPortfolioValue: number;
  }>;
}
declare const DEFAULT_HEIST_TARGETS: HeistTarget[];
declare class HeistManager {
  private bank;
  private targets;
  private activeHeists;
  constructor(bank: BankManager, targets?: HeistTarget[]);
  getTargets(): HeistTarget[];
  getTarget(id: string): HeistTarget | undefined;
  getHeist(heistId: string): HeistSession | undefined;
  /**
   * Creates a new Heist lobby.
   */
  createLobby(initiatorId: string, initiatorName: string, targetId: string, guildId?: string): Promise<{
    success: boolean;
    session?: HeistSession;
    error?: string;
  }>;
  /**
   * Joins an existing heist lobby with a specific role.
   */
  joinLobby(heistId: string, userId: string, username: string, role: HeistRole): {
    success: boolean;
    session?: HeistSession;
    error?: string;
  };
  /**
   * Executes the heist.
   */
  executeHeist(heistId: string): Promise<HeistResult>;
}
declare const DEFAULT_PETS: PetConfig[];
declare class PetManager {
  private bank;
  private catalog;
  constructor(bank: BankManager, initialPets?: PetConfig[]);
  getCatalog(): PetConfig[];
  getPetConfig(id: string): PetConfig | undefined;
  /**
   * Adopts/purchases a companion pet.
   */
  adoptPet(userId: string, petId: string, customName?: string, guildId?: string): Promise<{
    success: boolean;
    pet?: UserPet;
    error?: string;
  }>;
  /**
   * Feeds a pet to restore hunger and happiness.
   */
  feedPet(userId: string, petId: string, guildId?: string): Promise<{
    success: boolean;
    pet?: UserPet;
    error?: string;
  }>;
  /**
   * Dispatches pet on a timed foraging expedition.
   */
  sendExpedition(userId: string, petId: string, durationHours?: number, guildId?: string): Promise<{
    success: boolean;
    returnsAt?: number;
    error?: string;
  }>;
  /**
   * Claims rewards when a pet returns from an expedition.
   */
  claimExpedition(userId: string, petId: string, guildId?: string): Promise<{
    success: boolean;
    reward?: any;
    error?: string;
  }>;
}
declare const CRATE_PRICES: Record<CrateTier, number>;
declare class CrateManager {
  private bank;
  constructor(bank: BankManager);
  getCratePrice(tier: CrateTier): number;
  /**
   * Opens a mystery crate of the given tier and awards randomized rewards.
   */
  openCrate(userId: string, tier: CrateTier, guildId?: string): Promise<CrateReward>;
}
declare const DEFAULT_VAULT_TIERS: BankVaultTier[];
declare class VaultManager {
  private bank;
  private tiers;
  constructor(bank: BankManager, customTiers?: BankVaultTier[]);
  getVaultTiers(): BankVaultTier[];
  getVaultTier(tierNumber: number): BankVaultTier;
  getUserVault(userId: string, guildId?: string): Promise<{
    currentTier: BankVaultTier;
    nextTier?: BankVaultTier;
    bank: number;
    capacity: number;
    dailyInterestAccrual: number;
    canClaimInterest: boolean;
  }>;
  /**
   * Upgrades the user's bank vault to the next tier.
   */
  upgradeVault(userId: string, guildId?: string): Promise<{
    success: boolean;
    previousTier: BankVaultTier;
    newTier: BankVaultTier;
    cost: number;
    newCapacity: number;
    error?: string;
  }>;
  /**
   * Claims accumulated 24h compound interest on savings.
   */
  claimDailyInterest(userId: string, guildId?: string): Promise<{
    success: boolean;
    interestEarned: number;
    newBankBalance: number;
    rate: number;
    cooldownRemainingMs?: number;
    error?: string;
  }>;
}
declare const LOAN_CATALOG: LoanOffer[];
declare class LoanManager {
  private bank;
  private offers;
  constructor(bank: BankManager, customOffers?: LoanOffer[]);
  getOffers(): LoanOffer[];
  getRatingForScore(score: number): CreditRating;
  getCreditScore(userId: string, guildId?: string): Promise<CreditScoreData>;
  getUserLoans(userId: string, guildId?: string): Promise<UserLoan[]>;
  /**
   * Applies for a new bank loan.
   */
  applyLoan(userId: string, tier: LoanTier, guildId?: string): Promise<{
    success: boolean;
    loan?: UserLoan;
    creditScore: number;
    error?: string;
  }>;
  /**
   * Repays active debt.
   */
  repayLoan(userId: string, loanId: string, amount: number | "all", guildId?: string): Promise<{
    success: boolean;
    amountPaid: number;
    remainingDue: number;
    isFullyPaid: boolean;
    newCreditScore: number;
    error?: string;
  }>;
  /**
   * Audits active debts and executes repo / collections on defaulted loans.
   */
  processCollections(userId: string, guildId?: string): Promise<{
    defaultedLoans: UserLoan[];
    garnishedCash: number;
    scorePenalty: number;
    newScore: number;
  }>;
}
declare class TaxManager {
  private bank;
  constructor(bank: BankManager);
  getPendingBills(userId: string, guildId?: string): Promise<MunicipalBill[]>;
  getAllBills(userId: string, guildId?: string): Promise<MunicipalBill[]>;
  /**
   * Generates municipal bills & progressive wealth taxes if due.
   */
  generateBillsIfDue(userId: string, guildId?: string): Promise<{
    generated: boolean;
    newBills: MunicipalBill[];
    totalBilled: number;
  }>;
  /**
   * Pays a specific municipal bill.
   */
  payBill(userId: string, billId: string, guildId?: string): Promise<{
    success: boolean;
    bill?: MunicipalBill;
    amountPaid: number;
    newCreditScore: number;
    error?: string;
  }>;
  /**
   * Settles all pending municipal bills at once.
   */
  payAllBills(userId: string, guildId?: string): Promise<{
    success: boolean;
    paidCount: number;
    totalAmountPaid: number;
    newCreditScore: number;
    error?: string;
  }>;
  /**
   * Attempts high-risk offshore tax evasion to wipe pending wealth taxes.
   */
  attemptTaxEvasion(userId: string, guildId?: string): Promise<{
    success: boolean;
    taxesEvaded: number;
    penaltyFined: number;
    creditScoreChange: number;
    newCreditScore: number;
    auditDetails: string;
  }>;
}
declare class EcoBridgeRouter implements BridgePackageRouter {
  name: string;
  basePath: string;
  description: string;
  version: string;
  private eco;
  constructor(eco: EcoManager);
  handleRequest(req: BridgeRequest): Promise<BridgeResponse | null>;
  handleAction(action: BridgeAction): Promise<any>;
}
interface EcoGameRewardRule {
  /** Flat coins awarded on victory */
  winReward?: number;
  /** Flat coins deducted on defeat */
  lossPenalty?: number;
  /** Flat coins awarded on draw / tie */
  drawReward?: number;
  /** Multiplier for solo points/score (e.g. 0.05 means 1000 score = 50 coins) */
  scoreMultiplier?: number;
  /** Maximum coins allowed from score multiplier */
  maxScoreReward?: number;
  /** Bonus coins awarded per win streak count */
  streakBonus?: number;
}
interface EcoWagerRecord {
  id: string;
  player1Id: string;
  player2Id: string;
  amount: number;
  totalPot: number;
  guildId?: string;
  game?: string;
  createdAt: number;
  status: "active" | "resolved" | "refunded";
  winnerId?: string;
}
interface EcoWagerCreateResult {
  success: boolean;
  wager?: EcoWagerRecord;
  reason?: string;
  failedUserId?: string;
}
interface EcoWekyConnectorOptions {
  /** Default flat coins awarded on victory (default: 50) */
  defaultWinReward?: number;
  /** Default flat coins deducted on defeat (default: 0) */
  defaultLossPenalty?: number;
  /** Default flat coins awarded on tie/draw (default: 10) */
  defaultDrawReward?: number;
  /** Default multiplier applied to solo score (default: 0.05) */
  defaultScoreMultiplier?: number;
  /** Maximum coins awarded from score in a single game (default: 500) */
  maxScoreReward?: number;
  /** Bonus coins awarded per active win streak count (default: 5) */
  streakBonus?: number;
  /** Tournament champion cash prize (default: 500) */
  tournamentChampionPrize?: number;
  /** Tournament runner-up cash prize (default: 200) */
  tournamentRunnerUpPrize?: number;
  /** House fee percentage taken from PvP wager pots (0 - 100, default: 0) */
  wagerHouseFee?: number;
  /** Specific per-game rule overrides */
  games?: Record<string, EcoGameRewardRule>;
  /** Whether automatic rewards on gameOver are enabled (default: true) */
  autoReward?: boolean;
}
interface EcoRewardDistributionResult {
  userId: string;
  game: string;
  outcome: "WIN" | "LOSE" | "DRAW" | "SCORE" | "TOURNAMENT";
  amount: number;
  newBalance: number;
  reason: string;
  streakBonus?: number;
  scoreBonus?: number;
  wagerWon?: number;
}
interface EcoWagerResolvedEvent {
  wager: EcoWagerRecord;
  winnerId: string;
  loserId: string;
  payout: number;
  houseFee: number;
}
interface EcoWagerRefundedEvent {
  wager: EcoWagerRecord;
  reason: string;
}
/**
 * Type-safe map of events emitted by EcoWekyConnector.
 */
interface EcoWekyConnectorEvents {
  wagerCreated: [wager: EcoWagerRecord];
  wagerResolved: [event: EcoWagerResolvedEvent];
  wagerRefunded: [event: EcoWagerRefundedEvent];
  reward: [result: EcoRewardDistributionResult];
  penalty: [result: EcoRewardDistributionResult];
  tournamentReward: [result: EcoRewardDistributionResult];
  error: [error: any];
}
declare class EcoWekyConnector extends EventEmitter {
  readonly eco: EcoManager;
  readonly weky: any;
  options: EcoWekyConnectorOptions;
  private activeWagers;
  private userToWagerMap;
  constructor(eco: EcoManager, weky: any, options?: EcoWekyConnectorOptions);
  on<K extends keyof EcoWekyConnectorEvents>(event: K, listener: (...args: EcoWekyConnectorEvents[K]) => void): this;
  on(event: string | symbol, listener: (...args: any[]) => void): this;
  once<K extends keyof EcoWekyConnectorEvents>(event: K, listener: (...args: EcoWekyConnectorEvents[K]) => void): this;
  once(event: string | symbol, listener: (...args: any[]) => void): this;
  emit<K extends keyof EcoWekyConnectorEvents>(event: K, ...args: EcoWekyConnectorEvents[K]): boolean;
  emit(event: string | symbol, ...args: any[]): boolean;
  off<K extends keyof EcoWekyConnectorEvents>(event: K, listener: (...args: EcoWekyConnectorEvents[K]) => void): this;
  off(event: string | symbol, listener: (...args: any[]) => void): this;
  addListener<K extends keyof EcoWekyConnectorEvents>(event: K, listener: (...args: EcoWekyConnectorEvents[K]) => void): this;
  addListener(event: string | symbol, listener: (...args: any[]) => void): this;
  removeListener<K extends keyof EcoWekyConnectorEvents>(event: K, listener: (...args: EcoWekyConnectorEvents[K]) => void): this;
  removeListener(event: string | symbol, listener: (...args: any[]) => void): this;
  prependListener<K extends keyof EcoWekyConnectorEvents>(event: K, listener: (...args: EcoWekyConnectorEvents[K]) => void): this;
  prependListener(event: string | symbol, listener: (...args: any[]) => void): this;
  prependOnceListener<K extends keyof EcoWekyConnectorEvents>(event: K, listener: (...args: EcoWekyConnectorEvents[K]) => void): this;
  prependOnceListener(event: string | symbol, listener: (...args: any[]) => void): this;
  private initListeners;
  /**
   * Creates and escrows a PvP wager match between two players.
   * Both players must have sufficient wallet balances.
   */
  createWager(params: {
    wagerId: string;
    player1Id: string;
    player2Id: string;
    amount: number;
    guildId?: string;
    game?: string;
  }): Promise<EcoWagerCreateResult>;
  /**
   * Resolves an active wager, awarding the escrowed pot (minus optional house fee) to the winner.
   */
  resolveWager(wagerId: string, winnerId: string): Promise<EcoRewardDistributionResult | null>;
  /**
   * Cancels and refunds an active wager back to both participants.
   */
  refundWager(wagerId: string, reason?: string): Promise<boolean>;
  /**
   * Internal handler for Weky gameOver events.
   */
  private handleGameOver;
  /**
   * Internal handler for Weky tournamentEnd events.
   */
  private handleTournamentEnd;
  getUserWallet(userId: string, guildId?: string): Promise<number>;
  creditWallet(userId: string, amount: number, reason?: string, guildId?: string): Promise<number>;
  deductWallet(userId: string, amount: number, reason?: string, guildId?: string): Promise<number>;
  getActiveWagers(): EcoWagerRecord[];
  getWager(wagerId: string): EcoWagerRecord | undefined;
}
declare class EcoManager extends EventEmitter {
  storage: EcoStorageAdapter;
  bank: BankManager;
  rewards: RewardManager;
  careers: CareerManager;
  shop: ShopManager;
  businesses: BusinessManager;
  casino: CasinoManager;
  leaderboards: LeaderboardManager;
  stocks: StockMarketManager;
  heist: HeistManager;
  pets: PetManager;
  crates: CrateManager;
  vault: VaultManager;
  loans: LoanManager;
  taxes: TaxManager;
  router: EcoBridgeRouter;
  currencySymbol: string;
  currencyName: string;
  embedColor?: any;
  customMessages?: Partial<EcoCustomMessages>;
  emojis?: Partial<EcoCustomEmojis>;
  notifyUpdates: boolean;
  private bridge?;
  constructor(options?: EcoManagerOptions);
  /**
   * Universal router getter for @m3rcena/bridge mounting.
   */
  toBridgeRouter(): EcoBridgeRouter;
  /**
   * Connects this economy instance with an M3rcenaBridge controller.
   * Enables: eco.connectBridge(bridge) or bridge.use(eco).
   */
  connectBridge(bridge: any): this;
  /**
   * Connects this economy instance with @m3rcena/weky minigames engine.
   * Enables automated coin payouts, streak bonuses, solo score multipliers, PvP wager bets, and tournament prize pools.
   */
  connectWeky(weky: any, options?: EcoWekyConnectorOptions): EcoWekyConnector;
  /**
   * Connects this economy instance with @m3rcena/bridge for live web dashboard streaming.
   */
  setBridge(bridge: any): this;
  emit<K extends keyof EcoEvents>(event: K, ...args: EcoEvents[K]): boolean;
  emit(event: string | symbol, ...args: any[]): boolean;
  on<K extends keyof EcoEvents>(event: K, listener: (...args: EcoEvents[K]) => void): this;
  on(event: string | symbol, listener: (...args: any[]) => void): this;
  once<K extends keyof EcoEvents>(event: K, listener: (...args: EcoEvents[K]) => void): this;
  once(event: string | symbol, listener: (...args: any[]) => void): this;
  off<K extends keyof EcoEvents>(event: K, listener: (...args: EcoEvents[K]) => void): this;
  off(event: string | symbol, listener: (...args: any[]) => void): this;
  addListener<K extends keyof EcoEvents>(event: K, listener: (...args: EcoEvents[K]) => void): this;
  addListener(event: string | symbol, listener: (...args: any[]) => void): this;
  removeListener<K extends keyof EcoEvents>(event: K, listener: (...args: EcoEvents[K]) => void): this;
  removeListener(event: string | symbol, listener: (...args: any[]) => void): this;
  prependListener<K extends keyof EcoEvents>(event: K, listener: (...args: EcoEvents[K]) => void): this;
  prependListener(event: string | symbol, listener: (...args: any[]) => void): this;
  prependOnceListener<K extends keyof EcoEvents>(event: K, listener: (...args: EcoEvents[K]) => void): this;
  prependOnceListener(event: string | symbol, listener: (...args: any[]) => void): this;
  /**
   * Dispatches an event to the bridge if connected.
   */
  private dispatchBridgeAction;
  getAccount(userId: string, guildId?: string): Promise<UserAccount>;
  getBalance(userId: string, guildId?: string): Promise<{
    wallet: number;
    bank: number;
    bankCapacity: number;
    netWorth: number;
  }>;
  addWallet(userId: string, amount: number, guildId?: string): Promise<number>;
  removeWallet(userId: string, amount: number, guildId?: string): Promise<number>;
  deposit(userId: string, amount: number | "all", guildId?: string): Promise<{
    success: boolean;
    deposited: number;
    wallet: number;
    bank: number;
    error?: string;
  }>;
  withdraw(userId: string, amount: number | "all", guildId?: string): Promise<{
    success: boolean;
    withdrawn: number;
    wallet: number;
    bank: number;
    error?: string;
  }>;
  transfer(fromUserId: string, toUserId: string, amount: number, guildId?: string): Promise<TransferResult>;
  daily(userId: string, guildId?: string): Promise<{
    success: boolean;
    amount: number;
    rewardAmount: number;
    streak: number;
    isMilestone: boolean;
    jackpotMilestone?: boolean;
    remainingMs?: number;
    cooldownRemainingMs?: number;
  }>;
  weekly(userId: string, guildId?: string): Promise<{
    success: boolean;
    amount: number;
    rewardAmount: number;
    remainingMs?: number;
    cooldownRemainingMs?: number;
  }>;
  monthly(userId: string, guildId?: string): Promise<{
    success: boolean;
    amount: number;
    rewardAmount: number;
    remainingMs?: number;
    cooldownRemainingMs?: number;
  }>;
  hourly(userId: string, guildId?: string): Promise<{
    success: boolean;
    amount: number;
    rewardAmount: number;
    remainingMs?: number;
    cooldownRemainingMs?: number;
  }>;
  work(userId: string, guildId?: string): Promise<{
    success: boolean;
    earned: number;
    earnedAmount: number;
    xp: number;
    xpEarned: number;
    jobTitle: string;
    remainingMs?: number;
    cooldownRemainingMs?: number;
  } | {
    success: boolean;
    earned: number;
    earnedAmount: number;
    xp: number;
    xpEarned: number;
    jobTitle: string;
    remainingMs?: number;
    cooldownRemainingMs?: number;
    careerShift: {
      hasCareer: boolean;
      promoted: boolean;
      newCareerLevel?: number;
      promotionBonus?: number;
      shiftsCompleted?: number;
      job?: CareerJob;
    };
  }>;
  beg(userId: string, guildId?: string): Promise<{
    success: boolean;
    earned: number;
    npc: string;
    donor: string;
    quote: string;
    remainingMs?: number;
    cooldownRemainingMs?: number;
  }>;
  crime(userId: string, guildId?: string): Promise<{
    success: boolean;
    payout: number;
    earned?: number;
    fine: number;
    message: string;
    remainingMs?: number;
    cooldownRemainingMs?: number;
  }>;
  rob(robberId: string, victimId: string, guildId?: string): Promise<RobResult>;
  buyItem(userId: string, itemId: string, quantity?: number, guildId?: string): Promise<{
    success: boolean;
    item?: ShopItem;
    quantity: number;
    totalCost: number;
    newWallet: number;
    error?: string;
  }>;
  sellItem(userId: string, itemId: string, quantity?: number, guildId?: string): Promise<{
    success: boolean;
    item?: ShopItem;
    quantity: number;
    earned: number;
    newWallet: number;
    error?: string;
  }>;
  useItem(userId: string, itemId: string, guildId?: string): Promise<{
    success: boolean;
    message: string;
    item?: ShopItem;
    effect?: ActiveEffect;
    lotteryWon?: number;
    error?: string;
  }>;
  getInventory(userId: string, guildId?: string): Promise<InventoryItem[]>;
  buyBusiness(userId: string, businessId: string, guildId?: string): Promise<{
    success: boolean;
    business?: UserBusiness;
    cost: number;
    newWallet: number;
    error?: string;
  }>;
  upgradeBusiness(userId: string, businessId: string, guildId?: string): Promise<{
    success: boolean;
    business?: UserBusiness;
    newLevel: number;
    upgradeCost: number;
    newWallet: number;
    error?: string;
  }>;
  hireEmployees(userId: string, businessId: string, count?: number, guildId?: string): Promise<{
    success: boolean;
    business?: UserBusiness;
    totalEmployees: number;
    cost: number;
    newWallet: number;
    error?: string;
  }>;
  collectBusinessRevenue(userId: string, businessId?: string, guildId?: string): Promise<{
    success: boolean;
    collected: number;
    newWallet: number;
    summary: Array<{
      businessId: string;
      name: string;
      amount: number;
    }>;
    error?: string;
  }>;
  coinflip(userId: string, betAmount: number, choice: "heads" | "tails", guildId?: string): Promise<CasinoBetResult>;
  dice(userId: string, betAmount: number, prediction: "high" | "low" | number, guildId?: string): Promise<CasinoBetResult>;
  slots(userId: string, betAmount: number, guildId?: string): Promise<CasinoBetResult>;
  roulette(userId: string, betAmount: number, betType: "red" | "black" | "green" | "even" | "odd" | number, guildId?: string): Promise<CasinoBetResult>;
  crash(userId: string, betAmount: number, targetMultiplier: number, guildId?: string): Promise<CasinoBetResult>;
  startBlackjack(userId: string, betAmount: number, guildId?: string): Promise<BlackjackState>;
  blackjackHit(gameId: string): Promise<BlackjackState>;
  blackjackStand(gameId: string): Promise<BlackjackState>;
  blackjackDouble(gameId: string): Promise<BlackjackState>;
  getLeaderboard(metric?: LeaderboardMetric, limit?: number, guildId?: string): Promise<LeaderboardEntry[]>;
  formatLeaderboard(metric?: LeaderboardMetric, limit?: number, guildId?: string): Promise<string>;
  getStocks(): StockConfig[];
  getStock(symbol: string): StockConfig | undefined;
  tickStockMarket(): void;
  buyStock(userId: string, symbol: string, shares: number, guildId?: string): Promise<StockTradeResult>;
  sellStock(userId: string, symbol: string, shares: number, guildId?: string): Promise<StockTradeResult>;
  getStockPortfolio(userId: string, guildId?: string): Promise<{
    userId: string;
    positions: {
      symbol: string;
      name: string;
      shares: number;
      averageBuyPrice: number;
      currentPrice: number;
      currentValue: number;
      profitOrLoss: number;
      profitOrLossPercentage: number;
    }[];
    totalPortfolioValue: number;
  }>;
  getHeistTargets(): HeistTarget[];
  createHeist(leaderId: string, targetId: string, guildId?: string): Promise<HeistSession>;
  joinHeist(heistId: string, userId: string, role: HeistRole, username?: string): Promise<{
    success: boolean;
    session: HeistSession;
    message?: string;
  }>;
  executeHeist(heistId: string): Promise<HeistResult>;
  getAvailablePets(): PetConfig[];
  getUserPets(userId: string, guildId?: string): Promise<UserPet[]>;
  adoptPet(userId: string, petId: string, customName?: string, guildId?: string): Promise<UserPet>;
  feedPet(userId: string, petId: string, guildId?: string): Promise<{
    success: boolean;
    pet: UserPet;
    cost: number;
  }>;
  sendPetExpedition(userId: string, petId: string, guildId?: string): Promise<{
    success: boolean;
    finishesAt: number;
  }>;
  claimPetExpedition(userId: string, petId: string, guildId?: string): Promise<PetExpeditionResult>;
  getCratePrice(tier: CrateTier): number;
  openCrate(userId: string, tier: CrateTier, guildId?: string): Promise<CrateReward>;
  getUserVault(userId: string, guildId?: string): Promise<{
    currentTier: BankVaultTier;
    nextTier?: BankVaultTier;
    bank: number;
    capacity: number;
    dailyInterestAccrual: number;
    canClaimInterest: boolean;
  }>;
  upgradeVault(userId: string, guildId?: string): Promise<{
    success: boolean;
    previousTier: BankVaultTier;
    newTier: BankVaultTier;
    cost: number;
    newCapacity: number;
    error?: string;
  }>;
  claimDailyInterest(userId: string, guildId?: string): Promise<{
    success: boolean;
    interestEarned: number;
    newBankBalance: number;
    rate: number;
    cooldownRemainingMs?: number;
    error?: string;
  }>;
  getCreditScore(userId: string, guildId?: string): Promise<CreditScoreData>;
  getUserLoans(userId: string, guildId?: string): Promise<UserLoan[]>;
  applyLoan(userId: string, tier: LoanTier, guildId?: string): Promise<{
    success: boolean;
    loan?: UserLoan;
    creditScore: number;
    error?: string;
  }>;
  repayLoan(userId: string, loanId: string, amount: number | "all", guildId?: string): Promise<{
    success: boolean;
    amountPaid: number;
    remainingDue: number;
    isFullyPaid: boolean;
    newCreditScore: number;
    error?: string;
  }>;
  processLoanCollections(userId: string, guildId?: string): Promise<{
    defaultedLoans: UserLoan[];
    garnishedCash: number;
    scorePenalty: number;
    newScore: number;
  }>;
  getPendingBills(userId: string, guildId?: string): Promise<MunicipalBill[]>;
  getAllBills(userId: string, guildId?: string): Promise<MunicipalBill[]>;
  generateBillsIfDue(userId: string, guildId?: string): Promise<{
    generated: boolean;
    newBills: MunicipalBill[];
    totalBilled: number;
  }>;
  payBill(userId: string, billId: string, guildId?: string): Promise<{
    success: boolean;
    bill?: MunicipalBill;
    amountPaid: number;
    newCreditScore: number;
    error?: string;
  }>;
  payAllBills(userId: string, guildId?: string): Promise<{
    success: boolean;
    paidCount: number;
    totalAmountPaid: number;
    newCreditScore: number;
    error?: string;
  }>;
  attemptTaxEvasion(userId: string, guildId?: string): Promise<{
    success: boolean;
    taxesEvaded: number;
    penaltyFined: number;
    creditScoreChange: number;
    newCreditScore: number;
    auditDetails: string;
  }>;
}
interface HostEcoOptions {
  port?: number;
  dbPath?: string;
  bridgeUrl?: string;
}
declare function hostEco(options?: HostEcoOptions): Promise<{
  eco: EcoManager;
  router: EcoBridgeRouter;
  server: http.Server;
  port: number;
}>;
export { CreditRating as $, BlackjackState as A, UserStats as At, BankManager as B, DEFAULT_HEIST_TARGETS as C, StockTradeResult as Ct, LeaderboardEntry as D, UserCareer as Dt, StockMarketManager as E, UserBusiness as Et, DEFAULT_SHOP_ITEMS as F, ActiveEffect as G, JsonEcoStorage as H, ShopManager as I, BusinessConfig as J, BankVaultTier as K, CareerManager as L, CasinoManager as M, BusinessManager as N, LeaderboardManager as O, UserLoan as Ot, DEFAULT_BUSINESS_CATALOG as P, CrateTier as Q, DEFAULT_JOBS as R, PetManager as S, StockMarketTrend as St, DEFAULT_STOCKS as T, UserAccount as Tt, MemoryEcoStorage as U, EcoStorageAdapter as V, createDefaultAccount as W, CasinoBetResult as X, CareerJob as Y, CrateReward as Z, DEFAULT_VAULT_TIERS as _, Prestige as _t, EcoRewardDistributionResult as a, EcoManagerOptions as at, CrateManager as b, SkillTree as bt, EcoWagerRefundedEvent as c, HeistRole as ct, EcoWekyConnectorEvents as d, InventoryItem as dt, CreditScoreData as et, EcoWekyConnectorOptions as f, LoanOffer as ft, LoanManager as g, PetExpeditionResult as gt, LOAN_CATALOG as h, PetConfig as ht, EcoGameRewardRule as i, EcoEvents as it, Card as j, UserStockPosition as jt, LeaderboardMetric as k, UserPet as kt, EcoWagerResolvedEvent as l, HeistSession as lt, TaxManager as m, MunicipalBill as mt, hostEco as n, EcoCustomMessages as nt, EcoWagerCreateResult as o, HeistCrewMember as ot, EcoBridgeRouter as p, LoanTier as pt, BillType as q, EcoManager as r, EcoDatabaseConfig as rt, EcoWagerRecord as s, HeistResult as st, HostEcoOptions as t, EcoCustomEmojis as tt, EcoWekyConnector as u, HeistTarget as ut, VaultManager as v, RobResult as vt, HeistManager as w, TransferResult as wt, DEFAULT_PETS as x, StockConfig as xt, CRATE_PRICES as y, ShopItem as yt, RewardManager as z };
//# sourceMappingURL=host-XZmTzNyx.d.cts.map