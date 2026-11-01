/**
 * @m3rcena/eco
 * Interactive Discord Leaderboard UI with Components V2.
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
import { LeaderboardMetric } from "../modules/LeaderboardManager.js";

export interface EcoLeaderboardUIOptions extends EcoBaseUIOptions {
  initialMetric?: LeaderboardMetric;
  limit?: number;
}

export class EcoLeaderboardUI extends EcoBaseUI<EcoLeaderboardUIOptions> {
  private selectedMetric: LeaderboardMetric = "net_worth";
  private page: number = 0;
  private pageSize: number = 10;
  private btnPrefix: string;

  constructor(manager: any, options: EcoLeaderboardUIOptions) {
    super(manager, options, "lb_");
    this.selectedMetric = options.initialMetric || "net_worth";
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
        ContextAdapter.replyEphemeral(interaction, "⛔ You cannot paginate someone else's leaderboard view!");
        return;
      }

      await interaction.deferUpdate().catch(() => {});
      this.resetTimeout(() => this.destroy());

      if (interaction.isStringSelectMenu()) {
        if (interaction.customId === `${this.btnPrefix}select_metric`) {
          this.selectedMetric = interaction.values[0] as LeaderboardMetric;
          this.page = 0;
        }
      } else if (interaction.isButton()) {
        const action = interaction.customId.replace(this.btnPrefix, "");
        if (action === "prev") {
          this.page = Math.max(0, this.page - 1);
        } else if (action === "next") {
          this.page++;
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

    const allEntries = await this.manager.getLeaderboard(
      this.selectedMetric,
      50,
      this.ctx.guild?.id
    );

    const totalPages = Math.ceil(allEntries.length / this.pageSize) || 1;
    if (this.page >= totalPages) this.page = totalPages - 1;

    const startIdx = this.page * this.pageSize;
    const pageEntries = allEntries.slice(startIdx, startIdx + this.pageSize);

    const metricLabels: Record<LeaderboardMetric, string> = {
      net_worth: "💎 Net Worth",
      wallet: "💵 Wallet Cash",
      bank: "🏦 Bank Vault",
      level: "⭐ Level & XP",
      streak: "🔥 Daily Streaks",
    };

    let content = `## 🏆 Server Economic Leaderboards\n` +
      `> **Ranking Metric:** \`${metricLabels[this.selectedMetric] || this.selectedMetric}\`  •  **Page:** \`${this.page + 1}/${totalPages}\`\n\n`;

    if (pageEntries.length === 0) {
      content += `> *No user rankings recorded yet for this metric.*\n`;
    } else {
      for (const entry of pageEntries) {
        const medal = entry.rank === 1 ? "🥇" : entry.rank === 2 ? "🥈" : entry.rank === 3 ? "🥉" : `\`#${entry.rank}\``;
        let valStr = "";
        if (this.selectedMetric === "level") {
          valStr = `Level ${entry.value.toLocaleString()}`;
        } else if (this.selectedMetric === "streak") {
          valStr = `${entry.value.toLocaleString()} days`;
        } else {
          valStr = `${sym} ${entry.value.toLocaleString()}`;
        }

        content += `> ${medal} <@${entry.userId}> — **${valStr}**\n`;
      }
    }

    container.addTextDisplayComponents((t) => t.setContent(content));

    // Metric selector
    const metrics: LeaderboardMetric[] = ["net_worth", "wallet", "bank", "level", "streak"];
    const options = metrics.map((m) =>
      new StringSelectMenuOptionBuilder()
        .setLabel(metricLabels[m] || m)
        .setValue(m)
        .setDefault(m === this.selectedMetric)
    );

    const menuRow = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId(`${this.btnPrefix}select_metric`)
        .setPlaceholder("Select Leaderboard Category...")
        .addOptions(options)
    );
    container.addActionRowComponents(menuRow);

    // Prev / Next pagination buttons
    const btnRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(`${this.btnPrefix}prev`)
        .setLabel("◀ Previous")
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(this.page === 0),
      new ButtonBuilder()
        .setCustomId(`${this.btnPrefix}next`)
        .setLabel("Next ▶")
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(this.page >= totalPages - 1)
    );
    container.addActionRowComponents(btnRow);

    return container;
  }
}
