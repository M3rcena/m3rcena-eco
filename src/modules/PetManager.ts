/**
 * @m3rcena/eco
 * Pet & Companion Foraging System.
 *
 * @copyright 2026 M3rcena Development. All rights reserved.
 * @license Apache-2.0
 */

import { BankManager } from "./BankManager.js";
import { PetConfig, UserPet } from "../types.js";

export const DEFAULT_PETS: PetConfig[] = [
  {
    id: "cyber_hound",
    name: "Cybernetic K9",
    species: "Canine",
    rarity: "common",
    buyCost: 25000,
    description: "Loyal robotic guardian. Barks at pickpockets and detects incoming robbers.",
    emoji: "🐕",
    workMultiplierBonus: 0.1,
    crimeProtectionBonus: 0.15,
    luckBonus: 0.02,
  },
  {
    id: "fortune_cat",
    name: "Maneki-Neko Lucky Cat",
    species: "Feline",
    rarity: "rare",
    buyCost: 85000,
    description: "Golden waving talisman that attracts coin drops and daily streak multipliers.",
    emoji: "🐱",
    workMultiplierBonus: 0.2,
    crimeProtectionBonus: 0.05,
    luckBonus: 0.08,
  },
  {
    id: "obsidian_drake",
    name: "Obsidian Drake",
    species: "Dragon",
    rarity: "epic",
    buyCost: 350000,
    description: "Armored juvenile dragon with molten breath that scares off high-tier syndicate thugs.",
    emoji: "🐉",
    workMultiplierBonus: 0.35,
    crimeProtectionBonus: 0.3,
    luckBonus: 0.1,
  },
  {
    id: "void_phoenix",
    name: "Celestial Void Phoenix",
    species: "Phoenix",
    rarity: "mythic",
    buyCost: 1500000,
    description: "Legendary cosmic firebird. Doubles expedition rewards and grants passive hourly coin drops.",
    emoji: "🦅",
    workMultiplierBonus: 0.65,
    crimeProtectionBonus: 0.5,
    luckBonus: 0.2,
  },
];

export class PetManager {
  private bank: BankManager;
  private catalog: Map<string, PetConfig> = new Map();

  constructor(bank: BankManager, initialPets: PetConfig[] = DEFAULT_PETS) {
    this.bank = bank;
    for (const pet of initialPets) {
      this.catalog.set(pet.id, pet);
    }
  }

  public getCatalog(): PetConfig[] {
    return Array.from(this.catalog.values());
  }

  public getPetConfig(id: string): PetConfig | undefined {
    return this.catalog.get(id);
  }

  /**
   * Adopts/purchases a companion pet.
   */
  public async adoptPet(userId: string, petId: string, customName?: string, guildId?: string): Promise<{ success: boolean; pet?: UserPet; error?: string }> {
    const config = this.catalog.get(petId);
    if (!config) return { success: false, error: `Pet "${petId}" not found.` };

    const acc = await this.bank.getAccount(userId, guildId);
    if (acc.wallet < config.buyCost) {
      return { success: false, error: `Insufficient cash. Need $${config.buyCost.toLocaleString()}, you have $${acc.wallet.toLocaleString()}.` };
    }

    if (!acc.pets) acc.pets = [];
    if (acc.pets.some((p) => p.petId === petId)) {
      return { success: false, error: `You already own a ${config.name}!` };
    }

    acc.wallet -= config.buyCost;
    acc.stats.totalSpent += config.buyCost;

    const newPet: UserPet = {
      id: "pet_" + Math.random().toString(36).substring(2, 8),
      petId: config.id,
      name: customName || config.name,
      species: config.species,
      level: 1,
      xp: 0,
      hunger: 100,
      happiness: 100,
      acquiredAt: Date.now(),
      isExpeditionActive: false,
    };

    acc.pets.push(newPet);
    await this.bank.saveAccount(acc);

    return { success: true, pet: newPet };
  }

  /**
   * Feeds a pet to restore hunger and happiness.
   */
  public async feedPet(userId: string, petId: string, guildId?: string): Promise<{ success: boolean; pet?: UserPet; error?: string }> {
    const acc = await this.bank.getAccount(userId, guildId);
    const pet = (acc.pets || []).find((p) => p.petId === petId || p.id === petId);
    if (!pet) return { success: false, error: "Pet not found in your shelter." };

    const foodCost = 250;
    if (acc.wallet < foodCost) return { success: false, error: `Feeding costs $${foodCost}.` };

    acc.wallet -= foodCost;
    pet.hunger = Math.min(100, pet.hunger + 40);
    pet.happiness = Math.min(100, pet.happiness + 25);
    pet.xp += 15;

    // Check level up
    const reqXp = pet.level * 100;
    if (pet.xp >= reqXp) {
      pet.level += 1;
      pet.xp -= reqXp;
    }

    await this.bank.saveAccount(acc);
    return { success: true, pet };
  }

  /**
   * Dispatches pet on a timed foraging expedition.
   */
  public async sendExpedition(userId: string, petId: string, durationHours: number = 2, guildId?: string): Promise<{ success: boolean; returnsAt?: number; error?: string }> {
    const acc = await this.bank.getAccount(userId, guildId);
    const pet = (acc.pets || []).find((p) => p.petId === petId || p.id === petId);
    if (!pet) return { success: false, error: "Pet not found." };
    if (pet.isExpeditionActive) return { success: false, error: "Pet is already out on an expedition!" };

    const returnsAt = Date.now() + durationHours * 3600 * 1000;
    pet.isExpeditionActive = true;
    pet.expeditionReturnsAt = returnsAt;

    await this.bank.saveAccount(acc);
    return { success: true, returnsAt };
  }

  /**
   * Claims rewards when a pet returns from an expedition.
   */
  public async claimExpedition(userId: string, petId: string, guildId?: string): Promise<{ success: boolean; reward?: any; error?: string }> {
    const acc = await this.bank.getAccount(userId, guildId);
    const pet = (acc.pets || []).find((p) => p.petId === petId || p.id === petId);
    if (!pet) return { success: false, error: "Pet not found." };
    if (!pet.isExpeditionActive || !pet.expeditionReturnsAt) return { success: false, error: "Pet is not currently on an expedition." };

    if (Date.now() < pet.expeditionReturnsAt) {
      const remainingSec = Math.ceil((pet.expeditionReturnsAt - Date.now()) / 1000);
      return { success: false, error: `Expedition still in progress! Returning in ${Math.ceil(remainingSec / 60)} minutes.` };
    }

    const cfg = this.catalog.get(pet.petId);
    const multiplier = 1 + (cfg?.workMultiplierBonus || 0) + pet.level * 0.05;

    const coinsFound = Math.floor((Math.random() * 25000 + 8000) * multiplier);
    const xpGained = Math.floor(Math.random() * 60 + 40);

    acc.wallet += coinsFound;
    acc.stats.totalEarned += coinsFound;
    pet.xp += xpGained;
    pet.hunger = Math.max(10, pet.hunger - 35);
    pet.happiness = Math.max(10, pet.happiness - 20);
    pet.isExpeditionActive = false;
    pet.expeditionReturnsAt = undefined;

    await this.bank.saveAccount(acc);

    return {
      success: true,
      reward: {
        coins: coinsFound,
        xp: xpGained,
        petLevel: pet.level,
      },
    };
  }
}
