/**
 * @m3rcena/eco
 * Interactive Bank Vault Tiers, Upgrade & Compound Interest UI.
 *
 * @copyright 2026 M3rcena Development. All rights reserved.
 * @license Apache-2.0
 */

import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  Interaction,
  MessageFlags,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
} from "discord.js";
import { EcoBaseUI, EcoBaseUIOptions } from "./EcoBaseUI.js";
import { ContextAdapter } from "./ContextAdapter.js";
import { BankVaultTier } from "../types.js";
import { DEFAULT_VAULT_TIERS } from "../modules/VaultManager.js";

export class EcoVaultUI extends EcoBaseUI {
  private selectedTierNum: number = 1;
  private btnPrefix: string;
  private statusMessage: string = "Select a vault tier below to inspect security specifications and interest yield.";

  constructor(manager: any, options: EcoBaseUIOptions) {
    super(manager, options, "vault_");
    this.btnPrefix = this.id + "_";
  }

  public async start(): Promise<void> {
    this.isActive = true;
    const vault = await this.manager.getUserVault(this.ctx.userId, this.ctx.guild?.id);
    this.selectedTierNum = vault.currentTier.tier;

    const container = await this.buildContainer();

    await this.ctx.sendInitial({
      components: [container],
      flags: MessageFlags.IsComponentsV2,
    });

    this.setupCollector();
    this.resetTimeout(() => this.destroy());
  }

  private setupCollector(): void {
    if (!this.ctx.channel) return;
    const filter = (i: Interaction) =>
      (i.isButton() && i.customId.startsWith(this.btnPrefix)) ||
      (i.isStringSelectMenu() && i.customId.startsWith(this.btnPrefix));

    const collector = this.ctx.channel.createMessageComponentCollector({
      filter,
      time: this.defaultTimeout,
    });

    collector.on("collect", async (interaction: any) => {
      if (interaction.user.id !== this.ctx.userId) {
        ContextAdapter.replyEphemeral(interaction, "⛔ You cannot manage someone else's bank vault!");
        return;
      }

      await interaction.deferUpdate().catch(() => {});
      this.resetTimeout(() => this.destroy());

      if (interaction.isStringSelectMenu()) {
        if (interaction.customId === `${this.btnPrefix}select_tier`) {
          this.selectedTierNum = parseInt(interaction.values[0], 10);
        }
      } else if (interaction.isButton()) {
        const action = interaction.customId.replace(this.btnPrefix, "");
        if (action === "upgrade") {
          try {
            const res = await this.manager.upgradeVault(this.ctx.userId, this.ctx.guild?.id);
            if (res.success) {
              this.selectedTierNum = res.newTier.tier;
              this.statusMessage = `🎉 **VAULT UPGRADED!** You are now Tier ${res.newTier.tier} (${res.newTier.name}). New capacity: $${res.newCapacity.toLocaleString()}!`;
            } else {
              this.statusMessage = `❌ ${res.error}`;
            }
          } catch (err: any) {
            this.statusMessage = `❌ ${err.message}`;
          }
        } else if (action === "claim_interest") {
          try {
            const res = await this.manager.claimDailyInterest(this.ctx.userId, this.ctx.guild?.id);
            if (res.success) {
              this.statusMessage = `💰 **INTEREST DISTRIBUTED!** Added **$${res.interestEarned.toLocaleString()}** (${(res.rate * 100).toFixed(1)}% daily) to your vault savings!`;
            } else {
              this.statusMessage = `⏳ ${res.error}`;
            }
          } catch (err: any) {
            this.statusMessage = `❌ ${err.message}`;
          }
        }
      }

      const container = await this.buildContainer();
      await this.ctx.edit({
        components: [container],
        flags: MessageFlags.IsComponentsV2,
      });
    });
  }

  private async buildContainer() {
    const container = this.createContainer();
    const sym = this.manager.currencySymbol || "🪙";
    const userVault = await this.manager.getUserVault(this.ctx.userId, this.ctx.guild?.id);
    const tiers: BankVaultTier[] = this.manager.vault ? this.manager.vault.getVaultTiers() : DEFAULT_VAULT_TIERS;
    const inspectingTier = tiers.find((t) => t.tier === this.selectedTierNum) || userVault.currentTier;

    const isCurrent = inspectingTier.tier === userVault.currentTier.tier;
    const isNext = userVault.nextTier && inspectingTier.tier === userVault.nextTier.tier;

    let content = `## 🏦 Swiss & Orbital Private Vault Showroom\n` +
      `> **Account Holder:** <@${this.ctx.userId}>\n` +
      `> **Current Vault Tier:** \`Tier ${userVault.currentTier.tier} — ${userVault.currentTier.name}\`\n` +
      `> **Savings Vault Balance:** \`${sym} ${userVault.bank.toLocaleString()}\` / \`${sym} ${userVault.capacity.toLocaleString()}\`\n` +
      `> **Estimated 24h Compound Yield:** \`${sym} ${userVault.dailyInterestAccrual.toLocaleString()} / day\`\n\n` +
      `> **Status:** ${this.statusMessage}\n\n`;

    content += `### 🔍 Inspecting: Tier ${inspectingTier.tier} — ${inspectingTier.name} ${isCurrent ? "*(Active Vault)*" : ""}\n` +
      `> • **Storage Capacity:** \`${sym} ${inspectingTier.capacity.toLocaleString()}\`\n` +
      `> • **Daily Compound Yield:** \`${(inspectingTier.interestRate * 100).toFixed(1)}% / 24h\`\n` +
      `> • **Robbery Shield Defense:** \`${(inspectingTier.robberyDefense * 100).toFixed(0)}% deterrence\`\n` +
      `> • **Upgrade Price:** \`${inspectingTier.upgradeCost > 0 ? `${sym} ${inspectingTier.upgradeCost.toLocaleString()}` : "Included Free"}\`\n`;

    if (inspectingTier.perks && inspectingTier.perks.length > 0) {
      content += `> • **Special Perks:** ${inspectingTier.perks.join(" • ")}\n`;
    }

    container.addTextDisplayComponents((t) => t.setContent(content));

    // Vault Tier Selector
    const options = tiers.map((t) =>
      new StringSelectMenuOptionBuilder()
        .setLabel(`Tier ${t.tier}: ${t.name}`)
        .setValue(String(t.tier))
        .setDescription(`Cap: ${sym} ${t.capacity.toLocaleString()} | Interest: ${(t.interestRate * 100).toFixed(1)}%`)
        .setDefault(t.tier === this.selectedTierNum)
    );

    const selectRow = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId(`${this.btnPrefix}select_tier`)
        .setPlaceholder("Select a vault tier to inspect...")
        .addOptions(options)
    );
    container.addActionRowComponents(selectRow);

    // Buttons: Upgrade Vault, Claim Daily Interest
    const canUpgrade = !!userVault.nextTier;
    const upgradeLabel = canUpgrade
      ? `⚡ Upgrade to Tier ${userVault.nextTier!.tier} (${sym} ${userVault.nextTier!.upgradeCost.toLocaleString()})`
      : "👑 Maximum Vault Tier Reached";

    const btnRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(`${this.btnPrefix}upgrade`)
        .setLabel(upgradeLabel)
        .setStyle(canUpgrade ? ButtonStyle.Success : ButtonStyle.Secondary)
        .setDisabled(!canUpgrade),
      new ButtonBuilder()
        .setCustomId(`${this.btnPrefix}claim_interest`)
        .setLabel(userVault.canClaimInterest ? `💰 Claim Interest (${sym} ${userVault.dailyInterestAccrual.toLocaleString()})` : "⏳ Interest Payout Pending")
        .setStyle(userVault.canClaimInterest ? ButtonStyle.Primary : ButtonStyle.Secondary)
        .setDisabled(!userVault.canClaimInterest)
    );
    container.addActionRowComponents(btnRow);

    return container;
  }
}
