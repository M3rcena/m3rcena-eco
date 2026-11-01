/**
 * @m3rcena/eco
 * Global & Guild Economy Leaderboards & Net Worth Rankings.
 *
 * @copyright 2026 M3rcena Development. All rights reserved.
 * @license Apache-2.0
 */

import { EcoStorageAdapter } from "../storage/EcoStorage.js";
import { UserAccount } from "../types.js";
import { ShopManager } from "./ShopManager.js";
import { BusinessManager } from "./BusinessManager.js";

export type LeaderboardMetric = "net_worth" | "wallet" | "bank" | "level" | "streak";

export interface LeaderboardEntry {
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

export class LeaderboardManager {
  private storage: EcoStorageAdapter;
  private shop?: ShopManager;
  private business?: BusinessManager;

  constructor(storage: EcoStorageAdapter, shop?: ShopManager, business?: BusinessManager) {
    this.storage = storage;
    this.shop = shop;
    this.business = business;
  }

  /**
   * Computes a user's total Net Worth across liquid cash, bank savings, business assets, and inventory collectibles.
   */
  public calculateNetWorth(account: UserAccount): number {
    let total = account.wallet + account.bank;

    // Add business assets valuation
    if (account.businesses && account.businesses.length > 0) {
      for (const b of account.businesses) {
        const config = this.business?.getBusinessConfig(b.businessId);
        if (config) {
          total += config.baseCost * b.level;
          total += b.employees * Math.floor(config.baseCost * 0.15);
        } else {
          total += 5000 * b.level;
        }
      }
    }

    // Add inventory valuation
    if (account.inventory && account.inventory.length > 0) {
      for (const item of account.inventory) {
        const shopItem = this.shop?.getItem(item.itemId);
        const unitVal = shopItem?.resaleValue ?? (shopItem ? Math.floor(shopItem.price * 0.6) : 100);
        total += unitVal * item.quantity;
      }
    }

    return total;
  }

  /**
   * Generates a ranked leaderboard for the specified metric.
   */
  public async getLeaderboard(
    metric: LeaderboardMetric = "net_worth",
    limit: number = 10,
    guildId?: string
  ): Promise<LeaderboardEntry[]> {
    const accounts = await this.storage.getAllAccounts(guildId);

    const enriched = accounts.map((acc) => {
      const netWorth = this.calculateNetWorth(acc);
      let sortValue = 0;

      switch (metric) {
        case "net_worth":
          sortValue = netWorth;
          break;
        case "wallet":
          sortValue = acc.wallet;
          break;
        case "bank":
          sortValue = acc.bank;
          break;
        case "level":
          sortValue = acc.level;
          break;
        case "streak":
          sortValue = acc.streak?.daily ?? 0;
          break;
      }

      return {
        userId: acc.userId,
        guildId: acc.guildId,
        value: sortValue,
        wallet: acc.wallet,
        bank: acc.bank,
        netWorth,
        level: acc.level,
        streak: acc.streak?.daily ?? 0,
      };
    });

    enriched.sort((a, b) => b.value - a.value);

    return enriched.slice(0, limit).map((entry, index) => ({
      ...entry,
      rank: index + 1,
    }));
  }

  /**
   * Formats the leaderboard entries into a clean Discord markdown string.
   */
  public formatLeaderboard(
    entries: LeaderboardEntry[],
    metric: LeaderboardMetric = "net_worth",
    currencySymbol: string = "🪙"
  ): string {
    if (entries.length === 0) {
      return "No economy records found yet.";
    }

    const metricTitles: Record<LeaderboardMetric, string> = {
      net_worth: "Net Worth",
      wallet: "Wallet Cash",
      bank: "Bank Savings",
      level: "Level & XP",
      streak: "Daily Streak",
    };

    let output = `🏆 **Top Economy Leaderboard (${metricTitles[metric]})**\n\n`;

    for (const e of entries) {
      let medal = `\`#${e.rank}\``;
      if (e.rank === 1) medal = "🥇";
      else if (e.rank === 2) medal = "🥈";
      else if (e.rank === 3) medal = "🥉";

      let formattedValue = "";
      if (metric === "level") {
        formattedValue = `Lvl ${e.value}`;
      } else if (metric === "streak") {
        formattedValue = `${e.value} days 🔥`;
      } else {
        formattedValue = `${currencySymbol} ${e.value.toLocaleString()}`;
      }

      output += `${medal} <@${e.userId}> — **${formattedValue}**\n`;
      output += `   └ Net Worth: ${currencySymbol} ${e.netWorth.toLocaleString()} | Lvl ${e.level}\n`;
    }

    return output;
  }
}

