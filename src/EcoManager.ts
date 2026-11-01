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

  public currencySymbol: string;
  public currencyName: string;
  private bridge?: any;

  constructor(options: EcoManagerOptions = {}) {
    this.currencySymbol = options.currencySymbol ?? "🪙";
    this.currencyName = options.currencyName ?? "Coins";

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

    // 9. Bridge integration
    if (options.bridge) {
      this.setBridge(options.bridge);
    }
  }

  /**
   * Connects this economy instance with @m3rcena/bridge for live web dashboard streaming.
   */
  public setBridge(bridge: any): void {
    this.bridge = bridge;

    if (this.bridge && typeof this.bridge.registerModule === "function") {
      this.bridge.registerModule("economy");
    }
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
}
