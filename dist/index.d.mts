import { $ as CreditRating, A as BlackjackState, At as UserStats, B as BankManager, C as DEFAULT_HEIST_TARGETS, Ct as StockTradeResult, D as LeaderboardEntry, Dt as UserCareer, E as StockMarketManager, Et as UserBusiness, F as DEFAULT_SHOP_ITEMS, G as ActiveEffect, H as JsonEcoStorage, I as ShopManager, J as BusinessConfig, K as BankVaultTier, L as CareerManager, M as CasinoManager, N as BusinessManager, O as LeaderboardManager, Ot as UserLoan, P as DEFAULT_BUSINESS_CATALOG, Q as CrateTier, R as DEFAULT_JOBS, S as PetManager, St as StockMarketTrend, T as DEFAULT_STOCKS, Tt as UserAccount, U as MemoryEcoStorage, V as EcoStorageAdapter, W as createDefaultAccount, X as CasinoBetResult, Y as CareerJob, Z as CrateReward, _ as DEFAULT_VAULT_TIERS, _t as Prestige, a as EcoRewardDistributionResult, at as EcoManagerOptions, b as CrateManager, bt as SkillTree, c as EcoWagerRefundedEvent, ct as HeistRole, d as EcoWekyConnectorEvents, dt as InventoryItem, et as CreditScoreData, f as EcoWekyConnectorOptions, ft as LoanOffer, g as LoanManager, gt as PetExpeditionResult, h as LOAN_CATALOG, ht as PetConfig, i as EcoGameRewardRule, it as EcoEvents, j as Card, jt as UserStockPosition, k as LeaderboardMetric, kt as UserPet, l as EcoWagerResolvedEvent, lt as HeistSession, m as TaxManager, mt as MunicipalBill, n as hostEco, nt as EcoCustomMessages, o as EcoWagerCreateResult, ot as HeistCrewMember, p as EcoBridgeRouter, pt as LoanTier, q as BillType, r as EcoManager, rt as EcoDatabaseConfig, s as EcoWagerRecord, st as HeistResult, t as HostEcoOptions, tt as EcoCustomEmojis, u as EcoWekyConnector, ut as HeistTarget, v as VaultManager, vt as RobResult, w as HeistManager, wt as TransferResult, x as DEFAULT_PETS, xt as StockConfig, y as CRATE_PRICES, yt as ShopItem, z as RewardManager } from "./host-_xxHiG2p.mjs";
import { M3rcenaPackageName, M3rcenaResolverConfig, PackageResolution, ResolverOptions, findProjectRoot, generateTsConfigPaths, getAllPackageResolutions, isTypeScriptRuntime, loadResolverConfig, printResolutionSummary, resolvePackage } from "./resolver.mjs";
import { ActionRowBuilder, AttachmentBuilder, ButtonInteraction, ChatInputCommandInteraction, Client, ColorResolvable, ContainerBuilder, EmbedBuilder, Guild, GuildMember, Interaction, Message, MessageFlags, TextBasedChannel, User } from "discord.js";
import { M3rcenaBridge } from "@m3rcena/bridge";
export interface SqliteEcoStorageOptions {
  /** Database file path on disk (default: "./eco.sqlite") */
  path?: string;
  /** Whether to enable WAL mode for high concurrency (default: true) */
  walMode?: boolean;
}
export declare class SqliteEcoStorage implements EcoStorageAdapter {
  private db;
  readonly dbPath: string;
  constructor(options?: string | SqliteEcoStorageOptions);
  private initTables;
  getAccount(userId: string, guildId?: string): Promise<UserAccount | null>;
  saveAccount(account: UserAccount): Promise<void>;
  getTopAccounts(sortBy?: "netWorth" | "wallet" | "bank" | "level", limit?: number, guildId?: string): Promise<UserAccount[]>;
  getAllAccounts(guildId?: string): Promise<UserAccount[]>;
  /**
   * Closes the SQLite database connection.
   */
  close(): void;
}
/**
 * Prisma Schema snippet that developers can paste into their schema.prisma.
 */
export declare const PRISMA_ECO_MODEL: string;
/**
 * Automatically inspects and appends the EcoAccount model to a schema.prisma file if missing.
 * @param schemaPath Path to schema.prisma (default: "prisma/schema.prisma")
 * @returns True if model was appended, false if already present or schema file not found.
 */
export declare function applyPrismaEcoModel(schemaPath?: string): boolean;
export interface PrismaEcoStorageOptions {
  /** The PrismaClient instance provided by the bot */
  client: any;
  /** Property name of the model on the PrismaClient (default: "ecoAccount") */
  model?: string;
  /** Underlying SQL table name (default: "EcoAccount") */
  tableName?: string;
  /** Automatically run table migration on connection if missing (default: true) */
  autoMigrate?: boolean;
}
export declare class PrismaEcoStorage implements EcoStorageAdapter {
  private client;
  private modelName;
  private tableName;
  private autoMigrate;
  private migrated;
  constructor(options: any | PrismaEcoStorageOptions);
  private ensureMigrated;
  getAccount(userId: string, guildId?: string): Promise<UserAccount | null>;
  saveAccount(account: UserAccount): Promise<void>;
  getTopAccounts(sortBy?: "netWorth" | "wallet" | "bank" | "level", limit?: number, guildId?: string): Promise<UserAccount[]>;
  getAllAccounts(guildId?: string): Promise<UserAccount[]>;
}
export declare class EcoDatabaseHandler {
  /**
   * Instantiates the requested database storage adapter based on developer configuration.
   */
  static create(config?: EcoDatabaseConfig): EcoStorageAdapter;
  /**
   * Helper utility to automatically append the EcoAccount model to schema.prisma.
   */
  static applyPrismaSchema(schemaPath?: string): boolean;
}
/**
 * Convenience helper to resolve an EcoStorageAdapter from either an existing storage instance or database config.
 */
export declare function resolveEcoStorage(options: {
  storage?: any;
  database?: EcoDatabaseConfig;
}): EcoStorageAdapter;
/**
 * @m3rcena/eco
 * Visual Canvas Bank Card & Passport Renderer.
 * Generates personalized debit/credit card artwork using @napi-rs/canvas.
 *
 * @copyright 2026 M3rcena Development. All rights reserved.
 * @license Apache-2.0
 */
export interface BankCardRenderOptions {
  username: string;
  avatarUrl?: string;
  wallet: number;
  bank: number;
  netWorth: number;
  currencySymbol?: string;
  cardNumber?: string;
  cardTier?: "BRONZE" | "SILVER" | "GOLD" | "PLATINUM" | "OBSIDIAN" | "MYTHIC";
  joinDate?: string;
  creditScore?: number;
  vaultTierName?: string;
  customGradient?: [string, string, string];
  bankName?: string;
}
export declare class RenderBankCard {
  /**
   * Generates a high-tech personalized debit/credit card buffer.
   */
  static renderCard(options: BankCardRenderOptions): Promise<Buffer>;
  private static resolveTier;
  private static drawChip;
  private static drawContactless;
  private static drawHoloCircles;
}
/**
 * @m3rcena/eco
 * Stock & Crypto Canvas Chart Renderer.
 * Generates dynamic candlestick / sparkline price trend charts.
 *
 * @copyright 2026 M3rcena Development. All rights reserved.
 * @license Apache-2.0
 */
export interface StockChartOptions {
  symbol: string;
  name: string;
  history: number[];
  currentPrice: number;
  change24h: number;
  currencySymbol?: string;
}
export declare class RenderMarketChart {
  /**
   * Generates a sleek dark mode price chart buffer.
   */
  static renderChart(options: StockChartOptions): Buffer;
}
export type ComponentBuilderType = ActionRowBuilder<any> | ContainerBuilder | any;
export interface ContextSendOptions {
  content?: string;
  embeds?: EmbedBuilder[];
  components?: ComponentBuilderType[];
  files?: (AttachmentBuilder | Buffer | {
    attachment: Buffer | string;
    name?: string;
  })[];
  flags?: MessageFlags | number;
}
export type GameContextInput = ChatInputCommandInteraction | ButtonInteraction | Interaction | Message | any;
export declare class ContextAdapter {
  raw: GameContextInput;
  user: User;
  userId: string;
  member: GuildMember | null;
  guild: Guild | null;
  channel: TextBasedChannel;
  client: Client;
  isInteraction: boolean;
  isMessage: boolean;
  gameMessage: Message | null;
  constructor(context: GameContextInput);
  static from(context: GameContextInput): ContextAdapter;
  private resolveFlags;
  sendInitial(options: ContextSendOptions): Promise<Message>;
  edit(options: ContextSendOptions): Promise<void>;
  static replyEphemeral(interaction: any, content: string): Promise<void>;
}
export interface EcoBaseUIOptions {
  context: GameContextInput;
  embedColor?: ColorResolvable | number | string;
  time?: number;
}
export declare abstract class EcoBaseUI<TOptions extends EcoBaseUIOptions = EcoBaseUIOptions> {
  manager: any;
  options: TOptions;
  ctx: ContextAdapter;
  id: string;
  defaultColor: number;
  isActive: boolean;
  protected timeoutTimer: NodeJS.Timeout | null;
  protected defaultTimeout: number;
  constructor(manager: any, options: TOptions, prefix?: string);
  resolveColor(color?: ColorResolvable | string | number | null, fallback?: number): number;
  createContainer(color?: number): ContainerBuilder;
  protected resetTimeout(callback?: () => void, customMs?: number): void;
  protected clearTimer(): void;
  destroy(): void;
  format(template: string, vars: Record<string, any>): string;
  abstract start(): Promise<void>;
}
export interface EcoProfileUIOptions extends EcoBaseUIOptions {
  targetUser?: User | GuildMember;
  renderCard?: boolean;
}
export declare class EcoProfileUI extends EcoBaseUI<EcoProfileUIOptions> {
  private targetUser;
  private currentTab;
  private btnPrefix;
  private cardBuffer;
  constructor(manager: any, options: EcoProfileUIOptions);
  start(): Promise<void>;
  private setupCollector;
  private buildContainer;
}
export interface EcoShopUIOptions extends EcoBaseUIOptions {
  itemsPerPage?: number;
}
export declare class EcoShopUI extends EcoBaseUI<EcoShopUIOptions> {
  private selectedCategory;
  private selectedItemId;
  private page;
  private itemsPerPage;
  private btnPrefix;
  constructor(manager: any, options: EcoShopUIOptions);
  start(): Promise<void>;
  private setupCollector;
  private buildContainer;
}
export interface EcoStockMarketUIOptions extends EcoBaseUIOptions {
  renderChart?: boolean;
}
export declare class EcoStockMarketUI extends EcoBaseUI<EcoStockMarketUIOptions> {
  private selectedSymbol;
  private chartBuffer;
  private btnPrefix;
  constructor(manager: any, options: EcoStockMarketUIOptions);
  start(): Promise<void>;
  private getStocks;
  private updateChart;
  private setupCollector;
  private buildContainer;
}
export interface EcoHeistUIOptions extends EcoBaseUIOptions {
  initialTargetId?: string;
}
export declare class EcoHeistUI extends EcoBaseUI<EcoHeistUIOptions> {
  private targetId;
  private session;
  private btnPrefix;
  private statusMessage;
  private isExecuting;
  private outcome;
  constructor(manager: any, options: EcoHeistUIOptions);
  start(): Promise<void>;
  private setupCollector;
  private getTarget;
  private buildContainer;
}
export interface EcoBlackjackUIOptions extends EcoBaseUIOptions {
  betAmount: number;
}
export declare class EcoBlackjackUI extends EcoBaseUI<EcoBlackjackUIOptions> {
  private state;
  private btnPrefix;
  private initialBet;
  constructor(manager: any, options: EcoBlackjackUIOptions);
  start(): Promise<void>;
  private setupCollector;
  private formatCards;
  private buildContainer;
}
export interface EcoCrateUIOptions extends EcoBaseUIOptions {
  initialTier?: CrateTier;
}
export declare class EcoCrateUI extends EcoBaseUI<EcoCrateUIOptions> {
  private selectedTier;
  private btnPrefix;
  private isUnboxing;
  private lastReward;
  constructor(manager: any, options: EcoCrateUIOptions);
  start(): Promise<void>;
  private setupCollector;
  private buildContainer;
}
export interface EcoLeaderboardUIOptions extends EcoBaseUIOptions {
  initialMetric?: LeaderboardMetric;
  limit?: number;
}
export declare class EcoLeaderboardUI extends EcoBaseUI<EcoLeaderboardUIOptions> {
  private selectedMetric;
  private page;
  private pageSize;
  private btnPrefix;
  constructor(manager: any, options: EcoLeaderboardUIOptions);
  start(): Promise<void>;
  private setupCollector;
  private buildContainer;
}
export declare class EcoVaultUI extends EcoBaseUI {
  private selectedTierNum;
  private btnPrefix;
  private statusMessage;
  constructor(manager: any, options: EcoBaseUIOptions);
  start(): Promise<void>;
  private setupCollector;
  private buildContainer;
}
export declare class EcoLoanUI extends EcoBaseUI {
  private selectedTier;
  private selectedLoanId;
  private btnPrefix;
  private statusMessage;
  constructor(manager: any, options: EcoBaseUIOptions);
  start(): Promise<void>;
  private setupCollector;
  private buildContainer;
}
export declare class EcoBillsUI extends EcoBaseUI {
  private selectedBillId;
  private btnPrefix;
  private statusMessage;
  constructor(manager: any, options: EcoBaseUIOptions);
  start(): Promise<void>;
  private setupCollector;
  private buildContainer;
}
/**
 * @m3rcena/eco
 * Terminal update notification box utility.
 *
 * @copyright 2026 M3rcena Development. All rights reserved.
 * @license Apache-2.0
 */
export declare const ECO_VERSION = "14.28.1";
/**
 * Strips ANSI color escape codes to compute visible string length.
 */
export declare function stripAnsi(str: string): string;
/**
 * Renders an array of text messages inside a styled terminal box.
 */
export declare function boxConsole(messages: string[]): void;
/**
 * Compares two semantic version strings.
 * Returns -1 if v1 < v2, 0 if equal, 1 if v1 > v2.
 */
export declare function compareSemver(v1: string, v2: string): number;
/**
 * Fetches the latest published version of `@m3rcena/eco` from the npm registry.
 */
export declare function fetchLatestVersion(): Promise<string | null>;
/**
 * Checks if a newer version of `@m3rcena/eco` is available and logs the notification box.
 */
export declare function checkPackageUpdates(currentVersion?: string, disabled?: boolean): Promise<void>;
export { ActiveEffect, BankManager, BankVaultTier, BillType, BlackjackState, BusinessConfig, BusinessManager, CRATE_PRICES, Card, CareerJob, CareerManager, CasinoBetResult, CasinoManager, CrateManager, CrateReward, CrateTier, CreditRating, CreditScoreData, DEFAULT_BUSINESS_CATALOG, DEFAULT_HEIST_TARGETS, DEFAULT_JOBS, DEFAULT_PETS, DEFAULT_SHOP_ITEMS, DEFAULT_STOCKS, DEFAULT_VAULT_TIERS, EcoBridgeRouter, EcoCustomEmojis, EcoCustomMessages, EcoDatabaseConfig, EcoEvents, EcoGameRewardRule, EcoManager, EcoManagerOptions, EcoRewardDistributionResult, EcoStorageAdapter, EcoWagerCreateResult, EcoWagerRecord, EcoWagerRefundedEvent, EcoWagerResolvedEvent, EcoWekyConnector, EcoWekyConnectorEvents, EcoWekyConnectorOptions, HeistCrewMember, HeistManager, HeistResult, HeistRole, HeistSession, HeistTarget, HostEcoOptions, InventoryItem, JsonEcoStorage, LOAN_CATALOG, LeaderboardEntry, LeaderboardManager, LeaderboardMetric, LoanManager, LoanOffer, LoanTier, M3rcenaBridge, M3rcenaPackageName, M3rcenaResolverConfig, MemoryEcoStorage, MunicipalBill, PackageResolution, PetConfig, PetExpeditionResult, PetManager, Prestige, ResolverOptions, RewardManager, RobResult, ShopItem, ShopManager, SkillTree, StockConfig, StockMarketManager, StockMarketTrend, StockTradeResult, TaxManager, TransferResult, UserAccount, UserBusiness, UserCareer, UserLoan, UserPet, UserStats, UserStockPosition, VaultManager, createDefaultAccount, findProjectRoot, generateTsConfigPaths, getAllPackageResolutions, hostEco, isTypeScriptRuntime, loadResolverConfig, printResolutionSummary, resolvePackage };
//# sourceMappingURL=index.d.mts.map