/**
 * @m3rcena/eco
 * Economy Bridge Package Router & Decoupled State Gateway.
 * Provides unified HTTP endpoints and WebSocket routing for real-time account dossiers,
 * bank vault upgrades, credit score management, loan issuance, bill settlement,
 * stock market trading, and custom visual Canvas card rendering.
 *
 * @copyright 2026 M3rcena Development. All rights reserved.
 * @license Apache-2.0
 */

import { BridgePackageRouter, BridgeRequest, BridgeResponse, BridgeAction } from "@m3rcena/bridge";
import { EcoManager } from "../EcoManager.js";
import { RenderBankCard } from "../canvas/RenderBankCard.js";
import { RenderMarketChart } from "../canvas/RenderMarketChart.js";
import { LoanTier } from "../types.js";
import { ECO_VERSION } from "../utils/Notifier.js";

export class EcoBridgeRouter implements BridgePackageRouter {
  public name: string = "economy";
  public basePath: string = "/api/eco";
  public description: string = "Universal economy engine, financial banking, loans, taxes, stock market, and debit card rendering.";
  public version: string = ECO_VERSION;
  private eco: EcoManager;

  constructor(eco: EcoManager) {
    this.eco = eco;
  }

  public async handleRequest(req: BridgeRequest): Promise<BridgeResponse | null> {
    const path = req.subPath.replace(/\/+$/, "") || "/";
    const method = req.method.toUpperCase();

    // 1. GET /account/:userId - Full Financial Dossier
    if (path.startsWith("/account/") && method === "GET") {
      const userId = path.replace("/account/", "").split("/")[0];
      const guildId = (req.query.guildId as string) || undefined;

      try {
        const acc = await this.eco.getAccount(userId, guildId);
        const credit = await this.eco.getCreditScore(userId, guildId);
        const vault = await this.eco.getUserVault(userId, guildId);
        const loans = await this.eco.getUserLoans(userId, guildId);
        const bills = await this.eco.getPendingBills(userId, guildId);
        const portfolio = await this.eco.getStockPortfolio(userId, guildId);

        return {
          status: 200,
          body: {
            userId: acc.userId,
            wallet: acc.wallet,
            bank: acc.bank,
            bankCapacity: acc.bankCapacity,
            netWorth: acc.wallet + acc.bank,
            level: acc.level,
            xp: acc.xp,
            streak: acc.streak?.daily || 0,
            vault,
            creditScore: credit,
            loans,
            bills,
            portfolio,
            businesses: acc.businesses || [],
            inventory: acc.inventory || [],
            pets: acc.pets || [],
          },
        };
      } catch (err: any) {
        return { status: 500, body: { error: err.message } };
      }
    }

    // 2. POST /vault/upgrade - Upgrade Bank Vault
    if (path === "/vault/upgrade" && method === "POST") {
      const { userId, guildId } = req.body || {};
      if (!userId) return { status: 400, body: { error: "Missing userId" } };

      const res = await this.eco.upgradeVault(userId, guildId);
      return { status: res.success ? 200 : 400, body: res };
    }

    // 3. POST /vault/interest - Claim Daily Interest
    if (path === "/vault/interest" && method === "POST") {
      const { userId, guildId } = req.body || {};
      if (!userId) return { status: 400, body: { error: "Missing userId" } };

      const res = await this.eco.claimDailyInterest(userId, guildId);
      return { status: res.success ? 200 : 400, body: res };
    }

    // 4. GET /loans/offers - Loan Catalog
    if (path === "/loans/offers" && method === "GET") {
      const offers = this.eco.loans ? this.eco.loans.getOffers() : [];
      return { status: 200, body: { offers } };
    }

    // 5. POST /loans/apply - Apply for Loan
    if (path === "/loans/apply" && method === "POST") {
      const { userId, tier, guildId } = req.body || {};
      if (!userId || !tier) return { status: 400, body: { error: "Missing userId or tier" } };

      const res = await this.eco.applyLoan(userId, tier as LoanTier, guildId);
      return { status: res.success ? 200 : 400, body: res };
    }

    // 6. POST /loans/repay - Repay Debt
    if (path === "/loans/repay" && method === "POST") {
      const { userId, loanId, amount, guildId } = req.body || {};
      if (!userId) return { status: 400, body: { error: "Missing userId" } };

      let targetLoanId = loanId;
      if (!targetLoanId) {
        const userLoans = await this.eco.getUserLoans(userId, guildId);
        const active = userLoans.find((l) => l.status === "active");
        if (active) targetLoanId = active.id;
      }
      if (!targetLoanId) return { status: 400, body: { error: "No active loan found to repay" } };

      const res = await this.eco.repayLoan(userId, targetLoanId, amount || "all", guildId);
      return { status: res.success ? 200 : 400, body: res };
    }

    // 7. GET /bills/:userId - Pending Bills
    if (path.startsWith("/bills/") && method === "GET") {
      const userId = path.replace("/bills/", "").split("/")[0];
      const guildId = (req.query.guildId as string) || undefined;
      const bills = await this.eco.getPendingBills(userId, guildId);
      return { status: 200, body: { bills } };
    }

    // 8. POST /bills/pay - Settle Bills
    if (path === "/bills/pay" && method === "POST") {
      const { userId, billId, payAll, guildId } = req.body || {};
      if (!userId) return { status: 400, body: { error: "Missing userId" } };

      if (payAll) {
        const res = await this.eco.payAllBills(userId, guildId);
        return { status: res.success ? 200 : 400, body: res };
      }

      if (billId) {
        const res = await this.eco.payBill(userId, billId, guildId);
        return { status: res.success ? 200 : 400, body: res };
      }

      return { status: 400, body: { error: "Provide either billId or payAll: true" } };
    }

    // 9. GET /stocks - Active Market Tickers
    if (path === "/stocks" && method === "GET") {
      const stocks = this.eco.getStocks();
      const trend = this.eco.stocks ? this.eco.stocks.getMarketTrend() : "STABLE";
      return { status: 200, body: { trend, stocks } };
    }

    // 10. POST /stocks/trade - Execute Buy / Sell Order
    if (path === "/stocks/trade" && method === "POST") {
      const { userId, symbol, action, shares, guildId } = req.body || {};
      if (!userId || !symbol || !action || !shares) {
        return { status: 400, body: { error: "Missing userId, symbol, action (BUY/SELL), or shares" } };
      }

      if (action.toUpperCase() === "BUY") {
        const res = await this.eco.buyStock(userId, symbol, parseInt(shares, 10), guildId);
        return { status: res.success ? 200 : 400, body: res };
      } else {
        const res = await this.eco.sellStock(userId, symbol, parseInt(shares, 10), guildId);
        return { status: res.success ? 200 : 400, body: res };
      }
    }

    // 11. GET /cards/debit/:userId - Visual Canvas Debit Card Buffer
    if (path.startsWith("/cards/debit/") && method === "GET") {
      const userId = path.replace("/cards/debit/", "").split("/")[0];
      const guildId = (req.query.guildId as string) || undefined;

      try {
        const acc = await this.eco.getAccount(userId, guildId);
        const credit = await this.eco.getCreditScore(userId, guildId);
        const vault = await this.eco.getUserVault(userId, guildId);

        let customGradient: [string, string, string] | undefined = undefined;
        if (req.query.gradient) {
          const stops = (req.query.gradient as string).split(",");
          if (stops.length === 3) {
            customGradient = [stops[0].trim(), stops[1].trim(), stops[2].trim()];
          }
        }

        const cardBuffer = await RenderBankCard.renderCard({
          username: (req.query.username as string) || acc.userId,
          avatarUrl: (req.query.avatarUrl as string) || undefined,
          wallet: acc.wallet,
          bank: acc.bank,
          netWorth: acc.wallet + acc.bank,
          currencySymbol: this.eco.currencySymbol,
          cardTier: (req.query.tier as any) || undefined,
          creditScore: credit.score,
          vaultTierName: vault.currentTier.name,
          customGradient,
          bankName: (req.query.bankName as string) || undefined,
        });

        return {
          status: 200,
          body: cardBuffer,
          isBuffer: true,
          contentType: "image/png",
        };
      } catch (err: any) {
        return { status: 500, body: { error: `Failed to render debit card: ${err.message}` } };
      }
    }

    // 12. GET /cards/chart/:symbol - Visual Market Chart Buffer
    if (path.startsWith("/cards/chart/") && method === "GET") {
      const rawSymbol = decodeURIComponent(path.replace("/cards/chart/", "").split("/")[0]).toUpperCase();
      const stock = this.eco.getStock(rawSymbol) || this.eco.getStock(`$${rawSymbol.replace(/^\$/, "")}`);
      if (!stock) {
        return { status: 404, body: { error: `Stock symbol "${rawSymbol}" not found.` } };
      }

      try {
        const chartBuffer = await RenderMarketChart.renderChart({
          symbol: stock.symbol,
          name: stock.name,
          currentPrice: stock.currentPrice,
          change24h: stock.change24h,
          history: stock.history,
        });

        return {
          status: 200,
          body: chartBuffer,
          isBuffer: true,
          contentType: "image/png",
        };
      } catch (err: any) {
        return { status: 500, body: { error: `Failed to render market chart: ${err.message}` } };
      }
    }

    // 13. GET /leaderboard - Leaderboard Ranks
    if (path === "/leaderboard" && method === "GET") {
      const metric = (req.query.metric as any) || "net_worth";
      const limit = parseInt((req.query.limit as string) || "10", 10);
      const entries = await this.eco.getLeaderboard(metric, limit);
      return { status: 200, body: { metric, entries } };
    }

    return null;
  }

  public async handleAction(action: BridgeAction): Promise<any> {
    if (action.action === "wallet:add") {
      return this.eco.addWallet(action.playerId, action.payload?.amount || 0);
    }
    if (action.action === "stock:buy") {
      return this.eco.buyStock(action.playerId, action.payload?.symbol, action.payload?.shares || 1);
    }
    if (action.action === "vault:upgrade") {
      return this.eco.upgradeVault(action.playerId);
    }
    return { success: true };
  }
}
