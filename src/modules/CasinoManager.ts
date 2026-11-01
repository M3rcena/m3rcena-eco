/**
 * @m3rcena/eco
 * Casino & High-Stakes Gambling Engine.
 *
 * @copyright 2026 M3rcena Development. All rights reserved.
 * @license Apache-2.0
 */

import { BankManager } from "./BankManager.js";
import { ShopManager } from "./ShopManager.js";
import { CasinoBetResult } from "../types.js";

export interface Card {
  suit: "♠" | "♥" | "♦" | "♣";
  rank: string;
  value: number;
}

export interface BlackjackState {
  gameId: string;
  userId: string;
  guildId?: string;
  betAmount: number;
  deck: Card[];
  playerHand: Card[];
  dealerHand: Card[];
  status: "playing" | "player_bust" | "dealer_bust" | "player_win" | "dealer_win" | "push" | "blackjack";
  payout: number;
  finished: boolean;
}

export class CasinoManager {
  private bank: BankManager;
  private shop?: ShopManager;
  private activeBlackjackGames: Map<string, BlackjackState> = new Map();

  constructor(bank: BankManager, shop?: ShopManager) {
    this.bank = bank;
    this.shop = shop;
  }

  public setShopManager(shop: ShopManager): void {
    this.shop = shop;
  }

  /**
   * Helper to check for active luck boost effect.
   */
  private async getLuckBoost(userId: string, guildId?: string): Promise<number> {
    if (!this.shop) return 0;
    const hasLuck = await this.shop.hasActiveEffect(userId, "gamble_luck", guildId);
    return hasLuck ? 0.12 : 0; // +12% probability bonus
  }

  /**
   * Pre-bet validation & deduction.
   */
  private async prepareBet(
    userId: string,
    betAmount: number,
    guildId?: string
  ): Promise<{ valid: boolean; error?: string }> {
    if (betAmount <= 0) {
      return { valid: false, error: "Bet amount must be greater than zero." };
    }

    const acc = await this.bank.getAccount(userId, guildId);
    if (acc.wallet < betAmount) {
      return {
        valid: false,
        error: `Insufficient wallet funds! Your bet: ${betAmount.toLocaleString()}, Wallet: ${acc.wallet.toLocaleString()}.`,
      };
    }

    // Deduct bet from wallet
    acc.wallet -= betAmount;
    acc.stats.totalGambled += betAmount;
    await this.bank.saveAccount(acc);

    return { valid: true };
  }

  /**
   * Post-bet payout & stats recording.
   */
  private async finishBet(
    userId: string,
    payout: number,
    guildId?: string
  ): Promise<number> {
    const acc = await this.bank.getAccount(userId, guildId);
    if (payout > 0) {
      acc.wallet += payout;
      acc.stats.totalGambleWon += payout;
    }
    await this.bank.saveAccount(acc);
    return acc.wallet;
  }

  /* -------------------------------------------------------------------------- */
  /* COINFLIP                                                                  */
  /* -------------------------------------------------------------------------- */

  public async coinflip(
    userId: string,
    betAmount: number,
    choice: "heads" | "tails",
    guildId?: string
  ): Promise<CasinoBetResult> {
    const prep = await this.prepareBet(userId, betAmount, guildId);
    if (!prep.valid) {
      const acc = await this.bank.getAccount(userId, guildId);
      return {
        game: "coinflip",
        betAmount,
        outcome: "lose",
        payout: 0,
        profit: -betAmount,
        multiplier: 0,
        details: prep.error ?? "Invalid bet",
        finalWallet: acc.wallet,
      };
    }

    const luck = await this.getLuckBoost(userId, guildId);
    // Base 50/50 win chance, luck increases win chance to 62%
    const winProbability = 0.5 + luck;
    const isWin = Math.random() < winProbability;

    const landed: "heads" | "tails" = isWin
      ? choice
      : choice === "heads"
      ? "tails"
      : "heads";

    const payout = isWin ? betAmount * 2 : 0;
    const finalWallet = await this.finishBet(userId, payout, guildId);

    return {
      game: "coinflip",
      betAmount,
      outcome: isWin ? "win" : "lose",
      payout,
      profit: payout - betAmount,
      multiplier: isWin ? 2 : 0,
      details: isWin
        ? `🪙 Coin landed on **${landed.toUpperCase()}**! You called it correctly and doubled your bet!`
        : `🪙 Coin landed on **${landed.toUpperCase()}**. You called ${choice.toUpperCase()} and lost your bet.`,
      finalWallet,
    };
  }

  /* -------------------------------------------------------------------------- */
  /* DICE                                                                       */
  /* -------------------------------------------------------------------------- */

  public async dice(
    userId: string,
    betAmount: number,
    prediction: "high" | "low" | number,
    guildId?: string
  ): Promise<CasinoBetResult> {
    const prep = await this.prepareBet(userId, betAmount, guildId);
    if (!prep.valid) {
      const acc = await this.bank.getAccount(userId, guildId);
      return {
        game: "dice",
        betAmount,
        outcome: "lose",
        payout: 0,
        profit: -betAmount,
        multiplier: 0,
        details: prep.error ?? "Invalid bet",
        finalWallet: acc.wallet,
      };
    }

    const roll = Math.floor(Math.random() * 6) + 1;
    let won = false;
    let multiplier = 0;

    if (typeof prediction === "number") {
      won = roll === prediction;
      multiplier = won ? 6 : 0;
    } else if (prediction === "high") {
      won = roll >= 4;
      multiplier = won ? 2 : 0;
    } else {
      won = roll <= 3;
      multiplier = won ? 2 : 0;
    }

    const payout = won ? betAmount * multiplier : 0;
    const finalWallet = await this.finishBet(userId, payout, guildId);

    return {
      game: "dice",
      betAmount,
      outcome: won ? "win" : "lose",
      payout,
      profit: payout - betAmount,
      multiplier,
      details: won
        ? `🎲 The die rolled a **${roll}**! Your prediction (${prediction}) was spot on! Payout: ${payout.toLocaleString()}`
        : `🎲 The die rolled a **${roll}**. Your prediction (${prediction}) was incorrect.`,
      finalWallet,
    };
  }

  /* -------------------------------------------------------------------------- */
  /* SLOTS                                                                      */
  /* -------------------------------------------------------------------------- */

  public async slots(userId: string, betAmount: number, guildId?: string): Promise<CasinoBetResult> {
    const prep = await this.prepareBet(userId, betAmount, guildId);
    if (!prep.valid) {
      const acc = await this.bank.getAccount(userId, guildId);
      return {
        game: "slots",
        betAmount,
        outcome: "lose",
        payout: 0,
        profit: -betAmount,
        multiplier: 0,
        details: prep.error ?? "Invalid bet",
        finalWallet: acc.wallet,
      };
    }

    const symbols = ["🍒", "🍋", "🍇", "🔔", "⭐", "💎", "7️⃣"];
    const luck = await this.getLuckBoost(userId, guildId);

    // Roll reels
    const pickSymbol = () => symbols[Math.floor(Math.random() * symbols.length)];
    let r1 = pickSymbol();
    let r2 = pickSymbol();
    let r3 = pickSymbol();

    // With luck boost, bias second/third reel towards matching
    if (luck > 0 && Math.random() < luck) {
      r2 = r1;
      if (Math.random() < 0.4) {
        r3 = r1;
      }
    }

    let multiplier = 0;
    let outcome: "win" | "lose" = "lose";
    let detailMsg = `[ ${r1} | ${r2} | ${r3} ]`;

    if (r1 === r2 && r2 === r3) {
      outcome = "win";
      switch (r1) {
        case "7️⃣":
          multiplier = 50;
          detailMsg += " - 💥 TRIPLE SEVENS JACKPOT! (50x)";
          break;
        case "💎":
          multiplier = 30;
          detailMsg += " - 💎 DIAMOND EXTRAVAGANZA! (30x)";
          break;
        case "⭐":
          multiplier = 20;
          detailMsg += " - ⭐ SUPERNOVA MATCH! (20x)";
          break;
        case "🔔":
          multiplier = 10;
          detailMsg += " - 🔔 GOLDEN BELLS! (10x)";
          break;
        default:
          multiplier = 5;
          detailMsg += " - 🍇 FRUIT TRIPLET! (5x)";
      }
    } else if (r1 === r2 || r2 === r3 || r1 === r3) {
      outcome = "win";
      multiplier = 1.5;
      detailMsg += " - ✨ Double Match! (1.5x)";
    } else {
      detailMsg += " - No match. Better luck next spin!";
    }

    const payout = Math.floor(betAmount * multiplier);
    const finalWallet = await this.finishBet(userId, payout, guildId);

    return {
      game: "slots",
      betAmount,
      outcome,
      payout,
      profit: payout - betAmount,
      multiplier,
      details: detailMsg,
      finalWallet,
    };
  }

  /* -------------------------------------------------------------------------- */
  /* ROULETTE                                                                   */
  /* -------------------------------------------------------------------------- */

  public async roulette(
    userId: string,
    betAmount: number,
    betType: "red" | "black" | "green" | "even" | "odd" | number,
    guildId?: string
  ): Promise<CasinoBetResult> {
    const prep = await this.prepareBet(userId, betAmount, guildId);
    if (!prep.valid) {
      const acc = await this.bank.getAccount(userId, guildId);
      return {
        game: "roulette",
        betAmount,
        outcome: "lose",
        payout: 0,
        profit: -betAmount,
        multiplier: 0,
        details: prep.error ?? "Invalid bet",
        finalWallet: acc.wallet,
      };
    }

    // Numbers 0 to 36
    const redNumbers = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36];
    const landedNumber = Math.floor(Math.random() * 37);

    let landedColor: "green" | "red" | "black" = "black";
    if (landedNumber === 0) {
      landedColor = "green";
    } else if (redNumbers.includes(landedNumber)) {
      landedColor = "red";
    }

    let won = false;
    let multiplier = 0;

    if (typeof betType === "number") {
      won = landedNumber === betType;
      multiplier = won ? 36 : 0;
    } else if (betType === "green") {
      won = landedNumber === 0;
      multiplier = won ? 36 : 0;
    } else if (betType === "red" || betType === "black") {
      won = landedColor === betType;
      multiplier = won ? 2 : 0;
    } else if (betType === "even") {
      won = landedNumber > 0 && landedNumber % 2 === 0;
      multiplier = won ? 2 : 0;
    } else if (betType === "odd") {
      won = landedNumber > 0 && landedNumber % 2 !== 0;
      multiplier = won ? 2 : 0;
    }

    const payout = won ? betAmount * multiplier : 0;
    const finalWallet = await this.finishBet(userId, payout, guildId);

    const colorEmoji = landedColor === "red" ? "🔴" : landedColor === "black" ? "⚫" : "🟢";
    const details = won
      ? `🎡 Roulette ball stopped at ${colorEmoji} **${landedNumber} (${landedColor.toUpperCase()})**! Your bet on ${betType} won ${payout.toLocaleString()}!`
      : `🎡 Roulette ball stopped at ${colorEmoji} **${landedNumber} (${landedColor.toUpperCase()})**. You lost your bet on ${betType}.`;

    return {
      game: "roulette",
      betAmount,
      outcome: won ? "win" : "lose",
      payout,
      profit: payout - betAmount,
      multiplier,
      details,
      finalWallet,
    };
  }

  /* -------------------------------------------------------------------------- */
  /* CRASH                                                                      */
  /* -------------------------------------------------------------------------- */

  public async crash(
    userId: string,
    betAmount: number,
    targetMultiplier: number,
    guildId?: string
  ): Promise<CasinoBetResult> {
    if (targetMultiplier < 1.01) {
      const acc = await this.bank.getAccount(userId, guildId);
      return {
        game: "crash",
        betAmount,
        outcome: "lose",
        payout: 0,
        profit: -betAmount,
        multiplier: 0,
        details: "Target multiplier must be at least 1.01x.",
        finalWallet: acc.wallet,
      };
    }

    const prep = await this.prepareBet(userId, betAmount, guildId);
    if (!prep.valid) {
      const acc = await this.bank.getAccount(userId, guildId);
      return {
        game: "crash",
        betAmount,
        outcome: "lose",
        payout: 0,
        profit: -betAmount,
        multiplier: 0,
        details: prep.error ?? "Invalid bet",
        finalWallet: acc.wallet,
      };
    }

    // House edge ~ 4%
    const rand = Math.random();
    let crashPoint = 1.0;
    if (rand >= 0.04) {
      // Exponential decay
      crashPoint = Math.floor((0.96 / (1 - rand)) * 100) / 100;
      crashPoint = Math.max(1.0, crashPoint);
    }

    const won = targetMultiplier <= crashPoint;
    const multiplier = won ? targetMultiplier : 0;
    const payout = won ? Math.floor(betAmount * targetMultiplier) : 0;
    const finalWallet = await this.finishBet(userId, payout, guildId);

    const details = won
      ? `🚀 Rocket flew up to **${crashPoint.toFixed(2)}x**! You safely cashed out at **${targetMultiplier.toFixed(2)}x**! Won: ${payout.toLocaleString()}`
      : `💥 CRASH! Rocket exploded at **${crashPoint.toFixed(2)}x** before reaching your target of **${targetMultiplier.toFixed(2)}x**!`;

    return {
      game: "crash",
      betAmount,
      outcome: won ? "win" : "lose",
      payout,
      profit: payout - betAmount,
      multiplier,
      details,
      finalWallet,
    };
  }

  /* -------------------------------------------------------------------------- */
  /* BLACKJACK ENGINE & SESSIONS                                                */
  /* -------------------------------------------------------------------------- */

  private buildDeck(): Card[] {
    const suits: Array<Card["suit"]> = ["♠", "♥", "♦", "♣"];
    const ranks = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"];
    const deck: Card[] = [];

    for (const suit of suits) {
      for (const rank of ranks) {
        let value = parseInt(rank, 10);
        if (["J", "Q", "K"].includes(rank)) value = 10;
        if (rank === "A") value = 11;
        deck.push({ suit, rank, value });
      }
    }

    // Fisher-Yates Shuffle
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }

    return deck;
  }

  public calculateHand(hand: Card[]): { total: number; isSoft: boolean; isBust: boolean; isBlackjack: boolean } {
    let total = 0;
    let aces = 0;

    for (const card of hand) {
      total += card.value;
      if (card.rank === "A") aces += 1;
    }

    while (total > 21 && aces > 0) {
      total -= 10;
      aces -= 1;
    }

    const isSoft = aces > 0;
    const isBust = total > 21;
    const isBlackjack = hand.length === 2 && total === 21;

    return { total, isSoft, isBust, isBlackjack };
  }

  /**
   * Starts an interactive Blackjack game session.
   */
  public async startBlackjackGame(
    userId: string,
    betAmount: number,
    guildId?: string
  ): Promise<BlackjackState> {
    const prep = await this.prepareBet(userId, betAmount, guildId);
    if (!prep.valid) {
      throw new Error(prep.error ?? "Invalid bet");
    }

    const deck = this.buildDeck();
    const playerHand = [deck.pop()!, deck.pop()!];
    const dealerHand = [deck.pop()!, deck.pop()!];

    const pCalc = this.calculateHand(playerHand);
    const dCalc = this.calculateHand(dealerHand);

    const gameId = `bj_${userId}_${Date.now()}`;
    const state: BlackjackState = {
      gameId,
      userId,
      guildId,
      betAmount,
      deck,
      playerHand,
      dealerHand,
      status: "playing",
      payout: 0,
      finished: false,
    };

    // Check immediate blackjacks
    if (pCalc.isBlackjack && dCalc.isBlackjack) {
      state.status = "push";
      state.payout = betAmount;
      state.finished = true;
      await this.finishBet(userId, state.payout, guildId);
    } else if (pCalc.isBlackjack) {
      state.status = "blackjack";
      state.payout = Math.floor(betAmount * 2.5); // 3:2 payout
      state.finished = true;
      await this.finishBet(userId, state.payout, guildId);
    } else if (dCalc.isBlackjack) {
      state.status = "dealer_win";
      state.payout = 0;
      state.finished = true;
      await this.finishBet(userId, 0, guildId);
    }

    if (!state.finished) {
      this.activeBlackjackGames.set(gameId, state);
    }

    return state;
  }

  /**
   * Player draws a card ("hit").
   */
  public async blackjackHit(gameId: string): Promise<BlackjackState> {
    const game = this.activeBlackjackGames.get(gameId);
    if (!game || game.finished) {
      throw new Error("Active Blackjack game not found.");
    }

    game.playerHand.push(game.deck.pop()!);
    const pCalc = this.calculateHand(game.playerHand);

    if (pCalc.isBust) {
      game.status = "player_bust";
      game.payout = 0;
      game.finished = true;
      this.activeBlackjackGames.delete(gameId);
      await this.finishBet(game.userId, 0, game.guildId);
    } else if (pCalc.total === 21) {
      // Auto stand on 21
      return this.blackjackStand(gameId);
    }

    return game;
  }

  /**
   * Player stands. Dealer resolves their hand according to standard casino rules (dealer hits until >= 17).
   */
  public async blackjackStand(gameId: string): Promise<BlackjackState> {
    const game = this.activeBlackjackGames.get(gameId);
    if (!game || game.finished) {
      throw new Error("Active Blackjack game not found.");
    }

    const pCalc = this.calculateHand(game.playerHand);
    let dCalc = this.calculateHand(game.dealerHand);

    // Dealer hits on soft/hard < 17
    while (dCalc.total < 17) {
      game.dealerHand.push(game.deck.pop()!);
      dCalc = this.calculateHand(game.dealerHand);
    }

    game.finished = true;
    this.activeBlackjackGames.delete(gameId);

    if (dCalc.isBust) {
      game.status = "dealer_bust";
      game.payout = game.betAmount * 2;
    } else if (pCalc.total > dCalc.total) {
      game.status = "player_win";
      game.payout = game.betAmount * 2;
    } else if (pCalc.total < dCalc.total) {
      game.status = "dealer_win";
      game.payout = 0;
    } else {
      game.status = "push";
      game.payout = game.betAmount;
    }

    await this.finishBet(game.userId, game.payout, game.guildId);
    return game;
  }

  /**
   * Double down: doubles bet, receives exactly one card, and automatically stands.
   */
  public async blackjackDouble(gameId: string): Promise<BlackjackState> {
    const game = this.activeBlackjackGames.get(gameId);
    if (!game || game.finished) {
      throw new Error("Active Blackjack game not found.");
    }

    // Must have enough wallet to double the original bet
    const extraPrep = await this.prepareBet(game.userId, game.betAmount, game.guildId);
    if (!extraPrep.valid) {
      throw new Error(`Cannot double down: ${extraPrep.error}`);
    }

    game.betAmount *= 2;
    game.playerHand.push(game.deck.pop()!);
    const pCalc = this.calculateHand(game.playerHand);

    if (pCalc.isBust) {
      game.status = "player_bust";
      game.payout = 0;
      game.finished = true;
      this.activeBlackjackGames.delete(gameId);
      await this.finishBet(game.userId, 0, game.guildId);
      return game;
    }

    return this.blackjackStand(gameId);
  }

  public getActiveBlackjackGame(gameId: string): BlackjackState | undefined {
    return this.activeBlackjackGames.get(gameId);
  }
}

