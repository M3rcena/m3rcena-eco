/**
 * @m3rcena/eco
 * Interactive Discord Economy Shop UI with Components V2.
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
import { ShopItem } from "../types.js";

export interface EcoShopUIOptions extends EcoBaseUIOptions {
  itemsPerPage?: number;
}

export class EcoShopUI extends EcoBaseUI<EcoShopUIOptions> {
  private selectedCategory: string = "ALL";
  private selectedItemId: string | null = null;
  private page: number = 0;
  private itemsPerPage: number = 5;
  private btnPrefix: string;

  constructor(manager: any, options: EcoShopUIOptions) {
    super(manager, options, "shop_");
    this.itemsPerPage = options.itemsPerPage || 5;
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
        ContextAdapter.replyEphemeral(interaction, "⛔ You cannot interact with someone else's shop menu!");
        return;
      }

      await interaction.deferUpdate().catch(() => {});
      this.resetTimeout(() => this.destroy());

      if (interaction.isStringSelectMenu()) {
        const value = interaction.values[0];
        if (interaction.customId === `${this.btnPrefix}category_select`) {
          this.selectedCategory = value;
          this.page = 0;
          this.selectedItemId = null;
        } else if (interaction.customId === `${this.btnPrefix}item_select`) {
          this.selectedItemId = value;
        }
      } else if (interaction.isButton()) {
        const action = interaction.customId.replace(this.btnPrefix, "");
        if (action === "prev_page") {
          this.page = Math.max(0, this.page - 1);
        } else if (action === "next_page") {
          this.page++;
        } else if (action === "buy_1") {
          if (this.selectedItemId) {
            try {
              const res = await this.manager.buyItem(this.ctx.userId, this.selectedItemId, 1, this.ctx.guild?.id);
              if (res.success) {
                ContextAdapter.replyEphemeral(interaction, `✅ Successfully purchased **1x ${res.item?.name || this.selectedItemId}** for ${this.manager.currencySymbol} ${res.totalPrice.toLocaleString()}!`);
              } else {
                ContextAdapter.replyEphemeral(interaction, `❌ ${res.message || "Purchase failed."}`);
              }
            } catch (err: any) {
              ContextAdapter.replyEphemeral(interaction, `❌ Error: ${err.message}`);
            }
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
    const allItems: ShopItem[] = this.manager.shop ? this.manager.shop.getItems() : [];

    const categories = Array.from(new Set(allItems.map((i) => i.category.toUpperCase())));
    const filtered = allItems.filter((item) =>
      this.selectedCategory === "ALL" ? true : item.category.toUpperCase() === this.selectedCategory
    );

    const totalPages = Math.ceil(filtered.length / this.itemsPerPage) || 1;
    if (this.page >= totalPages) this.page = totalPages - 1;

    const startIdx = this.page * this.itemsPerPage;
    const pageItems = filtered.slice(startIdx, startIdx + this.itemsPerPage);

    // If no item is selected, select the first one on the page
    if (!this.selectedItemId && pageItems.length > 0) {
      this.selectedItemId = pageItems[0].id;
    } else if (this.selectedItemId && !pageItems.find((i) => i.id === this.selectedItemId) && pageItems.length > 0) {
      this.selectedItemId = pageItems[0].id;
    }

    const selectedItem = allItems.find((i) => i.id === this.selectedItemId);

    let content = `## 🛒 Nexus Marketplace\n` +
      `> **Category:** \`${this.selectedCategory}\`  •  **Page:** \`${this.page + 1}/${totalPages}\`\n\n`;

    if (pageItems.length === 0) {
      content += `> *No items available in this category.*\n`;
    } else {
      for (const item of pageItems) {
        const isSel = item.id === this.selectedItemId ? "👉 " : "• ";
        content += `${isSel}**${item.name}** [${sym} ${item.price.toLocaleString()}] — *${item.description}*\n`;
      }
    }

    if (selectedItem) {
      content += `\n### 📦 Selected Item: ${selectedItem.name}\n` +
        `> **Price:** \`${sym} ${selectedItem.price.toLocaleString()}\`  •  **Type:** \`${selectedItem.category}\`\n` +
        `> **Description:** ${selectedItem.description}\n`;
    }

    container.addTextDisplayComponents((t) => t.setContent(content));

    // Category select menu
    const catOptions = [
      new StringSelectMenuOptionBuilder()
        .setLabel("All Categories")
        .setValue("ALL")
        .setDescription("Browse entire catalog")
        .setDefault(this.selectedCategory === "ALL"),
      ...categories.map((cat) =>
        new StringSelectMenuOptionBuilder()
          .setLabel(cat.charAt(0) + cat.slice(1).toLowerCase())
          .setValue(cat)
          .setDescription(`Filter by ${cat.toLowerCase()}`)
          .setDefault(this.selectedCategory === cat)
      ),
    ];

    const catRow = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId(`${this.btnPrefix}category_select`)
        .setPlaceholder("Filter by Category...")
        .addOptions(catOptions)
    );
    container.addActionRowComponents(catRow);

    // Item select menu if items exist on page
    if (pageItems.length > 0) {
      const itemOptions = pageItems.map((it) =>
        new StringSelectMenuOptionBuilder()
          .setLabel(it.name)
          .setValue(it.id)
          .setDescription(`${sym} ${it.price.toLocaleString()} — ${it.category}`)
          .setDefault(it.id === this.selectedItemId)
      );

      const itemRow = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId(`${this.btnPrefix}item_select`)
          .setPlaceholder("Select an item to inspect or purchase...")
          .addOptions(itemOptions)
      );
      container.addActionRowComponents(itemRow);
    }

    // Action buttons: Prev, Buy 1, Next
    const btnRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(`${this.btnPrefix}prev_page`)
        .setLabel("◀ Previous")
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(this.page === 0),
      new ButtonBuilder()
        .setCustomId(`${this.btnPrefix}buy_1`)
        .setLabel(`Buy Selected`)
        .setStyle(ButtonStyle.Success)
        .setDisabled(!selectedItem),
      new ButtonBuilder()
        .setCustomId(`${this.btnPrefix}next_page`)
        .setLabel("Next ▶")
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(this.page >= totalPages - 1)
    );
    container.addActionRowComponents(btnRow);

    return container;
  }
}
