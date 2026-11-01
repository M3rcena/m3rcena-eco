/**
 * @m3rcena/eco
 * Multiplayer Crew Bank Heist & Crime Syndicate Engine.
 *
 * @copyright 2026 M3rcena Development. All rights reserved.
 * @license Apache-2.0
 */

import { BankManager } from "./BankManager.js";
import { HeistTarget, HeistSession, HeistResult, HeistRole } from "../types.js";

export const DEFAULT_HEIST_TARGETS: HeistTarget[] = [
  {
    id: "corner_store",
    name: "Nightshift Mart Safe",
    difficulty: "EASY",
    minLevel: 1,
    minCrew: 1,
    maxCrew: 2,
    baseBountyMin: 12000,
    baseBountyMax: 30000,
    failureBail: 3500,
    successRate: 0.8,
    description: "Low-security register and floor safe. Fast cash with minimal police response.",
  },
  {
    id: "city_trust_bank",
    name: "First Metro Bank Vault",
    difficulty: "MEDIUM",
    minLevel: 5,
    minCrew: 2,
    maxCrew: 3,
    baseBountyMin: 65000,
    baseBountyMax: 180000,
    failureBail: 15000,
    successRate: 0.65,
    description: "Reinforced vault door with laser grid sensors. Needs a Hacker and a Muscle.",
  },
  {
    id: "casino_vault",
    name: "Grand Bellagio Casino Vault",
    difficulty: "HARD",
    minLevel: 12,
    minCrew: 3,
    maxCrew: 4,
    baseBountyMin: 350000,
    baseBountyMax: 900000,
    failureBail: 65000,
    successRate: 0.5,
    description: "High-roller cash depository protected by private armed security and motion alarms.",
  },
  {
    id: "federal_reserve",
    name: "Federal Bullion Depository",
    difficulty: "IMPOSSIBLE",
    minLevel: 25,
    minCrew: 4,
    maxCrew: 4,
    baseBountyMin: 1500000,
    baseBountyMax: 4500000,
    failureBail: 250000,
    successRate: 0.38,
    description: "The ultimate score: solid gold bullion pallets under biometric time locks.",
  },
];

export class HeistManager {
  private bank: BankManager;
  private targets: Map<string, HeistTarget> = new Map();
  private activeHeists: Map<string, HeistSession> = new Map();

  constructor(bank: BankManager, targets: HeistTarget[] = DEFAULT_HEIST_TARGETS) {
    this.bank = bank;
    for (const t of targets) {
      this.targets.set(t.id, t);
    }
  }

  public getTargets(): HeistTarget[] {
    return Array.from(this.targets.values());
  }

  public getTarget(id: string): HeistTarget | undefined {
    return this.targets.get(id);
  }

  public getHeist(heistId: string): HeistSession | undefined {
    return this.activeHeists.get(heistId);
  }

  /**
   * Creates a new Heist lobby.
   */
  public async createLobby(initiatorId: string, initiatorName: string, targetId: string, guildId?: string): Promise<{ success: boolean; session?: HeistSession; error?: string }> {
    const target = this.targets.get(targetId);
    if (!target) return { success: false, error: `Heist target "${targetId}" not found.` };

    const acc = await this.bank.getAccount(initiatorId, guildId);
    if (acc.level < target.minLevel) {
      return { success: false, error: `You need to be Level ${target.minLevel} to initiate this heist. (Your level: ${acc.level})` };
    }

    const heistId = "heist_" + Math.random().toString(36).substring(2, 8);
    const session: HeistSession = {
      id: heistId,
      guildId,
      initiatorId,
      target,
      crew: [
        {
          userId: initiatorId,
          username: initiatorName,
          role: "HACKER",
          ready: true,
        },
      ],
      phase: "LOBBY",
      createdAt: Date.now(),
      log: [`Planning initiated by ${initiatorName} targeting ${target.name}.`],
    };

    this.activeHeists.set(heistId, session);
    return { success: true, session };
  }

  /**
   * Joins an existing heist lobby with a specific role.
   */
  public joinLobby(heistId: string, userId: string, username: string, role: HeistRole): { success: boolean; session?: HeistSession; error?: string } {
    const session = this.activeHeists.get(heistId);
    if (!session) return { success: false, error: "Heist lobby not found." };
    if (session.phase !== "LOBBY") return { success: false, error: "Heist has already launched." };

    if (session.crew.some((m) => m.userId === userId)) {
      // Update role
      const member = session.crew.find((m) => m.userId === userId);
      if (member) member.role = role;
      return { success: true, session };
    }

    if (session.crew.length >= session.target.maxCrew) {
      return { success: false, error: "Heist crew is already full!" };
    }

    session.crew.push({ userId, username, role, ready: true });
    session.log.push(`${username} joined the crew as ${role}.`);
    return { success: true, session };
  }

  /**
   * Executes the heist.
   */
  public async executeHeist(heistId: string): Promise<HeistResult> {
    const session = this.activeHeists.get(heistId);
    if (!session) {
      throw new Error(`Heist session "${heistId}" not found.`);
    }

    if (session.crew.length < session.target.minCrew) {
      throw new Error(`Not enough crew members. Need at least ${session.target.minCrew} players.`);
    }

    session.phase = "EXECUTION";
    const target = session.target;

    // Calculate success chance with crew composition bonuses
    let successChance = target.successRate;
    const hasHacker = session.crew.some((m) => m.role === "HACKER");
    const hasDriver = session.crew.some((m) => m.role === "DRIVER");
    const hasDemo = session.crew.some((m) => m.role === "DEMOLITIONIST");
    const hasMuscle = session.crew.some((m) => m.role === "MUSCLE");

    if (hasHacker) successChance += 0.06;
    if (hasDriver) successChance += 0.05;
    if (hasDemo) successChance += 0.05;
    if (hasMuscle) successChance += 0.04;

    const roll = Math.random();
    const isSuccess = roll < successChance;
    session.success = isSuccess;
    session.phase = "CONCLUDED";

    if (isSuccess) {
      const totalBounty = Math.floor(Math.random() * (target.baseBountyMax - target.baseBountyMin + 1)) + target.baseBountyMin;
      const share = Math.floor(totalBounty / session.crew.length);

      session.totalLoot = totalBounty;
      session.lootSplit = {};

      session.log.push(`💥 Vault breached successfully! Looted $${totalBounty.toLocaleString()}!`);
      session.log.push(`🚓 Clean getaway! Each crew member takes home $${share.toLocaleString()}!`);

      // Award loot to all crew members
      for (const member of session.crew) {
        session.lootSplit[member.userId] = share;
        const acc = await this.bank.getAccount(member.userId, session.guildId);
        acc.wallet += share;
        acc.stats.totalEarned += share;
        acc.stats.heistsCompleted = (acc.stats.heistsCompleted || 0) + 1;
        await this.bank.saveAccount(acc);
      }

      return {
        success: true,
        targetName: target.name,
        totalLoot: totalBounty,
        crewCount: session.crew.length,
        sharePerPlayer: share,
        log: session.log,
      };
    } else {
      const bail = target.failureBail;
      session.log.push(`🚨 Silent alarm triggered! SWAT teams surrounded the perimeter!`);
      session.log.push(`🚔 Heist failed! Each member fined $${bail.toLocaleString()} in police bail!`);

      // Deduct bail fines
      for (const member of session.crew) {
        const acc = await this.bank.getAccount(member.userId, session.guildId);
        acc.wallet = Math.max(0, acc.wallet - bail);
        acc.stats.totalSpent += bail;
        await this.bank.saveAccount(acc);
      }

      return {
        success: false,
        targetName: target.name,
        totalLoot: 0,
        crewCount: session.crew.length,
        sharePerPlayer: 0,
        finePerPlayer: bail,
        log: session.log,
      };
    }
  }
}
