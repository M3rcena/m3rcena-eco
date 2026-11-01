/**
 * @m3rcena/eco
 * Stock & Cryptocurrency Exchange Simulation Engine.
 *
 * @copyright 2026 M3rcena Development. All rights reserved.
 * @license Apache-2.0
 */

import { BankManager } from "./BankManager.js";
import { StockConfig, UserStockPosition, StockTradeResult, StockMarketTrend } from "../types.js";

export const DEFAULT_STOCKS: StockConfig[] = [
  {
    symbol: "$AETH",
    name: "Aether AI Robotics",
    category: "TECH",
    basePrice: 145.5,
    currentPrice: 145.5,
    high24h: 152.0,
    low24h: 140.2,
    change24h: 3.75,
    history: [138, 140, 142, 141, 144, 145.5],
    volatility: 0.04,
    dividendYield: 0.02,
    description: "Next-gen neural AI processors and autonomous robotics.",
  },
  {
    symbol: "$NEXU",
    name: "Nexus Global Finance",
    category: "FINANCE",
    basePrice: 85.0,
    currentPrice: 85.0,
    high24h: 88.5,
    low24h: 83.0,
    change24h: 1.2,
    history: [82, 83, 84, 84.5, 85],
    volatility: 0.02,
    dividendYield: 0.04,
    description: "Interplanetary banking conglomerate and liquidity provider.",
  },
  {
    symbol: "$CORE",
    name: "DeepCore Asteroid Mining",
    category: "MINING",
    basePrice: 320.0,
    currentPrice: 320.0,
    high24h: 345.0,
    low24h: 298.0,
    change24h: -4.5,
    history: [340, 335, 330, 318, 320],
    volatility: 0.07,
    dividendYield: 0.03,
    description: "High-yield rare earth metal extraction from off-world asteroids.",
  },
  {
    symbol: "₿BIT",
    name: "BitCoin Core",
    category: "CRYPTO",
    basePrice: 64200.0,
    currentPrice: 64200.0,
    high24h: 68500.0,
    low24h: 62000.0,
    change24h: 6.8,
    history: [61000, 62500, 63800, 63100, 64200],
    volatility: 0.09,
    description: "Decentralized digital gold asset and store of cosmic value.",
  },
  {
    symbol: "ΞETH",
    name: "Ether Compute",
    category: "CRYPTO",
    basePrice: 3450.0,
    currentPrice: 3450.0,
    high24h: 3620.0,
    low24h: 3310.0,
    change24h: 2.1,
    history: [3300, 3380, 3420, 3400, 3450],
    volatility: 0.08,
    description: "Global decentralized smart contract compute platform.",
  },
];

export class StockMarketManager {
  private bank: BankManager;
  private stocks: Map<string, StockConfig> = new Map();
  private marketTrend: StockMarketTrend = "BULL";
  private lastTick: number = Date.now();

  constructor(bank: BankManager, initialStocks: StockConfig[] = DEFAULT_STOCKS) {
    this.bank = bank;
    for (const stock of initialStocks) {
      this.stocks.set(stock.symbol.toUpperCase(), { ...stock });
    }
  }

  public getStocks(): StockConfig[] {
    return Array.from(this.stocks.values());
  }

  public getStock(symbol: string): StockConfig | undefined {
    return this.stocks.get(symbol.toUpperCase());
  }

  public getMarketTrend(): StockMarketTrend {
    return this.marketTrend;
  }

  /**
   * Ticks the market forward, simulating realistic price fluctuations.
   */
  public tickMarket(): void {
    const trends: StockMarketTrend[] = ["BULL", "BEAR", "STABLE", "VOLATILE"];
    if (Math.random() < 0.15) {
      this.marketTrend = trends[Math.floor(Math.random() * trends.length)];
    }

    for (const [sym, stock] of this.stocks) {
      const vol = stock.volatility;
      let bias = 0;
      if (this.marketTrend === "BULL") bias = 0.015;
      else if (this.marketTrend === "BEAR") bias = -0.015;

      const deltaPct = (Math.random() * 2 - 1) * vol + bias;
      const oldPrice = stock.currentPrice;
      const newPrice = Math.max(1, parseFloat((oldPrice * (1 + deltaPct)).toFixed(2)));

      stock.currentPrice = newPrice;
      stock.high24h = Math.max(stock.high24h, newPrice);
      stock.low24h = Math.min(stock.low24h, newPrice);
      stock.change24h = parseFloat((((newPrice - stock.basePrice) / stock.basePrice) * 100).toFixed(2));

      stock.history.push(newPrice);
      if (stock.history.length > 20) stock.history.shift();
    }
    this.lastTick = Date.now();
  }

  /**
   * Purchases shares of a stock or cryptocurrency.
   */
  public async buyStock(userId: string, symbol: string, shares: number, guildId?: string): Promise<StockTradeResult> {
    const sym = symbol.toUpperCase();
    const stock = this.stocks.get(sym);
    if (!stock) {
      return { success: false, action: "BUY", symbol: sym, shares: 0, pricePerShare: 0, totalAmount: 0, userWallet: 0, sharesRemaining: 0, error: `Stock symbol "${sym}" not found.` };
    }

    if (shares <= 0 || isNaN(shares)) {
      return { success: false, action: "BUY", symbol: sym, shares: 0, pricePerShare: stock.currentPrice, totalAmount: 0, userWallet: 0, sharesRemaining: 0, error: "Shares must be greater than zero." };
    }

    const totalCost = parseFloat((stock.currentPrice * shares).toFixed(2));
    const account = await this.bank.getAccount(userId, guildId);

    if (account.wallet < totalCost) {
      return {
        success: false,
        action: "BUY",
        symbol: sym,
        shares,
        pricePerShare: stock.currentPrice,
        totalAmount: totalCost,
        userWallet: account.wallet,
        sharesRemaining: 0,
        error: `Insufficient cash in wallet. Need $${totalCost.toLocaleString()}, you have $${account.wallet.toLocaleString()}.`,
      };
    }

    // Deduct cost from wallet
    account.wallet -= totalCost;
    account.stats.totalSpent += totalCost;
    account.stats.stockTrades = (account.stats.stockTrades || 0) + 1;

    // Update stock position
    if (!account.stocks) account.stocks = [];
    let position = account.stocks.find((p) => p.symbol.toUpperCase() === sym);

    if (!position) {
      position = {
        symbol: sym,
        shares,
        totalInvested: totalCost,
        averageBuyPrice: stock.currentPrice,
        lastTradeTimestamp: Date.now(),
      };
      account.stocks.push(position);
    } else {
      const prevTotal = position.shares * position.averageBuyPrice;
      position.shares += shares;
      position.totalInvested += totalCost;
      position.averageBuyPrice = parseFloat(((prevTotal + totalCost) / position.shares).toFixed(2));
      position.lastTradeTimestamp = Date.now();
    }

    await this.bank.saveAccount(account);

    return {
      success: true,
      action: "BUY",
      symbol: sym,
      shares,
      pricePerShare: stock.currentPrice,
      totalAmount: totalCost,
      userWallet: account.wallet,
      sharesRemaining: position.shares,
    };
  }

  /**
   * Sells shares of an owned stock or cryptocurrency.
   */
  public async sellStock(userId: string, symbol: string, sharesToSell: number | "all", guildId?: string): Promise<StockTradeResult> {
    const sym = symbol.toUpperCase();
    const stock = this.stocks.get(sym);
    if (!stock) {
      return { success: false, action: "SELL", symbol: sym, shares: 0, pricePerShare: 0, totalAmount: 0, userWallet: 0, sharesRemaining: 0, error: `Stock symbol "${sym}" not found.` };
    }

    const account = await this.bank.getAccount(userId, guildId);
    if (!account.stocks) account.stocks = [];

    const position = account.stocks.find((p) => p.symbol.toUpperCase() === sym);
    if (!position || position.shares <= 0) {
      return { success: false, action: "SELL", symbol: sym, shares: 0, pricePerShare: stock.currentPrice, totalAmount: 0, userWallet: account.wallet, sharesRemaining: 0, error: `You do not own any shares of ${sym}.` };
    }

    const shares = sharesToSell === "all" ? position.shares : sharesToSell;
    if (shares <= 0 || isNaN(shares) || shares > position.shares) {
      return { success: false, action: "SELL", symbol: sym, shares: 0, pricePerShare: stock.currentPrice, totalAmount: 0, userWallet: account.wallet, sharesRemaining: position.shares, error: `Invalid share count. You only own ${position.shares} shares.` };
    }

    const grossPayout = parseFloat((stock.currentPrice * shares).toFixed(2));
    const costBasis = parseFloat((position.averageBuyPrice * shares).toFixed(2));
    const profitOrLoss = parseFloat((grossPayout - costBasis).toFixed(2));

    account.wallet += grossPayout;
    account.stats.totalEarned += grossPayout;
    account.stats.stockTrades = (account.stats.stockTrades || 0) + 1;

    position.shares -= shares;
    if (position.shares <= 0) {
      account.stocks = account.stocks.filter((p) => p.symbol.toUpperCase() !== sym);
    }

    await this.bank.saveAccount(account);

    return {
      success: true,
      action: "SELL",
      symbol: sym,
      shares,
      pricePerShare: stock.currentPrice,
      totalAmount: grossPayout,
      userWallet: account.wallet,
      sharesRemaining: position ? position.shares : 0,
      profitOrLoss,
    };
  }

  /**
   * Retrieves user portfolio valuation and positions.
   */
  public async getUserPortfolio(userId: string, guildId?: string) {
    const account = await this.bank.getAccount(userId, guildId);
    const positions = (account.stocks || []).map((pos) => {
      const stock = this.stocks.get(pos.symbol.toUpperCase());
      const currentPrice = stock ? stock.currentPrice : pos.averageBuyPrice;
      const currentValue = parseFloat((pos.shares * currentPrice).toFixed(2));
      const costBasis = parseFloat((pos.shares * pos.averageBuyPrice).toFixed(2));
      const pnl = parseFloat((currentValue - costBasis).toFixed(2));
      const pnlPct = costBasis > 0 ? parseFloat(((pnl / costBasis) * 100).toFixed(2)) : 0;

      return {
        symbol: pos.symbol,
        name: stock ? stock.name : pos.symbol,
        shares: pos.shares,
        averageBuyPrice: pos.averageBuyPrice,
        currentPrice,
        currentValue,
        profitOrLoss: pnl,
        profitOrLossPercentage: pnlPct,
      };
    });

    const totalPortfolioValue = positions.reduce((acc, p) => acc + p.currentValue, 0);
    return {
      userId,
      positions,
      totalPortfolioValue: parseFloat(totalPortfolioValue.toFixed(2)),
    };
  }
}

