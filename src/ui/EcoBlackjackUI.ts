/**
 * @m3rcena/eco
 * Interactive Discord Blackjack Casino UI with Components V2.
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
} from "discord.js";
import { EcoBaseUI, EcoBaseUIOptions } from "./EcoBaseUI.js";
import { ContextAdapter } from "./ContextAdapter.js";
import { BlackjackState, Card } from "../modules/CasinoManager.js";

export interface EcoBlackjackUIOptions extends EcoBaseUIOptions {
  betAmount: number;
}

export class EcoBlackjackUI extends EcoBaseUI<EcoBlackjackUIOptions> {
  private state: BlackjackState | null = null;
  private btnPrefix: string;
  private initialBet: number;

  constructor(manager: any, options: EcoBlackjackUIOptions) {
    super(manager, options, "bj_");
    this.initialBet = Math.max(10, Math.floor(options.betAmount || 50));
    this.btnPrefix = this.id + "_";
  }

  public async start(): Promise<void> {
    this.isActive = true;

    try {
      this.state = await this.manager.startBlackjack(
        this.ctx.userId,
        this.initialBet,
        this.ctx.guild?.id
      );
    } catch (err: any) {
      await this.ctx.sendInitial({
        content: `❌ Could not start Blackjack game: ${err.message}`,
      });
      this.destroy();
      return;
    }

    const container = this.buildContainer();

    await this.ctx.sendInitial({
      components: [container],
      flags: MessageFlags.IsComponentsV2,
    });

    if (this.state && this.state.finished) {
      this.destroy();
      return;
    }

    this.setupCollector();
    this.resetTimeout(() => this.destroy(), 60_000);
  }

  private setupCollector(): void {
    if (!this.ctx.channel) return;
    const filter = (i: Interaction) => i.isButton() && i.customId.startsWith(this.btnPrefix);
    const collector = this.ctx.channel.createMessageComponentCollector({
      filter,
      time: 60_000,
    });

    collector.on("collect", async (interaction: any) => {
      if (interaction.user.id !== this.ctx.userId) {
        ContextAdapter.replyEphemeral(interaction, "⛔ You cannot play on someone else's blackjack table!");
        return;
      }

      if (!this.state || this.state.finished) {
        ContextAdapter.replyEphemeral(interaction, "⚠️ This hand has already concluded.");
        return;
      }

      await interaction.deferUpdate().catch(() => {});
      this.resetTimeout(() => this.destroy(), 60_000);

      const action = interaction.customId.replace(this.btnPrefix, "");
      try {
        if (action === "hit") {
          this.state = await this.manager.blackjackHit(this.state.gameId);
        } else if (action === "stand") {
          this.state = await this.manager.blackjackStand(this.state.gameId);
        } else if (action === "double") {
          this.state = await this.manager.blackjackDouble(this.state.gameId);
        }
      } catch (err: any) {
        ContextAdapter.replyEphemeral(interaction, `❌ ${err.message}`);
      }

      const container = this.buildContainer();
      await this.ctx.edit({
        components: [container],
        flags: MessageFlags.IsComponentsV2,
      });

      if (this.state?.finished) {
        collector.stop();
        this.destroy();
      }
    });
  }

  private formatCards(cards: Card[], hideSecond: boolean = false): string {
    if (hideSecond && cards.length > 1) {
      return `[\`${cards[0].rank}${cards[0].suit}\`] [\`🂠 ?\`]`;
    }
    return cards.map((c) => `[\`${c.rank}${c.suit}\`]`).join(" ");
  }

  private buildContainer() {
    const container = this.createContainer();
    const sym = this.manager.currencySymbol || "🪙";

    if (!this.state) {
      container.addTextDisplayComponents((t) => t.setContent("## 🎰 Blackjack Table\n> *No game in progress.*"));
      return container;
    }

    const isPlaying = !this.state.finished;
    const pCalc = this.manager.casino.calculateHand(this.state.playerHand);
    const dCalc = this.manager.casino.calculateHand(this.state.dealerHand);

    let statusText = "Game in progress... Hit or Stand?";
    if (this.state.status === "blackjack") {
      statusText = `🏆 **NATURAL BLACKJACK!** Payout: **${sym} ${this.state.payout.toLocaleString()}** (3:2)`;
    } else if (this.state.status === "player_win") {
      statusText = `🎉 **YOU WIN!** Dealer lost. Payout: **${sym} ${this.state.payout.toLocaleString()}**`;
    } else if (this.state.status === "dealer_bust") {
      statusText = `💥 **DEALER BUSTED!** Payout: **${sym} ${this.state.payout.toLocaleString()}**`;
    } else if (this.state.status === "player_bust") {
      statusText = `💥 **BUSTED!** Total exceeded 21. Lost: **${sym} ${this.state.betAmount.toLocaleString()}**`;
    } else if (this.state.status === "dealer_win") {
      statusText = `💀 **DEALER WINS!** Dealer had the superior hand. Lost: **${sym} ${this.state.betAmount.toLocaleString()}**`;
    } else if (this.state.status === "push") {
      statusText = `🤝 **PUSH (TIE)!** Bet of **${sym} ${this.state.betAmount.toLocaleString()}** refunded.`;
    }

    const dealerDisplay = isPlaying
      ? `${this.formatCards(this.state.dealerHand, true)} *(Showing ${this.state.dealerHand[0].value})*`
      : `${this.formatCards(this.state.dealerHand, false)} *(Total: **${dCalc.total}**)*`;

    const playerDisplay = `${this.formatCards(this.state.playerHand, false)} *(Total: **${pCalc.total}**${pCalc.isSoft ? " soft" : ""})*`;

    let content = `## 🎰 High Stakes VIP Blackjack Table\n` +
      `> **Player:** <@${this.ctx.userId}>  •  **Total Bet:** \`${sym} ${this.state.betAmount.toLocaleString()}\`\n\n` +
      `### 🤵 Dealer's Hand:\n> ${dealerDisplay}\n\n` +
      `### 🃏 Your Hand:\n> ${playerDisplay}\n\n` +
      `> **Table Status:** ${statusText}\n`;

    container.addTextDisplayComponents((t) => t.setContent(content));

    const canDouble = isPlaying && this.state.playerHand.length === 2;
    const actionRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(`${this.btnPrefix}hit`)
        .setLabel("🃏 Hit")
        .setStyle(ButtonStyle.Success)
        .setDisabled(!isPlaying),
      new ButtonBuilder()
        .setCustomId(`${this.btnPrefix}stand`)
        .setLabel("🛑 Stand")
        .setStyle(ButtonStyle.Danger)
        .setDisabled(!isPlaying),
      new ButtonBuilder()
        .setCustomId(`${this.btnPrefix}double`)
        .setLabel("⚡ Double Down")
        .setStyle(ButtonStyle.Primary)
        .setDisabled(!canDouble)
    );

    container.addActionRowComponents(actionRow);
    return container;
  }
}
