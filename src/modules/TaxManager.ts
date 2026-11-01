/**
 * @m3rcena/eco
 * Municipal Bills, Progressive Wealth Taxes & IRS Audit Engine.
 *
 * @copyright 2026 M3rcena Development. All rights reserved.
 * @license Apache-2.0
 */

import { BankManager } from "./BankManager.js";
import { MunicipalBill } from "../types.js";

export class TaxManager {
  private bank: BankManager;

  constructor(bank: BankManager) {
    this.bank = bank;
  }

  public async getPendingBills(userId: string, guildId?: string): Promise<MunicipalBill[]> {
    const acc = await this.bank.getAccount(userId, guildId);
    return (acc.bills || []).filter((b) => !b.isPaid);
  }

  public async getAllBills(userId: string, guildId?: string): Promise<MunicipalBill[]> {
    const acc = await this.bank.getAccount(userId, guildId);
    return acc.bills || [];
  }

  /**
   * Generates municipal bills & progressive wealth taxes if due.
   */
  public async generateBillsIfDue(userId: string, guildId?: string): Promise<{
    generated: boolean;
    newBills: MunicipalBill[];
    totalBilled: number;
  }> {
    const acc = await this.bank.getAccount(userId, guildId);
    const now = Date.now();
    const lastBilled = acc.streak.lastMonthly || 0; // Using monthly cycle
    const cycleMs = 7 * 24 * 60 * 60 * 1000; // 7 days billing cycle

    if (!acc.bills) acc.bills = [];

    // Check if user already has active unpaid bills
    const unpaid = acc.bills.filter((b) => !b.isPaid);
    if (unpaid.length >= 4) {
      return { generated: false, newBills: [], totalBilled: 0 };
    }

    const netWorth = acc.wallet + acc.bank;
    const newBills: MunicipalBill[] = [];

    // 1. Grid & Utility Data Bill
    const bizCount = (acc.businesses || []).length;
    const utilityCost = 1500 + bizCount * 800;
    newBills.push({
      id: "bill_util_" + Math.random().toString(36).substring(2, 8),
      type: "utility",
      title: "⚡ Quantum Grid & Data Bandwidth Utilities",
      amount: utilityCost,
      issuedAt: now,
      dueAt: now + 48 * 3600 * 1000,
      isPaid: false,
    });

    // 2. Vault Security & Maintenance
    const vaultTier = acc.bankTier || 1;
    if (vaultTier > 1) {
      const maintenance = vaultTier * 1250;
      newBills.push({
        id: "bill_vault_" + Math.random().toString(36).substring(2, 8),
        type: "vault_maintenance",
        title: "🛡️ High-Security Vault Armored Maintenance",
        amount: maintenance,
        issuedAt: now,
        dueAt: now + 72 * 3600 * 1000,
        isPaid: false,
      });
    }

    // 3. Progressive Wealth Tax (if net worth > $50,000)
    if (netWorth >= 50000) {
      let taxRate = 0.02; // 2% for 50k-250k
      if (netWorth >= 1000000) taxRate = 0.08; // 8% for 1M+
      else if (netWorth >= 250000) taxRate = 0.05; // 5% for 250k-1M

      const taxAmount = Math.floor(netWorth * taxRate);
      newBills.push({
        id: "bill_tax_" + Math.random().toString(36).substring(2, 8),
        type: "wealth_tax",
        title: `🏛️ Department of Revenue: ${(taxRate * 100).toFixed(0)}% Progressive Wealth Tax`,
        amount: taxAmount,
        issuedAt: now,
        dueAt: now + 96 * 3600 * 1000,
        isPaid: false,
      });
    }

    acc.bills.push(...newBills);
    await this.bank.saveAccount(acc);

    const totalBilled = newBills.reduce((sum, b) => sum + b.amount, 0);
    return { generated: true, newBills, totalBilled };
  }

  /**
   * Pays a specific municipal bill.
   */
  public async payBill(userId: string, billId: string, guildId?: string): Promise<{
    success: boolean;
    bill?: MunicipalBill;
    amountPaid: number;
    newCreditScore: number;
    error?: string;
  }> {
    const acc = await this.bank.getAccount(userId, guildId);
    const bill = (acc.bills || []).find((b) => b.id === billId);

    if (!bill) {
      return { success: false, amountPaid: 0, newCreditScore: 0, error: `Bill "${billId}" not found.` };
    }

    if (bill.isPaid) {
      return { success: false, amountPaid: 0, newCreditScore: acc.creditScore?.score || 650, error: "This bill has already been settled." };
    }

    if (acc.wallet < bill.amount) {
      return {
        success: false,
        amountPaid: 0,
        newCreditScore: acc.creditScore?.score || 650,
        error: `Insufficient cash in wallet. Bill amount: $${bill.amount.toLocaleString()}, you have $${acc.wallet.toLocaleString()}.`,
      };
    }

    acc.wallet -= bill.amount;
    acc.stats.totalSpent += bill.amount;
    bill.isPaid = true;

    if (!acc.creditScore) {
      acc.creditScore = { score: 650, rating: "FAIR", loansRepaid: 0, defaultsCount: 0, taxesPaid: 0 };
    }

    acc.creditScore.taxesPaid += 1;
    acc.creditScore.score = Math.min(850, acc.creditScore.score + 10);

    await this.bank.saveAccount(acc);

    return {
      success: true,
      bill,
      amountPaid: bill.amount,
      newCreditScore: acc.creditScore.score,
    };
  }

  /**
   * Settles all pending municipal bills at once.
   */
  public async payAllBills(userId: string, guildId?: string): Promise<{
    success: boolean;
    paidCount: number;
    totalAmountPaid: number;
    newCreditScore: number;
    error?: string;
  }> {
    const acc = await this.bank.getAccount(userId, guildId);
    const pending = (acc.bills || []).filter((b) => !b.isPaid);

    if (pending.length === 0) {
      return { success: true, paidCount: 0, totalAmountPaid: 0, newCreditScore: acc.creditScore?.score || 650 };
    }

    const totalCost = pending.reduce((sum, b) => sum + b.amount, 0);

    if (acc.wallet < totalCost) {
      return {
        success: false,
        paidCount: 0,
        totalAmountPaid: 0,
        newCreditScore: acc.creditScore?.score || 650,
        error: `Insufficient cash to settle all bills. Total: $${totalCost.toLocaleString()}, you have $${acc.wallet.toLocaleString()}.`,
      };
    }

    acc.wallet -= totalCost;
    acc.stats.totalSpent += totalCost;
    for (const b of pending) {
      b.isPaid = true;
    }

    if (!acc.creditScore) {
      acc.creditScore = { score: 650, rating: "FAIR", loansRepaid: 0, defaultsCount: 0, taxesPaid: 0 };
    }

    acc.creditScore.taxesPaid += pending.length;
    acc.creditScore.score = Math.min(850, acc.creditScore.score + 25);

    await this.bank.saveAccount(acc);

    return {
      success: true,
      paidCount: pending.length,
      totalAmountPaid: totalCost,
      newCreditScore: acc.creditScore.score,
    };
  }

  /**
   * Attempts high-risk offshore tax evasion to wipe pending wealth taxes.
   */
  public async attemptTaxEvasion(userId: string, guildId?: string): Promise<{
    success: boolean;
    taxesEvaded: number;
    penaltyFined: number;
    creditScoreChange: number;
    newCreditScore: number;
    auditDetails: string;
  }> {
    const acc = await this.bank.getAccount(userId, guildId);
    const wealthTaxBills = (acc.bills || []).filter((b) => !b.isPaid && b.type === "wealth_tax");

    if (wealthTaxBills.length === 0) {
      return {
        success: false,
        taxesEvaded: 0,
        penaltyFined: 0,
        creditScoreChange: 0,
        newCreditScore: acc.creditScore?.score || 650,
        auditDetails: "No active wealth tax bills to evade.",
      };
    }

    const totalTaxes = wealthTaxBills.reduce((sum, b) => sum + b.amount, 0);
    const roll = Math.random();

    // 40% success rate (Swiss vault tier boosts odds)
    const isSwissTier = (acc.bankTier || 1) >= 5;
    const successRate = isSwissTier ? 0.65 : 0.4;
    const isEvaded = roll < successRate;

    if (!acc.creditScore) {
      acc.creditScore = { score: 650, rating: "FAIR", loansRepaid: 0, defaultsCount: 0, taxesPaid: 0 };
    }

    if (isEvaded) {
      // Succeeded in routing funds through anonymous offshore trusts
      for (const b of wealthTaxBills) {
        b.isPaid = true;
      }
      await this.bank.saveAccount(acc);

      return {
        success: true,
        taxesEvaded: totalTaxes,
        penaltyFined: 0,
        creditScoreChange: 0,
        newCreditScore: acc.creditScore.score,
        auditDetails: `💼 **OFFSHORE SUCCESS!** Routed $${totalTaxes.toLocaleString()} through anonymous Swiss shell trusts. Taxes eliminated!`,
      };
    } else {
      // Busted by financial regulatory audit!
      const fine = Math.floor(totalTaxes * 2.2);
      acc.wallet = Math.max(0, acc.wallet - fine);
      acc.stats.totalSpent += fine;
      acc.creditScore.score = Math.max(300, acc.creditScore.score - 50);

      for (const b of wealthTaxBills) {
        b.isPaid = true;
      }
      await this.bank.saveAccount(acc);

      return {
        success: false,
        taxesEvaded: 0,
        penaltyFined: fine,
        creditScoreChange: -50,
        newCreditScore: acc.creditScore.score,
        auditDetails: `🚨 **IRS AUDIT TRIGGERED!** Regulators seized illicit ledgers. Fined 2.2x penalty of $${fine.toLocaleString()} and credit score penalized!`,
      };
    }
  }
}
