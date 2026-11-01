/**
 * @m3rcena/eco
 * Interactive Discord Stock & Crypto Exchange Terminal UI.
 *
 * @copyright 2026 M3rcena Development. All rights reserved.
 * @license Apache-2.0
 */

import {
  ActionRowBuilder,
  AttachmentBuilder,
  ButtonBuilder,
  ButtonStyle,
  Interaction,
  MessageFlags,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
} from "discord.js";
import { EcoBaseUI, EcoBaseUIOptions } from "./EcoBaseUI.js";
import { RenderMarketChart } from "../canvas/RenderMarketChart.js";
import { ContextAdapter } from "./ContextAdapter.js";
import { StockConfig } from "../types.js";

export interface EcoStockMarketUIOptions extends EcoBaseUIOptions {
  renderChart?: boolean;
}

export class EcoStockMarketUI extends EcoBaseUI<EcoStockMarketUIOptions> {
  private selectedSymbol: string = "$AETH";
  private chartBuffer: Buffer | null = null;
  private btnPrefix: string;

  constructor(manager: any, options: EcoStockMarketUIOptions) {
    super(manager, options, "stock_");
    this.btnPrefix = this.id + "_";
  }

  public async start(): Promise<void> {
    this.isActive = true;

    // Pick first stock if available
    const stocks = this.getStocks();
    if (stocks.length > 0 && !stocks.find((s) => s.symbol === this.selectedSymbol)) {
      this.selectedSymbol = stocks[0].symbol;
    }

    await this.updateChart();
    const container = await this.buildContainer();
    const files = this.chartBuffer ? [new AttachmentBuilder(this.chartBuffer, { name: "market-chart.png" })] : [];

    await this.ctx.sendInitial({
      components: [container],
      files,
      flags: MessageFlags.IsComponentsV2,
    });

    this.setupCollector();
    this.resetTimeout(() => this.destroy());
  }

  private getStocks(): StockConfig[] {
    if (this.manager.stocks && typeof this.manager.stocks.getStocks === "function") {
      return this.manager.stocks.getStocks();
    }
    return [];
  }

  private async updateChart(): Promise<void> {
    if (this.options.renderChart === false) return;
    const stocks = this.getStocks();
    const stock = stocks.find((s) => s.symbol.toUpperCase() === this.selectedSymbol.toUpperCase());
    if (!stock) return;

    try {
      this.chartBuffer = await RenderMarketChart.renderChart({
        symbol: stock.symbol,
        name: stock.name,
        currentPrice: stock.currentPrice,
        change24h: stock.change24h,
        history: stock.history,
      });
    } catch (err) {
      console.warn("Could not render market chart:", err);
    }
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
        ContextAdapter.replyEphemeral(interaction, "⛔ You cannot trade on someone else's market terminal!");
        return;
      }

      await interaction.deferUpdate().catch(() => {});
      this.resetTimeout(() => this.destroy());

      if (interaction.isStringSelectMenu()) {
        if (interaction.customId === `${this.btnPrefix}select_ticker`) {
          this.selectedSymbol = interaction.values[0];
          await this.updateChart();
        }
      } else if (interaction.isButton()) {
        const action = interaction.customId.replace(this.btnPrefix, "");
        if (action === "buy_1") {
          try {
            const res = await this.manager.buyStock(this.ctx.userId, this.selectedSymbol, 1, this.ctx.guild?.id);
            ContextAdapter.replyEphemeral(interaction, `📈 Bought 1 share of **${this.selectedSymbol}** at $${res.pricePerShare.toLocaleString()} (Total: $${res.totalAmount.toLocaleString()})`);
          } catch (err: any) {
            ContextAdapter.replyEphemeral(interaction, `❌ ${err.message}`);
          }
        } else if (action === "buy_10") {
          try {
            const res = await this.manager.buyStock(this.ctx.userId, this.selectedSymbol, 10, this.ctx.guild?.id);
            ContextAdapter.replyEphemeral(interaction, `📈 Bought 10 shares of **${this.selectedSymbol}** at $${res.pricePerShare.toLocaleString()} (Total: $${res.totalAmount.toLocaleString()})`);
          } catch (err: any) {
            ContextAdapter.replyEphemeral(interaction, `❌ ${err.message}`);
          }
        } else if (action === "sell_all") {
          try {
            const portfolio = await this.manager.getStockPortfolio(this.ctx.userId, this.ctx.guild?.id);
            const pos = portfolio.positions.find((p: any) => p.symbol.toUpperCase() === this.selectedSymbol.toUpperCase());
            if (!pos || pos.shares <= 0) {
              ContextAdapter.replyEphemeral(interaction, `❌ You don't own any shares of **${this.selectedSymbol}**.`);
            } else {
              const res = await this.manager.sellStock(this.ctx.userId, this.selectedSymbol, pos.shares, this.ctx.guild?.id);
              const pnlPrefix = (res.profitOrLoss ?? 0) >= 0 ? "+$" : "-$";
              ContextAdapter.replyEphemeral(interaction, `📉 Sold ${res.shares} shares of **${this.selectedSymbol}** for $${res.totalAmount.toLocaleString()}! (PnL: ${pnlPrefix}${Math.abs(res.profitOrLoss ?? 0).toLocaleString()})`);
            }
          } catch (err: any) {
            ContextAdapter.replyEphemeral(interaction, `❌ ${err.message}`);
          }
        } else if (action === "refresh") {
          // If stocks manager has tickMarket, tick it
          if (this.manager.stocks && typeof this.manager.stocks.tickMarket === "function") {
            this.manager.stocks.tickMarket();
          }
          await this.updateChart();
        }
      }

      const container = await this.buildContainer();
      const files = this.chartBuffer ? [new AttachmentBuilder(this.chartBuffer, { name: "market-chart.png" })] : [];

      await this.ctx.edit({
        components: [container],
        files,
        flags: MessageFlags.IsComponentsV2,
      });
    });
  }

  private async buildContainer() {
    const container = this.createContainer();
    const stocks = this.getStocks();
    const stock = stocks.find((s) => s.symbol.toUpperCase() === this.selectedSymbol.toUpperCase()) || stocks[0];
    const trend = this.manager.stocks?.getMarketTrend?.() || "STABLE";

    let portfolio: any = { positions: [], totalValue: 0, totalProfitLoss: 0 };
    try {
      portfolio = await this.manager.getStockPortfolio(this.ctx.userId, this.ctx.guild?.id);
    } catch {}

    const userPos = portfolio.positions?.find((p: any) => p.symbol.toUpperCase() === (stock?.symbol || "").toUpperCase());
    const sharesOwned = userPos ? userPos.shares : 0;
    const avgBuy = userPos ? userPos.averageBuyPrice : 0;
    const currentVal = stock ? sharesOwned * stock.currentPrice : 0;
    const pnl = userPos ? currentVal - userPos.totalInvested : 0;
    const pnlSign = pnl >= 0 ? "+" : "";

    const trendEmoji = trend === "BULL" ? "🟢 🐂 BULL MARKET" : trend === "BEAR" ? "🔴 🐻 BEAR MARKET" : "🟡 ⚖️ STABLE MARKET";
    const changeSign = stock && stock.change24h >= 0 ? "+" : "";

    let content = `## 📊 Global Financial & Crypto Exchange\n` +
      `> **Market Mood:** \`${trendEmoji}\`  •  **Total Portfolio Value:** \`$${(portfolio.totalValue || 0).toLocaleString()}\`\n\n`;

    if (stock) {
      content += `### 🏷️ Active Asset: ${stock.name} (${stock.symbol})\n` +
        `> **Current Price:** \`$${stock.currentPrice.toLocaleString()}\` (${changeSign}${stock.change24h}% 24h)\n` +
        `> **24h Range:** \`$${stock.low24h.toLocaleString()}\` — \`$${stock.high24h.toLocaleString()}\`  •  **Volatility:** \`${(stock.volatility * 100).toFixed(0)}%\`\n` +
        `> **Sector:** \`${stock.category}\`  •  **Info:** *${stock.description}*\n\n` +
        `> **Your Holdings:** \`${sharesOwned} shares\` (Valued at \`$${currentVal.toLocaleString()}\`)\n` +
        `> **Unrealized PnL:** \`${pnlSign}$${pnl.toLocaleString()}\` (Avg Buy: \`$${avgBuy.toLocaleString()}\`)\n`;
    }

    container.addTextDisplayComponents((t) => t.setContent(content));

    // Stock ticker select menu
    if (stocks.length > 0) {
      const options = stocks.map((s) =>
        new StringSelectMenuOptionBuilder()
          .setLabel(`${s.symbol} — ${s.name}`)
          .setValue(s.symbol)
          .setDescription(`$${s.currentPrice.toLocaleString()} (${s.change24h >= 0 ? "+" : ""}${s.change24h}%)`)
          .setDefault(s.symbol.toUpperCase() === this.selectedSymbol.toUpperCase())
      );

      const selectRow = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId(`${this.btnPrefix}select_ticker`)
          .setPlaceholder("Select an asset / cryptocurrency...")
          .addOptions(options)
      );
      container.addActionRowComponents(selectRow);
    }

    // Interactive buttons: Buy 1, Buy 10, Sell All, Refresh
    const actionRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(`${this.btnPrefix}buy_1`)
        .setLabel("Buy 1x")
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId(`${this.btnPrefix}buy_10`)
        .setLabel("Buy 10x")
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId(`${this.btnPrefix}sell_all`)
        .setLabel("Sell All")
        .setStyle(ButtonStyle.Danger)
        .setDisabled(sharesOwned <= 0),
      new ButtonBuilder()
        .setCustomId(`${this.btnPrefix}refresh`)
        .setLabel("🔄 Live Refresh")
        .setStyle(ButtonStyle.Secondary)
    );
    container.addActionRowComponents(actionRow);

    return container;
  }
}
