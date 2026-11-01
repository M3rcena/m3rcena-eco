/**
 * @m3rcena/eco
 * Interactive Discord Mystery Loot Crate Unboxing UI with Components V2.
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
import { CrateTier, CrateReward } from "../types.js";
import { CRATE_PRICES } from "../modules/CrateManager.js";

export interface EcoCrateUIOptions extends EcoBaseUIOptions {
  initialTier?: CrateTier;
}

export class EcoCrateUI extends EcoBaseUI<EcoCrateUIOptions> {
  private selectedTier: CrateTier = "rare";
  private btnPrefix: string;
  private isUnboxing: boolean = false;
  private lastReward: CrateReward | null = null;

  constructor(manager: any, options: EcoCrateUIOptions) {
    super(manager, options, "crate_");
    this.selectedTier = options.initialTier || "rare";
    this.btnPrefix = this.id + "_";
  }

  public async start(): Promise<void> {
    this.isActive = true;
    const container = this.buildContainer();

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
        ContextAdapter.replyEphemeral(interaction, "⛔ You cannot open someone else's mystery crates!");
        return;
      }

      await interaction.deferUpdate().catch(() => {});
      this.resetTimeout(() => this.destroy());

      if (interaction.isStringSelectMenu()) {
        if (interaction.customId === `${this.btnPrefix}select_tier`) {
          this.selectedTier = interaction.values[0] as CrateTier;
          this.lastReward = null;
        }
      } else if (interaction.isButton()) {
        const action = interaction.customId.replace(this.btnPrefix, "");
        if (action === "open") {
          this.isUnboxing = true;
          this.lastReward = null;

          const suspenseContainer = this.buildContainer();
          await this.ctx.edit({
            components: [suspenseContainer],
            flags: MessageFlags.IsComponentsV2,
          });

          try {
            this.lastReward = await this.manager.openCrate(
              this.ctx.userId,
              this.selectedTier,
              this.ctx.guild?.id
            );
          } catch (err: any) {
            ContextAdapter.replyEphemeral(interaction, `❌ ${err.message}`);
          } finally {
            this.isUnboxing = false;
          }
        }
      }

      const container = this.buildContainer();
      await this.ctx.edit({
        components: [container],
        flags: MessageFlags.IsComponentsV2,
      });
    });
  }

  private buildContainer() {
    const container = this.createContainer();
    const sym = this.manager.currencySymbol || "🪙";
    const cost = CRATE_PRICES[this.selectedTier] || 10000;

    const tierIcons: Record<CrateTier, string> = {
      common: "📦 Common Supply Drop",
      rare: "🔷 Rare Tech Capsule",
      epic: "💜 Epic Cyber Crate",
      legendary: "👑 Legendary Vault Box",
      mythic: "🌌 Mythic Celestial Relic",
    };

    let content = `## 🎁 Quantum Mystery Loot Crates\n` +
      `> **Selected Tier:** \`${tierIcons[this.selectedTier]}\`\n` +
      `> **Price to Unlock:** \`${sym} ${cost.toLocaleString()}\`\n\n`;

    if (this.isUnboxing) {
      content += `> ⏳ **UNBOXING IN PROGRESS...**\n` +
        `> *Decentralized cryptographic locks cracking... Rolling loot tables...*\n\n`;
    } else if (this.lastReward) {
      content += `### 🎊 Loot Drop Received!\n` +
        `> 💰 **Cash Rewarded:** \`${sym} ${this.lastReward.coins.toLocaleString()}\`\n` +
        `> ⭐ **Experience Points:** \`+${this.lastReward.xp} XP\`\n`;

      if (this.lastReward.item) {
        content += `> 🎒 **Special Item Received:** **${this.lastReward.item.name}** (*${this.lastReward.item.category}*)\n`;
      }
      content += `\n`;
    } else {
      content += `> *Select a crate tier from the menu below and press Open to reveal randomized riches, XP, and collectible items!* \n\n`;
    }

    container.addTextDisplayComponents((t) => t.setContent(content));

    if (!this.isUnboxing) {
      // Tier selector
      const tiers: CrateTier[] = ["common", "rare", "epic", "legendary", "mythic"];
      const options = tiers.map((t) =>
        new StringSelectMenuOptionBuilder()
          .setLabel(tierIcons[t])
          .setValue(t)
          .setDescription(`${sym} ${CRATE_PRICES[t].toLocaleString()}`)
          .setDefault(t === this.selectedTier)
      );

      const menuRow = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId(`${this.btnPrefix}select_tier`)
          .setPlaceholder("Select Crate Tier...")
          .addOptions(options)
      );
      container.addActionRowComponents(menuRow);

      // Open button
      const openRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId(`${this.btnPrefix}open`)
          .setLabel(`🎁 Open ${this.selectedTier.toUpperCase()} (${sym} ${cost.toLocaleString()})`)
          .setStyle(ButtonStyle.Success)
      );
      container.addActionRowComponents(openRow);
    }

    return container;
  }
}
