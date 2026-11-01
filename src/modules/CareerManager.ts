/**
 * @m3rcena/eco
 * Career & Job Progression System.
 *
 * @copyright 2026 M3rcena Development. All rights reserved.
 * @license Apache-2.0
 */

import { BankManager } from "./BankManager.js";
import { CareerJob, UserCareer } from "../types.js";

export const DEFAULT_JOBS: CareerJob[] = [
  {
    id: "intern",
    title: "Junior Intern",
    category: "Corporate",
    baseSalary: 250,
    minLevel: 1,
    requiredShiftsForPromotion: 3,
    description: "Get coffee and organize files. A humble start.",
    perk: "+5% Work XP bonus",
  },
  {
    id: "barista",
    title: "Artisan Barista",
    category: "Hospitality",
    baseSalary: 500,
    minLevel: 2,
    requiredShiftsForPromotion: 5,
    description: "Brew espresso and master latte art for demanding customers.",
    perk: "Free daily energy boost",
  },
  {
    id: "software_engineer",
    title: "Full-Stack Developer",
    category: "Technology",
    baseSalary: 1400,
    minLevel: 5,
    requiredShiftsForPromotion: 8,
    description: "Write robust code, debug edge cases, and push releases.",
    perk: "+15% Salary bonus on promotions",
  },
  {
    id: "data_scientist",
    title: "AI & Data Scientist",
    category: "Technology",
    baseSalary: 3000,
    minLevel: 10,
    requiredShiftsForPromotion: 12,
    description: "Train neural networks and unlock algorithmic profits.",
    perk: "Increased Lucky Streak chance",
  },
  {
    id: "investment_banker",
    title: "Wall Street Banker",
    category: "Finance",
    baseSalary: 6500,
    minLevel: 15,
    requiredShiftsForPromotion: 15,
    description: "Leverage derivatives and manage multi-million dollar portfolios.",
    perk: "+20% Bank deposit capacity bonus",
  },
  {
    id: "cyber_syndicate_lead",
    title: "Syndicate Boss",
    category: "Underground",
    baseSalary: 12500,
    minLevel: 20,
    requiredShiftsForPromotion: 20,
    description: "Command underground operations from the shadows.",
    perk: "+25% Crime payout bonus",
  },
];

export class CareerManager {
  private bank: BankManager;
  private jobs: Map<string, CareerJob> = new Map();

  constructor(bank: BankManager, initialJobs: CareerJob[] = DEFAULT_JOBS) {
    this.bank = bank;
    for (const job of initialJobs) {
      this.jobs.set(job.id, job);
    }
  }

  /**
   * Returns all available jobs.
   */
  public getJobs(): CareerJob[] {
    return Array.from(this.jobs.values());
  }

  /**
   * Retrieves a job by ID.
   */
  public getJob(jobId: string): CareerJob | undefined {
    return this.jobs.get(jobId);
  }

  /**
   * Registers a new custom job.
   */
  public registerJob(job: CareerJob): void {
    this.jobs.set(job.id, job);
  }

  /**
   * Returns a user's current career.
   */
  public async getCareer(userId: string, guildId?: string): Promise<UserCareer | null> {
    const acc = await this.bank.getAccount(userId, guildId);
    return acc.career ?? null;
  }

  /**
   * Applies for a job. User must meet the minimum level requirement.
   */
  public async apply(
    userId: string,
    jobId: string,
    guildId?: string
  ): Promise<{ success: boolean; job?: CareerJob; error?: string }> {
    const job = this.jobs.get(jobId);
    if (!job) {
      return { success: false, error: `Job with ID "${jobId}" does not exist.` };
    }

    const acc = await this.bank.getAccount(userId, guildId);

    if (acc.level < job.minLevel) {
      return {
        success: false,
        error: `You need to be at least Level ${job.minLevel} to apply for ${job.title}. (Your level: ${acc.level})`,
      };
    }

    if (acc.career?.jobId === jobId) {
      return { success: false, error: `You are already employed as a ${job.title}!` };
    }

    acc.career = {
      jobId: job.id,
      jobTitle: job.title,
      level: 1,
      shiftsCompleted: 0,
      lastPromoted: Date.now(),
    };

    await this.bank.saveAccount(acc);
    return { success: true, job };
  }

  /**
   * Resigns from the current career.
   */
  public async resign(
    userId: string,
    guildId?: string
  ): Promise<{ success: boolean; previousJob?: string; error?: string }> {
    const acc = await this.bank.getAccount(userId, guildId);

    if (!acc.career) {
      return { success: false, error: "You are not currently employed in any career." };
    }

    const prev = acc.career.jobTitle;
    acc.career = undefined;
    await this.bank.saveAccount(acc);

    return { success: true, previousJob: prev };
  }

  /**
   * Records a shift worked and checks for a promotion.
   */
  public async recordShift(
    userId: string,
    guildId?: string
  ): Promise<{
    hasCareer: boolean;
    promoted: boolean;
    newCareerLevel?: number;
    promotionBonus?: number;
    shiftsCompleted?: number;
    job?: CareerJob;
  }> {
    const acc = await this.bank.getAccount(userId, guildId);
    if (!acc.career) {
      return { hasCareer: false, promoted: false };
    }

    const job = this.jobs.get(acc.career.jobId);
    if (!job) {
      return { hasCareer: true, promoted: false };
    }

    acc.career.shiftsCompleted += 1;
    let promoted = false;
    let bonus = 0;

    // Check if eligible for promotion
    const requiredShifts = job.requiredShiftsForPromotion * acc.career.level;
    if (acc.career.shiftsCompleted >= requiredShifts) {
      acc.career.level += 1;
      acc.career.shiftsCompleted = 0;
      acc.career.lastPromoted = Date.now();
      promoted = true;

      // Promotion bonus = 2x base salary * new level
      bonus = job.baseSalary * 2 * acc.career.level;
      acc.wallet += bonus;
      acc.stats.totalEarned += bonus;
    }

    await this.bank.saveAccount(acc);

    return {
      hasCareer: true,
      promoted,
      newCareerLevel: acc.career.level,
      promotionBonus: bonus,
      shiftsCompleted: acc.career.shiftsCompleted,
      job,
    };
  }

  /**
   * Computes salary for a user based on their career and career level.
   */
  public calculateSalary(career?: UserCareer): number {
    if (!career) return 0;
    const job = this.jobs.get(career.jobId);
    if (!job) return 0;

    // Base salary + 25% extra per career level
    const multiplier = 1 + (career.level - 1) * 0.25;
    return Math.floor(job.baseSalary * multiplier);
  }
}
