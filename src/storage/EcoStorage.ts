/**
 * @m3rcena/eco
 * Pluggable Storage Adapters for Economy Accounts and Data.
 *
 * @copyright 2026 M3rcena Development. All rights reserved.
 * @license Apache-2.0
 */

import fs from "fs";
import path from "path";
import { UserAccount } from "../types.js";

export interface EcoStorageAdapter {
  getAccount(userId: string, guildId?: string): Promise<UserAccount | null>;
  saveAccount(account: UserAccount): Promise<void>;
  getTopAccounts(sortBy: "netWorth" | "wallet" | "bank" | "level", limit?: number, guildId?: string): Promise<UserAccount[]>;
  getAllAccounts(guildId?: string): Promise<UserAccount[]>;
}

export function createDefaultAccount(
  userId: string,
  guildId?: string,
  defaultWallet = 500,
  defaultBankCap = 10000
): UserAccount {
  return {
    userId,
    guildId,
    wallet: defaultWallet,
    bank: 0,
    bankCapacity: defaultBankCap,
    xp: 0,
    level: 1,
    streak: {
      daily: 0,
    },
    inventory: [],
    businesses: [],
    activeEffects: [],
    stats: {
      totalEarned: defaultWallet,
      totalSpent: 0,
      totalGambled: 0,
      totalGambleWon: 0,
      totalRobbed: 0,
      timesRobbed: 0,
      jobsCompleted: 0,
      itemsBought: 0,
    },
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

export class MemoryEcoStorage implements EcoStorageAdapter {
  private accounts: Map<string, UserAccount> = new Map();

  private makeKey(userId: string, guildId?: string): string {
    return guildId ? `${guildId}_${userId}` : userId;
  }

  public async getAccount(userId: string, guildId?: string): Promise<UserAccount | null> {
    const key = this.makeKey(userId, guildId);
    const acc = this.accounts.get(key);
    return acc ? JSON.parse(JSON.stringify(acc)) : null;
  }

  public async saveAccount(account: UserAccount): Promise<void> {
    const key = this.makeKey(account.userId, account.guildId);
    account.updatedAt = Date.now();
    this.accounts.set(key, JSON.parse(JSON.stringify(account)));
  }

  public async getTopAccounts(
    sortBy: "netWorth" | "wallet" | "bank" | "level" = "netWorth",
    limit: number = 10,
    guildId?: string
  ): Promise<UserAccount[]> {
    let list = Array.from(this.accounts.values());
    if (guildId) list = list.filter((a) => a.guildId === guildId);

    const sortFn = (a: UserAccount, b: UserAccount) => {
      if (sortBy === "wallet") return b.wallet - a.wallet;
      if (sortBy === "bank") return b.bank - a.bank;
      if (sortBy === "level") return b.level - a.level;
      const nwA = a.wallet + a.bank;
      const nwB = b.wallet + b.bank;
      return nwB - nwA;
    };

    return list.sort(sortFn).slice(0, limit);
  }

  public async getAllAccounts(guildId?: string): Promise<UserAccount[]> {
    let list = Array.from(this.accounts.values());
    if (guildId) list = list.filter((a) => a.guildId === guildId);
    return list;
  }
}

export class JsonEcoStorage implements EcoStorageAdapter {
  private filePath: string;
  private cache: Record<string, UserAccount> = {};
  private loaded = false;

  constructor(filePath: string = "./eco-data.json") {
    this.filePath = path.resolve(process.cwd(), filePath);
  }

  private makeKey(userId: string, guildId?: string): string {
    return guildId ? `${guildId}_${userId}` : userId;
  }

  private async ensureLoaded(): Promise<void> {
    if (this.loaded) return;
    try {
      if (fs.existsSync(this.filePath)) {
        const raw = await fs.promises.readFile(this.filePath, "utf-8");
        this.cache = JSON.parse(raw);
      }
    } catch {
      this.cache = {};
    }
    this.loaded = true;
  }

  private async persist(): Promise<void> {
    try {
      const dir = path.dirname(this.filePath);
      if (!fs.existsSync(dir)) await fs.promises.mkdir(dir, { recursive: true });
      await fs.promises.writeFile(this.filePath, JSON.stringify(this.cache, null, 2), "utf-8");
    } catch (err) {
      console.error("[JsonEcoStorage] Failed to save accounts to disk:", err);
    }
  }

  public async getAccount(userId: string, guildId?: string): Promise<UserAccount | null> {
    await this.ensureLoaded();
    const key = this.makeKey(userId, guildId);
    const acc = this.cache[key];
    return acc ? JSON.parse(JSON.stringify(acc)) : null;
  }

  public async saveAccount(account: UserAccount): Promise<void> {
    await this.ensureLoaded();
    const key = this.makeKey(account.userId, account.guildId);
    account.updatedAt = Date.now();
    this.cache[key] = JSON.parse(JSON.stringify(account));
    await this.persist();
  }

  public async getTopAccounts(
    sortBy: "netWorth" | "wallet" | "bank" | "level" = "netWorth",
    limit: number = 10,
    guildId?: string
  ): Promise<UserAccount[]> {
    await this.ensureLoaded();
    let list = Object.values(this.cache);
    if (guildId) list = list.filter((a) => a.guildId === guildId);

    const sortFn = (a: UserAccount, b: UserAccount) => {
      if (sortBy === "wallet") return b.wallet - a.wallet;
      if (sortBy === "bank") return b.bank - a.bank;
      if (sortBy === "level") return b.level - a.level;
      const nwA = a.wallet + a.bank;
      const nwB = b.wallet + b.bank;
      return nwB - nwA;
    };

    return list.sort(sortFn).slice(0, limit);
  }

  public async getAllAccounts(guildId?: string): Promise<UserAccount[]> {
    await this.ensureLoaded();
    let list = Object.values(this.cache);
    if (guildId) list = list.filter((a) => a.guildId === guildId);
    return list;
  }
}
