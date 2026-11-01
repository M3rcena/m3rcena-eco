/**
 * @m3rcena/eco
 * Credit Score, Bank Loans & Debt Collection Engine.
 *
 * @copyright 2026 M3rcena Development. All rights reserved.
 * @license Apache-2.0
 */

import { BankManager } from "./BankManager.js";
import { LoanOffer, LoanTier, UserLoan, CreditScoreData, CreditRating } from "../types.js";

export const LOAN_CATALOG: LoanOffer[] = [
  {
    tier: "starter",
    name: "Micro Personal Advance",
    principal: 10000,
    interestRate: 0.05, // 5%
    totalDue: 10500,
    minCreditScore: 500,
    durationHours: 48,
    description: "Low-risk starter loan to fund early work tools or safety equipment.",
  },
  {
    tier: "business",
    name: "Small Enterprise Commercial Credit",
    principal: 50000,
    interestRate: 0.08, // 8%
    totalDue: 54000,
    minCreditScore: 600,
    durationHours: 72,
    description: "Working capital to acquire commercial businesses or hire employees.",
  },
  {
    tier: "commercial",
    name: "Metropolitan Venture Capital Loan",
    principal: 250000,
    interestRate: 0.12, // 12%
    totalDue: 280000,
    minCreditScore: 700,
    durationHours: 96,
    description: "Substantial institutional backing for high-stakes market operations.",
  },
  {
    tier: "whale",
    name: "Syndicate High-Roller Credit Line",
    principal: 1000000,
    interestRate: 0.15, // 15%
    totalDue: 1150000,
    minCreditScore: 780,
    durationHours: 120,
    description: "Massive institutional liquidity reserved for elite tycoons and syndicates.",
  },
];

export class LoanManager {
  private bank: BankManager;
  private offers: LoanOffer[] = LOAN_CATALOG;

  constructor(bank: BankManager, customOffers?: LoanOffer[]) {
    this.bank = bank;
    if (customOffers && customOffers.length > 0) {
      this.offers = customOffers;
    }
  }

  public getOffers(): LoanOffer[] {
    return this.offers;
  }

  public getRatingForScore(score: number): CreditRating {
    if (score >= 800) return "EXCELLENT";
    if (score >= 740) return "VERY_GOOD";
    if (score >= 670) return "GOOD";
    if (score >= 580) return "FAIR";
    return "POOR";
  }

  public async getCreditScore(userId: string, guildId?: string): Promise<CreditScoreData> {
    const acc = await this.bank.getAccount(userId, guildId);
    if (!acc.creditScore) {
      acc.creditScore = {
        score: 650,
        rating: "FAIR",
        loansRepaid: 0,
        defaultsCount: 0,
        taxesPaid: 0,
      };
      await this.bank.saveAccount(acc);
    }
    acc.creditScore.rating = this.getRatingForScore(acc.creditScore.score);
    return acc.creditScore;
  }

  public async getUserLoans(userId: string, guildId?: string): Promise<UserLoan[]> {
    const acc = await this.bank.getAccount(userId, guildId);
    return acc.loans || [];
  }

  /**
   * Applies for a new bank loan.
   */
  public async applyLoan(userId: string, tier: LoanTier, guildId?: string): Promise<{
    success: boolean;
    loan?: UserLoan;
    creditScore: number;
    error?: string;
  }> {
    const offer = this.offers.find((o) => o.tier === tier);
    if (!offer) {
      return { success: false, creditScore: 0, error: `Loan tier "${tier}" does not exist.` };
    }

    const acc = await this.bank.getAccount(userId, guildId);
    const credit = await this.getCreditScore(userId, guildId);

    if (credit.score < offer.minCreditScore) {
      return {
        success: false,
        creditScore: credit.score,
        error: `Credit score too low for ${offer.name}. Required: ${offer.minCreditScore}, Your Score: ${credit.score} (${credit.rating}).`,
      };
    }

    const activeLoans = (acc.loans || []).filter((l) => l.status === "active");
    if (activeLoans.length >= 2) {
      return {
        success: false,
        creditScore: credit.score,
        error: "Maximum of 2 concurrent active loans permitted. Please repay outstanding debts first.",
      };
    }

    const hasDefaulted = (acc.loans || []).some((l) => l.status === "defaulted");
    if (hasDefaulted) {
      return {
        success: false,
        creditScore: credit.score,
        error: "Your account is flagged for an outstanding defaulted debt! Settle past debts to unfreeze credit lines.",
      };
    }

    const now = Date.now();
    const newLoan: UserLoan = {
      id: "loan_" + Math.random().toString(36).substring(2, 8),
      tier: offer.tier,
      name: offer.name,
      principal: offer.principal,
      totalDue: offer.totalDue,
      remainingDue: offer.totalDue,
      takenAt: now,
      dueAt: now + offer.durationHours * 3600 * 1000,
      status: "active",
    };

    if (!acc.loans) acc.loans = [];
    acc.loans.push(newLoan);

    // Deposit loan cash into wallet
    acc.wallet += offer.principal;
    acc.stats.totalEarned += offer.principal;

    await this.bank.saveAccount(acc);

    return {
      success: true,
      loan: newLoan,
      creditScore: credit.score,
    };
  }

  /**
   * Repays active debt.
   */
  public async repayLoan(userId: string, loanId: string, amount: number | "all", guildId?: string): Promise<{
    success: boolean;
    amountPaid: number;
    remainingDue: number;
    isFullyPaid: boolean;
    newCreditScore: number;
    error?: string;
  }> {
    const acc = await this.bank.getAccount(userId, guildId);
    const loan = (acc.loans || []).find((l) => l.id === loanId);

    if (!loan) {
      return { success: false, amountPaid: 0, remainingDue: 0, isFullyPaid: false, newCreditScore: 0, error: `Loan "${loanId}" not found.` };
    }

    if (loan.status === "paid") {
      return { success: false, amountPaid: 0, remainingDue: 0, isFullyPaid: true, newCreditScore: acc.creditScore?.score || 650, error: "This loan has already been fully repaid." };
    }

    const paymentAmount = amount === "all" ? loan.remainingDue : Math.min(amount, loan.remainingDue);

    if (acc.wallet < paymentAmount) {
      return {
        success: false,
        amountPaid: 0,
        remainingDue: loan.remainingDue,
        isFullyPaid: false,
        newCreditScore: acc.creditScore?.score || 650,
        error: `Insufficient funds in wallet. Need $${paymentAmount.toLocaleString()}, you have $${acc.wallet.toLocaleString()}.`,
      };
    }

    acc.wallet -= paymentAmount;
    acc.stats.totalSpent += paymentAmount;
    loan.remainingDue = Math.max(0, loan.remainingDue - paymentAmount);

    let isFullyPaid = false;
    let scoreBoost = 0;

    if (!acc.creditScore) {
      acc.creditScore = { score: 650, rating: "FAIR", loansRepaid: 0, defaultsCount: 0, taxesPaid: 0 };
    }

    if (loan.remainingDue <= 0) {
      loan.status = "paid";
      isFullyPaid = true;
      acc.creditScore.loansRepaid += 1;
      scoreBoost = loan.tier === "whale" ? 45 : loan.tier === "commercial" ? 35 : loan.tier === "business" ? 25 : 15;
      acc.creditScore.score = Math.min(850, acc.creditScore.score + scoreBoost);
      acc.creditScore.rating = this.getRatingForScore(acc.creditScore.score);
    }

    await this.bank.saveAccount(acc);

    return {
      success: true,
      amountPaid: paymentAmount,
      remainingDue: loan.remainingDue,
      isFullyPaid,
      newCreditScore: acc.creditScore.score,
    };
  }

  /**
   * Audits active debts and executes repo / collections on defaulted loans.
   */
  public async processCollections(userId: string, guildId?: string): Promise<{
    defaultedLoans: UserLoan[];
    garnishedCash: number;
    scorePenalty: number;
    newScore: number;
  }> {
    const acc = await this.bank.getAccount(userId, guildId);
    const loans = acc.loans || [];
    const now = Date.now();

    const defaulted: UserLoan[] = [];
    let totalGarnished = 0;
    let totalPenalty = 0;

    if (!acc.creditScore) {
      acc.creditScore = { score: 650, rating: "FAIR", loansRepaid: 0, defaultsCount: 0, taxesPaid: 0 };
    }

    for (const loan of loans) {
      if (loan.status === "active" && now > loan.dueAt) {
        loan.status = "defaulted";
        defaulted.push(loan);
        acc.creditScore.defaultsCount += 1;

        // Penalty 75 points per default
        const penalty = 75;
        acc.creditScore.score = Math.max(300, acc.creditScore.score - penalty);
        totalPenalty += penalty;

        // Wage garnishment: seize up to 60% of wallet cash
        const garnishment = Math.min(loan.remainingDue, Math.floor(acc.wallet * 0.6));
        if (garnishment > 0) {
          acc.wallet -= garnishment;
          loan.remainingDue -= garnishment;
          totalGarnished += garnishment;
        }
      }
    }

    acc.creditScore.rating = this.getRatingForScore(acc.creditScore.score);
    if (defaulted.length > 0) {
      await this.bank.saveAccount(acc);
    }

    return {
      defaultedLoans: defaulted,
      garnishedCash: totalGarnished,
      scorePenalty: totalPenalty,
      newScore: acc.creditScore.score,
    };
  }
}

