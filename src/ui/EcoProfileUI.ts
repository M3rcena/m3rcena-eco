/**
 * @m3rcena/eco
 * Interactive Discord Economy Profile & Passport UI.
 *
 * @copyright 2026 M3rcena Development. All rights reserved.
 * @license Apache-2.0
 */

import {
  ActionRowBuilder,
  AttachmentBuilder,
  ButtonBuilder,
  ButtonStyle,
  GuildMember,
  Interaction,
  MessageFlags,
  User,
} from "discord.js";
import { EcoBaseUI, EcoBaseUIOptions } from "./EcoBaseUI.js";
import { RenderBankCard } from "../canvas/RenderBankCard.js";
import { ContextAdapter } from "./ContextAdapter.js";

export interface EcoProfileUIOptions extends EcoBaseUIOptions {
  targetUser?: User | GuildMember;
  renderCard?: boolean;
}

export class EcoProfileUI extends EcoBaseUI<EcoProfileUIOptions> {
  private targetUser: User;
  private currentTab: "OVERVIEW" | "INVENTORY" | "BUSINESSES" | "STOCKS" | "PETS" = "OVERVIEW";
  private btnPrefix: string;
  private cardBuffer: Buffer | null = null;

  constructor(manager: any, options: EcoProfileUIOptions) {
    super(manager, options, "prof_");
    const target = options.targetUser;
    if (target instanceof GuildMember) {
      this.targetUser = target.user;
    } else if (target instanceof User) {
      this.targetUser = target;
    } else {
      this.targetUser = this.ctx.user;
    }
    this.btnPrefix = this.id + "_";
  }

  public async start(): Promise<void> {
    this.isActive = true;
    const account = await this.manager.getAccount(this.targetUser.id, this.ctx.guild?.id);

    // 1. Generate visual canvas card
    if (this.options.renderCard !== false) {
      try {
        const avatarUrl = this.targetUser.displayAvatarURL ? this.targetUser.displayAvatarURL({ extension: "png", size: 128 }) : undefined;
        this.cardBuffer = await RenderBankCard.renderCard({
          username: this.targetUser.username,
          avatarUrl,
          wallet: account.wallet,
          bank: account.bank,
          netWorth: account.wallet + account.bank,
          currencySymbol: this.manager.currencySymbol,
        });
      } catch (err) {
        console.warn("Could not generate canvas bank card:", err);
      }
    }

    const container = this.buildContainer(account);
    const files = this.cardBuffer && this.currentTab === "OVERVIEW" ? [new AttachmentBuilder(this.cardBuffer, { name: "bank-card.png" })] : [];

    const msg = await this.ctx.sendInitial({
      components: [container],
      files,
      flags: MessageFlags.IsComponentsV2,
    });

    this.setupCollector();
    this.resetTimeout(() => this.destroy());
  }

  private setupCollector(): void {
    if (!this.ctx.channel) return;
    const filter = (i: Interaction) => i.isButton() && i.customId.startsWith(this.btnPrefix);
    const collector = this.ctx.channel.createMessageComponentCollector({ filter, time: this.defaultTimeout });

    collector.on("collect", async (interaction: any) => {
      if (interaction.user.id !== this.ctx.userId) {
        ContextAdapter.replyEphemeral(interaction, "⛔ You cannot interact with someone else's profile tabs!");
        return;
      }

      await interaction.deferUpdate().catch(() => {});
      this.resetTimeout(() => this.destroy());

      const action = interaction.customId.replace(this.btnPrefix, "");
      if (action === "tab_overview") this.currentTab = "OVERVIEW";
      else if (action === "tab_inv") this.currentTab = "INVENTORY";
      else if (action === "tab_biz") this.currentTab = "BUSINESSES";
      else if (action === "tab_stocks") this.currentTab = "STOCKS";
      else if (action === "tab_pets") this.currentTab = "PETS";

      const account = await this.manager.getAccount(this.targetUser.id, this.ctx.guild?.id);
      const container = this.buildContainer(account);
      const files = this.cardBuffer && this.currentTab === "OVERVIEW" ? [new AttachmentBuilder(this.cardBuffer, { name: "bank-card.png" })] : [];

      await this.ctx.edit({
        components: [container],
        files,
        flags: MessageFlags.IsComponentsV2,
      });
    });
  }

  private buildContainer(account: any) {
    const container = this.createContainer();
    const sym = this.manager.currencySymbol || "🪙";

    let content = "";
    if (this.currentTab === "OVERVIEW") {
      const netWorth = account.wallet + account.bank;
      const job = account.career?.jobTitle || "Unemployed";
      const streak = account.streak?.daily || 0;
      const reqXp = account.level * 250;

      content = `## 💳 Financial Passport: ${this.targetUser.username}\n` +
        `> **Net Worth:** \`${sym} ${netWorth.toLocaleString()}\`  •  **Level:** \`${account.level}\` (\`${account.xp}/${reqXp} XP\`)\n` +
        `> **Cash in Wallet:** \`${sym} ${account.wallet.toLocaleString()}\`\n` +
        `> **Bank Vault:** \`${sym} ${account.bank.toLocaleString()}\` / \`${sym} ${account.bankCapacity.toLocaleString()}\`\n` +
        `> **Daily Streak:** \`🔥 ${streak} Days\`  •  **Career:** \`💼 ${job}\`\n\n` +
        `*Click the interactive buttons below to inspect inventory, investments, and businesses.*`;
    } else if (this.currentTab === "INVENTORY") {
      const items = account.inventory || [];
      content = `## 🎒 Backpack & Inventory: ${this.targetUser.username}\n`;
      if (items.length === 0) {
        content += `> *Your backpack is completely empty. Visit the shop to purchase tools and upgrades!*`;
      } else {
        content += items
          .map((it: any) => `> • **${it.name || it.itemId}** (x${it.quantity}) — *${it.category}*`)
          .join("\n");
      }
    } else if (this.currentTab === "BUSINESSES") {
      const biz = account.businesses || [];
      content = `## 🏢 Enterprise Portfolio: ${this.targetUser.username}\n`;
      if (biz.length === 0) {
        content += `> *No companies owned yet. Purchase a business to unlock automated passive income!*`;
      } else {
        content += biz
          .map((b: any) => `> • **${b.name || b.businessId}** [Level ${b.level}] — 👥 ${b.employees} Staff • Total Rev: \`${sym} ${(b.totalCollected || 0).toLocaleString()}\``)
          .join("\n");
      }
    } else if (this.currentTab === "STOCKS") {
      const stocks = account.stocks || [];
      content = `## 📈 Stock & Crypto Portfolio: ${this.targetUser.username}\n`;
      if (stocks.length === 0) {
        content += `> *No active investments. Browse the stock exchange to trade tech shares and crypto!*`;
      } else {
        content += stocks
          .map((p: any) => `> • **${p.symbol}**: \`${p.shares} shares\` (Avg Buy: \`$${p.averageBuyPrice.toLocaleString()}\` • Total Invested: \`$${p.totalInvested.toLocaleString()}\`)`)
          .join("\n");
      }
    } else if (this.currentTab === "PETS") {
      const pets = account.pets || [];
      content = `## 🐾 Companion Shelter: ${this.targetUser.username}\n`;
      if (pets.length === 0) {
        content += `> *No companion pets adopted. Adopt a Cybernetic K9 or Lucky Cat to gain foraging loot and defense buffs!*`;
      } else {
        content += pets
          .map((pet: any) => `> • **${pet.name}** (${pet.species}) [Lvl ${pet.level}] — 🍖 Hunger: \`${pet.hunger}%\` • ❤️ Joy: \`${pet.happiness}%\` ${pet.isExpeditionActive ? "• *[Expedition Active]*" : ""}`)
          .join("\n");
      }
    }

    container.addTextDisplayComponents((t) => t.setContent(content));

    // Navigation buttons row
    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(`${this.btnPrefix}tab_overview`)
        .setLabel("💳 Overview")
        .setStyle(this.currentTab === "OVERVIEW" ? ButtonStyle.Primary : ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(`${this.btnPrefix}tab_inv`)
        .setLabel("🎒 Backpack")
        .setStyle(this.currentTab === "INVENTORY" ? ButtonStyle.Primary : ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(`${this.btnPrefix}tab_biz`)
        .setLabel("🏢 Businesses")
        .setStyle(this.currentTab === "BUSINESSES" ? ButtonStyle.Primary : ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(`${this.btnPrefix}tab_stocks`)
        .setLabel("📈 Stocks")
        .setStyle(this.currentTab === "STOCKS" ? ButtonStyle.Primary : ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(`${this.btnPrefix}tab_pets`)
        .setLabel("🐾 Pets")
        .setStyle(this.currentTab === "PETS" ? ButtonStyle.Primary : ButtonStyle.Secondary)
    );

    container.addActionRowComponents(row);
    return container;
  }
}

