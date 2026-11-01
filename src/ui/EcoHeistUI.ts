/**
 * @m3rcena/eco
 * Interactive Discord Multiplayer Crew Bank Heist UI.
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
import { HeistTarget, HeistRole, HeistSession, HeistResult } from "../types.js";
import { DEFAULT_HEIST_TARGETS } from "../modules/HeistManager.js";

export interface EcoHeistUIOptions extends EcoBaseUIOptions {
  initialTargetId?: string;
}

export class EcoHeistUI extends EcoBaseUI<EcoHeistUIOptions> {
  private targetId: string = "city_trust_bank";
  private session: HeistSession | null = null;
  private btnPrefix: string;
  private statusMessage: string = "Waiting for crew members to select their roles...";
  private isExecuting: boolean = false;
  private outcome: HeistResult | null = null;

  constructor(manager: any, options: EcoHeistUIOptions) {
    super(manager, options, "heist_");
    this.targetId = options.initialTargetId || "city_trust_bank";
    this.btnPrefix = this.id + "_";
  }

  public async start(): Promise<void> {
    this.isActive = true;

    // Create session in HeistManager
    try {
      this.session = await this.manager.createHeist(
        this.ctx.userId,
        this.targetId,
        this.ctx.guild?.id
      );
    } catch (err: any) {
      this.statusMessage = `Error initializing heist: ${err.message}`;
    }

    const container = this.buildContainer();

    await this.ctx.sendInitial({
      components: [container],
      flags: MessageFlags.IsComponentsV2,
    });

    this.setupCollector();
    this.resetTimeout(() => this.destroy(), 180_000);
  }

  private setupCollector(): void {
    if (!this.ctx.channel) return;
    const filter = (i: Interaction) =>
      (i.isButton() && i.customId.startsWith(this.btnPrefix)) ||
      (i.isStringSelectMenu() && i.customId.startsWith(this.btnPrefix));

    const collector = this.ctx.channel.createMessageComponentCollector({
      filter,
      time: 180_000,
    });

    collector.on("collect", async (interaction: any) => {
      if (this.isExecuting || this.outcome) {
        ContextAdapter.replyEphemeral(interaction, "⚠️ The heist has already been executed.");
        return;
      }

      await interaction.deferUpdate().catch(() => {});
      this.resetTimeout(() => this.destroy(), 180_000);

      if (interaction.isStringSelectMenu()) {
        if (interaction.customId === `${this.btnPrefix}select_target`) {
          if (interaction.user.id !== this.ctx.userId) {
            ContextAdapter.replyEphemeral(interaction, "⛔ Only the crew leader can change the vault target!");
            return;
          }
          this.targetId = interaction.values[0];
          try {
            this.session = await this.manager.createHeist(
              this.ctx.userId,
              this.targetId,
              this.ctx.guild?.id
            );
          } catch {}
        }
      } else if (interaction.isButton()) {
        const action = interaction.customId.replace(this.btnPrefix, "");
        if (action.startsWith("join_")) {
          const role = action.replace("join_", "").toUpperCase() as HeistRole;
          try {
            if (this.session) {
              const username = interaction.user.username;
              const res = await this.manager.joinHeist(
                this.session.id,
                interaction.user.id,
                role,
                username
              );
              this.session = res.session;
              this.statusMessage = `🤝 **${username}** joined as the **${role}**!`;
            }
          } catch (err: any) {
            ContextAdapter.replyEphemeral(interaction, `❌ ${err.message}`);
          }
        } else if (action === "execute") {
          if (interaction.user.id !== this.ctx.userId) {
            ContextAdapter.replyEphemeral(interaction, "⛔ Only the crew leader can trigger the breach!");
            return;
          }
          if (!this.session) return;

          const target = this.getTarget();
          if (this.session.crew.length < target.minCrew) {
            ContextAdapter.replyEphemeral(
              interaction,
              `❌ Need at least ${target.minCrew} crew members to attempt this vault! Currently: ${this.session.crew.length}`
            );
            return;
          }

          // Trigger execution simulation
          this.isExecuting = true;
          this.statusMessage = "🚨 **BREACH IN PROGRESS!** Cutting power grid & drilling safety vault...";

          const interimContainer = this.buildContainer();
          await this.ctx.edit({
            components: [interimContainer],
            flags: MessageFlags.IsComponentsV2,
          });

          try {
            this.outcome = await this.manager.executeHeist(this.session.id);
            if (this.outcome?.success) {
              this.statusMessage = `🏆 **VAULT CLEANED OUT!** Stole **$${this.outcome.totalLoot.toLocaleString()}**!`;
            } else {
              this.statusMessage = `🚔 **BUSTED BY SWAT!** Heist failed. Bail fee paid: $${(this.outcome?.finePerPlayer || 0).toLocaleString()}`;
            }
          } catch (err: any) {
            this.statusMessage = `❌ Execution failed: ${err.message}`;
          } finally {
            this.isExecuting = false;
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

  private getTarget(): HeistTarget {
    const targets = this.manager.heist?.getTargets?.() || DEFAULT_HEIST_TARGETS;
    return targets.find((t: HeistTarget) => t.id === this.targetId) || targets[0];
  }

  private buildContainer() {
    const container = this.createContainer();
    const target = this.getTarget();
    const crew = this.session?.crew || [];
    const sym = this.manager.currencySymbol || "🪙";

    let content = `## 🏦 Syndicate Crew Bank Heist Operations\n` +
      `> **Leader:** <@${this.ctx.userId}>  •  **Target:** \`${target.name}\` [${target.difficulty}]\n` +
      `> **Potential Haul:** \`${sym} ${target.baseBountyMin.toLocaleString()}\` — \`${sym} ${target.baseBountyMax.toLocaleString()}\`\n` +
      `> **Failure Bail Risk:** \`${sym} ${target.failureBail.toLocaleString()}\`  •  **Base Success Odds:** \`${(target.successRate * 100).toFixed(0)}%\`\n\n` +
      `> **Status:** ${this.statusMessage}\n\n`;

    content += `### 👥 Active Crew Roster (${crew.length}/${target.maxCrew})\n`;
    if (crew.length === 0) {
      content += `> *No crew members assembled yet. Claim a role below to gear up!*\n`;
    } else {
      for (const member of crew) {
        const icon = member.role === "HACKER" ? "💻" : member.role === "DRIVER" ? "🚗" : member.role === "DEMOLITIONIST" ? "💣" : "💪";
        content += `> ${icon} **${member.role}**: **${member.username}** (<@${member.userId}>)\n`;
      }
    }

    if (this.outcome) {
      content += `\n### 📋 After-Action Report\n`;
      if (this.outcome.success) {
        content += `> 💰 **Total Loot Taken:** \`${sym} ${this.outcome.totalLoot.toLocaleString()}\`\n` +
          `> 💵 **Cut Per Operative:** \`${sym} ${this.outcome.sharePerPlayer.toLocaleString()}\`\n`;
      } else {
        content += `> 🚔 **Interception:** Police interceptors cornered the team.\n` +
          `> 💸 **Bail Deducted:** \`${sym} ${(this.outcome.finePerPlayer || 0).toLocaleString()}\` each\n`;
      }
    }

    container.addTextDisplayComponents((t) => t.setContent(content));

    // Target selection menu if not executing or finished
    if (!this.isExecuting && !this.outcome) {
      const targets = this.manager.heist?.getTargets?.() || DEFAULT_HEIST_TARGETS;
      const targetOptions = targets.map((t: HeistTarget) =>
        new StringSelectMenuOptionBuilder()
          .setLabel(`${t.name} [${t.difficulty}]`)
          .setValue(t.id)
          .setDescription(`Crew: ${t.minCrew}-${t.maxCrew} | Payout: ${sym} ${t.baseBountyMin.toLocaleString()}+`)
          .setDefault(t.id === this.targetId)
      );

      const targetRow = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId(`${this.btnPrefix}select_target`)
          .setPlaceholder("Select a vault target...")
          .addOptions(targetOptions)
      );
      container.addActionRowComponents(targetRow);

      // Role claim buttons: Hacker, Driver, Demo, Muscle
      const roleRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId(`${this.btnPrefix}join_hacker`)
          .setLabel("💻 Hacker")
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId(`${this.btnPrefix}join_driver`)
          .setLabel("🚗 Driver")
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId(`${this.btnPrefix}join_demolitionist`)
          .setLabel("💣 Demo")
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId(`${this.btnPrefix}join_muscle`)
          .setLabel("💪 Muscle")
          .setStyle(ButtonStyle.Secondary)
      );
      container.addActionRowComponents(roleRow);

      // Launch button
      const canLaunch = crew.length >= target.minCrew && crew.length <= target.maxCrew;
      const launchRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId(`${this.btnPrefix}execute`)
          .setLabel(canLaunch ? "🚀 Launch Heist Breach" : `Need ${target.minCrew}+ Crew to Launch`)
          .setStyle(canLaunch ? ButtonStyle.Success : ButtonStyle.Secondary)
          .setDisabled(!canLaunch)
      );
      container.addActionRowComponents(launchRow);
    }

    return container;
  }
}
