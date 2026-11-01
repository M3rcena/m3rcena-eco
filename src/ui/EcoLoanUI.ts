/**
 * @m3rcena/eco
 * Interactive Bank Loan, Credit Score & Debt Management UI.
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
import { LoanTier, LoanOffer, UserLoan } from "../types.js";
import { LOAN_CATALOG } from "../modules/LoanManager.js";

export class EcoLoanUI extends EcoBaseUI {
  private selectedTier: LoanTier = "starter";
  private selectedLoanId: string | null = null;
  private btnPrefix: string;
  private statusMessage: string = "Select a credit package below to inspect terms or choose an active loan to pay down.";

  constructor(manager: any, options: EcoBaseUIOptions) {
    super(manager, options, "loan_");
    this.btnPrefix = this.id + "_";
  }

  public async start(): Promise<void> {
    this.isActive = true;
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
        ContextAdapter.replyEphemeral(interaction, "⛔ You cannot manage someone else's credit lines!");
        return;
      }

      await interaction.deferUpdate().catch(() => {});
      this.resetTimeout(() => this.destroy());

      if (interaction.isStringSelectMenu()) {
        if (interaction.customId === `${this.btnPrefix}select_offer`) {
          this.selectedTier = interaction.values[0] as LoanTier;
        } else if (interaction.customId === `${this.btnPrefix}select_loan`) {
          this.selectedLoanId = interaction.values[0];
        }
      } else if (interaction.isButton()) {
        const action = interaction.customId.replace(this.btnPrefix, "");
        if (action === "apply") {
          try {
            const res = await this.manager.applyLoan(this.ctx.userId, this.selectedTier, this.ctx.guild?.id);
            if (res.success) {
              this.statusMessage = `✅ **LOAN APPROVED!** Disbursed **$${res.loan.principal.toLocaleString()}** to your cash wallet! (Repay by: <t:${Math.floor(res.loan.dueAt / 1000)}:R>)`;
            } else {
              this.statusMessage = `❌ Application rejected: ${res.error}`;
            }
          } catch (err: any) {
            this.statusMessage = `❌ ${err.message}`;
          }
        } else if (action === "repay_all" || action === "repay_half") {
          const loans = await this.manager.getUserLoans(this.ctx.userId, this.ctx.guild?.id);
          const activeLoan = loans.find((l: UserLoan) => (this.selectedLoanId ? l.id === this.selectedLoanId : l.status !== "paid"));
          if (!activeLoan) {
            ContextAdapter.replyEphemeral(interaction, "❌ You have no active debts to pay!");
            return;
          }

          const payAmount = action === "repay_all" ? "all" : Math.ceil(activeLoan.remainingDue / 2);
          try {
            const res = await this.manager.repayLoan(this.ctx.userId, activeLoan.id, payAmount, this.ctx.guild?.id);
            if (res.success) {
              if (res.isFullyPaid) {
                this.statusMessage = `🎉 **DEBT PAID IN FULL!** Succeeded in settling debt. Credit score boosted to **${res.newCreditScore}**!`;
              } else {
                this.statusMessage = `💵 Paid **$${res.amountPaid.toLocaleString()}** toward debt. Remaining: **$${res.remainingDue.toLocaleString()}**`;
              }
            } else {
              this.statusMessage = `❌ ${res.error}`;
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

    const credit = await this.manager.getCreditScore(this.ctx.userId, this.ctx.guild?.id);
    const loans: UserLoan[] = await this.manager.getUserLoans(this.ctx.userId, this.ctx.guild?.id);
    const offers: LoanOffer[] = this.manager.loans ? this.manager.loans.getOffers() : LOAN_CATALOG;
    const selectedOffer = offers.find((o) => o.tier === this.selectedTier) || offers[0];

    const activeLoans = loans.filter((l) => l.status === "active" || l.status === "defaulted");
    const totalDebt = activeLoans.reduce((sum, l) => sum + l.remainingDue, 0);

    const ratingColors: Record<string, string> = {
      EXCELLENT: "🟢 800-850 (EXCELLENT)",
      VERY_GOOD: "🟢 740-799 (VERY GOOD)",
      GOOD: "🟡 670-739 (GOOD)",
      FAIR: "🟠 580-669 (FAIR)",
      POOR: "🔴 300-579 (POOR - HIGH RISK)",
    };

    let content = `## 🏦 Global Commercial Credit Bureau & Loan Broker\n` +
      `> **Account:** <@${this.ctx.userId}>  •  **FICO Credit Rating:** \`${ratingColors[credit.rating] || credit.rating}\` (\`${credit.score} Score\`)\n` +
      `> **Total Active Debt:** \`${sym} ${totalDebt.toLocaleString()}\`  •  **Loans Repaid:** \`${credit.loansRepaid}\`  •  **Defaults:** \`${credit.defaultsCount}\`\n\n` +
      `> **Status:** ${this.statusMessage}\n\n`;

    if (activeLoans.length > 0) {
      content += `### 💳 Outstanding Debts (${activeLoans.length}/2 Active):\n`;
      for (const l of activeLoans) {
        const isDefault = l.status === "defaulted";
        const tag = isDefault ? "🚨 **[OVERDUE DEFAULT]**" : `⏳ Due: <t:${Math.floor(l.dueAt / 1000)}:R>`;
        content += `> • **${l.name}**: Remaining: \`${sym} ${l.remainingDue.toLocaleString()}\` / \`${sym} ${l.totalDue.toLocaleString()}\` — ${tag}\n`;
      }
      content += `\n`;
    }

    content += `### 📋 Inspecting Offer: ${selectedOffer.name}\n` +
      `> • **Principal Cash Advance:** \`${sym} ${selectedOffer.principal.toLocaleString()}\`\n` +
      `> • **Fixed Interest:** \`${(selectedOffer.interestRate * 100).toFixed(1)}%\` (Total Due: \`${sym} ${selectedOffer.totalDue.toLocaleString()}\`)\n` +
      `> • **Repayment Window:** \`${selectedOffer.durationHours} hours\`\n` +
      `> • **Required Credit Score:** \`${selectedOffer.minCreditScore}+\` ${credit.score >= selectedOffer.minCreditScore ? "*(Eligible)*" : "*(Score Too Low)*"}\n` +
      `> • **Description:** *${selectedOffer.description}*\n`;

    container.addTextDisplayComponents((t) => t.setContent(content));

    // Offer selector
    const options = offers.map((o) =>
      new StringSelectMenuOptionBuilder()
        .setLabel(`${o.name} (${sym} ${o.principal.toLocaleString()})`)
        .setValue(o.tier)
        .setDescription(`Rate: ${(o.interestRate * 100).toFixed(1)}% | Min Score: ${o.minCreditScore}`)
        .setDefault(o.tier === this.selectedTier)
    );

    const offerRow = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId(`${this.btnPrefix}select_offer`)
        .setPlaceholder("Select a credit advance package...")
        .addOptions(options)
    );
    container.addActionRowComponents(offerRow);

    // Buttons
    const canApply = credit.score >= selectedOffer.minCreditScore && activeLoans.length < 2 && !activeLoans.some((l) => l.status === "defaulted");
    const hasDebt = totalDebt > 0;

    const btnRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(`${this.btnPrefix}apply`)
        .setLabel(`📝 Apply for ${selectedOffer.name}`)
        .setStyle(canApply ? ButtonStyle.Success : ButtonStyle.Secondary)
        .setDisabled(!canApply),
      new ButtonBuilder()
        .setCustomId(`${this.btnPrefix}repay_half`)
        .setLabel("💵 Pay 50% Debt")
        .setStyle(ButtonStyle.Primary)
        .setDisabled(!hasDebt),
      new ButtonBuilder()
        .setCustomId(`${this.btnPrefix}repay_all`)
        .setLabel("🎉 Settle Full Debt")
        .setStyle(ButtonStyle.Success)
        .setDisabled(!hasDebt)
    );
    container.addActionRowComponents(btnRow);

    return container;
  }
}

