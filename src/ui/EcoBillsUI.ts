/**
 * @m3rcena/eco
 * Interactive Municipal Bills, Wealth Taxes & Audit Desk UI.
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
import { MunicipalBill } from "../types.js";

export class EcoBillsUI extends EcoBaseUI {
  private selectedBillId: string | null = null;
  private btnPrefix: string;
  private statusMessage: string = "Review municipal bills and wealth taxes below. Settle on time to protect your credit score!";

  constructor(manager: any, options: EcoBaseUIOptions) {
    super(manager, options, "bills_");
    this.btnPrefix = this.id + "_";
  }

  public async start(): Promise<void> {
    this.isActive = true;

    // Generate bills if due
    if (this.manager.taxes && typeof this.manager.taxes.generateBillsIfDue === "function") {
      await this.manager.taxes.generateBillsIfDue(this.ctx.userId, this.ctx.guild?.id);
    }

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
        ContextAdapter.replyEphemeral(interaction, "⛔ You cannot manage someone else's municipal tax desk!");
        return;
      }

      await interaction.deferUpdate().catch(() => {});
      this.resetTimeout(() => this.destroy());

      if (interaction.isStringSelectMenu()) {
        if (interaction.customId === `${this.btnPrefix}select_bill`) {
          this.selectedBillId = interaction.values[0];
        }
      } else if (interaction.isButton()) {
        const action = interaction.customId.replace(this.btnPrefix, "");
        if (action === "pay_selected") {
          if (!this.selectedBillId) {
            ContextAdapter.replyEphemeral(interaction, "❌ Please select a bill from the menu first.");
            return;
          }
          try {
            const res = await this.manager.payBill(this.ctx.userId, this.selectedBillId, this.ctx.guild?.id);
            if (res.success) {
              this.statusMessage = `✅ Paid **${res.bill?.title}** ($${res.amountPaid.toLocaleString()})! Credit score increased to **${res.newCreditScore}**!`;
            } else {
              this.statusMessage = `❌ ${res.error}`;
            }
          } catch (err: any) {
            this.statusMessage = `❌ ${err.message}`;
          }
        } else if (action === "pay_all") {
          try {
            const res = await this.manager.payAllBills(this.ctx.userId, this.ctx.guild?.id);
            if (res.success) {
              this.statusMessage = `🏛️ **TAX COMPLIANCE ACHIEVED!** Settled ${res.paidCount} bills ($${res.totalAmountPaid.toLocaleString()})! Credit score boosted to **${res.newCreditScore}**!`;
            } else {
              this.statusMessage = `❌ ${res.error}`;
            }
          } catch (err: any) {
            this.statusMessage = `❌ ${err.message}`;
          }
        } else if (action === "evade") {
          try {
            const res = await this.manager.attemptTaxEvasion(this.ctx.userId, this.ctx.guild?.id);
            this.statusMessage = res.auditDetails;
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

    const bills: MunicipalBill[] = await this.manager.getPendingBills(this.ctx.userId, this.ctx.guild?.id);
    const totalBilled = bills.reduce((sum, b) => sum + b.amount, 0);
    const credit = await this.manager.getCreditScore(this.ctx.userId, this.ctx.guild?.id);

    let content = `## 🏛️ Municipal Treasury, Utilities & Tax Compliance\n` +
      `> **Citizen:** <@${this.ctx.userId}>  •  **Credit Rating:** \`${credit.rating}\` (\`${credit.score} pts\`)\n` +
      `> **Total Pending Obligations:** \`${sym} ${totalBilled.toLocaleString()}\` across \`${bills.length} bills\`\n\n` +
      `> **Status:** ${this.statusMessage}\n\n`;

    if (bills.length === 0) {
      content += `> ✨ **ALL OBLIGATIONS SETTLED!** You are in 100% tax and utility compliance. No pending fees!\n`;
    } else {
      content += `### 📄 Pending Notices:\n`;
      for (const b of bills) {
        const isSel = b.id === this.selectedBillId ? "👉 " : "• ";
        content += `> ${isSel}**${b.title}**: \`${sym} ${b.amount.toLocaleString()}\` (Due: <t:${Math.floor(b.dueAt / 1000)}:R>)\n`;
      }
    }

    container.addTextDisplayComponents((t) => t.setContent(content));

    if (bills.length > 0) {
      // Bill select menu
      const options = bills.map((b) =>
        new StringSelectMenuOptionBuilder()
          .setLabel(`${b.title.slice(0, 50)}`)
          .setValue(b.id)
          .setDescription(`${sym} ${b.amount.toLocaleString()}`)
          .setDefault(b.id === this.selectedBillId)
      );

      const billRow = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId(`${this.btnPrefix}select_bill`)
          .setPlaceholder("Select a bill to settle...")
          .addOptions(options)
      );
      container.addActionRowComponents(billRow);

      const hasTax = bills.some((b) => b.type === "wealth_tax");

      // Action buttons
      const btnRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId(`${this.btnPrefix}pay_selected`)
          .setLabel("Pay Selected Bill")
          .setStyle(ButtonStyle.Primary)
          .setDisabled(!this.selectedBillId),
        new ButtonBuilder()
          .setCustomId(`${this.btnPrefix}pay_all`)
          .setLabel(`🏛️ Settle All (${sym} ${totalBilled.toLocaleString()})`)
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId(`${this.btnPrefix}evade`)
          .setLabel("🎲 Offshore Shell Evasion")
          .setStyle(ButtonStyle.Danger)
          .setDisabled(!hasTax)
      );
      container.addActionRowComponents(btnRow);
    }

    return container;
  }
}
