/**
 * @m3rcena/eco
 * Central Economy Orchestrator & Dashboard Bridge Integration.
 *
 * @copyright 2026 M3rcena Development. All rights reserved.
 * @license Apache-2.0
 */

import { BankManager } from "./modules/BankManager.js";
import { RewardManager } from "./modules/RewardManager.js";
import { CareerManager } from "./modules/CareerManager.js";
import { ShopManager } from "./modules/ShopManager.js";
import { BusinessManager } from "./modules/BusinessManager.js";
import { CasinoManager, BlackjackState } from "./modules/CasinoManager.js";
import { LeaderboardManager, LeaderboardMetric, LeaderboardEntry } from "./modules/LeaderboardManager.js";
import { StockMarketManager } from "./modules/StockMarketManager.js";
import { HeistManager } from "./modules/HeistManager.js";
import { PetManager } from "./modules/PetManager.js";
import { CrateManager } from "./modules/CrateManager.js";
import { VaultManager } from "./modules/VaultManager.js";
import { LoanManager } from "./modules/LoanManager.js";
import { TaxManager } from "./modules/TaxManager.js";
import { EcoBridgeRouter } from "./bridge/EcoBridgeRouter.js";
import { EcoStorageAdapter, MemoryEcoStorage, JsonEcoStorage } from "./storage/EcoStorage.js";
import {
  EcoManagerOptions,
  UserAccount,
  TransferResult,
  RobResult,
  CasinoBetResult,
  ShopItem,
  CareerJob,
  BusinessConfig,
  StockConfig,
  StockTradeResult,
  UserStockPosition,
  HeistTarget,
  HeistRole,
  HeistSession,
  HeistResult,
  PetConfig,
  UserPet,
  PetExpeditionResult,
  CrateTier,
  CrateReward,
  EcoCustomMessages,
  EcoCustomEmojis,
  BankVaultTier,
  CreditScoreData,
  LoanTier,
  LoanOffer,
  UserLoan,
  MunicipalBill,
} from "./types.js";

export class EcoManager {
  public storage: EcoStorageAdapter;
  public bank: BankManager;
  public rewards: RewardManager;
  public careers: CareerManager;
  public shop: ShopManager;
  public businesses: BusinessManager;
  public casino: CasinoManager;
  public leaderboards: LeaderboardManager;
  public stocks: StockMarketManager;
  public heist: HeistManager;
  public pets: PetManager;
  public crates: CrateManager;
  public vault: VaultManager;
  public loans: LoanManager;
  public taxes: TaxManager;
  public router?: EcoBridgeRouter;

  public currencySymbol: string;
  public currencyName: string;
  public embedColor?: any;
  public customMessages?: Partial<EcoCustomMessages>;
  public emojis?: Partial<EcoCustomEmojis>;
  private bridge?: any;

  constructor(options: EcoManagerOptions = {}) {
    this.currencySymbol = options.currencySymbol ?? "🪙";
    this.currencyName = options.currencyName ?? "Coins";
    this.embedColor = options.embedColor ?? 0x5865f2;
    this.customMessages = options.customMessages;
    this.emojis = options.emojis;

    // 1. Storage
    this.storage = options.storage ?? new MemoryEcoStorage();

    // 2. Bank
    this.bank = new BankManager(this.storage, {
      defaultWallet: options.defaultWalletBalance ?? 500,
      defaultBankCap: options.defaultBankCapacity ?? 10000,
      transactionFee: options.transactionFeePercentage ?? 0,
    });

    // 3. Rewards
    this.rewards = new RewardManager(this.bank, options.cooldowns as any);

    // 4. Careers
    this.careers = new CareerManager(this.bank);

    // 5. Shop
    this.shop = new ShopManager(this.bank);

    // 6. Businesses
    this.businesses = new BusinessManager(this.bank);

    // 7. Casino
    this.casino = new CasinoManager(this.bank, this.shop);

    // 8. Leaderboards
    this.leaderboards = new LeaderboardManager(this.storage, this.shop, this.businesses);

    // 9. Stocks & Crypto Exchange
    this.stocks = new StockMarketManager(this.bank, options.initialStocks);

    // 10. Multiplayer Syndicate Heists
    this.heist = new HeistManager(this.bank, options.initialHeistTargets);

    // 11. Pets & Companions
    this.pets = new PetManager(this.bank, options.initialPets);

    // 12. Mystery Loot Crates
    this.crates = new CrateManager(this.bank);

    // 13. Bank Vault Tiers & Compound Interest
    this.vault = new VaultManager(this.bank);

    // 14. Credit Score, Loans & Debt
    this.loans = new LoanManager(this.bank);

    // 15. Municipal Bills & Progressive Wealth Taxes
    this.taxes = new TaxManager(this.bank);

    // 16. Dynamic Package Router for Bridge Gateway
    this.router = new EcoBridgeRouter(this);

    // 17. Bridge integration
    if (options.bridge) {
      this.setBridge(options.bridge);
    }
  }

  /**
   * Universal router getter for @m3rcena/bridge mounting.
   */
  public toBridgeRouter(): EcoBridgeRouter {
    return this.router;
  }

  /**
   * Connects this economy instance with an M3rcenaBridge controller.
   * Enables: eco.connectBridge(bridge) or bridge.use(eco).
   */
  public connectBridge(bridge: any): this {
    return this.setBridge(bridge);
  }

  /**
   * Connects this economy instance with @m3rcena/bridge for live web dashboard streaming.
   */
  public setBridge(bridge: any): this {
    this.bridge = bridge;

    if (this.bridge && typeof this.bridge.registerModule === "function") {
      this.bridge.registerModule("economy", async (action: any) => {
        if (this.router && typeof this.router.handleAction === "function") {
          return this.router.handleAction(action);
        }
        return { success: true };
      });
    }

    if (this.bridge && typeof this.bridge.mountPackage === "function" && this.router) {
      this.bridge.mountPackage(this.router);
    }

    return this;
  }

  /**
   * Dispatches an event to the bridge if connected.
   */
  private dispatchBridgeAction(
    actionName: string,
    payload: Record<string, any>,
    userId?: string,
    audioCue?: { sound: string; volume?: number }
  ): void {
    if (!this.bridge) return;

    if (typeof this.bridge.dispatchAction === "function") {
      this.bridge.dispatchAction({
        module: "economy",
        action: actionName,
        playerId: userId ?? "system",
        payload,
        sourcePlatform: "discord",
      }).catch?.(() => {});
    }

    if (audioCue) {
      if (typeof this.bridge.dispatchAudioCue === "function") {
        this.bridge.dispatchAudioCue({
          sound: audioCue.sound,
          volume: audioCue.volume ?? 0.8,
          userId,
          module: "economy",
        });
      } else if (typeof this.bridge.triggerAudioCue === "function") {
        this.bridge.triggerAudioCue({
          sound: audioCue.sound,
          volume: audioCue.volume ?? 0.8,
          userId,
          module: "economy",
        });
      }
    }
  }

  /* -------------------------------------------------------------------------- */
  /* ACCOUNT & BALANCE SHORTCUTS                                               */
  /* -------------------------------------------------------------------------- */

  public async getAccount(userId: string, guildId?: string): Promise<UserAccount> {
    return this.bank.getAccount(userId, guildId);
  }

  public async getBalance(
    userId: string,
    guildId?: string
  ): Promise<{ wallet: number; bank: number; bankCapacity: number; netWorth: number }> {
    const acc = await this.bank.getAccount(userId, guildId);
    const netWorth = this.leaderboards.calculateNetWorth(acc);
    return {
      wallet: acc.wallet,
      bank: acc.bank,
      bankCapacity: acc.bankCapacity,
      netWorth,
    };
  }

  public async addWallet(userId: string, amount: number, guildId?: string): Promise<number> {
    const newBal = await this.bank.addWallet(userId, amount, guildId);
    this.dispatchBridgeAction("wallet:add", { userId, amount, newWallet: newBal }, userId, { sound: "coin_drop" });
    return newBal;
  }

  public async removeWallet(userId: string, amount: number, guildId?: string): Promise<number> {
    const newBal = await this.bank.removeWallet(userId, amount, guildId);
    this.dispatchBridgeAction("wallet:remove", { userId, amount, newWallet: newBal }, userId);
    return newBal;
  }

  public async deposit(userId: string, amount: number | "all", guildId?: string) {
    const result = await this.bank.deposit(userId, amount, guildId);
    if (result.success) {
      this.dispatchBridgeAction("bank:deposit", { userId, deposited: result.deposited, wallet: result.wallet, bank: result.bank }, userId);
    }
    return result;
  }

  public async withdraw(userId: string, amount: number | "all", guildId?: string) {
    const result = await this.bank.withdraw(userId, amount, guildId);
    if (result.success) {
      this.dispatchBridgeAction("bank:withdraw", { userId, withdrawn: result.withdrawn, wallet: result.wallet, bank: result.bank }, userId);
    }
    return result;
  }

  public async transfer(fromUserId: string, toUserId: string, amount: number, guildId?: string): Promise<TransferResult> {
    const result = await this.bank.transfer(fromUserId, toUserId, amount, guildId);
    if (result.success) {
      this.dispatchBridgeAction("bank:transfer", result, fromUserId, { sound: "coin_drop" });
    }
    return result;
  }

  /* -------------------------------------------------------------------------- */
  /* REWARDS & EARNING                                                          */
  /* -------------------------------------------------------------------------- */

  public async daily(userId: string, guildId?: string) {
    const res = await this.rewards.claimDaily(userId, guildId);
    if (res.success) {
      this.dispatchBridgeAction("reward:daily", res, userId, { sound: "coin_drop" });
    }
    return res;
  }

  public async weekly(userId: string, guildId?: string) {
    const res = await this.rewards.claimWeekly(userId, guildId);
    if (res.success) {
      this.dispatchBridgeAction("reward:weekly", res, userId, { sound: "win" });
    }
    return res;
  }

  public async monthly(userId: string, guildId?: string) {
    const res = await this.rewards.claimMonthly(userId, guildId);
    if (res.success) {
      this.dispatchBridgeAction("reward:monthly", res, userId, { sound: "win" });
    }
    return res;
  }

  public async hourly(userId: string, guildId?: string) {
    const res = await this.rewards.claimHourly(userId, guildId);
    if (res.success) {
      this.dispatchBridgeAction("reward:hourly", res, userId, { sound: "coin_drop" });
    }
    return res;
  }

  public async work(userId: string, guildId?: string) {
    // Check career salary if applicable
    const career = await this.careers.getCareer(userId, guildId);
    const careerSalary = this.careers.calculateSalary(career ?? undefined);

    const res = await this.rewards.work(userId, guildId, careerSalary);
    if (res.success) {
      // Record shift in career
      const shiftRes = await this.careers.recordShift(userId, guildId);
      this.dispatchBridgeAction("reward:work", { ...res, careerShift: shiftRes }, userId, { sound: "coin_drop" });
      return { ...res, careerShift: shiftRes };
    }
    return res;
  }

  public async beg(userId: string, guildId?: string) {
    const res = await this.rewards.beg(userId, guildId);
    if (res.success && res.earned > 0) {
      this.dispatchBridgeAction("reward:beg", res, userId, { sound: "coin_drop" });
    }
    return res;
  }

  public async crime(userId: string, guildId?: string) {
    const res = await this.rewards.crime(userId, guildId);
    this.dispatchBridgeAction("reward:crime", res, userId, res.success ? { sound: "coin_drop" } : { sound: "rob_siren" });
    return res;
  }

  public async rob(robberId: string, victimId: string, guildId?: string): Promise<RobResult> {
    const res = await this.rewards.rob(robberId, victimId, guildId);
    this.dispatchBridgeAction(
      "reward:rob",
      res,
      robberId,
      res.success ? { sound: "win" } : { sound: "rob_siren" }
    );
    return res;
  }

  /* -------------------------------------------------------------------------- */
  /* SHOP & INVENTORY                                                           */
  /* -------------------------------------------------------------------------- */

  public async buyItem(userId: string, itemId: string, quantity: number = 1, guildId?: string) {
    const res = await this.shop.buy(userId, itemId, quantity, guildId);
    if (res.success) {
      this.dispatchBridgeAction("shop:buy", res, userId, { sound: "purchase" });
    }
    return res;
  }

  public async sellItem(userId: string, itemId: string, quantity: number = 1, guildId?: string) {
    const res = await this.shop.sell(userId, itemId, quantity, guildId);
    if (res.success) {
      this.dispatchBridgeAction("shop:sell", res, userId, { sound: "coin_drop" });
    }
    return res;
  }

  public async useItem(userId: string, itemId: string, guildId?: string) {
    const res = await this.shop.use(userId, itemId, guildId);
    if (res.success) {
      this.dispatchBridgeAction("shop:use", res, userId);
    }
    return res;
  }

  public async getInventory(userId: string, guildId?: string) {
    return this.shop.getInventory(userId, guildId);
  }

  /* -------------------------------------------------------------------------- */
  /* BUSINESSES                                                                 */
  /* -------------------------------------------------------------------------- */

  public async buyBusiness(userId: string, businessId: string, guildId?: string) {
    const res = await this.businesses.buyBusiness(userId, businessId, guildId);
    if (res.success) {
      this.dispatchBridgeAction("business:buy", res, userId, { sound: "purchase" });
    }
    return res;
  }

  public async upgradeBusiness(userId: string, businessId: string, guildId?: string) {
    const res = await this.businesses.upgradeBusiness(userId, businessId, guildId);
    if (res.success) {
      this.dispatchBridgeAction("business:upgrade", res, userId, { sound: "purchase" });
    }
    return res;
  }

  public async hireEmployees(userId: string, businessId: string, count: number = 1, guildId?: string) {
    const res = await this.businesses.hireEmployees(userId, businessId, count, guildId);
    if (res.success) {
      this.dispatchBridgeAction("business:hire", res, userId);
    }
    return res;
  }

  public async collectBusinessRevenue(userId: string, businessId?: string, guildId?: string) {
    const res = await this.businesses.collectRevenue(userId, businessId, guildId);
    if (res.success) {
      this.dispatchBridgeAction("business:collect", res, userId, { sound: "coin_drop" });
    }
    return res;
  }

  /* -------------------------------------------------------------------------- */
  /* CASINO                                                                     */
  /* -------------------------------------------------------------------------- */

  public async coinflip(userId: string, betAmount: number, choice: "heads" | "tails", guildId?: string) {
    const res = await this.casino.coinflip(userId, betAmount, choice, guildId);
    this.dispatchBridgeAction("casino:coinflip", res, userId, res.outcome === "win" ? { sound: "win" } : undefined);
    return res;
  }

  public async dice(userId: string, betAmount: number, prediction: "high" | "low" | number, guildId?: string) {
    const res = await this.casino.dice(userId, betAmount, prediction, guildId);
    this.dispatchBridgeAction("casino:dice", res, userId, res.outcome === "win" ? { sound: "win" } : undefined);
    return res;
  }

  public async slots(userId: string, betAmount: number, guildId?: string) {
    const res = await this.casino.slots(userId, betAmount, guildId);
    this.dispatchBridgeAction("casino:slots", res, userId, res.outcome === "win" ? { sound: "win" } : undefined);
    return res;
  }

  public async roulette(
    userId: string,
    betAmount: number,
    betType: "red" | "black" | "green" | "even" | "odd" | number,
    guildId?: string
  ) {
    const res = await this.casino.roulette(userId, betAmount, betType, guildId);
    this.dispatchBridgeAction("casino:roulette", res, userId, res.outcome === "win" ? { sound: "win" } : undefined);
    return res;
  }

  public async crash(userId: string, betAmount: number, targetMultiplier: number, guildId?: string) {
    const res = await this.casino.crash(userId, betAmount, targetMultiplier, guildId);
    this.dispatchBridgeAction("casino:crash", res, userId, res.outcome === "win" ? { sound: "win" } : undefined);
    return res;
  }

  public async startBlackjack(userId: string, betAmount: number, guildId?: string): Promise<BlackjackState> {
    return this.casino.startBlackjackGame(userId, betAmount, guildId);
  }

  public async blackjackHit(gameId: string): Promise<BlackjackState> {
    return this.casino.blackjackHit(gameId);
  }

  public async blackjackStand(gameId: string): Promise<BlackjackState> {
    const state = await this.casino.blackjackStand(gameId);
    if (state.payout > 0) {
      this.dispatchBridgeAction("casino:blackjack_win", state, state.userId, { sound: "win" });
    }
    return state;
  }

  public async blackjackDouble(gameId: string): Promise<BlackjackState> {
    const state = await this.casino.blackjackDouble(gameId);
    if (state.payout > 0) {
      this.dispatchBridgeAction("casino:blackjack_win", state, state.userId, { sound: "win" });
    }
    return state;
  }

  /* -------------------------------------------------------------------------- */
  /* LEADERBOARDS                                                               */
  /* -------------------------------------------------------------------------- */

  public async getLeaderboard(
    metric: LeaderboardMetric = "net_worth",
    limit: number = 10,
    guildId?: string
  ): Promise<LeaderboardEntry[]> {
    return this.leaderboards.getLeaderboard(metric, limit, guildId);
  }

  public async formatLeaderboard(
    metric: LeaderboardMetric = "net_worth",
    limit: number = 10,
    guildId?: string
  ): Promise<string> {
    const entries = await this.getLeaderboard(metric, limit, guildId);
    return this.leaderboards.formatLeaderboard(entries, metric, this.currencySymbol);
  }

  /* -------------------------------------------------------------------------- */
  /* STOCK & CRYPTOCURRENCY EXCHANGE                                            */
  /* -------------------------------------------------------------------------- */

  public getStocks(): StockConfig[] {
    return this.stocks.getStocks();
  }

  public getStock(symbol: string): StockConfig | undefined {
    return this.stocks.getStock(symbol);
  }

  public tickStockMarket(): void {
    this.stocks.tickMarket();
    this.dispatchBridgeAction("stocks:tick", {
      trend: this.stocks.getMarketTrend(),
      stocks: this.stocks.getStocks().map((s) => ({ symbol: s.symbol, price: s.currentPrice, change: s.change24h })),
    });
  }

  public async buyStock(userId: string, symbol: string, shares: number, guildId?: string): Promise<StockTradeResult> {
    const result = await this.stocks.buyStock(userId, symbol, shares, guildId);
    this.dispatchBridgeAction("stocks:buy", result, userId, { sound: "purchase" });
    return result;
  }

  public async sellStock(userId: string, symbol: string, shares: number, guildId?: string): Promise<StockTradeResult> {
    const result = await this.stocks.sellStock(userId, symbol, shares, guildId);
    this.dispatchBridgeAction("stocks:sell", result, userId, { sound: "coin_drop" });
    return result;
  }

  public async getStockPortfolio(userId: string, guildId?: string): Promise<{
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
  }> {
    return this.stocks.getUserPortfolio(userId, guildId);
  }

  /* -------------------------------------------------------------------------- */
  /* MULTIPLAYER SYNDICATE HEISTS                                               */
  /* -------------------------------------------------------------------------- */

  public getHeistTargets(): HeistTarget[] {
    return this.heist.getTargets();
  }

  public async createHeist(leaderId: string, targetId: string, guildId?: string): Promise<HeistSession> {
    const res = await this.heist.createLobby(leaderId, leaderId, targetId, guildId);
    if (!res.success || !res.session) {
      throw new Error(res.error || "Failed to create heist lobby.");
    }
    this.dispatchBridgeAction("heist:created", { heistId: res.session.id, leaderId, targetId });
    return res.session;
  }

  public async joinHeist(
    heistId: string,
    userId: string,
    role: HeistRole,
    username?: string
  ): Promise<{ success: boolean; session: HeistSession; message?: string }> {
    const res = await this.heist.joinLobby(heistId, userId, username || userId, role);
    if (!res.success || !res.session) {
      throw new Error(res.error || "Failed to join heist lobby.");
    }
    this.dispatchBridgeAction("heist:joined", { heistId, userId, role, username });
    return { success: true, session: res.session };
  }

  public async executeHeist(heistId: string): Promise<HeistResult> {
    const result = await this.heist.executeHeist(heistId);
    this.dispatchBridgeAction(
      "heist:executed",
      result,
      undefined,
      result.success ? { sound: "win" } : { sound: "rob_siren" }
    );
    return result;
  }

  /* -------------------------------------------------------------------------- */
  /* PETS & COMPANIONS                                                          */
  /* -------------------------------------------------------------------------- */

  public getAvailablePets(): PetConfig[] {
    return this.pets.getCatalog();
  }

  public async getUserPets(userId: string, guildId?: string): Promise<UserPet[]> {
    const acc = await this.bank.getAccount(userId, guildId);
    return acc.pets || [];
  }

  public async adoptPet(userId: string, petId: string, customName?: string, guildId?: string): Promise<UserPet> {
    const res = await this.pets.adoptPet(userId, petId, customName, guildId);
    if (!res.success || !res.pet) {
      throw new Error(res.error || "Failed to adopt pet.");
    }
    this.dispatchBridgeAction("pet:adopted", { userId, pet: res.pet }, userId, { sound: "purchase" });
    return res.pet;
  }

  public async feedPet(userId: string, petId: string, guildId?: string): Promise<{ success: boolean; pet: UserPet; cost: number }> {
    const res = await this.pets.feedPet(userId, petId, guildId);
    if (!res.success || !res.pet) {
      throw new Error(res.error || "Failed to feed pet.");
    }
    this.dispatchBridgeAction("pet:fed", { userId, petId, cost: 250 });
    return { success: true, pet: res.pet, cost: 250 };
  }

  public async sendPetExpedition(userId: string, petId: string, guildId?: string): Promise<{ success: boolean; finishesAt: number }> {
    const res = await this.pets.sendExpedition(userId, petId, 2, guildId);
    if (!res.success || !res.returnsAt) {
      throw new Error(res.error || "Failed to start expedition.");
    }
    this.dispatchBridgeAction("pet:expedition_started", { userId, petId, finishesAt: res.returnsAt });
    return { success: true, finishesAt: res.returnsAt };
  }

  public async claimPetExpedition(userId: string, petId: string, guildId?: string): Promise<PetExpeditionResult> {
    const res = await this.pets.claimExpedition(userId, petId, guildId);
    if (!res.success || !res.reward) {
      throw new Error(res.error || "Failed to claim expedition.");
    }
    this.dispatchBridgeAction("pet:expedition_claimed", { userId, petId, result: res.reward }, userId, { sound: "win" });
    return res.reward;
  }

  /* -------------------------------------------------------------------------- */
  /* MYSTERY LOOT CRATES                                                        */
  /* -------------------------------------------------------------------------- */

  public getCratePrice(tier: CrateTier): number {
    return this.crates.getCratePrice(tier);
  }

  public async openCrate(userId: string, tier: CrateTier, guildId?: string): Promise<CrateReward> {
    const reward = await this.crates.openCrate(userId, tier, guildId);
    this.dispatchBridgeAction("crate:opened", { userId, tier, reward }, userId, { sound: "win" });
    return reward;
  }

  /* -------------------------------------------------------------------------- */
  /* REAL ECONOMY: BANK VAULT TIERS & COMPOUND INTEREST                         */
  /* -------------------------------------------------------------------------- */

  public async getUserVault(userId: string, guildId?: string) {
    return this.vault.getUserVault(userId, guildId);
  }

  public async upgradeVault(userId: string, guildId?: string) {
    const res = await this.vault.upgradeVault(userId, guildId);
    if (res.success) {
      this.dispatchBridgeAction("vault:upgraded", res, userId, { sound: "purchase" });
    }
    return res;
  }

  public async claimDailyInterest(userId: string, guildId?: string) {
    const res = await this.vault.claimDailyInterest(userId, guildId);
    if (res.success) {
      this.dispatchBridgeAction("vault:interest_claimed", res, userId, { sound: "coin_drop" });
    }
    return res;
  }

  /* -------------------------------------------------------------------------- */
  /* REAL ECONOMY: CREDIT SCORE, LOANS & DEBT REPAYMENT                         */
  /* -------------------------------------------------------------------------- */

  public async getCreditScore(userId: string, guildId?: string): Promise<CreditScoreData> {
    return this.loans.getCreditScore(userId, guildId);
  }

  public async getUserLoans(userId: string, guildId?: string): Promise<UserLoan[]> {
    return this.loans.getUserLoans(userId, guildId);
  }

  public async applyLoan(userId: string, tier: LoanTier, guildId?: string) {
    const res = await this.loans.applyLoan(userId, tier, guildId);
    if (res.success) {
      this.dispatchBridgeAction("loan:approved", res, userId, { sound: "coin_drop" });
    }
    return res;
  }

  public async repayLoan(userId: string, loanId: string, amount: number | "all", guildId?: string) {
    const res = await this.loans.repayLoan(userId, loanId, amount, guildId);
    if (res.success) {
      this.dispatchBridgeAction("loan:repaid", res, userId, res.isFullyPaid ? { sound: "win" } : undefined);
    }
    return res;
  }

  public async processLoanCollections(userId: string, guildId?: string) {
    const res = await this.loans.processCollections(userId, guildId);
    if (res.defaultedLoans.length > 0) {
      this.dispatchBridgeAction("loan:defaulted", res, userId, { sound: "rob_siren" });
    }
    return res;
  }

  /* -------------------------------------------------------------------------- */
  /* REAL ECONOMY: MUNICIPAL BILLS & PROGRESSIVE WEALTH TAXES                   */
  /* -------------------------------------------------------------------------- */

  public async getPendingBills(userId: string, guildId?: string): Promise<MunicipalBill[]> {
    return this.taxes.getPendingBills(userId, guildId);
  }

  public async getAllBills(userId: string, guildId?: string): Promise<MunicipalBill[]> {
    return this.taxes.getAllBills(userId, guildId);
  }

  public async generateBillsIfDue(userId: string, guildId?: string) {
    return this.taxes.generateBillsIfDue(userId, guildId);
  }

  public async payBill(userId: string, billId: string, guildId?: string) {
    const res = await this.taxes.payBill(userId, billId, guildId);
    if (res.success) {
      this.dispatchBridgeAction("bill:paid", res, userId, { sound: "coin_drop" });
    }
    return res;
  }

  public async payAllBills(userId: string, guildId?: string) {
    const res = await this.taxes.payAllBills(userId, guildId);
    if (res.success) {
      this.dispatchBridgeAction("bills:all_paid", res, userId, { sound: "win" });
    }
    return res;
  }

  public async attemptTaxEvasion(userId: string, guildId?: string) {
    const res = await this.taxes.attemptTaxEvasion(userId, guildId);
    this.dispatchBridgeAction("tax:evasion_attempt", res, userId, res.success ? { sound: "win" } : { sound: "rob_siren" });
    return res;
  }
}
