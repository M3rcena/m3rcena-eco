/**
 * @m3rcena/eco
 * Shop, Inventory & Consumable Buff Items System.
 *
 * @copyright 2026 M3rcena Development. All rights reserved.
 * @license Apache-2.0
 */

import { BankManager } from "./BankManager.js";
import { ActiveEffect, InventoryItem, ShopItem } from "../types.js";

export const DEFAULT_SHOP_ITEMS: ShopItem[] = [
  {
    id: "padlock",
    name: "Titanium Padlock",
    description: "Equips a high-security lock to your wallet. Automatically blocks the next robbery attempt!",
    price: 1500,
    category: "tool",
    consumable: true,
    usableEffect: "shield",
    effectDurationMs: 24 * 60 * 60 * 1000, // 24 hours
    resaleValue: 750,
  },
  {
    id: "energy_drink",
    name: "Cyber Caffeine Overdrive",
    description: "Instant caffeine rush! Immediately resets your work shift cooldown.",
    price: 800,
    category: "consumable",
    consumable: true,
    usableEffect: "cooldown_reset",
    resaleValue: 400,
  },
  {
    id: "lucky_coin",
    name: "Enchanted Gold Coin",
    description: "A mystical coin favored by fortune. Grants +15% casino winning probability for 1 hour.",
    price: 2500,
    category: "consumable",
    consumable: true,
    usableEffect: "gamble_luck",
    effectDurationMs: 60 * 60 * 1000, // 1 hour
    resaleValue: 1200,
  },
  {
    id: "xp_potion",
    name: "Elixir of Knowledge",
    description: "Ancient brew that accelerates learning. Doubles all XP gains for 2 hours.",
    price: 2000,
    category: "consumable",
    consumable: true,
    usableEffect: "xp_boost",
    effectDurationMs: 2 * 60 * 60 * 1000, // 2 hours
    resaleValue: 1000,
  },
  {
    id: "bank_vault_key",
    name: "Swiss Vault Key",
    description: "Upgrades your safe deposit box, permanently expanding your bank capacity by +25,000.",
    price: 15000,
    category: "upgrade",
    consumable: true,
    usableEffect: "bank_capacity",
    effectMagnitude: 25000,
    resaleValue: 8000,
  },
  {
    id: "lottery_ticket",
    name: "Mega Millions Scratch Ticket",
    description: "Scratch to win! Offers a chance to win up to 50,000 cash.",
    price: 500,
    category: "consumable",
    consumable: true,
    usableEffect: "lottery",
    resaleValue: 100,
  },
  {
    id: "gold_watch",
    name: "Rolex Submariner Gold",
    description: "A luxury timepiece that exudes status and class.",
    price: 12000,
    category: "collectible",
    consumable: false,
    resaleValue: 9500,
  },
  {
    id: "diamond_trophy",
    name: "Championship Diamond Trophy",
    description: "A solid diamond trophy celebrating legendary wealth.",
    price: 50000,
    category: "collectible",
    consumable: false,
    resaleValue: 42000,
  },
];

export class ShopManager {
  private bank: BankManager;
  private items: Map<string, ShopItem> = new Map();

  constructor(bank: BankManager, initialItems: ShopItem[] = DEFAULT_SHOP_ITEMS) {
    this.bank = bank;
    for (const item of initialItems) {
      this.items.set(item.id, item);
    }
  }

  /**
   * Returns all items currently in the shop.
   */
  public getItems(): ShopItem[] {
    return Array.from(this.items.values());
  }

  /**
   * Retrieves an item by ID.
   */
  public getItem(itemId: string): ShopItem | undefined {
    return this.items.get(itemId);
  }

  /**
   * Registers a new item or updates an existing one in the shop catalog.
   */
  public registerItem(item: ShopItem): void {
    this.items.set(item.id, item);
  }

  /**
   * Cleans expired effects from an account.
   */
  private cleanExpiredEffects(effects: ActiveEffect[]): ActiveEffect[] {
    const now = Date.now();
    return effects.filter((e) => e.expiresAt > now);
  }

  /**
   * Purchases one or more units of an item.
   */
  public async buy(
    userId: string,
    itemId: string,
    quantity: number = 1,
    guildId?: string
  ): Promise<{
    success: boolean;
    item?: ShopItem;
    quantity: number;
    totalCost: number;
    newWallet: number;
    error?: string;
  }> {
    if (quantity <= 0) {
      return { success: false, quantity, totalCost: 0, newWallet: 0, error: "Quantity must be greater than zero." };
    }

    const item = this.items.get(itemId);
    if (!item) {
      return { success: false, quantity, totalCost: 0, newWallet: 0, error: `Item "${itemId}" not found in the shop.` };
    }

    const acc = await this.bank.getAccount(userId, guildId);
    const totalCost = item.price * quantity;

    if (acc.wallet < totalCost) {
      return {
        success: false,
        item,
        quantity,
        totalCost,
        newWallet: acc.wallet,
        error: `Insufficient funds in your wallet! Needed: ${totalCost}, Available: ${acc.wallet}.`,
      };
    }

    // Deduct wallet
    acc.wallet -= totalCost;
    acc.stats.totalSpent += totalCost;
    acc.stats.itemsBought += quantity;

    // Add to inventory
    const existing = acc.inventory.find((i) => i.itemId === item.id);
    if (existing) {
      existing.quantity += quantity;
    } else {
      acc.inventory.push({
        id: `${item.id}_${Date.now()}`,
        itemId: item.id,
        name: item.name,
        description: item.description,
        quantity,
        category: item.category,
        acquiredAt: Date.now(),
      });
    }

    await this.bank.saveAccount(acc);

    return {
      success: true,
      item,
      quantity,
      totalCost,
      newWallet: acc.wallet,
    };
  }

  /**
   * Sells an item from inventory back to the store.
   */
  public async sell(
    userId: string,
    itemId: string,
    quantity: number = 1,
    guildId?: string
  ): Promise<{
    success: boolean;
    item?: ShopItem;
    quantity: number;
    earned: number;
    newWallet: number;
    error?: string;
  }> {
    if (quantity <= 0) {
      return { success: false, quantity, earned: 0, newWallet: 0, error: "Quantity must be greater than zero." };
    }

    const acc = await this.bank.getAccount(userId, guildId);
    const invIndex = acc.inventory.findIndex((i) => i.itemId === itemId);
    if (invIndex === -1 || acc.inventory[invIndex].quantity < quantity) {
      const owned = invIndex !== -1 ? acc.inventory[invIndex].quantity : 0;
      return {
        success: false,
        quantity,
        earned: 0,
        newWallet: acc.wallet,
        error: `You do not own ${quantity}x of this item (owned: ${owned}).`,
      };
    }

    const shopItem = this.items.get(itemId);
    const unitPrice = shopItem?.resaleValue ?? (shopItem ? Math.floor(shopItem.price * 0.6) : 100);
    const totalEarned = unitPrice * quantity;

    // Deduct from inventory
    acc.inventory[invIndex].quantity -= quantity;
    if (acc.inventory[invIndex].quantity <= 0) {
      acc.inventory.splice(invIndex, 1);
    }

    acc.wallet += totalEarned;
    acc.stats.totalEarned += totalEarned;

    await this.bank.saveAccount(acc);

    return {
      success: true,
      item: shopItem,
      quantity,
      earned: totalEarned,
      newWallet: acc.wallet,
    };
  }

  /**
   * Uses/consumes an item from the user's inventory.
   */
  public async use(
    userId: string,
    itemId: string,
    guildId?: string
  ): Promise<{
    success: boolean;
    message: string;
    item?: ShopItem;
    effect?: ActiveEffect;
    lotteryWon?: number;
    error?: string;
  }> {
    const acc = await this.bank.getAccount(userId, guildId);
    const invIndex = acc.inventory.findIndex((i) => i.itemId === itemId);
    if (invIndex === -1 || acc.inventory[invIndex].quantity <= 0) {
      return { success: false, message: "", error: "You do not have this item in your inventory." };
    }

    const shopItem = this.items.get(itemId);
    if (!shopItem || !shopItem.consumable) {
      return { success: false, message: "", error: "This item cannot be consumed or used directly." };
    }

    // Deduct 1 unit from inventory
    acc.inventory[invIndex].quantity -= 1;
    if (acc.inventory[invIndex].quantity <= 0) {
      acc.inventory.splice(invIndex, 1);
    }

    // Clean expired effects first
    acc.activeEffects = this.cleanExpiredEffects(acc.activeEffects);

    let message = `You used ${shopItem.name}.`;
    let activeEffect: ActiveEffect | undefined;
    let lotteryWon: number | undefined;

    switch (shopItem.usableEffect) {
      case "shield": {
        const duration = shopItem.effectDurationMs ?? 24 * 60 * 60 * 1000;
        activeEffect = {
          id: `shield_${Date.now()}`,
          name: "Titanium Shield",
          type: "shield",
          magnitude: 1,
          expiresAt: Date.now() + duration,
        };
        // Replace any existing shield
        acc.activeEffects = acc.activeEffects.filter((e) => e.type !== "shield");
        acc.activeEffects.push(activeEffect);
        message = `🛡️ ${shopItem.name} activated! Your wallet is protected from the next robbery attempt for 24 hours.`;
        break;
      }

      case "cooldown_reset": {
        acc.streak.lastWork = undefined;
        message = `⚡ ${shopItem.name} consumed! Your work shift cooldown has been completely reset. You can work now!`;
        break;
      }

      case "gamble_luck": {
        const duration = shopItem.effectDurationMs ?? 60 * 60 * 1000;
        activeEffect = {
          id: `luck_${Date.now()}`,
          name: "Lady Luck's Favor",
          type: "gamble_luck",
          magnitude: 15,
          expiresAt: Date.now() + duration,
        };
        acc.activeEffects = acc.activeEffects.filter((e) => e.type !== "gamble_luck");
        acc.activeEffects.push(activeEffect);
        message = `🍀 ${shopItem.name} activated! You have +15% enhanced luck at the casino for the next hour!`;
        break;
      }

      case "xp_boost": {
        const duration = shopItem.effectDurationMs ?? 2 * 60 * 60 * 1000;
        activeEffect = {
          id: `xp_${Date.now()}`,
          name: "Double XP Elixir",
          type: "xp_boost",
          magnitude: 2,
          expiresAt: Date.now() + duration,
        };
        acc.activeEffects = acc.activeEffects.filter((e) => e.type !== "xp_boost");
        acc.activeEffects.push(activeEffect);
        message = `✨ ${shopItem.name} activated! You will receive 2x XP from all jobs and activities for 2 hours!`;
        break;
      }

      case "bank_capacity": {
        const increase = shopItem.effectMagnitude ?? 25000;
        acc.bankCapacity += increase;
        message = `🔑 ${shopItem.name} used! Your bank capacity has been permanently increased by +${increase.toLocaleString()}! New Capacity: ${acc.bankCapacity.toLocaleString()}.`;
        break;
      }

      case "lottery": {
        // Roll lottery: 40% win nothing, 35% win small (200-1,000), 20% win medium (2,500-10,000), 5% jackpot (25,000-50,000)
        const roll = Math.random() * 100;
        if (roll < 40) {
          lotteryWon = 0;
          message = `🎫 You scratched the ticket... Unfortunately, it was a blank! Better luck next time!`;
        } else if (roll < 75) {
          lotteryWon = Math.floor(Math.random() * 800) + 200;
          acc.wallet += lotteryWon;
          acc.stats.totalEarned += lotteryWon;
          message = `🎫 Winning ticket! You won ${lotteryWon.toLocaleString()} in cash!`;
        } else if (roll < 95) {
          lotteryWon = Math.floor(Math.random() * 7500) + 2500;
          acc.wallet += lotteryWon;
          acc.stats.totalEarned += lotteryWon;
          message = `🎉 Big Win! You matched 3 lucky stars and won ${lotteryWon.toLocaleString()}!`;
        } else {
          lotteryWon = Math.floor(Math.random() * 25000) + 25000;
          acc.wallet += lotteryWon;
          acc.stats.totalEarned += lotteryWon;
          message = `💎 💥 JACKPOT! You scratched off the GRAND PRIZE of ${lotteryWon.toLocaleString()}!`;
        }
        break;
      }

      default:
        message = `You used ${shopItem.name}.`;
    }

    await this.bank.saveAccount(acc);

    return {
      success: true,
      message,
      item: shopItem,
      effect: activeEffect,
      lotteryWon,
    };
  }

  /**
   * Retrieves active, unexpired effects for a user.
   */
  public async getActiveEffects(userId: string, guildId?: string): Promise<ActiveEffect[]> {
    const acc = await this.bank.getAccount(userId, guildId);
    acc.activeEffects = this.cleanExpiredEffects(acc.activeEffects);
    return acc.activeEffects;
  }

  /**
   * Checks if a user has a specific effect active.
   */
  public async hasActiveEffect(userId: string, effectType: string, guildId?: string): Promise<boolean> {
    const active = await this.getActiveEffects(userId, guildId);
    return active.some((e) => e.type === effectType);
  }

  /**
   * Consumes an active effect (e.g. shield is spent when blocking robbery).
   */
  public async consumeActiveEffect(userId: string, effectType: string, guildId?: string): Promise<boolean> {
    const acc = await this.bank.getAccount(userId, guildId);
    acc.activeEffects = this.cleanExpiredEffects(acc.activeEffects);
    const idx = acc.activeEffects.findIndex((e) => e.type === effectType);
    if (idx !== -1) {
      acc.activeEffects.splice(idx, 1);
      await this.bank.saveAccount(acc);
      return true;
    }
    return false;
  }

  /**
   * Returns a user's inventory.
   */
  public async getInventory(userId: string, guildId?: string): Promise<InventoryItem[]> {
    const acc = await this.bank.getAccount(userId, guildId);
    return acc.inventory;
  }
}

