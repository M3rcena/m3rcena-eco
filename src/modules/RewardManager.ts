/**
 * @m3rcena/eco
 * Earning, Daily Streaks, Work, Crime, and Robbery System.
 *
 * @copyright 2026 M3rcena Development. All rights reserved.
 * @license Apache-2.0
 */

import { BankManager } from "./BankManager.js";
import { RobResult } from "../types.js";

const DEFAULT_COOLDOWNS = {
  daily: 24 * 60 * 60 * 1000,
  weekly: 7 * 24 * 60 * 60 * 1000,
  monthly: 30 * 24 * 60 * 60 * 1000,
  hourly: 60 * 60 * 1000,
  work: 30 * 60 * 1000,
  beg: 5 * 60 * 1000,
  crime: 45 * 60 * 1000,
  rob: 2 * 60 * 60 * 1000,
};

const BEG_RESPONSES = [
  { npc: "Mr. Beast", quote: "I just tipped you a chunk of cash!", min: 100, max: 400 },
  { npc: "Generous Grandma", quote: "Here is some sweet candy money, dear.", min: 50, max: 200 },
  { npc: "Homeless Veteran", quote: "Sharing what little I have left, stay safe.", min: 10, max: 80 },
  { npc: "Tech Bro", quote: "Take some crypto change, to the moon!", min: 80, max: 350 },
  { npc: "Street Busker", quote: "A little coin for appreciating my tunes.", min: 40, max: 150 },
];

export class RewardManager {
  private bank: BankManager;
  private cooldowns: Record<string, number>;

  constructor(bank: BankManager, customCooldowns: Record<string, number> = {}) {
    this.bank = bank;
    this.cooldowns = { ...DEFAULT_COOLDOWNS, ...customCooldowns };
  }

  private checkCooldown(lastUsed: number | undefined, cooldownMs: number): { onCooldown: boolean; remainingMs: number } {
    if (!lastUsed) return { onCooldown: false, remainingMs: 0 };
    const elapsed = Date.now() - lastUsed;
    if (elapsed < cooldownMs) {
      return { onCooldown: true, remainingMs: cooldownMs - elapsed };
    }
    return { onCooldown: false, remainingMs: 0 };
  }

  /**
   * Claims the daily reward with streak multipliers.
   */
  public async claimDaily(
    userId: string,
    guildId?: string
  ): Promise<{
    success: boolean;
    amount: number;
    rewardAmount: number;
    streak: number;
    isMilestone: boolean;
    jackpotMilestone?: boolean;
    remainingMs?: number;
    cooldownRemainingMs?: number;
  }> {
    const acc = await this.bank.getAccount(userId, guildId);
    const { onCooldown, remainingMs } = this.checkCooldown(acc.streak.lastDaily, this.cooldowns.daily);

    if (onCooldown) {
      return {
        success: false,
        amount: 0,
        rewardAmount: 0,
        streak: acc.streak.daily,
        isMilestone: false,
        jackpotMilestone: false,
        remainingMs,
        cooldownRemainingMs: remainingMs,
      };
    }

    // Streak calculation (reset if missed by > 48 hours)
    const missedStreak = acc.streak.lastDaily && Date.now() - acc.streak.lastDaily > 48 * 60 * 60 * 1000;
    const currentStreak = missedStreak ? 1 : (acc.streak.daily || 0) + 1;
    acc.streak.daily = currentStreak;
    acc.streak.lastDaily = Date.now();

    // Base: 1000 + 100 per streak day (up to day 30), Day 7 has 2x jackpot
    const isMilestone = currentStreak % 7 === 0;
    const baseAmount = 1000 + Math.min(currentStreak, 30) * 100;
    const finalAmount = isMilestone ? baseAmount * 2 : baseAmount;

    acc.wallet += finalAmount;
    acc.stats.totalEarned += finalAmount;
    acc.xp += 100;
    this.checkLevelUp(acc);

    await this.bank.saveAccount(acc);
    return {
      success: true,
      amount: finalAmount,
      rewardAmount: finalAmount,
      streak: currentStreak,
      isMilestone,
      jackpotMilestone: isMilestone,
    };
  }

  /**
   * Claims weekly reward bonus.
   */
  public async claimWeekly(
    userId: string,
    guildId?: string
  ): Promise<{ success: boolean; amount: number; rewardAmount: number; remainingMs?: number; cooldownRemainingMs?: number }> {
    const acc = await this.bank.getAccount(userId, guildId);
    const { onCooldown, remainingMs } = this.checkCooldown(acc.streak.lastWeekly, this.cooldowns.weekly);

    if (onCooldown) {
      return { success: false, amount: 0, rewardAmount: 0, remainingMs, cooldownRemainingMs: remainingMs };
    }

    const reward = 5000 + acc.level * 500;
    acc.wallet += reward;
    acc.stats.totalEarned += reward;
    acc.xp += 300;
    acc.streak.lastWeekly = Date.now();
    this.checkLevelUp(acc);
    await this.bank.saveAccount(acc);

    return { success: true, amount: reward, rewardAmount: reward };
  }

  /**
   * Claims monthly reward bonus.
   */
  public async claimMonthly(
    userId: string,
    guildId?: string
  ): Promise<{ success: boolean; amount: number; rewardAmount: number; remainingMs?: number; cooldownRemainingMs?: number }> {
    const acc = await this.bank.getAccount(userId, guildId);
    const { onCooldown, remainingMs } = this.checkCooldown(acc.streak.lastMonthly, this.cooldowns.monthly);

    if (onCooldown) {
      return { success: false, amount: 0, rewardAmount: 0, remainingMs, cooldownRemainingMs: remainingMs };
    }

    const reward = 25000 + acc.level * 2500;
    acc.wallet += reward;
    acc.stats.totalEarned += reward;
    acc.xp += 1500;
    acc.streak.lastMonthly = Date.now();
    this.checkLevelUp(acc);
    await this.bank.saveAccount(acc);

    return { success: true, amount: reward, rewardAmount: reward };
  }

  /**
   * Claims hourly allowance.
   */
  public async claimHourly(
    userId: string,
    guildId?: string
  ): Promise<{ success: boolean; amount: number; rewardAmount: number; remainingMs?: number; cooldownRemainingMs?: number }> {
    const acc = await this.bank.getAccount(userId, guildId);
    const { onCooldown, remainingMs } = this.checkCooldown(acc.streak.lastHourly, this.cooldowns.hourly);

    if (onCooldown) {
      return { success: false, amount: 0, rewardAmount: 0, remainingMs, cooldownRemainingMs: remainingMs };
    }

    const reward = 150 + acc.level * 25;
    acc.wallet += reward;
    acc.stats.totalEarned += reward;
    acc.streak.lastHourly = Date.now();
    await this.bank.saveAccount(acc);

    return { success: true, amount: reward, rewardAmount: reward };
  }

  /**
   * Completes a work shift.
   */
  public async work(
    userId: string,
    guildId?: string,
    bonusSalary: number = 0
  ): Promise<{
    success: boolean;
    earned: number;
    earnedAmount: number;
    xp: number;
    xpEarned: number;
    jobTitle: string;
    remainingMs?: number;
    cooldownRemainingMs?: number;
  }> {
    const acc = await this.bank.getAccount(userId, guildId);
    const { onCooldown, remainingMs } = this.checkCooldown(acc.streak.lastWork, this.cooldowns.work);

    if (onCooldown) {
      return {
        success: false,
        earned: 0,
        earnedAmount: 0,
        xp: 0,
        xpEarned: 0,
        jobTitle: acc.career?.jobTitle || "Freelancer",
        remainingMs,
        cooldownRemainingMs: remainingMs,
      };
    }

    const jobTitle = acc.career?.jobTitle || "Freelancer";
    const baseSalary = bonusSalary > 0 ? bonusSalary : (acc.career ? 300 + acc.career.level * 150 : 200);
    const variance = Math.floor(Math.random() * 100) - 30;
    const earned = Math.max(50, baseSalary + variance);
    const xpEarned = 50 + (acc.career?.level || 1) * 10;

    acc.wallet += earned;
    acc.stats.totalEarned += earned;
    acc.stats.jobsCompleted++;
    acc.xp += xpEarned;
    acc.streak.lastWork = Date.now();

    if (acc.career) {
      acc.career.shiftsCompleted++;
    }

    this.checkLevelUp(acc);
    await this.bank.saveAccount(acc);

    return { success: true, earned, earnedAmount: earned, xp: xpEarned, xpEarned, jobTitle };
  }

  /**
   * Begs for coins from random NPCs.
   */
  public async beg(
    userId: string,
    guildId?: string
  ): Promise<{
    success: boolean;
    earned: number;
    npc: string;
    donor: string;
    quote: string;
    remainingMs?: number;
    cooldownRemainingMs?: number;
  }> {
    const acc = await this.bank.getAccount(userId, guildId);
    const { onCooldown, remainingMs } = this.checkCooldown(acc.streak.lastBeg, this.cooldowns.beg);

    if (onCooldown) {
      return { success: false, earned: 0, npc: "", donor: "", quote: "", remainingMs, cooldownRemainingMs: remainingMs };
    }

    // 20% pity fail chance
    const isSuccess = Math.random() > 0.2;
    acc.streak.lastBeg = Date.now();

    if (!isSuccess) {
      await this.bank.saveAccount(acc);
      return {
        success: false,
        earned: 0,
        npc: "Grumpy Stranger",
        donor: "Grumpy Stranger",
        quote: "Get a job, kid! Nothing for you.",
      };
    }

    const pick = BEG_RESPONSES[Math.floor(Math.random() * BEG_RESPONSES.length)];
    const earned = Math.floor(Math.random() * (pick.max - pick.min + 1)) + pick.min;

    acc.wallet += earned;
    acc.stats.totalEarned += earned;
    await this.bank.saveAccount(acc);

    return { success: true, earned, npc: pick.npc, donor: pick.npc, quote: pick.quote };
  }

  /**
   * Attempts an illicit crime for high stakes.
   */
  public async commitCrime(
    userId: string,
    guildId?: string
  ): Promise<{
    success: boolean;
    payout: number;
    earned?: number;
    fine: number;
    message: string;
    remainingMs?: number;
    cooldownRemainingMs?: number;
  }> {
    const acc = await this.bank.getAccount(userId, guildId);
    const { onCooldown, remainingMs } = this.checkCooldown(acc.streak.lastCrime, this.cooldowns.crime);

    if (onCooldown) {
      return {
        success: false,
        payout: 0,
        earned: 0,
        fine: 0,
        message: "Police heat is too high!",
        remainingMs,
        cooldownRemainingMs: remainingMs,
      };
    }

    acc.streak.lastCrime = Date.now();

    // 55% success rate
    const isSuccess = Math.random() < 0.55;

    if (isSuccess) {
      const payout = Math.floor(Math.random() * 800) + 400; // 400 - 1200
      acc.wallet += payout;
      acc.stats.totalEarned += payout;
      acc.xp += 120;
      this.checkLevelUp(acc);
      await this.bank.saveAccount(acc);

      return {
        success: true,
        payout,
        earned: payout,
        fine: 0,
        message: `You successfully hacked a high-frequency trading server and laundered ${payout} coins!`,
      };
    } else {
      const fine = Math.min(acc.wallet, Math.floor(Math.random() * 400) + 200);
      acc.wallet -= fine;
      acc.stats.totalSpent += fine;
      await this.bank.saveAccount(acc);

      return {
        success: false,
        payout: 0,
        earned: 0,
        fine,
        message: `The police caught you red-handed! You paid a bail fine of ${fine} coins.`,
      };
    }
  }

  /**
   * Alias for commitCrime.
   */
  public async crime(
    userId: string,
    guildId?: string
  ): Promise<{
    success: boolean;
    payout: number;
    earned?: number;
    fine: number;
    message: string;
    remainingMs?: number;
    cooldownRemainingMs?: number;
  }> {
    return this.commitCrime(userId, guildId);
  }

  /**
   * Attempts to rob another player's wallet.
   */
  public async rob(
    robberId: string,
    victimId: string,
    guildId?: string
  ): Promise<RobResult> {
    if (robberId === victimId) {
      return {
        success: false,
        robberId,
        victimId,
        amountStolen: 0,
        robberWallet: 0,
        victimWallet: 0,
        message: "You cannot rob yourself!",
      };
    }

    const robber = await this.bank.getAccount(robberId, guildId);
    const { onCooldown } = this.checkCooldown(robber.streak.lastRob, this.cooldowns.rob);

    if (onCooldown) {
      return {
        success: false,
        robberId,
        victimId,
        amountStolen: 0,
        robberWallet: robber.wallet,
        victimWallet: 0,
        message: "You are currently laying low. Wait before planning another robbery!",
      };
    }

    if (robber.wallet < 200) {
      return {
        success: false,
        robberId,
        victimId,
        amountStolen: 0,
        robberWallet: robber.wallet,
        victimWallet: 0,
        message: "You need at least 200 coins in your wallet to cover police fines if you fail!",
      };
    }

    const victim = await this.bank.getAccount(victimId, guildId);
    if (victim.wallet < 100) {
      return {
        success: false,
        robberId,
        victimId,
        amountStolen: 0,
        robberWallet: robber.wallet,
        victimWallet: victim.wallet,
        message: "Your target is broke! They have less than 100 coins in their wallet.",
      };
    }

    robber.streak.lastRob = Date.now();

    // Check if victim has active shield/padlock effect
    const shieldIdx = victim.activeEffects.findIndex((e) => e.type === "shield" && e.expiresAt > Date.now());
    if (shieldIdx !== -1) {
      // Shield consumed
      victim.activeEffects.splice(shieldIdx, 1);
      const fine = Math.min(robber.wallet, 250);
      robber.wallet -= fine;
      robber.stats.totalSpent += fine;
      victim.stats.timesRobbed++;

      await this.bank.saveAccount(robber);
      await this.bank.saveAccount(victim);

      return {
        success: false,
        robberId,
        victimId,
        amountStolen: 0,
        finePaid: fine,
        blockedByShield: true,
        robberWallet: robber.wallet,
        victimWallet: victim.wallet,
        message: `Robbery failed! Target was protected by a high-security padlock shield. You paid ${fine} coins in fines!`,
      };
    }

    // 50% base success probability
    const isSuccess = Math.random() < 0.5;

    if (isSuccess) {
      const percent = Math.random() * 0.4 + 0.2; // 20% to 60% of wallet
      const stolen = Math.floor(victim.wallet * percent);

      victim.wallet -= stolen;
      victim.stats.timesRobbed++;

      robber.wallet += stolen;
      robber.stats.totalRobbed += stolen;
      robber.stats.totalEarned += stolen;

      await this.bank.saveAccount(robber);
      await this.bank.saveAccount(victim);

      return {
        success: true,
        robberId,
        victimId,
        amountStolen: stolen,
        blockedByShield: false,
        robberWallet: robber.wallet,
        victimWallet: victim.wallet,
        message: `Heist successful! You stealthily stole ${stolen} coins from their wallet!`,
      };
    } else {
      const fine = Math.min(robber.wallet, Math.floor(victim.wallet * 0.2) + 150);
      robber.wallet -= fine;
      robber.stats.totalSpent += fine;

      // Half the fine goes to the victim as compensation
      const comp = Math.floor(fine * 0.5);
      victim.wallet += comp;

      await this.bank.saveAccount(robber);
      await this.bank.saveAccount(victim);

      return {
        success: false,
        robberId,
        victimId,
        amountStolen: 0,
        finePaid: fine,
        blockedByShield: false,
        robberWallet: robber.wallet,
        victimWallet: victim.wallet,
        message: `You tripped the silent alarm and got tackled! You were fined ${fine} coins (half given to victim as compensation).`,
      };
    }
  }

  private checkLevelUp(acc: any): boolean {
    const requiredXp = acc.level * 500;
    if (acc.xp >= requiredXp) {
      acc.level++;
      acc.bankCapacity += 2500; // Bonus bank capacity on level up!
      return true;
    }
    return false;
  }
}
