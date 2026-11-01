/**
 * @m3rcena/eco
 * Bank & Wallet Management System.
 *
 * @copyright 2026 M3rcena Development. All rights reserved.
 * @license Apache-2.0
 */

import { EcoStorageAdapter, createDefaultAccount } from "../storage/EcoStorage.js";
import { TransferResult, UserAccount } from "../types.js";

export class BankManager {
  private storage: EcoStorageAdapter;
  private defaultWallet: number;
  private defaultBankCap: number;
  private transactionFee: number;

  constructor(
    storage: EcoStorageAdapter,
    options: { defaultWallet?: number; defaultBankCap?: number; transactionFee?: number } = {}
  ) {
    this.storage = storage;
    this.defaultWallet = options.defaultWallet ?? 500;
    this.defaultBankCap = options.defaultBankCap ?? 10000;
    this.transactionFee = options.transactionFee ?? 0;
  }

  public async getAccount(userId: string, guildId?: string): Promise<UserAccount> {
    let acc = await this.storage.getAccount(userId, guildId);
    if (!acc) {
      acc = createDefaultAccount(userId, guildId, this.defaultWallet, this.defaultBankCap);
      await this.storage.saveAccount(acc);
    }
    return acc;
  }

  public async saveAccount(account: UserAccount): Promise<void> {
    await this.storage.saveAccount(account);
  }

  /**
   * Deposits cash from wallet into the bank up to bank capacity.
   */
  public async deposit(
    userId: string,
    amount: number | "all",
    guildId?: string
  ): Promise<{ success: boolean; deposited: number; wallet: number; bank: number; error?: string }> {
    const acc = await this.getAccount(userId, guildId);

    const availableSpace = Math.max(0, acc.bankCapacity - acc.bank);
    if (availableSpace <= 0) {
      return { success: false, deposited: 0, wallet: acc.wallet, bank: acc.bank, error: "Bank capacity is full!" };
    }

    const maxCanDeposit = Math.min(acc.wallet, availableSpace);
    const toDeposit = amount === "all" ? maxCanDeposit : Math.min(amount, maxCanDeposit);

    if (toDeposit <= 0) {
      return { success: false, deposited: 0, wallet: acc.wallet, bank: acc.bank, error: "No funds available to deposit." };
    }

    acc.wallet -= toDeposit;
    acc.bank += toDeposit;
    await this.saveAccount(acc);

    return { success: true, deposited: toDeposit, wallet: acc.wallet, bank: acc.bank };
  }

  /**
   * Withdraws cash from bank to wallet.
   */
  public async withdraw(
    userId: string,
    amount: number | "all",
    guildId?: string
  ): Promise<{ success: boolean; withdrawn: number; wallet: number; bank: number; error?: string }> {
    const acc = await this.getAccount(userId, guildId);

    const toWithdraw = amount === "all" ? acc.bank : Math.min(amount, acc.bank);
    if (toWithdraw <= 0) {
      return { success: false, withdrawn: 0, wallet: acc.wallet, bank: acc.bank, error: "Insufficient bank funds." };
    }

    acc.bank -= toWithdraw;
    acc.wallet += toWithdraw;
    await this.saveAccount(acc);

    return { success: true, withdrawn: toWithdraw, wallet: acc.wallet, bank: acc.bank };
  }

  /**
   * Transfers funds from one user's wallet to another.
   */
  public async transfer(
    fromUserId: string,
    toUserId: string,
    amount: number,
    guildId?: string
  ): Promise<TransferResult> {
    if (fromUserId === toUserId) {
      return {
        success: false,
        fromUserId,
        toUserId,
        amount: 0,
        fee: 0,
        fromWallet: 0,
        toWallet: 0,
        error: "Cannot transfer funds to yourself.",
      };
    }

    if (amount <= 0) {
      return {
        success: false,
        fromUserId,
        toUserId,
        amount: 0,
        fee: 0,
        fromWallet: 0,
        toWallet: 0,
        error: "Transfer amount must be greater than zero.",
      };
    }

    const sender = await this.getAccount(fromUserId, guildId);
    if (sender.wallet < amount) {
      return {
        success: false,
        fromUserId,
        toUserId,
        amount: 0,
        fee: 0,
        fromWallet: sender.wallet,
        toWallet: 0,
        error: "Insufficient wallet funds.",
      };
    }

    const fee = Math.floor(amount * this.transactionFee);
    const amountReceived = amount - fee;

    const receiver = await this.getAccount(toUserId, guildId);

    sender.wallet -= amount;
    sender.stats.totalSpent += amount;

    receiver.wallet += amountReceived;
    receiver.stats.totalEarned += amountReceived;

    await this.saveAccount(sender);
    await this.saveAccount(receiver);

    return {
      success: true,
      fromUserId,
      toUserId,
      amount: amountReceived,
      fee,
      fromWallet: sender.wallet,
      toWallet: receiver.wallet,
    };
  }

  /**
   * Upgrades bank capacity for a fee.
   */
  public async upgradeCapacity(
    userId: string,
    additionalCapacity: number,
    cost: number,
    guildId?: string
  ): Promise<{ success: boolean; newCapacity: number; wallet: number; error?: string }> {
    const acc = await this.getAccount(userId, guildId);
    if (acc.wallet < cost) {
      return {
        success: false,
        newCapacity: acc.bankCapacity,
        wallet: acc.wallet,
        error: `Insufficient funds. Upgrade requires ${cost} coins.`,
      };
    }

    acc.wallet -= cost;
    acc.bankCapacity += additionalCapacity;
    acc.stats.totalSpent += cost;
    await this.saveAccount(acc);

    return { success: true, newCapacity: acc.bankCapacity, wallet: acc.wallet };
  }

  /**
   * Adds cash to wallet.
   */
  public async addWallet(userId: string, amount: number, guildId?: string): Promise<number> {
    const { newBalance } = await this.modifyWallet(userId, Math.max(0, amount), guildId);
    return newBalance;
  }

  /**
   * Removes cash from wallet.
   */
  public async removeWallet(userId: string, amount: number, guildId?: string): Promise<number> {
    const { newBalance } = await this.modifyWallet(userId, -Math.abs(amount), guildId);
    return newBalance;
  }

  /**
   * Adds or subtracts wallet balance directly (admin/reward action).
   */
  public async modifyWallet(
    userId: string,
    delta: number,
    guildId?: string
  ): Promise<{ newBalance: number }> {
    const acc = await this.getAccount(userId, guildId);
    acc.wallet = Math.max(0, acc.wallet + delta);
    if (delta > 0) acc.stats.totalEarned += delta;
    if (delta < 0) acc.stats.totalSpent += Math.abs(delta);
    await this.saveAccount(acc);
    return { newBalance: acc.wallet };
  }
}
