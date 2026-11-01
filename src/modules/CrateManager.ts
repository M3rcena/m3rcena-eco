/**
 * @m3rcena/eco
 * Mystery Loot Crate Unboxing System.
 *
 * @copyright 2026 M3rcena Development. All rights reserved.
 * @license Apache-2.0
 */

import { BankManager } from "./BankManager.js";
import { CrateTier, CrateReward } from "../types.js";

export const CRATE_PRICES: Record<CrateTier, number> = {
  common: 5000,
  rare: 25000,
  epic: 100000,
  legendary: 500000,
  mythic: 2000000,
};

export class CrateManager {
  private bank: BankManager;

  constructor(bank: BankManager) {
    this.bank = bank;
  }

  public getCratePrice(tier: CrateTier): number {
    return CRATE_PRICES[tier] || 10000;
  }

  /**
   * Opens a mystery crate of the given tier and awards randomized rewards.
   */
  public async openCrate(userId: string, tier: CrateTier, guildId?: string): Promise<CrateReward> {
    const cost = this.getCratePrice(tier);
    const acc = await this.bank.getAccount(userId, guildId);

    if (acc.wallet < cost) {
      throw new Error(`Insufficient funds to open ${tier.toUpperCase()} crate. Price: $${cost.toLocaleString()}, you have: $${acc.wallet.toLocaleString()}`);
    }

    acc.wallet -= cost;
    acc.stats.totalSpent += cost;

    let minCoins = cost * 0.4;
    let maxCoins = cost * 2.2;
    let xp = 50;

    if (tier === "mythic") {
      minCoins = cost * 0.8;
      maxCoins = cost * 4.5;
      xp = 1000;
    } else if (tier === "legendary") {
      minCoins = cost * 0.6;
      maxCoins = cost * 3.0;
      xp = 450;
    } else if (tier === "epic") {
      xp = 200;
    }

    const wonCoins = Math.floor(Math.random() * (maxCoins - minCoins + 1)) + minCoins;
    acc.wallet += wonCoins;
    acc.stats.totalEarned += wonCoins;
    acc.xp += xp;

    // Check level up
    const reqXp = acc.level * 250;
    if (acc.xp >= reqXp) {
      acc.level += 1;
      acc.xp -= reqXp;
    }

    await this.bank.saveAccount(acc);

    return {
      tier,
      coins: wonCoins,
      xp,
      announcement: `Unboxed [${tier.toUpperCase()} CRATE] and discovered $${wonCoins.toLocaleString()} + ${xp} XP!`,
    };
  }
}

