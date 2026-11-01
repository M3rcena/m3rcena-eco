/**
 * @m3rcena/eco
 * Bank Vault Tiers, Capacity Upgrades & Daily Compound Interest Engine.
 *
 * @copyright 2026 M3rcena Development. All rights reserved.
 * @license Apache-2.0
 */

import { BankManager } from "./BankManager.js";
import { BankVaultTier, UserAccount } from "../types.js";

export const DEFAULT_VAULT_TIERS: BankVaultTier[] = [
  {
    tier: 1,
    name: "Piggy Bank & Floor Safe",
    capacity: 10000,
    upgradeCost: 0,
    interestRate: 0,
    robberyDefense: 0,
    perks: ["Basic starter storage", "No interest yield"],
  },
  {
    tier: 2,
    name: "Community Commercial Safe",
    capacity: 50000,
    upgradeCost: 15000,
    interestRate: 0.005, // 0.5% daily
    robberyDefense: 0.15,
    perks: ["$50,000 capacity", "0.5% daily compound interest", "15% robbery defense"],
  },
  {
    tier: 3,
    name: "Reinforced Iron Vault",
    capacity: 200000,
    upgradeCost: 75000,
    interestRate: 0.01, // 1.0% daily
    robberyDefense: 0.35,
    perks: ["$200,000 capacity", "1.0% daily compound interest", "35% robbery defense"],
  },
  {
    tier: 4,
    name: "Titanium Security Depository",
    capacity: 1000000,
    upgradeCost: 350000,
    interestRate: 0.018, // 1.8% daily
    robberyDefense: 0.6,
    perks: ["$1,000,000 capacity", "1.8% daily compound interest", "60% robbery defense"],
  },
  {
    tier: 5,
    name: "Swiss Offshore Bunker",
    capacity: 5000000,
    upgradeCost: 1500000,
    interestRate: 0.025, // 2.5% daily
    robberyDefense: 0.85,
    perks: ["$5,000,000 capacity", "2.5% daily compound interest", "85% robbery defense", "Tax evasion resistance"],
  },
  {
    tier: 6,
    name: "Quantum Orbital Reserve",
    capacity: 25000000,
    upgradeCost: 8000000,
    interestRate: 0.04, // 4.0% daily
    robberyDefense: 1.0,
    perks: ["$25,000,000 capacity", "4.0% daily compound interest", "100% robbery immunity (Satellite defense)"],
  },
];

export class VaultManager {
  private bank: BankManager;
  private tiers: BankVaultTier[] = DEFAULT_VAULT_TIERS;

  constructor(bank: BankManager, customTiers?: BankVaultTier[]) {
    this.bank = bank;
    if (customTiers && customTiers.length > 0) {
      this.tiers = customTiers;
    }
  }

  public getVaultTiers(): BankVaultTier[] {
    return this.tiers;
  }

  public getVaultTier(tierNumber: number): BankVaultTier {
    return this.tiers.find((t) => t.tier === tierNumber) || this.tiers[0];
  }

  public async getUserVault(userId: string, guildId?: string): Promise<{
    currentTier: BankVaultTier;
    nextTier?: BankVaultTier;
    bank: number;
    capacity: number;
    dailyInterestAccrual: number;
    canClaimInterest: boolean;
  }> {
    const acc = await this.bank.getAccount(userId, guildId);
    const tierNum = acc.bankTier || 1;
    const currentTier = this.getVaultTier(tierNum);
    const nextTier = this.tiers.find((t) => t.tier === tierNum + 1);

    const dailyInterestAccrual = Math.floor(acc.bank * currentTier.interestRate);
    const lastClaim = acc.lastInterestClaimedAt || 0;
    const oneDayMs = 24 * 60 * 60 * 1000;
    const canClaimInterest = Date.now() - lastClaim >= oneDayMs && acc.bank > 0 && currentTier.interestRate > 0;

    return {
      currentTier,
      nextTier,
      bank: acc.bank,
      capacity: acc.bankCapacity,
      dailyInterestAccrual,
      canClaimInterest,
    };
  }

  /**
   * Upgrades the user's bank vault to the next tier.
   */
  public async upgradeVault(userId: string, guildId?: string): Promise<{
    success: boolean;
    previousTier: BankVaultTier;
    newTier: BankVaultTier;
    cost: number;
    newCapacity: number;
    error?: string;
  }> {
    const acc = await this.bank.getAccount(userId, guildId);
    const currentTierNum = acc.bankTier || 1;
    const currentTier = this.getVaultTier(currentTierNum);

    const nextTier = this.tiers.find((t) => t.tier === currentTierNum + 1);
    if (!nextTier) {
      return {
        success: false,
        previousTier: currentTier,
        newTier: currentTier,
        cost: 0,
        newCapacity: acc.bankCapacity,
        error: "Your bank vault is already at the maximum tier (Quantum Orbital Reserve)!",
      };
    }

    if (acc.wallet < nextTier.upgradeCost) {
      return {
        success: false,
        previousTier: currentTier,
        newTier: nextTier,
        cost: nextTier.upgradeCost,
        newCapacity: acc.bankCapacity,
        error: `Insufficient cash in wallet. Upgrade costs $${nextTier.upgradeCost.toLocaleString()}, you have $${acc.wallet.toLocaleString()}.`,
      };
    }

    acc.wallet -= nextTier.upgradeCost;
    acc.stats.totalSpent += nextTier.upgradeCost;
    acc.bankTier = nextTier.tier;
    acc.bankCapacity = nextTier.capacity;

    await this.bank.saveAccount(acc);

    return {
      success: true,
      previousTier: currentTier,
      newTier: nextTier,
      cost: nextTier.upgradeCost,
      newCapacity: nextTier.capacity,
    };
  }

  /**
   * Claims accumulated 24h compound interest on savings.
   */
  public async claimDailyInterest(userId: string, guildId?: string): Promise<{
    success: boolean;
    interestEarned: number;
    newBankBalance: number;
    rate: number;
    cooldownRemainingMs?: number;
    error?: string;
  }> {
    const acc = await this.bank.getAccount(userId, guildId);
    const tier = this.getVaultTier(acc.bankTier || 1);

    if (tier.interestRate <= 0) {
      return {
        success: false,
        interestEarned: 0,
        newBankBalance: acc.bank,
        rate: 0,
        error: "Your current vault tier does not yield interest. Upgrade to Community Safe (Tier 2) or higher!",
      };
    }

    const lastClaim = acc.lastInterestClaimedAt || 0;
    const oneDayMs = 24 * 60 * 60 * 1000;
    const timeSince = Date.now() - lastClaim;

    if (timeSince < oneDayMs) {
      return {
        success: false,
        interestEarned: 0,
        newBankBalance: acc.bank,
        rate: tier.interestRate,
        cooldownRemainingMs: oneDayMs - timeSince,
        error: `Interest is distributed every 24 hours. Next payout in ${Math.ceil((oneDayMs - timeSince) / (60 * 1000))} minutes.`,
      };
    }

    if (acc.bank <= 0) {
      return {
        success: false,
        interestEarned: 0,
        newBankBalance: 0,
        rate: tier.interestRate,
        error: "Your bank vault is empty. Deposit funds to earn compound interest!",
      };
    }

    const interest = Math.floor(acc.bank * tier.interestRate);
    const availableSpace = Math.max(0, acc.bankCapacity - acc.bank);
    const actualInterest = Math.min(interest, availableSpace);

    acc.bank += actualInterest;
    acc.stats.totalEarned += actualInterest;
    acc.lastInterestClaimedAt = Date.now();

    await this.bank.saveAccount(acc);

    return {
      success: true,
      interestEarned: actualInterest,
      newBankBalance: acc.bank,
      rate: tier.interestRate,
    };
  }
}

