import { A as DEFAULT_SHOP_ITEMS, B as applyPrismaEcoModel, C as HeistManager, D as CasinoManager, E as LeaderboardManager, F as BankManager, H as JsonEcoStorage, I as EcoDatabaseHandler, L as resolveEcoStorage, M as CareerManager, N as DEFAULT_JOBS, O as BusinessManager, P as RewardManager, R as PRISMA_ECO_MODEL, S as DEFAULT_HEIST_TARGETS, T as StockMarketManager, U as MemoryEcoStorage, V as SqliteEcoStorage, W as createDefaultAccount, _ as VaultManager, a as ECO_VERSION, b as DEFAULT_PETS, c as compareSemver, d as RenderMarketChart, f as RenderBankCard, g as DEFAULT_VAULT_TIERS, h as LoanManager, i as EcoBridgeRouter, j as ShopManager, k as DEFAULT_BUSINESS_CATALOG, l as fetchLatestVersion, m as LOAN_CATALOG, n as EcoManager, o as boxConsole, p as TaxManager, r as EcoWekyConnector, s as checkPackageUpdates, t as hostEco, u as stripAnsi, v as CRATE_PRICES, w as DEFAULT_STOCKS, x as PetManager, y as CrateManager, z as PrismaEcoStorage } from "./host-WzbkBFzD.mjs";
import { findProjectRoot, generateTsConfigPaths, getAllPackageResolutions, isTypeScriptRuntime, loadResolverConfig, printResolutionSummary, resolvePackage } from "./resolver.mjs";
import { ActionRowBuilder, AttachmentBuilder, ButtonBuilder, ButtonStyle, ContainerBuilder, GuildMember, Message, MessageFlags, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, User, resolveColor } from "discord.js";
import { M3rcenaBridge } from "@m3rcena/bridge";
// src/ui/ContextAdapter.ts
/**
* @m3rcena/eco
* Discord Context Adapter for Unified Slash Command, Message, and Dashboard Execution.
*
* @copyright 2026 M3rcena Development. All rights reserved.
* @license Apache-2.0
*/
var ContextAdapter = class ContextAdapter {
	raw;
	user;
	userId;
	member;
	guild;
	channel;
	client;
	isInteraction;
	isMessage;
	gameMessage = null;
	constructor(context) {
		if (context instanceof ContextAdapter) context = context.raw;
		this.raw = context;
		if (context instanceof Message) {
			this.isMessage = true;
			this.isInteraction = false;
			this.user = context.author;
			this.userId = context.author.id;
			this.member = context.member ?? null;
			this.guild = context.guild ?? null;
			this.channel = context.channel;
			this.client = context.client;
		} else if (typeof context?.reply === "function") {
			this.isInteraction = true;
			this.isMessage = false;
			this.user = context.user || context.author;
			this.userId = this.user?.id || context.member?.id;
			this.member = context.member ?? null;
			this.guild = context.guild ?? null;
			this.channel = context.channel;
			this.client = context.client;
		} else {
			this.isInteraction = false;
			this.isMessage = true;
			this.user = context.user || context.author;
			this.userId = this.user?.id || context.member?.id;
			this.member = context.member ?? null;
			this.guild = context.guild ?? null;
			this.channel = context.channel || (typeof context.send === "function" ? context : null);
			this.client = context.client;
		}
		if (!this.user || !this.channel) throw new Error("[ContextAdapter] Invalid Discord context: unable to resolve user or channel.");
	}
	static from(context) {
		return new ContextAdapter(context);
	}
	resolveFlags(options) {
		let flags = typeof options.flags === "number" ? options.flags : 0;
		if (options.components?.some((c) => c instanceof ContainerBuilder || typeof c?.setAccentColor === "function" || c?.data?.type === 17)) flags |= MessageFlags.IsComponentsV2;
		return flags > 0 ? flags : void 0;
	}
	async sendInitial(options) {
		if (typeof this.raw?.sendInitial === "function") {
			const msg = await this.raw.sendInitial(options);
			this.gameMessage = msg;
			return msg;
		}
		const resolvedFlags = this.resolveFlags(options);
		const isV2 = !!((resolvedFlags ?? 0) & MessageFlags.IsComponentsV2);
		if (this.isInteraction) {
			const interaction = this.raw;
			if (interaction.deferred || interaction.replied) {
				const payload = {
					components: options.components,
					files: options.files,
					flags: resolvedFlags
				};
				if (!isV2) {
					if (options.content !== void 0) payload.content = options.content;
					if (options.embeds !== void 0) payload.embeds = options.embeds;
				}
				const msg = await interaction.editReply(payload);
				if (msg instanceof Message) this.gameMessage = msg;
				else if (typeof interaction.fetchReply === "function") this.gameMessage = await interaction.fetchReply().catch(() => null);
				else this.gameMessage = msg || null;
			} else {
				const payload = {
					components: options.components,
					files: options.files,
					flags: resolvedFlags,
					withResponse: true
				};
				if (!isV2) {
					if (options.content !== void 0) payload.content = options.content;
					if (options.embeds !== void 0) payload.embeds = options.embeds;
				}
				const response = await interaction.reply(payload);
				if (response && typeof response === "object" && "resource" in response && response.resource?.message) this.gameMessage = response.resource.message;
				else if (response instanceof Message || response && typeof response === "object" && "id" in response) this.gameMessage = response;
				else if (typeof interaction.fetchReply === "function") this.gameMessage = await interaction.fetchReply().catch(() => null);
				else this.gameMessage = response || null;
			}
		} else {
			const channel = this.channel;
			if (typeof channel.send !== "function") throw new Error("[ContextAdapter] The provided channel is not sendable.");
			const payload = {
				components: options.components,
				files: options.files,
				flags: resolvedFlags,
				allowedMentions: { repliedUser: false }
			};
			if (!isV2) {
				if (options.content !== void 0) payload.content = options.content;
				if (options.embeds !== void 0) payload.embeds = options.embeds;
			}
			const msg = await channel.send(payload);
			this.gameMessage = msg;
		}
		return this.gameMessage;
	}
	async edit(options) {
		if (typeof this.raw?.edit === "function") {
			await this.raw.edit(options);
			return;
		}
		if (!this.gameMessage) {
			await this.sendInitial(options);
			return;
		}
		const resolvedFlags = this.resolveFlags(options);
		const isV2 = !!((resolvedFlags ?? 0) & MessageFlags.IsComponentsV2);
		const payload = {
			components: options.components ?? [],
			files: options.files ?? [],
			flags: resolvedFlags
		};
		if (!isV2) {
			payload.content = options.content ?? null;
			payload.embeds = options.embeds ?? [];
		}
		try {
			await this.gameMessage.edit(payload);
		} catch (err) {
			if (err.code !== 10008 && err.code !== 50027) {}
		}
	}
	static async replyEphemeral(interaction, content) {
		try {
			if (typeof interaction.reply === "function") {
				if (interaction.replied || interaction.deferred) await interaction.followUp({
					content,
					flags: MessageFlags.Ephemeral
				});
				else await interaction.reply({
					content,
					flags: MessageFlags.Ephemeral
				});
			}
		} catch {}
	}
};
// src/ui/EcoBaseUI.ts
/**
* @m3rcena/eco
* Base Class for Interactive Discord Economy UI Modules.
*
* @copyright 2026 M3rcena Development. All rights reserved.
* @license Apache-2.0
*/
var EcoBaseUI = class {
	manager;
	options;
	ctx;
	id;
	defaultColor = 5793266;
	isActive = false;
	timeoutTimer = null;
	defaultTimeout = 12e4;
	constructor(manager, options, prefix = "eco_") {
		this.manager = manager;
		this.options = options;
		this.ctx = ContextAdapter.from(options.context);
		this.id = `${prefix}${Math.random().toString(36).substring(2, 8)}`;
		this.defaultTimeout = options.time || 12e4;
		this.defaultColor = this.resolveColor(options.embedColor || manager?.embedColor);
	}
	resolveColor(color, fallback = 5793266) {
		if (!color) return fallback;
		if (typeof color === "number") return color;
		if (typeof color === "string") {
			if (color.startsWith("#")) {
				const parsed = parseInt(color.replace("#", ""), 16);
				if (!isNaN(parsed)) return parsed;
			}
		}
		try {
			return resolveColor(color);
		} catch {
			return fallback;
		}
	}
	createContainer(color) {
		const container = new ContainerBuilder();
		container.setAccentColor(color !== void 0 ? color : this.defaultColor);
		return container;
	}
	resetTimeout(callback, customMs) {
		this.clearTimer();
		const duration = customMs || this.defaultTimeout;
		this.timeoutTimer = setTimeout(() => {
			if (this.isActive) {
				if (callback) callback();
				else this.destroy();
			}
		}, duration);
		if (typeof this.timeoutTimer.unref === "function") this.timeoutTimer.unref();
	}
	clearTimer() {
		if (this.timeoutTimer) {
			clearTimeout(this.timeoutTimer);
			this.timeoutTimer = null;
		}
	}
	destroy() {
		this.isActive = false;
		this.clearTimer();
	}
	format(template, vars) {
		let result = template;
		for (const [key, value] of Object.entries(vars)) result = result.replaceAll(`{{${key}}}`, String(value));
		return result;
	}
};
// src/ui/EcoProfileUI.ts
/**
* @m3rcena/eco
* Interactive Discord Economy Profile & Passport UI.
*
* @copyright 2026 M3rcena Development. All rights reserved.
* @license Apache-2.0
*/
var EcoProfileUI = class extends EcoBaseUI {
	targetUser;
	currentTab = "OVERVIEW";
	btnPrefix;
	cardBuffer = null;
	constructor(manager, options) {
		super(manager, options, "prof_");
		const target = options.targetUser;
		if (target instanceof GuildMember) this.targetUser = target.user;
		else if (target instanceof User) this.targetUser = target;
		else this.targetUser = this.ctx.user;
		this.btnPrefix = this.id + "_";
	}
	async start() {
		this.isActive = true;
		const account = await this.manager.getAccount(this.targetUser.id, this.ctx.guild?.id);
		if (this.options.renderCard !== false) try {
			const avatarUrl = this.targetUser.displayAvatarURL ? this.targetUser.displayAvatarURL({
				extension: "png",
				size: 128
			}) : void 0;
			this.cardBuffer = await RenderBankCard.renderCard({
				username: this.targetUser.username,
				avatarUrl,
				wallet: account.wallet,
				bank: account.bank,
				netWorth: account.wallet + account.bank,
				currencySymbol: this.manager.currencySymbol
			});
		} catch (err) {
			console.warn("Could not generate canvas bank card:", err);
		}
		const container = this.buildContainer(account);
		const files = this.cardBuffer && this.currentTab === "OVERVIEW" ? [new AttachmentBuilder(this.cardBuffer, { name: "bank-card.png" })] : [];
		await this.ctx.sendInitial({
			components: [container],
			files,
			flags: MessageFlags.IsComponentsV2
		});
		this.setupCollector();
		this.resetTimeout(() => this.destroy());
	}
	setupCollector() {
		if (!this.ctx.channel) return;
		const filter = (i) => i.isButton() && i.customId.startsWith(this.btnPrefix);
		this.ctx.channel.createMessageComponentCollector({
			filter,
			time: this.defaultTimeout
		}).on("collect", async (interaction) => {
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
				flags: MessageFlags.IsComponentsV2
			});
		});
	}
	buildContainer(account) {
		const container = this.createContainer();
		const sym = this.manager.currencySymbol || "🪙";
		let content = "";
		if (this.currentTab === "OVERVIEW") {
			const netWorth = account.wallet + account.bank;
			const job = account.career?.jobTitle || "Unemployed";
			const streak = account.streak?.daily || 0;
			const reqXp = account.level * 250;
			content = `## 💳 Financial Passport: ${this.targetUser.username}\n> **Net Worth:** \`${sym} ${netWorth.toLocaleString()}\`  •  **Level:** \`${account.level}\` (\`${account.xp}/${reqXp} XP\`)\n> **Cash in Wallet:** \`${sym} ${account.wallet.toLocaleString()}\`\n> **Bank Vault:** \`${sym} ${account.bank.toLocaleString()}\` / \`${sym} ${account.bankCapacity.toLocaleString()}\`\n> **Daily Streak:** \`🔥 ${streak} Days\`  •  **Career:** \`💼 ${job}\`\n\n*Click the interactive buttons below to inspect inventory, investments, and businesses.*`;
		} else if (this.currentTab === "INVENTORY") {
			const items = account.inventory || [];
			content = `## 🎒 Backpack & Inventory: ${this.targetUser.username}\n`;
			if (items.length === 0) content += `> *Your backpack is completely empty. Visit the shop to purchase tools and upgrades!*`;
			else content += items.map((it) => `> • **${it.name || it.itemId}** (x${it.quantity}) — *${it.category}*`).join("\n");
		} else if (this.currentTab === "BUSINESSES") {
			const biz = account.businesses || [];
			content = `## 🏢 Enterprise Portfolio: ${this.targetUser.username}\n`;
			if (biz.length === 0) content += `> *No companies owned yet. Purchase a business to unlock automated passive income!*`;
			else content += biz.map((b) => `> • **${b.name || b.businessId}** [Level ${b.level}] — 👥 ${b.employees} Staff • Total Rev: \`${sym} ${(b.totalCollected || 0).toLocaleString()}\``).join("\n");
		} else if (this.currentTab === "STOCKS") {
			const stocks = account.stocks || [];
			content = `## 📈 Stock & Crypto Portfolio: ${this.targetUser.username}\n`;
			if (stocks.length === 0) content += `> *No active investments. Browse the stock exchange to trade tech shares and crypto!*`;
			else content += stocks.map((p) => `> • **${p.symbol}**: \`${p.shares} shares\` (Avg Buy: \`$${p.averageBuyPrice.toLocaleString()}\` • Total Invested: \`$${p.totalInvested.toLocaleString()}\`)`).join("\n");
		} else if (this.currentTab === "PETS") {
			const pets = account.pets || [];
			content = `## 🐾 Companion Shelter: ${this.targetUser.username}\n`;
			if (pets.length === 0) content += `> *No companion pets adopted. Adopt a Cybernetic K9 or Lucky Cat to gain foraging loot and defense buffs!*`;
			else content += pets.map((pet) => `> • **${pet.name}** (${pet.species}) [Lvl ${pet.level}] — 🍖 Hunger: \`${pet.hunger}%\` • ❤️ Joy: \`${pet.happiness}%\` ${pet.isExpeditionActive ? "• *[Expedition Active]*" : ""}`).join("\n");
		}
		container.addTextDisplayComponents((t) => t.setContent(content));
		const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId(`${this.btnPrefix}tab_overview`).setLabel("💳 Overview").setStyle(this.currentTab === "OVERVIEW" ? ButtonStyle.Primary : ButtonStyle.Secondary), new ButtonBuilder().setCustomId(`${this.btnPrefix}tab_inv`).setLabel("🎒 Backpack").setStyle(this.currentTab === "INVENTORY" ? ButtonStyle.Primary : ButtonStyle.Secondary), new ButtonBuilder().setCustomId(`${this.btnPrefix}tab_biz`).setLabel("🏢 Businesses").setStyle(this.currentTab === "BUSINESSES" ? ButtonStyle.Primary : ButtonStyle.Secondary), new ButtonBuilder().setCustomId(`${this.btnPrefix}tab_stocks`).setLabel("📈 Stocks").setStyle(this.currentTab === "STOCKS" ? ButtonStyle.Primary : ButtonStyle.Secondary), new ButtonBuilder().setCustomId(`${this.btnPrefix}tab_pets`).setLabel("🐾 Pets").setStyle(this.currentTab === "PETS" ? ButtonStyle.Primary : ButtonStyle.Secondary));
		container.addActionRowComponents(row);
		return container;
	}
};
// src/ui/EcoShopUI.ts
/**
* @m3rcena/eco
* Interactive Discord Economy Shop UI with Components V2.
*
* @copyright 2026 M3rcena Development. All rights reserved.
* @license Apache-2.0
*/
var EcoShopUI = class extends EcoBaseUI {
	selectedCategory = "ALL";
	selectedItemId = null;
	page = 0;
	itemsPerPage = 5;
	btnPrefix;
	constructor(manager, options) {
		super(manager, options, "shop_");
		this.itemsPerPage = options.itemsPerPage || 5;
		this.btnPrefix = this.id + "_";
	}
	async start() {
		this.isActive = true;
		const container = await this.buildContainer();
		await this.ctx.sendInitial({
			components: [container],
			flags: MessageFlags.IsComponentsV2
		});
		this.setupCollector();
		this.resetTimeout(() => this.destroy());
	}
	setupCollector() {
		if (!this.ctx.channel) return;
		const filter = (i) => i.isButton() && i.customId.startsWith(this.btnPrefix) || i.isStringSelectMenu() && i.customId.startsWith(this.btnPrefix);
		this.ctx.channel.createMessageComponentCollector({
			filter,
			time: this.defaultTimeout
		}).on("collect", async (interaction) => {
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
				} else if (interaction.customId === `${this.btnPrefix}item_select`) this.selectedItemId = value;
			} else if (interaction.isButton()) {
				const action = interaction.customId.replace(this.btnPrefix, "");
				if (action === "prev_page") this.page = Math.max(0, this.page - 1);
				else if (action === "next_page") this.page++;
				else if (action === "buy_1") {
					if (this.selectedItemId) try {
						const res = await this.manager.buyItem(this.ctx.userId, this.selectedItemId, 1, this.ctx.guild?.id);
						if (res.success) ContextAdapter.replyEphemeral(interaction, `✅ Successfully purchased **1x ${res.item?.name || this.selectedItemId}** for ${this.manager.currencySymbol} ${res.totalPrice.toLocaleString()}!`);
						else ContextAdapter.replyEphemeral(interaction, `❌ ${res.message || "Purchase failed."}`);
					} catch (err) {
						ContextAdapter.replyEphemeral(interaction, `❌ Error: ${err.message}`);
					}
				}
			}
			const container = await this.buildContainer();
			await this.ctx.edit({
				components: [container],
				flags: MessageFlags.IsComponentsV2
			});
		});
	}
	async buildContainer() {
		const container = this.createContainer();
		const sym = this.manager.currencySymbol || "🪙";
		const allItems = this.manager.shop ? this.manager.shop.getItems() : [];
		const categories = Array.from(new Set(allItems.map((i) => i.category.toUpperCase())));
		const filtered = allItems.filter((item) => this.selectedCategory === "ALL" ? true : item.category.toUpperCase() === this.selectedCategory);
		const totalPages = Math.ceil(filtered.length / this.itemsPerPage) || 1;
		if (this.page >= totalPages) this.page = totalPages - 1;
		const startIdx = this.page * this.itemsPerPage;
		const pageItems = filtered.slice(startIdx, startIdx + this.itemsPerPage);
		if (!this.selectedItemId && pageItems.length > 0) this.selectedItemId = pageItems[0].id;
		else if (this.selectedItemId && !pageItems.find((i) => i.id === this.selectedItemId) && pageItems.length > 0) this.selectedItemId = pageItems[0].id;
		const selectedItem = allItems.find((i) => i.id === this.selectedItemId);
		let content = `## 🛒 Nexus Marketplace\n> **Category:** \`${this.selectedCategory}\`  •  **Page:** \`${this.page + 1}/${totalPages}\`\n\n`;
		if (pageItems.length === 0) content += `> *No items available in this category.*\n`;
		else for (const item of pageItems) {
			const isSel = item.id === this.selectedItemId ? "👉 " : "• ";
			content += `${isSel}**${item.name}** [${sym} ${item.price.toLocaleString()}] — *${item.description}*\n`;
		}
		if (selectedItem) content += `\n### 📦 Selected Item: ${selectedItem.name}\n> **Price:** \`${sym} ${selectedItem.price.toLocaleString()}\`  •  **Type:** \`${selectedItem.category}\`\n> **Description:** ${selectedItem.description}\n`;
		container.addTextDisplayComponents((t) => t.setContent(content));
		const catOptions = [new StringSelectMenuOptionBuilder().setLabel("All Categories").setValue("ALL").setDescription("Browse entire catalog").setDefault(this.selectedCategory === "ALL"), ...categories.map((cat) => new StringSelectMenuOptionBuilder().setLabel(cat.charAt(0) + cat.slice(1).toLowerCase()).setValue(cat).setDescription(`Filter by ${cat.toLowerCase()}`).setDefault(this.selectedCategory === cat))];
		const catRow = new ActionRowBuilder().addComponents(new StringSelectMenuBuilder().setCustomId(`${this.btnPrefix}category_select`).setPlaceholder("Filter by Category...").addOptions(catOptions));
		container.addActionRowComponents(catRow);
		if (pageItems.length > 0) {
			const itemOptions = pageItems.map((it) => new StringSelectMenuOptionBuilder().setLabel(it.name).setValue(it.id).setDescription(`${sym} ${it.price.toLocaleString()} — ${it.category}`).setDefault(it.id === this.selectedItemId));
			const itemRow = new ActionRowBuilder().addComponents(new StringSelectMenuBuilder().setCustomId(`${this.btnPrefix}item_select`).setPlaceholder("Select an item to inspect or purchase...").addOptions(itemOptions));
			container.addActionRowComponents(itemRow);
		}
		const btnRow = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId(`${this.btnPrefix}prev_page`).setLabel("◀ Previous").setStyle(ButtonStyle.Secondary).setDisabled(this.page === 0), new ButtonBuilder().setCustomId(`${this.btnPrefix}buy_1`).setLabel(`Buy Selected`).setStyle(ButtonStyle.Success).setDisabled(!selectedItem), new ButtonBuilder().setCustomId(`${this.btnPrefix}next_page`).setLabel("Next ▶").setStyle(ButtonStyle.Secondary).setDisabled(this.page >= totalPages - 1));
		container.addActionRowComponents(btnRow);
		return container;
	}
};
// src/ui/EcoStockMarketUI.ts
/**
* @m3rcena/eco
* Interactive Discord Stock & Crypto Exchange Terminal UI.
*
* @copyright 2026 M3rcena Development. All rights reserved.
* @license Apache-2.0
*/
var EcoStockMarketUI = class extends EcoBaseUI {
	selectedSymbol = "$AETH";
	chartBuffer = null;
	btnPrefix;
	constructor(manager, options) {
		super(manager, options, "stock_");
		this.btnPrefix = this.id + "_";
	}
	async start() {
		this.isActive = true;
		const stocks = this.getStocks();
		if (stocks.length > 0 && !stocks.find((s) => s.symbol === this.selectedSymbol)) this.selectedSymbol = stocks[0].symbol;
		await this.updateChart();
		const container = await this.buildContainer();
		const files = this.chartBuffer ? [new AttachmentBuilder(this.chartBuffer, { name: "market-chart.png" })] : [];
		await this.ctx.sendInitial({
			components: [container],
			files,
			flags: MessageFlags.IsComponentsV2
		});
		this.setupCollector();
		this.resetTimeout(() => this.destroy());
	}
	getStocks() {
		if (this.manager.stocks && typeof this.manager.stocks.getStocks === "function") return this.manager.stocks.getStocks();
		return [];
	}
	async updateChart() {
		if (this.options.renderChart === false) return;
		const stock = this.getStocks().find((s) => s.symbol.toUpperCase() === this.selectedSymbol.toUpperCase());
		if (!stock) return;
		try {
			this.chartBuffer = await RenderMarketChart.renderChart({
				symbol: stock.symbol,
				name: stock.name,
				currentPrice: stock.currentPrice,
				change24h: stock.change24h,
				history: stock.history
			});
		} catch (err) {
			console.warn("Could not render market chart:", err);
		}
	}
	setupCollector() {
		if (!this.ctx.channel) return;
		const filter = (i) => i.isButton() && i.customId.startsWith(this.btnPrefix) || i.isStringSelectMenu() && i.customId.startsWith(this.btnPrefix);
		this.ctx.channel.createMessageComponentCollector({
			filter,
			time: this.defaultTimeout
		}).on("collect", async (interaction) => {
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
				if (action === "buy_1") try {
					const res = await this.manager.buyStock(this.ctx.userId, this.selectedSymbol, 1, this.ctx.guild?.id);
					ContextAdapter.replyEphemeral(interaction, `📈 Bought 1 share of **${this.selectedSymbol}** at $${res.pricePerShare.toLocaleString()} (Total: $${res.totalAmount.toLocaleString()})`);
				} catch (err) {
					ContextAdapter.replyEphemeral(interaction, `❌ ${err.message}`);
				}
				else if (action === "buy_10") try {
					const res = await this.manager.buyStock(this.ctx.userId, this.selectedSymbol, 10, this.ctx.guild?.id);
					ContextAdapter.replyEphemeral(interaction, `📈 Bought 10 shares of **${this.selectedSymbol}** at $${res.pricePerShare.toLocaleString()} (Total: $${res.totalAmount.toLocaleString()})`);
				} catch (err) {
					ContextAdapter.replyEphemeral(interaction, `❌ ${err.message}`);
				}
				else if (action === "sell_all") try {
					const pos = (await this.manager.getStockPortfolio(this.ctx.userId, this.ctx.guild?.id)).positions.find((p) => p.symbol.toUpperCase() === this.selectedSymbol.toUpperCase());
					if (!pos || pos.shares <= 0) ContextAdapter.replyEphemeral(interaction, `❌ You don't own any shares of **${this.selectedSymbol}**.`);
					else {
						const res = await this.manager.sellStock(this.ctx.userId, this.selectedSymbol, pos.shares, this.ctx.guild?.id);
						const pnlPrefix = (res.profitOrLoss ?? 0) >= 0 ? "+$" : "-$";
						ContextAdapter.replyEphemeral(interaction, `📉 Sold ${res.shares} shares of **${this.selectedSymbol}** for $${res.totalAmount.toLocaleString()}! (PnL: ${pnlPrefix}${Math.abs(res.profitOrLoss ?? 0).toLocaleString()})`);
					}
				} catch (err) {
					ContextAdapter.replyEphemeral(interaction, `❌ ${err.message}`);
				}
				else if (action === "refresh") {
					if (this.manager.stocks && typeof this.manager.stocks.tickMarket === "function") this.manager.stocks.tickMarket();
					await this.updateChart();
				}
			}
			const container = await this.buildContainer();
			const files = this.chartBuffer ? [new AttachmentBuilder(this.chartBuffer, { name: "market-chart.png" })] : [];
			await this.ctx.edit({
				components: [container],
				files,
				flags: MessageFlags.IsComponentsV2
			});
		});
	}
	async buildContainer() {
		const container = this.createContainer();
		const stocks = this.getStocks();
		const stock = stocks.find((s) => s.symbol.toUpperCase() === this.selectedSymbol.toUpperCase()) || stocks[0];
		const trend = this.manager.stocks?.getMarketTrend?.() || "STABLE";
		let portfolio = {
			positions: [],
			totalValue: 0,
			totalProfitLoss: 0
		};
		try {
			portfolio = await this.manager.getStockPortfolio(this.ctx.userId, this.ctx.guild?.id);
		} catch {}
		const userPos = portfolio.positions?.find((p) => p.symbol.toUpperCase() === (stock?.symbol || "").toUpperCase());
		const sharesOwned = userPos ? userPos.shares : 0;
		const avgBuy = userPos ? userPos.averageBuyPrice : 0;
		const currentVal = stock ? sharesOwned * stock.currentPrice : 0;
		const pnl = userPos ? currentVal - userPos.totalInvested : 0;
		const pnlSign = pnl >= 0 ? "+" : "";
		const trendEmoji = trend === "BULL" ? "🟢 🐂 BULL MARKET" : trend === "BEAR" ? "🔴 🐻 BEAR MARKET" : "🟡 ⚖️ STABLE MARKET";
		const changeSign = stock && stock.change24h >= 0 ? "+" : "";
		let content = `## 📊 Global Financial & Crypto Exchange\n> **Market Mood:** \`${trendEmoji}\`  •  **Total Portfolio Value:** \`$${(portfolio.totalValue || 0).toLocaleString()}\`\n\n`;
		if (stock) content += `### 🏷️ Active Asset: ${stock.name} (${stock.symbol})\n> **Current Price:** \`$${stock.currentPrice.toLocaleString()}\` (${changeSign}${stock.change24h}% 24h)\n> **24h Range:** \`$${stock.low24h.toLocaleString()}\` — \`$${stock.high24h.toLocaleString()}\`  •  **Volatility:** \`${(stock.volatility * 100).toFixed(0)}%\`\n> **Sector:** \`${stock.category}\`  •  **Info:** *${stock.description}*\n\n> **Your Holdings:** \`${sharesOwned} shares\` (Valued at \`$${currentVal.toLocaleString()}\`)\n> **Unrealized PnL:** \`${pnlSign}$${pnl.toLocaleString()}\` (Avg Buy: \`$${avgBuy.toLocaleString()}\`)\n`;
		container.addTextDisplayComponents((t) => t.setContent(content));
		if (stocks.length > 0) {
			const options = stocks.map((s) => new StringSelectMenuOptionBuilder().setLabel(`${s.symbol} — ${s.name}`).setValue(s.symbol).setDescription(`$${s.currentPrice.toLocaleString()} (${s.change24h >= 0 ? "+" : ""}${s.change24h}%)`).setDefault(s.symbol.toUpperCase() === this.selectedSymbol.toUpperCase()));
			const selectRow = new ActionRowBuilder().addComponents(new StringSelectMenuBuilder().setCustomId(`${this.btnPrefix}select_ticker`).setPlaceholder("Select an asset / cryptocurrency...").addOptions(options));
			container.addActionRowComponents(selectRow);
		}
		const actionRow = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId(`${this.btnPrefix}buy_1`).setLabel("Buy 1x").setStyle(ButtonStyle.Success), new ButtonBuilder().setCustomId(`${this.btnPrefix}buy_10`).setLabel("Buy 10x").setStyle(ButtonStyle.Success), new ButtonBuilder().setCustomId(`${this.btnPrefix}sell_all`).setLabel("Sell All").setStyle(ButtonStyle.Danger).setDisabled(sharesOwned <= 0), new ButtonBuilder().setCustomId(`${this.btnPrefix}refresh`).setLabel("🔄 Live Refresh").setStyle(ButtonStyle.Secondary));
		container.addActionRowComponents(actionRow);
		return container;
	}
};
// src/ui/EcoHeistUI.ts
/**
* @m3rcena/eco
* Interactive Discord Multiplayer Crew Bank Heist UI.
*
* @copyright 2026 M3rcena Development. All rights reserved.
* @license Apache-2.0
*/
var EcoHeistUI = class extends EcoBaseUI {
	targetId = "city_trust_bank";
	session = null;
	btnPrefix;
	statusMessage = "Waiting for crew members to select their roles...";
	isExecuting = false;
	outcome = null;
	constructor(manager, options) {
		super(manager, options, "heist_");
		this.targetId = options.initialTargetId || "city_trust_bank";
		this.btnPrefix = this.id + "_";
	}
	async start() {
		this.isActive = true;
		try {
			this.session = await this.manager.createHeist(this.ctx.userId, this.targetId, this.ctx.guild?.id);
		} catch (err) {
			this.statusMessage = `Error initializing heist: ${err.message}`;
		}
		const container = this.buildContainer();
		await this.ctx.sendInitial({
			components: [container],
			flags: MessageFlags.IsComponentsV2
		});
		this.setupCollector();
		this.resetTimeout(() => this.destroy(), 18e4);
	}
	setupCollector() {
		if (!this.ctx.channel) return;
		const filter = (i) => i.isButton() && i.customId.startsWith(this.btnPrefix) || i.isStringSelectMenu() && i.customId.startsWith(this.btnPrefix);
		this.ctx.channel.createMessageComponentCollector({
			filter,
			time: 18e4
		}).on("collect", async (interaction) => {
			if (this.isExecuting || this.outcome) {
				ContextAdapter.replyEphemeral(interaction, "⚠️ The heist has already been executed.");
				return;
			}
			await interaction.deferUpdate().catch(() => {});
			this.resetTimeout(() => this.destroy(), 18e4);
			if (interaction.isStringSelectMenu()) {
				if (interaction.customId === `${this.btnPrefix}select_target`) {
					if (interaction.user.id !== this.ctx.userId) {
						ContextAdapter.replyEphemeral(interaction, "⛔ Only the crew leader can change the vault target!");
						return;
					}
					this.targetId = interaction.values[0];
					try {
						this.session = await this.manager.createHeist(this.ctx.userId, this.targetId, this.ctx.guild?.id);
					} catch {}
				}
			} else if (interaction.isButton()) {
				const action = interaction.customId.replace(this.btnPrefix, "");
				if (action.startsWith("join_")) {
					const role = action.replace("join_", "").toUpperCase();
					try {
						if (this.session) {
							const username = interaction.user.username;
							const res = await this.manager.joinHeist(this.session.id, interaction.user.id, role, username);
							this.session = res.session;
							this.statusMessage = `🤝 **${username}** joined as the **${role}**!`;
						}
					} catch (err) {
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
						ContextAdapter.replyEphemeral(interaction, `❌ Need at least ${target.minCrew} crew members to attempt this vault! Currently: ${this.session.crew.length}`);
						return;
					}
					this.isExecuting = true;
					this.statusMessage = "🚨 **BREACH IN PROGRESS!** Cutting power grid & drilling safety vault...";
					const interimContainer = this.buildContainer();
					await this.ctx.edit({
						components: [interimContainer],
						flags: MessageFlags.IsComponentsV2
					});
					try {
						this.outcome = await this.manager.executeHeist(this.session.id);
						if (this.outcome?.success) this.statusMessage = `🏆 **VAULT CLEANED OUT!** Stole **$${this.outcome.totalLoot.toLocaleString()}**!`;
						else this.statusMessage = `🚔 **BUSTED BY SWAT!** Heist failed. Bail fee paid: $${(this.outcome?.finePerPlayer || 0).toLocaleString()}`;
					} catch (err) {
						this.statusMessage = `❌ Execution failed: ${err.message}`;
					} finally {
						this.isExecuting = false;
					}
				}
			}
			const container = this.buildContainer();
			await this.ctx.edit({
				components: [container],
				flags: MessageFlags.IsComponentsV2
			});
		});
	}
	getTarget() {
		const targets = this.manager.heist?.getTargets?.() || DEFAULT_HEIST_TARGETS;
		return targets.find((t) => t.id === this.targetId) || targets[0];
	}
	buildContainer() {
		const container = this.createContainer();
		const target = this.getTarget();
		const crew = this.session?.crew || [];
		const sym = this.manager.currencySymbol || "🪙";
		let content = `## 🏦 Syndicate Crew Bank Heist Operations\n> **Leader:** <@${this.ctx.userId}>  •  **Target:** \`${target.name}\` [${target.difficulty}]\n> **Potential Haul:** \`${sym} ${target.baseBountyMin.toLocaleString()}\` — \`${sym} ${target.baseBountyMax.toLocaleString()}\`\n> **Failure Bail Risk:** \`${sym} ${target.failureBail.toLocaleString()}\`  •  **Base Success Odds:** \`${(target.successRate * 100).toFixed(0)}%\`\n\n> **Status:** ${this.statusMessage}\n\n`;
		content += `### 👥 Active Crew Roster (${crew.length}/${target.maxCrew})\n`;
		if (crew.length === 0) content += `> *No crew members assembled yet. Claim a role below to gear up!*\n`;
		else for (const member of crew) {
			const icon = member.role === "HACKER" ? "💻" : member.role === "DRIVER" ? "🚗" : member.role === "DEMOLITIONIST" ? "💣" : "💪";
			content += `> ${icon} **${member.role}**: **${member.username}** (<@${member.userId}>)\n`;
		}
		if (this.outcome) {
			content += `\n### 📋 After-Action Report\n`;
			if (this.outcome.success) content += `> 💰 **Total Loot Taken:** \`${sym} ${this.outcome.totalLoot.toLocaleString()}\`\n> 💵 **Cut Per Operative:** \`${sym} ${this.outcome.sharePerPlayer.toLocaleString()}\`\n`;
			else content += `> 🚔 **Interception:** Police interceptors cornered the team.\n> 💸 **Bail Deducted:** \`${sym} ${(this.outcome.finePerPlayer || 0).toLocaleString()}\` each\n`;
		}
		container.addTextDisplayComponents((t) => t.setContent(content));
		if (!this.isExecuting && !this.outcome) {
			const targetOptions = (this.manager.heist?.getTargets?.() || DEFAULT_HEIST_TARGETS).map((t) => new StringSelectMenuOptionBuilder().setLabel(`${t.name} [${t.difficulty}]`).setValue(t.id).setDescription(`Crew: ${t.minCrew}-${t.maxCrew} | Payout: ${sym} ${t.baseBountyMin.toLocaleString()}+`).setDefault(t.id === this.targetId));
			const targetRow = new ActionRowBuilder().addComponents(new StringSelectMenuBuilder().setCustomId(`${this.btnPrefix}select_target`).setPlaceholder("Select a vault target...").addOptions(targetOptions));
			container.addActionRowComponents(targetRow);
			const roleRow = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId(`${this.btnPrefix}join_hacker`).setLabel("💻 Hacker").setStyle(ButtonStyle.Secondary), new ButtonBuilder().setCustomId(`${this.btnPrefix}join_driver`).setLabel("🚗 Driver").setStyle(ButtonStyle.Secondary), new ButtonBuilder().setCustomId(`${this.btnPrefix}join_demolitionist`).setLabel("💣 Demo").setStyle(ButtonStyle.Secondary), new ButtonBuilder().setCustomId(`${this.btnPrefix}join_muscle`).setLabel("💪 Muscle").setStyle(ButtonStyle.Secondary));
			container.addActionRowComponents(roleRow);
			const canLaunch = crew.length >= target.minCrew && crew.length <= target.maxCrew;
			const launchRow = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId(`${this.btnPrefix}execute`).setLabel(canLaunch ? "🚀 Launch Heist Breach" : `Need ${target.minCrew}+ Crew to Launch`).setStyle(canLaunch ? ButtonStyle.Success : ButtonStyle.Secondary).setDisabled(!canLaunch));
			container.addActionRowComponents(launchRow);
		}
		return container;
	}
};
// src/ui/EcoBlackjackUI.ts
/**
* @m3rcena/eco
* Interactive Discord Blackjack Casino UI with Components V2.
*
* @copyright 2026 M3rcena Development. All rights reserved.
* @license Apache-2.0
*/
var EcoBlackjackUI = class extends EcoBaseUI {
	state = null;
	btnPrefix;
	initialBet;
	constructor(manager, options) {
		super(manager, options, "bj_");
		this.initialBet = Math.max(10, Math.floor(options.betAmount || 50));
		this.btnPrefix = this.id + "_";
	}
	async start() {
		this.isActive = true;
		try {
			this.state = await this.manager.startBlackjack(this.ctx.userId, this.initialBet, this.ctx.guild?.id);
		} catch (err) {
			await this.ctx.sendInitial({ content: `❌ Could not start Blackjack game: ${err.message}` });
			this.destroy();
			return;
		}
		const container = this.buildContainer();
		await this.ctx.sendInitial({
			components: [container],
			flags: MessageFlags.IsComponentsV2
		});
		if (this.state && this.state.finished) {
			this.destroy();
			return;
		}
		this.setupCollector();
		this.resetTimeout(() => this.destroy(), 6e4);
	}
	setupCollector() {
		if (!this.ctx.channel) return;
		const filter = (i) => i.isButton() && i.customId.startsWith(this.btnPrefix);
		const collector = this.ctx.channel.createMessageComponentCollector({
			filter,
			time: 6e4
		});
		collector.on("collect", async (interaction) => {
			if (interaction.user.id !== this.ctx.userId) {
				ContextAdapter.replyEphemeral(interaction, "⛔ You cannot play on someone else's blackjack table!");
				return;
			}
			if (!this.state || this.state.finished) {
				ContextAdapter.replyEphemeral(interaction, "⚠️ This hand has already concluded.");
				return;
			}
			await interaction.deferUpdate().catch(() => {});
			this.resetTimeout(() => this.destroy(), 6e4);
			const action = interaction.customId.replace(this.btnPrefix, "");
			try {
				if (action === "hit") this.state = await this.manager.blackjackHit(this.state.gameId);
				else if (action === "stand") this.state = await this.manager.blackjackStand(this.state.gameId);
				else if (action === "double") this.state = await this.manager.blackjackDouble(this.state.gameId);
			} catch (err) {
				ContextAdapter.replyEphemeral(interaction, `❌ ${err.message}`);
			}
			const container = this.buildContainer();
			await this.ctx.edit({
				components: [container],
				flags: MessageFlags.IsComponentsV2
			});
			if (this.state?.finished) {
				collector.stop();
				this.destroy();
			}
		});
	}
	formatCards(cards, hideSecond = false) {
		if (hideSecond && cards.length > 1) return `[\`${cards[0].rank}${cards[0].suit}\`] [\`🂠 ?\`]`;
		return cards.map((c) => `[\`${c.rank}${c.suit}\`]`).join(" ");
	}
	buildContainer() {
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
		if (this.state.status === "blackjack") statusText = `🏆 **NATURAL BLACKJACK!** Payout: **${sym} ${this.state.payout.toLocaleString()}** (3:2)`;
		else if (this.state.status === "player_win") statusText = `🎉 **YOU WIN!** Dealer lost. Payout: **${sym} ${this.state.payout.toLocaleString()}**`;
		else if (this.state.status === "dealer_bust") statusText = `💥 **DEALER BUSTED!** Payout: **${sym} ${this.state.payout.toLocaleString()}**`;
		else if (this.state.status === "player_bust") statusText = `💥 **BUSTED!** Total exceeded 21. Lost: **${sym} ${this.state.betAmount.toLocaleString()}**`;
		else if (this.state.status === "dealer_win") statusText = `💀 **DEALER WINS!** Dealer had the superior hand. Lost: **${sym} ${this.state.betAmount.toLocaleString()}**`;
		else if (this.state.status === "push") statusText = `🤝 **PUSH (TIE)!** Bet of **${sym} ${this.state.betAmount.toLocaleString()}** refunded.`;
		const dealerDisplay = isPlaying ? `${this.formatCards(this.state.dealerHand, true)} *(Showing ${this.state.dealerHand[0].value})*` : `${this.formatCards(this.state.dealerHand, false)} *(Total: **${dCalc.total}**)*`;
		const playerDisplay = `${this.formatCards(this.state.playerHand, false)} *(Total: **${pCalc.total}**${pCalc.isSoft ? " soft" : ""})*`;
		let content = `## 🎰 High Stakes VIP Blackjack Table\n> **Player:** <@${this.ctx.userId}>  •  **Total Bet:** \`${sym} ${this.state.betAmount.toLocaleString()}\`\n\n### 🤵 Dealer's Hand:\n> ${dealerDisplay}\n\n### 🃏 Your Hand:\n> ${playerDisplay}\n\n> **Table Status:** ${statusText}\n`;
		container.addTextDisplayComponents((t) => t.setContent(content));
		const canDouble = isPlaying && this.state.playerHand.length === 2;
		const actionRow = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId(`${this.btnPrefix}hit`).setLabel("🃏 Hit").setStyle(ButtonStyle.Success).setDisabled(!isPlaying), new ButtonBuilder().setCustomId(`${this.btnPrefix}stand`).setLabel("🛑 Stand").setStyle(ButtonStyle.Danger).setDisabled(!isPlaying), new ButtonBuilder().setCustomId(`${this.btnPrefix}double`).setLabel("⚡ Double Down").setStyle(ButtonStyle.Primary).setDisabled(!canDouble));
		container.addActionRowComponents(actionRow);
		return container;
	}
};
// src/ui/EcoCrateUI.ts
/**
* @m3rcena/eco
* Interactive Discord Mystery Loot Crate Unboxing UI with Components V2.
*
* @copyright 2026 M3rcena Development. All rights reserved.
* @license Apache-2.0
*/
var EcoCrateUI = class extends EcoBaseUI {
	selectedTier = "rare";
	btnPrefix;
	isUnboxing = false;
	lastReward = null;
	constructor(manager, options) {
		super(manager, options, "crate_");
		this.selectedTier = options.initialTier || "rare";
		this.btnPrefix = this.id + "_";
	}
	async start() {
		this.isActive = true;
		const container = this.buildContainer();
		await this.ctx.sendInitial({
			components: [container],
			flags: MessageFlags.IsComponentsV2
		});
		this.setupCollector();
		this.resetTimeout(() => this.destroy());
	}
	setupCollector() {
		if (!this.ctx.channel) return;
		const filter = (i) => i.isButton() && i.customId.startsWith(this.btnPrefix) || i.isStringSelectMenu() && i.customId.startsWith(this.btnPrefix);
		this.ctx.channel.createMessageComponentCollector({
			filter,
			time: this.defaultTimeout
		}).on("collect", async (interaction) => {
			if (interaction.user.id !== this.ctx.userId) {
				ContextAdapter.replyEphemeral(interaction, "⛔ You cannot open someone else's mystery crates!");
				return;
			}
			await interaction.deferUpdate().catch(() => {});
			this.resetTimeout(() => this.destroy());
			if (interaction.isStringSelectMenu()) {
				if (interaction.customId === `${this.btnPrefix}select_tier`) {
					this.selectedTier = interaction.values[0];
					this.lastReward = null;
				}
			} else if (interaction.isButton()) {
				if (interaction.customId.replace(this.btnPrefix, "") === "open") {
					this.isUnboxing = true;
					this.lastReward = null;
					const suspenseContainer = this.buildContainer();
					await this.ctx.edit({
						components: [suspenseContainer],
						flags: MessageFlags.IsComponentsV2
					});
					try {
						this.lastReward = await this.manager.openCrate(this.ctx.userId, this.selectedTier, this.ctx.guild?.id);
					} catch (err) {
						ContextAdapter.replyEphemeral(interaction, `❌ ${err.message}`);
					} finally {
						this.isUnboxing = false;
					}
				}
			}
			const container = this.buildContainer();
			await this.ctx.edit({
				components: [container],
				flags: MessageFlags.IsComponentsV2
			});
		});
	}
	buildContainer() {
		const container = this.createContainer();
		const sym = this.manager.currencySymbol || "🪙";
		const cost = CRATE_PRICES[this.selectedTier] || 1e4;
		const tierIcons = {
			common: "📦 Common Supply Drop",
			rare: "🔷 Rare Tech Capsule",
			epic: "💜 Epic Cyber Crate",
			legendary: "👑 Legendary Vault Box",
			mythic: "🌌 Mythic Celestial Relic"
		};
		let content = `## 🎁 Quantum Mystery Loot Crates\n> **Selected Tier:** \`${tierIcons[this.selectedTier]}\`\n> **Price to Unlock:** \`${sym} ${cost.toLocaleString()}\`\n\n`;
		if (this.isUnboxing) content += "> ⏳ **UNBOXING IN PROGRESS...**\n> *Decentralized cryptographic locks cracking... Rolling loot tables...*\n\n";
		else if (this.lastReward) {
			content += `### 🎊 Loot Drop Received!\n> 💰 **Cash Rewarded:** \`${sym} ${this.lastReward.coins.toLocaleString()}\`\n> ⭐ **Experience Points:** \`+${this.lastReward.xp} XP\`\n`;
			if (this.lastReward.item) content += `> 🎒 **Special Item Received:** **${this.lastReward.item.name}** (*${this.lastReward.item.category}*)\n`;
			content += `\n`;
		} else content += `> *Select a crate tier from the menu below and press Open to reveal randomized riches, XP, and collectible items!* \n\n`;
		container.addTextDisplayComponents((t) => t.setContent(content));
		if (!this.isUnboxing) {
			const options = [
				"common",
				"rare",
				"epic",
				"legendary",
				"mythic"
			].map((t) => new StringSelectMenuOptionBuilder().setLabel(tierIcons[t]).setValue(t).setDescription(`${sym} ${CRATE_PRICES[t].toLocaleString()}`).setDefault(t === this.selectedTier));
			const menuRow = new ActionRowBuilder().addComponents(new StringSelectMenuBuilder().setCustomId(`${this.btnPrefix}select_tier`).setPlaceholder("Select Crate Tier...").addOptions(options));
			container.addActionRowComponents(menuRow);
			const openRow = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId(`${this.btnPrefix}open`).setLabel(`🎁 Open ${this.selectedTier.toUpperCase()} (${sym} ${cost.toLocaleString()})`).setStyle(ButtonStyle.Success));
			container.addActionRowComponents(openRow);
		}
		return container;
	}
};
// src/ui/EcoLeaderboardUI.ts
/**
* @m3rcena/eco
* Interactive Discord Leaderboard UI with Components V2.
*
* @copyright 2026 M3rcena Development. All rights reserved.
* @license Apache-2.0
*/
var EcoLeaderboardUI = class extends EcoBaseUI {
	selectedMetric = "net_worth";
	page = 0;
	pageSize = 10;
	btnPrefix;
	constructor(manager, options) {
		super(manager, options, "lb_");
		this.selectedMetric = options.initialMetric || "net_worth";
		this.btnPrefix = this.id + "_";
	}
	async start() {
		this.isActive = true;
		const container = await this.buildContainer();
		await this.ctx.sendInitial({
			components: [container],
			flags: MessageFlags.IsComponentsV2
		});
		this.setupCollector();
		this.resetTimeout(() => this.destroy());
	}
	setupCollector() {
		if (!this.ctx.channel) return;
		const filter = (i) => i.isButton() && i.customId.startsWith(this.btnPrefix) || i.isStringSelectMenu() && i.customId.startsWith(this.btnPrefix);
		this.ctx.channel.createMessageComponentCollector({
			filter,
			time: this.defaultTimeout
		}).on("collect", async (interaction) => {
			if (interaction.user.id !== this.ctx.userId) {
				ContextAdapter.replyEphemeral(interaction, "⛔ You cannot paginate someone else's leaderboard view!");
				return;
			}
			await interaction.deferUpdate().catch(() => {});
			this.resetTimeout(() => this.destroy());
			if (interaction.isStringSelectMenu()) {
				if (interaction.customId === `${this.btnPrefix}select_metric`) {
					this.selectedMetric = interaction.values[0];
					this.page = 0;
				}
			} else if (interaction.isButton()) {
				const action = interaction.customId.replace(this.btnPrefix, "");
				if (action === "prev") this.page = Math.max(0, this.page - 1);
				else if (action === "next") this.page++;
			}
			const container = await this.buildContainer();
			await this.ctx.edit({
				components: [container],
				flags: MessageFlags.IsComponentsV2
			});
		});
	}
	async buildContainer() {
		const container = this.createContainer();
		const sym = this.manager.currencySymbol || "🪙";
		const allEntries = await this.manager.getLeaderboard(this.selectedMetric, 50, this.ctx.guild?.id);
		const totalPages = Math.ceil(allEntries.length / this.pageSize) || 1;
		if (this.page >= totalPages) this.page = totalPages - 1;
		const startIdx = this.page * this.pageSize;
		const pageEntries = allEntries.slice(startIdx, startIdx + this.pageSize);
		const metricLabels = {
			net_worth: "💎 Net Worth",
			wallet: "💵 Wallet Cash",
			bank: "🏦 Bank Vault",
			level: "⭐ Level & XP",
			streak: "🔥 Daily Streaks"
		};
		let content = `## 🏆 Server Economic Leaderboards\n> **Ranking Metric:** \`${metricLabels[this.selectedMetric] || this.selectedMetric}\`  •  **Page:** \`${this.page + 1}/${totalPages}\`\n\n`;
		if (pageEntries.length === 0) content += `> *No user rankings recorded yet for this metric.*\n`;
		else for (const entry of pageEntries) {
			const medal = entry.rank === 1 ? "🥇" : entry.rank === 2 ? "🥈" : entry.rank === 3 ? "🥉" : `\`#${entry.rank}\``;
			let valStr = "";
			if (this.selectedMetric === "level") valStr = `Level ${entry.value.toLocaleString()}`;
			else if (this.selectedMetric === "streak") valStr = `${entry.value.toLocaleString()} days`;
			else valStr = `${sym} ${entry.value.toLocaleString()}`;
			content += `> ${medal} <@${entry.userId}> — **${valStr}**\n`;
		}
		container.addTextDisplayComponents((t) => t.setContent(content));
		const options = [
			"net_worth",
			"wallet",
			"bank",
			"level",
			"streak"
		].map((m) => new StringSelectMenuOptionBuilder().setLabel(metricLabels[m] || m).setValue(m).setDefault(m === this.selectedMetric));
		const menuRow = new ActionRowBuilder().addComponents(new StringSelectMenuBuilder().setCustomId(`${this.btnPrefix}select_metric`).setPlaceholder("Select Leaderboard Category...").addOptions(options));
		container.addActionRowComponents(menuRow);
		const btnRow = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId(`${this.btnPrefix}prev`).setLabel("◀ Previous").setStyle(ButtonStyle.Secondary).setDisabled(this.page === 0), new ButtonBuilder().setCustomId(`${this.btnPrefix}next`).setLabel("Next ▶").setStyle(ButtonStyle.Secondary).setDisabled(this.page >= totalPages - 1));
		container.addActionRowComponents(btnRow);
		return container;
	}
};
// src/ui/EcoVaultUI.ts
/**
* @m3rcena/eco
* Interactive Bank Vault Tiers, Upgrade & Compound Interest UI.
*
* @copyright 2026 M3rcena Development. All rights reserved.
* @license Apache-2.0
*/
var EcoVaultUI = class extends EcoBaseUI {
	selectedTierNum = 1;
	btnPrefix;
	statusMessage = "Select a vault tier below to inspect security specifications and interest yield.";
	constructor(manager, options) {
		super(manager, options, "vault_");
		this.btnPrefix = this.id + "_";
	}
	async start() {
		this.isActive = true;
		const vault = await this.manager.getUserVault(this.ctx.userId, this.ctx.guild?.id);
		this.selectedTierNum = vault.currentTier.tier;
		const container = await this.buildContainer();
		await this.ctx.sendInitial({
			components: [container],
			flags: MessageFlags.IsComponentsV2
		});
		this.setupCollector();
		this.resetTimeout(() => this.destroy());
	}
	setupCollector() {
		if (!this.ctx.channel) return;
		const filter = (i) => i.isButton() && i.customId.startsWith(this.btnPrefix) || i.isStringSelectMenu() && i.customId.startsWith(this.btnPrefix);
		this.ctx.channel.createMessageComponentCollector({
			filter,
			time: this.defaultTimeout
		}).on("collect", async (interaction) => {
			if (interaction.user.id !== this.ctx.userId) {
				ContextAdapter.replyEphemeral(interaction, "⛔ You cannot manage someone else's bank vault!");
				return;
			}
			await interaction.deferUpdate().catch(() => {});
			this.resetTimeout(() => this.destroy());
			if (interaction.isStringSelectMenu()) {
				if (interaction.customId === `${this.btnPrefix}select_tier`) this.selectedTierNum = parseInt(interaction.values[0], 10);
			} else if (interaction.isButton()) {
				const action = interaction.customId.replace(this.btnPrefix, "");
				if (action === "upgrade") try {
					const res = await this.manager.upgradeVault(this.ctx.userId, this.ctx.guild?.id);
					if (res.success) {
						this.selectedTierNum = res.newTier.tier;
						this.statusMessage = `🎉 **VAULT UPGRADED!** You are now Tier ${res.newTier.tier} (${res.newTier.name}). New capacity: $${res.newCapacity.toLocaleString()}!`;
					} else this.statusMessage = `❌ ${res.error}`;
				} catch (err) {
					this.statusMessage = `❌ ${err.message}`;
				}
				else if (action === "claim_interest") try {
					const res = await this.manager.claimDailyInterest(this.ctx.userId, this.ctx.guild?.id);
					if (res.success) this.statusMessage = `💰 **INTEREST DISTRIBUTED!** Added **$${res.interestEarned.toLocaleString()}** (${(res.rate * 100).toFixed(1)}% daily) to your vault savings!`;
					else this.statusMessage = `⏳ ${res.error}`;
				} catch (err) {
					this.statusMessage = `❌ ${err.message}`;
				}
			}
			const container = await this.buildContainer();
			await this.ctx.edit({
				components: [container],
				flags: MessageFlags.IsComponentsV2
			});
		});
	}
	async buildContainer() {
		const container = this.createContainer();
		const sym = this.manager.currencySymbol || "🪙";
		const userVault = await this.manager.getUserVault(this.ctx.userId, this.ctx.guild?.id);
		const tiers = this.manager.vault ? this.manager.vault.getVaultTiers() : DEFAULT_VAULT_TIERS;
		const inspectingTier = tiers.find((t) => t.tier === this.selectedTierNum) || userVault.currentTier;
		const isCurrent = inspectingTier.tier === userVault.currentTier.tier;
		userVault.nextTier && (inspectingTier.tier, userVault.nextTier.tier);
		let content = `## 🏦 Swiss & Orbital Private Vault Showroom\n> **Account Holder:** <@${this.ctx.userId}>\n> **Current Vault Tier:** \`Tier ${userVault.currentTier.tier} — ${userVault.currentTier.name}\`\n> **Savings Vault Balance:** \`${sym} ${userVault.bank.toLocaleString()}\` / \`${sym} ${userVault.capacity.toLocaleString()}\`\n> **Estimated 24h Compound Yield:** \`${sym} ${userVault.dailyInterestAccrual.toLocaleString()} / day\`\n\n> **Status:** ${this.statusMessage}\n\n`;
		content += `### 🔍 Inspecting: Tier ${inspectingTier.tier} — ${inspectingTier.name} ${isCurrent ? "*(Active Vault)*" : ""}\n> • **Storage Capacity:** \`${sym} ${inspectingTier.capacity.toLocaleString()}\`\n> • **Daily Compound Yield:** \`${(inspectingTier.interestRate * 100).toFixed(1)}% / 24h\`\n> • **Robbery Shield Defense:** \`${(inspectingTier.robberyDefense * 100).toFixed(0)}% deterrence\`\n> • **Upgrade Price:** \`${inspectingTier.upgradeCost > 0 ? `${sym} ${inspectingTier.upgradeCost.toLocaleString()}` : "Included Free"}\`\n`;
		if (inspectingTier.perks && inspectingTier.perks.length > 0) content += `> • **Special Perks:** ${inspectingTier.perks.join(" • ")}\n`;
		container.addTextDisplayComponents((t) => t.setContent(content));
		const options = tiers.map((t) => new StringSelectMenuOptionBuilder().setLabel(`Tier ${t.tier}: ${t.name}`).setValue(String(t.tier)).setDescription(`Cap: ${sym} ${t.capacity.toLocaleString()} | Interest: ${(t.interestRate * 100).toFixed(1)}%`).setDefault(t.tier === this.selectedTierNum));
		const selectRow = new ActionRowBuilder().addComponents(new StringSelectMenuBuilder().setCustomId(`${this.btnPrefix}select_tier`).setPlaceholder("Select a vault tier to inspect...").addOptions(options));
		container.addActionRowComponents(selectRow);
		const canUpgrade = !!userVault.nextTier;
		const upgradeLabel = canUpgrade ? `⚡ Upgrade to Tier ${userVault.nextTier.tier} (${sym} ${userVault.nextTier.upgradeCost.toLocaleString()})` : "👑 Maximum Vault Tier Reached";
		const btnRow = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId(`${this.btnPrefix}upgrade`).setLabel(upgradeLabel).setStyle(canUpgrade ? ButtonStyle.Success : ButtonStyle.Secondary).setDisabled(!canUpgrade), new ButtonBuilder().setCustomId(`${this.btnPrefix}claim_interest`).setLabel(userVault.canClaimInterest ? `💰 Claim Interest (${sym} ${userVault.dailyInterestAccrual.toLocaleString()})` : "⏳ Interest Payout Pending").setStyle(userVault.canClaimInterest ? ButtonStyle.Primary : ButtonStyle.Secondary).setDisabled(!userVault.canClaimInterest));
		container.addActionRowComponents(btnRow);
		return container;
	}
};
// src/ui/EcoLoanUI.ts
/**
* @m3rcena/eco
* Interactive Bank Loan, Credit Score & Debt Management UI.
*
* @copyright 2026 M3rcena Development. All rights reserved.
* @license Apache-2.0
*/
var EcoLoanUI = class extends EcoBaseUI {
	selectedTier = "starter";
	selectedLoanId = null;
	btnPrefix;
	statusMessage = "Select a credit package below to inspect terms or choose an active loan to pay down.";
	constructor(manager, options) {
		super(manager, options, "loan_");
		this.btnPrefix = this.id + "_";
	}
	async start() {
		this.isActive = true;
		const container = await this.buildContainer();
		await this.ctx.sendInitial({
			components: [container],
			flags: MessageFlags.IsComponentsV2
		});
		this.setupCollector();
		this.resetTimeout(() => this.destroy());
	}
	setupCollector() {
		if (!this.ctx.channel) return;
		const filter = (i) => i.isButton() && i.customId.startsWith(this.btnPrefix) || i.isStringSelectMenu() && i.customId.startsWith(this.btnPrefix);
		this.ctx.channel.createMessageComponentCollector({
			filter,
			time: this.defaultTimeout
		}).on("collect", async (interaction) => {
			if (interaction.user.id !== this.ctx.userId) {
				ContextAdapter.replyEphemeral(interaction, "⛔ You cannot manage someone else's credit lines!");
				return;
			}
			await interaction.deferUpdate().catch(() => {});
			this.resetTimeout(() => this.destroy());
			if (interaction.isStringSelectMenu()) {
				if (interaction.customId === `${this.btnPrefix}select_offer`) this.selectedTier = interaction.values[0];
				else if (interaction.customId === `${this.btnPrefix}select_loan`) this.selectedLoanId = interaction.values[0];
			} else if (interaction.isButton()) {
				const action = interaction.customId.replace(this.btnPrefix, "");
				if (action === "apply") try {
					const res = await this.manager.applyLoan(this.ctx.userId, this.selectedTier, this.ctx.guild?.id);
					if (res.success) this.statusMessage = `✅ **LOAN APPROVED!** Disbursed **$${res.loan.principal.toLocaleString()}** to your cash wallet! (Repay by: <t:${Math.floor(res.loan.dueAt / 1e3)}:R>)`;
					else this.statusMessage = `❌ Application rejected: ${res.error}`;
				} catch (err) {
					this.statusMessage = `❌ ${err.message}`;
				}
				else if (action === "repay_all" || action === "repay_half") {
					const activeLoan = (await this.manager.getUserLoans(this.ctx.userId, this.ctx.guild?.id)).find((l) => this.selectedLoanId ? l.id === this.selectedLoanId : l.status !== "paid");
					if (!activeLoan) {
						ContextAdapter.replyEphemeral(interaction, "❌ You have no active debts to pay!");
						return;
					}
					const payAmount = action === "repay_all" ? "all" : Math.ceil(activeLoan.remainingDue / 2);
					try {
						const res = await this.manager.repayLoan(this.ctx.userId, activeLoan.id, payAmount, this.ctx.guild?.id);
						if (res.success) {
							if (res.isFullyPaid) this.statusMessage = `🎉 **DEBT PAID IN FULL!** Succeeded in settling debt. Credit score boosted to **${res.newCreditScore}**!`;
							else this.statusMessage = `💵 Paid **$${res.amountPaid.toLocaleString()}** toward debt. Remaining: **$${res.remainingDue.toLocaleString()}**`;
						} else this.statusMessage = `❌ ${res.error}`;
					} catch (err) {
						this.statusMessage = `❌ ${err.message}`;
					}
				}
			}
			const container = await this.buildContainer();
			await this.ctx.edit({
				components: [container],
				flags: MessageFlags.IsComponentsV2
			});
		});
	}
	async buildContainer() {
		const container = this.createContainer();
		const sym = this.manager.currencySymbol || "🪙";
		const credit = await this.manager.getCreditScore(this.ctx.userId, this.ctx.guild?.id);
		const loans = await this.manager.getUserLoans(this.ctx.userId, this.ctx.guild?.id);
		const offers = this.manager.loans ? this.manager.loans.getOffers() : LOAN_CATALOG;
		const selectedOffer = offers.find((o) => o.tier === this.selectedTier) || offers[0];
		const activeLoans = loans.filter((l) => l.status === "active" || l.status === "defaulted");
		const totalDebt = activeLoans.reduce((sum, l) => sum + l.remainingDue, 0);
		let content = `## 🏦 Global Commercial Credit Bureau & Loan Broker\n> **Account:** <@${this.ctx.userId}>  •  **FICO Credit Rating:** \`${{
			EXCELLENT: "🟢 800-850 (EXCELLENT)",
			VERY_GOOD: "🟢 740-799 (VERY GOOD)",
			GOOD: "🟡 670-739 (GOOD)",
			FAIR: "🟠 580-669 (FAIR)",
			POOR: "🔴 300-579 (POOR - HIGH RISK)"
		}[credit.rating] || credit.rating}\` (\`${credit.score} Score\`)\n> **Total Active Debt:** \`${sym} ${totalDebt.toLocaleString()}\`  •  **Loans Repaid:** \`${credit.loansRepaid}\`  •  **Defaults:** \`${credit.defaultsCount}\`\n\n> **Status:** ${this.statusMessage}\n\n`;
		if (activeLoans.length > 0) {
			content += `### 💳 Outstanding Debts (${activeLoans.length}/2 Active):\n`;
			for (const l of activeLoans) {
				const tag = l.status === "defaulted" ? "🚨 **[OVERDUE DEFAULT]**" : `⏳ Due: <t:${Math.floor(l.dueAt / 1e3)}:R>`;
				content += `> • **${l.name}**: Remaining: \`${sym} ${l.remainingDue.toLocaleString()}\` / \`${sym} ${l.totalDue.toLocaleString()}\` — ${tag}\n`;
			}
			content += `\n`;
		}
		content += `### 📋 Inspecting Offer: ${selectedOffer.name}\n> • **Principal Cash Advance:** \`${sym} ${selectedOffer.principal.toLocaleString()}\`\n> • **Fixed Interest:** \`${(selectedOffer.interestRate * 100).toFixed(1)}%\` (Total Due: \`${sym} ${selectedOffer.totalDue.toLocaleString()}\`)\n> • **Repayment Window:** \`${selectedOffer.durationHours} hours\`\n> • **Required Credit Score:** \`${selectedOffer.minCreditScore}+\` ${credit.score >= selectedOffer.minCreditScore ? "*(Eligible)*" : "*(Score Too Low)*"}\n> • **Description:** *${selectedOffer.description}*\n`;
		container.addTextDisplayComponents((t) => t.setContent(content));
		const options = offers.map((o) => new StringSelectMenuOptionBuilder().setLabel(`${o.name} (${sym} ${o.principal.toLocaleString()})`).setValue(o.tier).setDescription(`Rate: ${(o.interestRate * 100).toFixed(1)}% | Min Score: ${o.minCreditScore}`).setDefault(o.tier === this.selectedTier));
		const offerRow = new ActionRowBuilder().addComponents(new StringSelectMenuBuilder().setCustomId(`${this.btnPrefix}select_offer`).setPlaceholder("Select a credit advance package...").addOptions(options));
		container.addActionRowComponents(offerRow);
		const canApply = credit.score >= selectedOffer.minCreditScore && activeLoans.length < 2 && !activeLoans.some((l) => l.status === "defaulted");
		const hasDebt = totalDebt > 0;
		const btnRow = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId(`${this.btnPrefix}apply`).setLabel(`📝 Apply for ${selectedOffer.name}`).setStyle(canApply ? ButtonStyle.Success : ButtonStyle.Secondary).setDisabled(!canApply), new ButtonBuilder().setCustomId(`${this.btnPrefix}repay_half`).setLabel("💵 Pay 50% Debt").setStyle(ButtonStyle.Primary).setDisabled(!hasDebt), new ButtonBuilder().setCustomId(`${this.btnPrefix}repay_all`).setLabel("🎉 Settle Full Debt").setStyle(ButtonStyle.Success).setDisabled(!hasDebt));
		container.addActionRowComponents(btnRow);
		return container;
	}
};
// src/ui/EcoBillsUI.ts
/**
* @m3rcena/eco
* Interactive Municipal Bills, Wealth Taxes & Audit Desk UI.
*
* @copyright 2026 M3rcena Development. All rights reserved.
* @license Apache-2.0
*/
var EcoBillsUI = class extends EcoBaseUI {
	selectedBillId = null;
	btnPrefix;
	statusMessage = "Review municipal bills and wealth taxes below. Settle on time to protect your credit score!";
	constructor(manager, options) {
		super(manager, options, "bills_");
		this.btnPrefix = this.id + "_";
	}
	async start() {
		this.isActive = true;
		if (this.manager.taxes && typeof this.manager.taxes.generateBillsIfDue === "function") await this.manager.taxes.generateBillsIfDue(this.ctx.userId, this.ctx.guild?.id);
		const container = await this.buildContainer();
		await this.ctx.sendInitial({
			components: [container],
			flags: MessageFlags.IsComponentsV2
		});
		this.setupCollector();
		this.resetTimeout(() => this.destroy());
	}
	setupCollector() {
		if (!this.ctx.channel) return;
		const filter = (i) => i.isButton() && i.customId.startsWith(this.btnPrefix) || i.isStringSelectMenu() && i.customId.startsWith(this.btnPrefix);
		this.ctx.channel.createMessageComponentCollector({
			filter,
			time: this.defaultTimeout
		}).on("collect", async (interaction) => {
			if (interaction.user.id !== this.ctx.userId) {
				ContextAdapter.replyEphemeral(interaction, "⛔ You cannot manage someone else's municipal tax desk!");
				return;
			}
			await interaction.deferUpdate().catch(() => {});
			this.resetTimeout(() => this.destroy());
			if (interaction.isStringSelectMenu()) {
				if (interaction.customId === `${this.btnPrefix}select_bill`) this.selectedBillId = interaction.values[0];
			} else if (interaction.isButton()) {
				const action = interaction.customId.replace(this.btnPrefix, "");
				if (action === "pay_selected") {
					if (!this.selectedBillId) {
						ContextAdapter.replyEphemeral(interaction, "❌ Please select a bill from the menu first.");
						return;
					}
					try {
						const res = await this.manager.payBill(this.ctx.userId, this.selectedBillId, this.ctx.guild?.id);
						if (res.success) this.statusMessage = `✅ Paid **${res.bill?.title}** ($${res.amountPaid.toLocaleString()})! Credit score increased to **${res.newCreditScore}**!`;
						else this.statusMessage = `❌ ${res.error}`;
					} catch (err) {
						this.statusMessage = `❌ ${err.message}`;
					}
				} else if (action === "pay_all") try {
					const res = await this.manager.payAllBills(this.ctx.userId, this.ctx.guild?.id);
					if (res.success) this.statusMessage = `🏛️ **TAX COMPLIANCE ACHIEVED!** Settled ${res.paidCount} bills ($${res.totalAmountPaid.toLocaleString()})! Credit score boosted to **${res.newCreditScore}**!`;
					else this.statusMessage = `❌ ${res.error}`;
				} catch (err) {
					this.statusMessage = `❌ ${err.message}`;
				}
				else if (action === "evade") try {
					const res = await this.manager.attemptTaxEvasion(this.ctx.userId, this.ctx.guild?.id);
					this.statusMessage = res.auditDetails;
				} catch (err) {
					this.statusMessage = `❌ ${err.message}`;
				}
			}
			const container = await this.buildContainer();
			await this.ctx.edit({
				components: [container],
				flags: MessageFlags.IsComponentsV2
			});
		});
	}
	async buildContainer() {
		const container = this.createContainer();
		const sym = this.manager.currencySymbol || "🪙";
		const bills = await this.manager.getPendingBills(this.ctx.userId, this.ctx.guild?.id);
		const totalBilled = bills.reduce((sum, b) => sum + b.amount, 0);
		const credit = await this.manager.getCreditScore(this.ctx.userId, this.ctx.guild?.id);
		let content = `## 🏛️ Municipal Treasury, Utilities & Tax Compliance\n> **Citizen:** <@${this.ctx.userId}>  •  **Credit Rating:** \`${credit.rating}\` (\`${credit.score} pts\`)\n> **Total Pending Obligations:** \`${sym} ${totalBilled.toLocaleString()}\` across \`${bills.length} bills\`\n\n> **Status:** ${this.statusMessage}\n\n`;
		if (bills.length === 0) content += `> ✨ **ALL OBLIGATIONS SETTLED!** You are in 100% tax and utility compliance. No pending fees!\n`;
		else {
			content += `### 📄 Pending Notices:\n`;
			for (const b of bills) {
				const isSel = b.id === this.selectedBillId ? "👉 " : "• ";
				content += `> ${isSel}**${b.title}**: \`${sym} ${b.amount.toLocaleString()}\` (Due: <t:${Math.floor(b.dueAt / 1e3)}:R>)\n`;
			}
		}
		container.addTextDisplayComponents((t) => t.setContent(content));
		if (bills.length > 0) {
			const options = bills.map((b) => new StringSelectMenuOptionBuilder().setLabel(`${b.title.slice(0, 50)}`).setValue(b.id).setDescription(`${sym} ${b.amount.toLocaleString()}`).setDefault(b.id === this.selectedBillId));
			const billRow = new ActionRowBuilder().addComponents(new StringSelectMenuBuilder().setCustomId(`${this.btnPrefix}select_bill`).setPlaceholder("Select a bill to settle...").addOptions(options));
			container.addActionRowComponents(billRow);
			const hasTax = bills.some((b) => b.type === "wealth_tax");
			const btnRow = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId(`${this.btnPrefix}pay_selected`).setLabel("Pay Selected Bill").setStyle(ButtonStyle.Primary).setDisabled(!this.selectedBillId), new ButtonBuilder().setCustomId(`${this.btnPrefix}pay_all`).setLabel(`🏛️ Settle All (${sym} ${totalBilled.toLocaleString()})`).setStyle(ButtonStyle.Success), new ButtonBuilder().setCustomId(`${this.btnPrefix}evade`).setLabel("🎲 Offshore Shell Evasion").setStyle(ButtonStyle.Danger).setDisabled(!hasTax));
			container.addActionRowComponents(btnRow);
		}
		return container;
	}
};
// src/index.ts
/**
* @m3rcena/eco
* The Ultimate High-Performance Economy, Progression & Casino Engine for Discord.js bots.
*
* @copyright 2026 M3rcena Development. All rights reserved.
* @license Apache-2.0
*/
export { BankManager, BusinessManager, CRATE_PRICES, CareerManager, CasinoManager, ContextAdapter, CrateManager, DEFAULT_BUSINESS_CATALOG, DEFAULT_HEIST_TARGETS, DEFAULT_JOBS, DEFAULT_PETS, DEFAULT_SHOP_ITEMS, DEFAULT_STOCKS, DEFAULT_VAULT_TIERS, ECO_VERSION, EcoBaseUI, EcoBillsUI, EcoBlackjackUI, EcoBridgeRouter, EcoCrateUI, EcoDatabaseHandler, EcoHeistUI, EcoLeaderboardUI, EcoLoanUI, EcoManager, EcoProfileUI, EcoShopUI, EcoStockMarketUI, EcoVaultUI, EcoWekyConnector, HeistManager, JsonEcoStorage, LOAN_CATALOG, LeaderboardManager, LoanManager, M3rcenaBridge, MemoryEcoStorage, PRISMA_ECO_MODEL, PetManager, PrismaEcoStorage, RenderBankCard, RenderMarketChart, RewardManager, ShopManager, SqliteEcoStorage, StockMarketManager, TaxManager, VaultManager, applyPrismaEcoModel, boxConsole, checkPackageUpdates, compareSemver, createDefaultAccount, fetchLatestVersion, findProjectRoot, generateTsConfigPaths, getAllPackageResolutions, hostEco, isTypeScriptRuntime, loadResolverConfig, printResolutionSummary, resolveEcoStorage, resolvePackage, stripAnsi };

//# sourceMappingURL=index.mjs.map