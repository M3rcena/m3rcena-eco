# 📖 @m3rcena/eco Comprehensive API Documentation

> 📚 **Official GitHub Wiki**: The full, categorized documentation, tutorials, and deep-dive guides are organized in the **[M3rcena Eco Official Wiki](https://github.com/M3rcena/m3rcena-eco/wiki)**:
> - **[Architecture & Database Handlers](https://github.com/M3rcena/m3rcena-eco/wiki/Architecture)**
> - **[Real Economy: Bank Vaults, Loans, Bills & Taxes](https://github.com/M3rcena/m3rcena-eco/wiki/Real-Economy)**
> - **[Careers, Jobs, Shop & Businesses](https://github.com/M3rcena/m3rcena-eco/wiki/Careers-and-Shop)**
> - **[Casino & Gambling Suite](https://github.com/M3rcena/m3rcena-eco/wiki/Casino-Suite)**
> - **[Stocks, Heists, Pets & Loot Crates](https://github.com/M3rcena/m3rcena-eco/wiki/Stocks-Heists-and-Pets)**
> - **[Dashboard Bridge Integration](https://github.com/M3rcena/m3rcena-eco/wiki/Bridge-Integration)**

Welcome to the definitive documentation for **`@m3rcena/eco`** (v14.28.0) — the ultimate enterprise-grade Discord.js v14 economy, progression, career, stock market, and casino engine.

---

## 📑 Table of Contents

1. [Architecture & Design Principles](#1-architecture--design-principles)
2. [Installation & Requirements](#2-installation--requirements)
3. [Quickstart Setup](#3-quickstart-setup)
4. [The Central Engine: `EcoManager`](#4-the-central-engine-ecomanager)
5. [Database Handlers & Persistence Layer](#5-database-handlers--persistence-layer)
   - [5.1. Zero-Config Local SQLite (`node:sqlite`)](#51-zero-config-local-sqlite-nodesqlite)
   - [5.2. Enterprise Prisma ORM Integration](#52-enterprise-prisma-orm-integration)
   - [5.3. Manual Prisma Migration Tables (PostgreSQL, MySQL, SQLite)](#53-manual-prisma-migration-tables)
   - [5.4. JSON File Storage (`JsonEcoStorage`)](#54-json-file-storage-jsonecostorage)
   - [5.5. In-Memory Ephemeral Storage (`MemoryEcoStorage`)](#55-in-memory-ephemeral-storage-memoryecostorage)
   - [5.6. Custom Database Adapters (`EcoStorageAdapter`)](#56-custom-database-adapters-ecostorageadapter)
6. [Core Banking & Dual-Currency System (`BankManager`)](#6-core-banking--dual-currency-system-bankmanager)
7. [Daily Streaks, Work, Crime & Robbery (`RewardManager`)](#7-daily-streaks-work-crime--robbery-rewardmanager)
8. [Career Progression & Jobs (`CareerManager`)](#8-career-progression--jobs-careermanager)
9. [Shop, Inventory & Consumable Buffs (`ShopManager`)](#9-shop-inventory--consumable-buffs-shopmanager)
10. [Passive Business Investment (`BusinessManager`)](#10-passive-business-investment-businessmanager)
11. [Casino & High-Stakes Gambling Suite (`CasinoManager`)](#11-casino--high-stakes-gambling-suite-casinomanager)
    - [11.1. Coinflip (`coinflip`)](#111-coinflip)
    - [11.2. Dice Roll (`dice`)](#112-dice-roll)
    - [11.3. Slot Machine (`slots`)](#113-slot-machine)
    - [11.4. European Roulette (`roulette`)](#114-european-roulette)
    - [11.5. Crash Multiplier (`crash`)](#115-crash-multiplier)
    - [11.6. Blackjack Table (`blackjack`)](#116-blackjack-table)
12. [Simulated Stock & Crypto Exchange (`StockMarketManager`)](#12-simulated-stock--crypto-exchange-stockmarketmanager)
13. [Multiplayer Syndicate Heists (`HeistManager`)](#13-multiplayer-syndicate-heists-heistmanager)
14. [Companion Pets & Foraging (`PetManager`)](#14-companion-pets--foraging-petmanager)
15. [Mystery Loot Crates (`CrateManager`)](#15-mystery-loot-crates-cratemanager)
16. [Real Economy: Bank Vaults & Compound Interest (`VaultManager`)](#16-real-economy-bank-vaults--compound-interest-vaultmanager)
17. [Real Economy: Credit Score, Loans & Debt (`LoanManager`)](#17-real-economy-credit-score-loans--debt-loanmanager)
18. [Real Economy: Municipal Bills, Taxes & Audits (`TaxManager`)](#18-real-economy-municipal-bills-taxes--audits-taxmanager)
19. [Interactive Discord Components V2 UI Suite](#19-interactive-discord-components-v2-ui-suite)
20. [High-Resolution Canvas Card Renderers](#20-high-resolution-canvas-card-renderers)
21. [Cross-Platform Bridge Integration (`EcoBridgeRouter`)](#21-cross-platform-bridge-integration-ecobridgerouter)
22. [Complete TypeScript Types Reference](#22-complete-typescript-types-reference)

---

## 1. Architecture & Design Principles

`@m3rcena/eco` is built with a modular, decoupled architecture where each financial domain is encapsulated within a dedicated manager class. All managers interact with the unified storage adapter to ensure atomic state updates and consistent user accounts.

```
                              ┌───────────────────────────────────────────────┐
                              │                  EcoManager                   │
                              └───────────────────────┬───────────────────────┘
                                                      │
         ┌───────────────────┬────────────────────────┼────────────────────────┬───────────────────┐
         │                   │                        │                        │                   │
         ▼                   ▼                        ▼                        ▼                   ▼
  ┌─────────────┐     ┌───────────────┐        ┌───────────────┐        ┌───────────────┐   ┌───────────────┐
  │ BankManager │     │ RewardManager │        │ CareerManager │        │  ShopManager  │   │BusinessManager│
  └──────┬──────┘     └───────┬───────┘        └───────┬───────┘        └───────┬───────┘   └───────┬───────┘
         │                   │                        │                        │                   │
         ├───────────────────┼────────────────────────┼────────────────────────┼───────────────────┤
         ▼                   ▼                        ▼                        ▼                   ▼
  ┌─────────────┐     ┌───────────────┐        ┌───────────────┐        ┌───────────────┐   ┌───────────────┐
  │CasinoManager│     │StockMarketMgr │        │ HeistManager  │        │  PetManager   │   │ CrateManager  │
  └──────┬──────┘     └───────┬───────┘        └───────┬───────┘        └───────┬───────┘   └───────┬───────┘
         │                   │                        │                        │                   │
         ├───────────────────┼────────────────────────┼────────────────────────┼───────────────────┤
         ▼                   ▼                        ▼                        ▼                   ▼
  ┌─────────────┐     ┌───────────────┐        ┌───────────────┐        ┌───────────────┐   ┌───────────────┐
  │VaultManager │     │  LoanManager  │        │  TaxManager   │        │LeaderboardMgr │   │EcoBridgeRouter│
  └──────┬──────┘     └───────┬───────┘        └───────┬───────┘        └───────┬───────┘   └───────┬───────┘
         │                   │                        │                        │                   │
         └───────────────────┴────────────────────────┼────────────────────────┴───────────────────┘
                                                      ▼
                                       ┌─────────────────────────────┐
                                       │      EcoStorageAdapter      │
                                       │   (SQLite / Prisma / JSON)  │
                                       └─────────────────────────────┘
```

- **Dual-Currency Balance**: Cash on hand (Wallet) and protected funds (Bank).
- **Zero-Dependency Native SQLite**: Native `node:sqlite` storage for zero-hassle local databases.
- **Enterprise Prisma ORM**: Auto-migrating Prisma storage with direct delegates or raw SQL fallback.
- **Components V2 Powered**: Uses Discord's modern `flags: 32768` (Components V2) container structures.
- **Cross-Platform Bridge Ready**: Plugs into `@m3rcena/bridge` via `bridge.use(eco)` with live REST API and WebSocket events.

---

## 2. Installation & Requirements

```bash
npm install @m3rcena/eco @m3rcena/bridge discord.js
```

### System Requirements
- **Node.js**: `>= 22.0.0` (Node 22, 24, or 26 recommended; supports native `node:sqlite`).
- **Discord.js**: `^14.0.0`.
- **Canvas (Optional)**: `@napi-rs/canvas` is bundled automatically for debit cards and stock charts.

---

## 3. Quickstart Setup

```typescript
import { Client, GatewayIntentBits } from "discord.js";
import { EcoManager, EcoProfileUI, EcoShopUI, EcoStockMarketUI } from "@m3rcena/eco";

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

// Initialize EcoManager with native SQLite
export const eco = new EcoManager({
  currencySymbol: "🪙",
  currencyName: "Coins",
  embedColor: "#F1C40F",
  database: "sqlite", // Zero configuration! Auto-creates ./eco.sqlite
});

client.on("messageCreate", async (message) => {
  if (message.author.bot) return;

  // 1. Balance Check
  if (message.content === "!balance") {
    const bal = await eco.getBalance(message.author.id, message.guildId ?? undefined);
    return message.reply(`💰 Wallet: 🪙 ${bal.wallet.toLocaleString()} | Bank: 🪙 ${bal.bank.toLocaleString()} / ${bal.bankCapacity.toLocaleString()}`);
  }

  // 2. Daily Reward
  if (message.content === "!daily") {
    const res = await eco.daily(message.author.id, message.guildId ?? undefined);
    if (!res.success) return message.reply(`⏳ Cooldown! Try again in ${Math.ceil((res.cooldownRemainingMs ?? 0) / 60000)}m.`);
    return message.reply(`🎉 Claimed 🪙 ${res.amount.toLocaleString()}! Daily Streak: ${res.streak} 🔥`);
  }

  // 3. Interactive Components V2 Passport Profile
  if (message.content === "!profile") {
    return new EcoProfileUI(eco, { context: message }).start();
  }

  // 4. Interactive Components V2 Shop
  if (message.content === "!shop") {
    return new EcoShopUI(eco, { context: message }).start();
  }
});

client.login("YOUR_BOT_TOKEN");
```

---

## 4. The Central Engine: `EcoManager`

`EcoManager` is the unified orchestrator exposing high-level helper functions for all underlying modules.

### Options (`EcoManagerOptions`)

| Option | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `currencySymbol` | `string` | `"🪙"` | Prefix symbol displayed across cards and messages. |
| `currencyName` | `string` | `"Coins"` | Plural name of the currency. |
| `embedColor` | `any` | `0x5865f2` | Primary embed accent color (Hex string or number). |
| `mode` | `"guild" \| "global"` | `"guild"` | Scoping mode for user accounts and leaderboards. |
| `defaultWalletBalance` | `number` | `500` | Starting cash granted to new accounts. |
| `defaultBankCapacity` | `number` | `10000` | Starting maximum bank deposit ceiling. |
| `bankInterestRate` | `number` | `0.01` | Daily interest multiplier on bank holdings (1%). |
| `transactionFeePercentage` | `number` | `0` | Fee percentage deducted on player transfers (e.g. `0.02` for 2%). |
| `database` | `EcoDatabaseConfig` | `"memory"` | Database storage configuration (`"sqlite"`, `"prisma"`, `"json"`, or object). |
| `storage` | `EcoStorageAdapter` | `MemoryEcoStorage` | Custom storage adapter instance. |
| `bridge` | `M3rcenaBridge` | `undefined` | Active `@m3rcena/bridge` instance for web dashboard synchronization. |
| `notifyUpdates` | `boolean` | `true` | Log styled update notification box when a newer version is on npm. |
| `stockMarketTickIntervalMs` | `number` | `60000` | Milliseconds between simulated market price fluctuations. |
| `initialStocks` | `StockConfig[]` | `DEFAULT_STOCKS` | Custom initial stock and crypto assets. |
| `initialHeistTargets` | `HeistTarget[]` | `DEFAULT_HEIST_TARGETS` | Custom heist target vaults. |
| `initialPets` | `PetConfig[]` | `DEFAULT_PETS` | Custom companion pets catalog. |
| `cooldowns` | `object` | *See below* | Cooldown duration overrides in milliseconds. |

---

## 5. Database Handlers & Persistence Layer

`@m3rcena/eco` features a zero-friction database system. Developers can choose between native SQLite, Prisma ORM, JSON files, or memory storage via the `database` configuration.

```typescript
export type EcoDatabaseConfig =
  | "sqlite"
  | "memory"
  | "json"
  | { type: "sqlite"; path?: string }
  | { type: "prisma"; client: any; model?: string; autoMigrate?: boolean }
  | { type: "json"; path?: string }
  | { type: "memory" };
```

---

### 5.1. Zero-Config Local SQLite (`node:sqlite`)

Uses Node.js `>= 22.0.0` built-in `node:sqlite` (`DatabaseSync`). Zero npm compilation, zero C++ build tools, instant startup, WAL mode enabled by default, and indexed queries.

```typescript
import { EcoManager } from "@m3rcena/eco";

const eco = new EcoManager({
  // Auto-creates ./eco.sqlite with tables & indexes
  database: "sqlite",

  // Or with custom directory:
  database: {
    type: "sqlite",
    path: "./data/economy.sqlite",
  },
});
```

---

### 5.2. Enterprise Prisma ORM Integration

Pass an existing `PrismaClient` instance. If your database hasn't compiled the `EcoAccount` delegate, `@m3rcena/eco` automatically runs DDL creation and executes queries via raw SQL:

```typescript
import { PrismaClient } from "@prisma/client";
import { EcoManager, applyPrismaEcoModel } from "@m3rcena/eco";

const prisma = new PrismaClient();

// Optional: Automatically appends `model EcoAccount` to schema.prisma if missing:
applyPrismaEcoModel();

const eco = new EcoManager({
  database: {
    type: "prisma",
    client: prisma,
    autoMigrate: true, // Auto-creates table if missing
  },
});
```

---

### 5.3. Manual Prisma Migration Tables

If you prefer to manage database schemas manually or with `npx prisma migrate dev`, use the schema snippet below:

#### Prisma Schema Snippet (`schema.prisma`):
```prisma
model EcoAccount {
  userId    String
  guildId   String   @default("")
  wallet    Float    @default(0)
  bank      Float    @default(0)
  level     Int      @default(1)
  data      String   // Complete JSON payload of account state (inventory, businesses, etc.)
  updatedAt DateTime @updatedAt

  @@id([userId, guildId])
  @@index([guildId])
  @@index([wallet, bank])
}
```

#### PostgreSQL Manual Migration SQL:
```sql
CREATE TABLE IF NOT EXISTS "EcoAccount" (
  "userId" VARCHAR(191) NOT NULL,
  "guildId" VARCHAR(191) NOT NULL DEFAULT '',
  "wallet" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "bank" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "level" INTEGER NOT NULL DEFAULT 1,
  "data" TEXT NOT NULL,
  "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY ("userId", "guildId")
);

CREATE INDEX IF NOT EXISTS idx_eco_guild ON "EcoAccount" ("guildId");
CREATE INDEX IF NOT EXISTS idx_eco_networth ON "EcoAccount" ("wallet", "bank");
```

#### MySQL Manual Migration SQL:
```sql
CREATE TABLE IF NOT EXISTS `EcoAccount` (
  `userId` VARCHAR(191) NOT NULL,
  `guildId` VARCHAR(191) NOT NULL DEFAULT '',
  `wallet` DOUBLE NOT NULL DEFAULT 0,
  `bank` DOUBLE NOT NULL DEFAULT 0,
  `level` INT NOT NULL DEFAULT 1,
  `data` LONGTEXT NOT NULL,
  `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`userId`, `guildId`),
  INDEX idx_eco_guild (`guildId`),
  INDEX idx_eco_networth (`wallet`, `bank`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

#### SQLite Manual Migration SQL:
```sql
CREATE TABLE IF NOT EXISTS eco_accounts (
  user_id TEXT NOT NULL,
  guild_id TEXT NOT NULL DEFAULT '',
  wallet REAL NOT NULL DEFAULT 0,
  bank REAL NOT NULL DEFAULT 0,
  level INTEGER NOT NULL DEFAULT 1,
  data TEXT NOT NULL,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, guild_id)
);

CREATE INDEX IF NOT EXISTS idx_eco_guild ON eco_accounts (guild_id);
CREATE INDEX IF NOT EXISTS idx_eco_networth ON eco_accounts (wallet + bank DESC);
```

---

### 5.4. JSON File Storage (`JsonEcoStorage`)

```typescript
const eco = new EcoManager({
  database: "json", // Defaults to ./eco-data.json
  // Or:
  database: {
    type: "json",
    path: "./data/economy.json",
  },
});
```

---

### 5.5. In-Memory Ephemeral Storage (`MemoryEcoStorage`)

Ideal for unit testing or ephemeral Discord bots with zero disk I/O:

```typescript
const eco = new EcoManager({
  database: "memory",
});
```

---

### 5.6. Custom Database Adapters (`EcoStorageAdapter`)

Implement the `EcoStorageAdapter` interface for MongoDB, DynamoDB, or Redis:

```typescript
import { EcoStorageAdapter, UserAccount } from "@m3rcena/eco";

export class CustomMongoStorage implements EcoStorageAdapter {
  async getAccount(userId: string, guildId?: string): Promise<UserAccount | null> {
    // Return UserAccount or null
  }
  async saveAccount(account: UserAccount): Promise<void> {
    // Persist account
  }
  async getTopAccounts(sortBy: "netWorth" | "wallet" | "bank" | "level", limit?: number, guildId?: string): Promise<UserAccount[]> {
    // Return sorted accounts
  }
  async getAllAccounts(guildId?: string): Promise<UserAccount[]> {
    // Return all accounts
  }
}
```

---

## 6. Core Banking & Dual-Currency System (`BankManager`)

Manages player accounts, wallet funds, bank storage, deposits, withdrawals, and peer transfers.

### Methods

#### `eco.getBalance(userId: string, guildId?: string): Promise<UserAccount>`
Returns the complete user account record with `wallet`, `bank`, `bankCapacity`, and computed `netWorth`.

#### `eco.deposit(userId: string, amount: number | "all", guildId?: string): Promise<TransferResult>`
Transfers funds from `wallet` to `bank`. Automatically caps deposits at `bankCapacity`.
```typescript
const res = await eco.deposit(message.author.id, 500);
if (!res.success) message.reply(res.error);
```

#### `eco.withdraw(userId: string, amount: number | "all", guildId?: string): Promise<TransferResult>`
Transfers funds from `bank` to `wallet`.

#### `eco.transfer(fromUserId: string, toUserId: string, amount: number, guildId?: string): Promise<TransferResult>`
Transfers funds between two users with optional percentage fees (`transactionFeePercentage`).

#### `eco.modifyWallet(userId: string, delta: number, guildId?: string): Promise<UserAccount>`
Directly increments or decrements cash in a user's wallet.

#### `eco.modifyBank(userId: string, delta: number, guildId?: string): Promise<UserAccount>`
Directly increments or decrements balance in a user's bank.

#### `eco.setBankCapacity(userId: string, newCap: number, guildId?: string): Promise<UserAccount>`
Sets maximum bank storage limit.

---

## 7. Daily Streaks, Work, Crime & Robbery (`RewardManager`)

Manages recurring player actions, time-gated reward claims, and high-risk criminal gameplay.

### Default Cooldowns
- **Daily**: 24 hours (`86,400,000` ms)
- **Weekly**: 7 days (`604,800,000` ms)
- **Monthly**: 30 days (`2,592,000,000` ms)
- **Hourly**: 1 hour (`3,600,000` ms)
- **Work**: 30 minutes (`1,800,000` ms)
- **Beg**: 45 seconds (`45,000` ms)
- **Crime**: 15 minutes (`900,000` ms)
- **Rob**: 2 hours (`7,200,000` ms)

### Methods

#### `eco.daily(userId, guildId?): Promise<RewardClaimResult>`
Claims daily cash reward with progressive streak bonuses.

#### `eco.work(userId, guildId?): Promise<WorkResult>`
Works a shift at the user's active career job. Awards career salary and character XP.

#### `eco.beg(userId, guildId?): Promise<BegResult>`
Begs from a randomized NPC (e.g. Elon Musk, MrBeast, Grandma) with custom dialogue quotes.

#### `eco.crime(userId, guildId?): Promise<CrimeResult>`
Attempts high-risk crime. 50% chance to earn 🪙 1,500 - 4,000; 50% chance to be fined by the police.

#### `eco.rob(robberId, victimId, guildId?): Promise<RobResult>`
Attempts to steal wallet cash from another player.
- **Titanium Padlock Shield**: If the victim owns a padlock, robbery fails and the padlock breaks.
- **Fail Penalty**: If caught, the robber pays a fine to the victim.

---

## 8. Career Progression & Jobs (`CareerManager`)

Provides a 10-tier career progression ladder with promotion mechanics and salary scaling.

### Career Ladder (`DEFAULT_JOBS`)

| Tier | Job Title | Base Salary | Required Level | Required Shifts for Promotion |
| :---: | :--- | :---: | :---: | :---: |
| 1 | 🧹 Janitor | 🪙 150 | Lv 1 | 5 Shifts |
| 2 | ☕ Barista | 🪙 350 | Lv 2 | 10 Shifts |
| 3 | 📦 Delivery Courier | 🪙 650 | Lv 4 | 15 Shifts |
| 4 | 💻 Junior Software Dev | 🪙 1,200 | Lv 7 | 20 Shifts |
| 5 | 🔐 Cyber Security Analyst | 🪙 2,400 | Lv 12 | 25 Shifts |
| 6 | 📈 Wall Street Broker | 🪙 4,800 | Lv 18 | 30 Shifts |
| 7 | 🚀 Aerospace Engineer | 🪙 9,500 | Lv 25 | 35 Shifts |
| 8 | ⚖️ Corporate Law Partner | 🪙 18,000 | Lv 35 | 40 Shifts |
| 9 | 🏥 Chief Medical Officer | 🪙 35,000 | Lv 50 | 50 Shifts |
| 10 | 👑 Hedge Fund Managing Dir | 🪙 75,000 | Lv 75 | Max Tier |

### Methods
- `eco.careers.getAvailableJobs()`: List all career options.
- `eco.careers.apply(userId, jobId, guildId?)`: Apply for a position.
- `eco.careers.getUserJob(userId, guildId?)`: Get active job details and promotion progress.

---

## 9. Shop, Inventory & Consumable Buffs (`ShopManager`)

Full player inventory management with interactive shopping and consumable buffs.

### Default Item Catalog (`DEFAULT_SHOP_ITEMS`)

| ID | Name | Price | Type | Effect Description |
| :--- | :--- | :---: | :---: | :--- |
| `padlock` | 🔒 Titanium Padlock | 🪙 2,500 | Defense | Blocks 1 robbery attempt; breaks on protection. |
| `energy_drink` | ⚡ Cyber Energy Drink | 🪙 800 | Consumable | Instantly resets your work shift cooldown. |
| `lucky_clover` | 🍀 Four-Leaf Clover | 🪙 3,500 | Consumable | Grants +15% casino winning probability for 1 hour. |
| `swiss_key` | 🗝️ Swiss Vault Key | 🪙 15,000 | Permanent | Permanently expands maximum bank capacity by +🪙 25,000. |
| `crypto_miner` | ⛏️ ASIC Mining Rig | 🪙 30,000 | Business | Generates passive crypto yields into your wallet. |

### Methods
- `eco.shop.getItems()`: Retrieve active shop catalog.
- `eco.shop.buy(userId, itemId, quantity, guildId?)`: Buy items with wallet cash.
- `eco.shop.sell(userId, itemId, quantity, guildId?)`: Sell items back for 70% refund.
- `eco.shop.use(userId, itemId, guildId?)`: Activate consumable buff.

---

## 10. Passive Business Investment (`BusinessManager`)

Allows players to purchase enterprises, upgrade facilities, hire staff, and collect passive income.

### Business Catalog (`DEFAULT_BUSINESS_CATALOG`)

| ID | Enterprise | Base Cost | Hourly Revenue | Base Employees |
| :--- | :--- | :---: | :---: | :---: |
| `kiosk` | ☕ Coffee Kiosk | 🪙 10,000 | 🪙 400 / hr | 2 Baristas |
| `startup` | 💻 SaaS Tech Startup | 🪙 50,000 | 🪙 2,500 / hr | 5 Developers |
| `mining_rig` | ⛏️ Bitcoin Mining Farm | 🪙 150,000 | 🪙 9,000 / hr | 3 Engineers |
| `megacorp` | 🏢 Conglomerate Holding Corp | 🪙 1,000,000 | 🪙 75,000 / hr | 25 Executives |

### Methods
- `eco.businesses.buy(userId, businessId, guildId?)`: Purchase enterprise.
- `eco.businesses.upgrade(userId, businessId, guildId?)`: Level up facility multiplier.
- `eco.businesses.hire(userId, businessId, count, guildId?)`: Hire employees for revenue boost.
- `eco.businesses.collect(userId, guildId?)`: Harvest accumulated revenue.

---

## 11. Casino & High-Stakes Gambling Suite (`CasinoManager`)

A complete, strictly audited casino suite with fair random math.

### 11.1. Coinflip
```typescript
const res = await eco.coinflip(userId, 500, "heads");
// res: { won: boolean, choice: "heads", outcome: "heads", payout: 1000 }
```

### 11.2. Dice Roll
```typescript
// Prediction: "high" (4-6), "low" (1-3), or exact number (1-6)
const res = await eco.dice(userId, 250, "high");
```

### 11.3. Slot Machine
Spins 3 reels. Triple 7s award the 50x Mega Jackpot!
```typescript
const res = await eco.slots(userId, 100);
// res: { reels: ["💎", "💎", "💎"], multiplier: 15, payout: 1500 }
```

### 11.4. European Roulette
Supports red, black, green (0), even, odd, or exact numbers (0-36).
```typescript
const res = await eco.roulette(userId, 1000, "red");
```

### 11.5. Crash Multiplier
Simulates the popular crypto crash curve.
```typescript
const res = await eco.crash(userId, 500, 2.5); // Target: 2.5x
```

### 11.6. Blackjack Table
Interactive dealer vs player blackjack:
```typescript
const session = await eco.casino.startBlackjack(userId, 500);
// Hit or Stand
const updated = await eco.casino.stepBlackjack(userId, "hit");
```

---

## 12. Simulated Stock & Crypto Exchange (`StockMarketManager`)

Simulates a live stock and crypto exchange with price fluctuations and market charts.

### Assets Tracked
- `TECH`: Antigravity Technologies
- `CRYP`: Cyber Bitcoin
- `CORP`: Apex Conglomerate
- `AERO`: Orbital Aerospace

### Methods
- `eco.stocks.getMarketOverview()`: Live prices, 24h change, and volume.
- `eco.stocks.buy(userId, symbol, shares, guildId?)`: Market buy order.
- `eco.stocks.sell(userId, symbol, shares, guildId?)`: Market sell order with realized PnL.
- `eco.stocks.getUserPortfolio(userId, guildId?)`: Portfolio holdings and valuation.

---

## 13. Multiplayer Syndicate Heists (`HeistManager`)

Assemble a crew of up to 4 players to rob high-security bank vaults.

### Roles
- **Hacker**: Disables security lasers and firewall protocols.
- **Muscle**: Subdues bank guards and patrols.
- **Driver**: Accelerates getaway speeds and lowers arrest probability.
- **Infiltrator**: Cracks vault lock combinations.

### Targets
1. 🏦 Local Credit Union (Difficulty: Easy, Loot: 🪙 50,000)
2. 🏛️ Central Federal Reserve (Difficulty: Hard, Loot: 🪙 250,000)
3. 🌐 Global Cyber Vault (Difficulty: Insane, Loot: 🪙 1,000,000)

---

## 14. Companion Pets & Foraging (`PetManager`)

Adopt pets, feed them, level up companion loyalty, and dispatch them on timed expeditions for passive loot:
- `eco.pets.adopt(userId, petId, nickname)`
- `eco.pets.feed(userId, petId)`
- `eco.pets.startExpedition(userId, petId, durationMs)`
- `eco.pets.claimExpedition(userId, petId)`

---

## 15. Mystery Loot Crates (`CrateManager`)

Unbox mystery crates with animated reveals and rare item rewards:
- **Common Crate**: 🪙 1,500 (Small coins + Common consumables)
- **Rare Crate**: 🪙 5,000 (Coins + XP + Tools)
- **Epic Crate**: 🪙 25,000 (Large payouts + Swiss Keys)
- **Legendary Crate**: 🪙 100,000 (Huge jackpots + Permanent multipliers)

---

## 16. Real Economy: Bank Vaults & Compound Interest (`VaultManager`)

Upgrade bank vault security tiers to expand holding ceilings, protect funds against robbers, and earn compound daily interest:
- **Tiers**: Standard ➔ Bronze ➔ Silver ➔ Gold ➔ Platinum ➔ Diamond ➔ Swiss Titanium.
- `eco.vault.inspect(userId)`: Inspect current vault tier and interest rate.
- `eco.vault.upgrade(userId)`: Upgrade to the next security vault tier.

---

## 17. Real Economy: Credit Score, Loans & Debt (`LoanManager`)

A realistic credit scoring and lending engine:
- **FICO Score (300 - 850)**: Rated as `POOR`, `FAIR`, `GOOD`, or `EXCELLENT`.
- **Loan Tiers**: Starter Microloan, Small Business Loan, Commercial Mortgage, Megacorp Credit Line.
- **Credit Dynamics**: Timely loan repayments increase FICO scores and unlock larger credit lines; missed payments damage credit and trigger default penalties.
- `eco.loans.getCreditScore(userId)`
- `eco.loans.apply(userId, tierId)`
- `eco.loans.repay(userId, amount)`

---

## 18. Real Economy: Municipal Bills, Taxes & Audits (`TaxManager`)

Progressive taxation and municipal bills:
- **Public Utility Bills**: Periodic water, energy, and network infrastructure fees.
- **Progressive Wealth Tax**: Applied to accounts exceeding multi-million net-worth thresholds.
- **Municipal Audits**: Players who evade taxes face audits, asset freezes, and penalty fees.
- **Good Citizen Perks**: Paying bills on time grants tax discounts and XP bonuses.
- `eco.taxes.getPendingBills(userId)`
- `eco.taxes.payBill(userId, billId)`
- `eco.taxes.payAllBills(userId)`

---

## 19. Interactive Discord Components V2 UI Suite

`@m3rcena/eco` bundles 10 turn-key interactive user interfaces utilizing Discord Components V2:

```typescript
import {
  EcoProfileUI,
  EcoShopUI,
  EcoStockMarketUI,
  EcoHeistUI,
  EcoBlackjackUI,
  EcoCrateUI,
  EcoLeaderboardUI,
  EcoVaultUI,
  EcoLoanUI,
  EcoBillsUI,
} from "@m3rcena/eco";

// 1. Digital Debit Card & Passport Profile
new EcoProfileUI(eco, { context: interaction }).start();

// 2. Interactive Storefront
new EcoShopUI(eco, { context: interaction }).start();

// 3. Stock Trader & Candle Chart
new EcoStockMarketUI(eco, { context: interaction }).start();

// 4. Syndicate Heist Recruitment Lobby
new EcoHeistUI(eco, { context: interaction }).start();

// 5. Interactive Blackjack Table
new EcoBlackjackUI(eco, { context: interaction, betAmount: 500 }).start();

// 6. Mystery Loot Crate Unboxing
new EcoCrateUI(eco, { context: interaction }).start();

// 7. Rich Paginated Net Worth Leaderboard
new EcoLeaderboardUI(eco, { context: interaction }).start();

// 8. Bank Vault Upgrades
new EcoVaultUI(eco, { context: interaction }).start();

// 9. Credit Score & Loan Terminal
new EcoLoanUI(eco, { context: interaction }).start();

// 10. Municipal Bills & Tax Ledger
new EcoBillsUI(eco, { context: interaction }).start();
```

---

## 20. High-Resolution Canvas Card Renderers

Bundles native `@napi-rs/canvas` visual generators:

### `RenderBankCard`
Generates a customized debit card complete with holographic microchip, holographic security foil, cardholder name, and bank balance:
```typescript
import { RenderBankCard } from "@m3rcena/eco";

const buffer = await RenderBankCard.render({
  username: "M3rcenaDev",
  avatarUrl: "https://cdn.discordapp.com/avatars/...",
  wallet: 25000,
  bank: 150000,
  netWorth: 175000,
  bankName: "CYBER CREDIT UNION",
  cardNumber: "4092 •••• •••• 8821",
});
```

### `RenderMarketChart`
Generates clean candlestick and sparkline price history charts with volume bars:
```typescript
import { RenderMarketChart } from "@m3rcena/eco";

const chartBuffer = await RenderMarketChart.render({
  symbol: "TECH",
  name: "Antigravity Technologies",
  currentPrice: 342.50,
  change24h: 8.4,
  history: [310, 315, 320, 318, 330, 342.50],
});
```

---

## 21. Cross-Platform Bridge Integration (`EcoBridgeRouter`)

Connect `@m3rcena/eco` to `@m3rcena/bridge` in one line:

```typescript
import { M3rcenaBridge } from "@m3rcena/bridge";
import { EcoManager } from "@m3rcena/eco";

const bridge = new M3rcenaBridge();
const eco = new EcoManager({ bridge });

// Fluent chaining also supported:
bridge.use(eco);
```

### Complete REST Route Reference (`/api/eco/*`)

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/eco/account/:userId` | Get full user account ledger (wallet, bank, net worth, vault, credit score). |
| `GET` | `/api/eco/cards/debit/:userId` | Returns rendered PNG buffer of user's holographic debit card. |
| `GET` | `/api/eco/market/overview` | Returns live prices and 24h metrics for all stocks and crypto. |
| `GET` | `/api/eco/market/chart/:symbol` | Returns rendered PNG sparkline / candlestick chart buffer. |
| `GET` | `/api/eco/leaderboard` | Returns top accounts ranked by net worth, wallet, or bank. |
| `GET` | `/api/eco/vault/:userId` | Returns current bank vault tier and upgrade pricing. |
| `GET` | `/api/eco/loans/:userId` | Returns FICO credit score, active debt, and loan offers. |
| `GET` | `/api/eco/bills/:userId` | Returns pending municipal utility bills and wealth taxes. |
| `POST` | `/api/eco/action/transfer` | Execute peer-to-peer money transfer. |
| `POST` | `/api/eco/action/gamble` | Place bets on coinflip, slots, dice, or roulette. |
| `POST` | `/api/eco/action/trade-stock` | Execute stock/crypto buy or sell orders. |

### Live Bridge Audio Cues Dispatched
- `coin_drop`: Triggered on wallet modifications and cash earnings.
- `cash_register`: Triggered on shop purchases and bill settlements.
- `jackpot`: Triggered on slot machine 50x Mega Jackpots.
- `alarm`: Triggered on robbery attempts and bank heists.
- `upgrade_ding`: Triggered on vault tier expansions and job promotions.

---

## 22. Weky Minigames Integration (`EcoWekyConnector`)

Seamlessly connect `@m3rcena/eco` to `@m3rcena/weky` to disburse minigame rewards, escrow PvP bet pots, and reward tournament champions:

```typescript
import { EcoManager } from "@m3rcena/eco";
import { WekyManager } from "@m3rcena/weky";

const eco = new EcoManager({ database: "sqlite" });
const weky = new WekyManager(client, { database: "sqlite" });

export const connector = eco.connectWeky(weky, {
  defaultWinReward: 50,         // Coins awarded on minigame victory
  defaultLossPenalty: 0,        // Coins deducted on defeat
  defaultScoreMultiplier: 0.05, // Solo score multiplier (1000 pts = 50 coins)
  streakBonus: 10,              // +10 bonus coins per active win streak count
  tournamentChampionPrize: 500, // Tournament champion prize
  wagerHouseFee: 5,             // 5% house fee taken from PvP bet pots
});

// Escrow a PvP wager duel:
await connector.createWager({
  wagerId: interaction.channelId,
  player1Id: player1.id,
  player2Id: player2.id,
  amount: 100, // 100 coins each = 200 pot
  game: "fight",
});
```

---

## 23. Complete TypeScript Types Reference

All types, configs, and adapters are exported from `@m3rcena/eco`:

```typescript
export {
  EcoManager,
  BankManager,
  RewardManager,
  CareerManager,
  ShopManager,
  BusinessManager,
  CasinoManager,
  LeaderboardManager,
  StockMarketManager,
  HeistManager,
  PetManager,
  CrateManager,
  VaultManager,
  LoanManager,
  TaxManager,
  EcoBridgeRouter,
  // Database Handlers
  SqliteEcoStorage,
  PrismaEcoStorage,
  EcoDatabaseHandler,
  resolveEcoStorage,
  applyPrismaEcoModel,
  PRISMA_ECO_MODEL,
  // UI Suite
  EcoProfileUI,
  EcoShopUI,
  EcoStockMarketUI,
  EcoHeistUI,
  EcoBlackjackUI,
  EcoCrateUI,
  EcoLeaderboardUI,
  EcoVaultUI,
  EcoLoanUI,
  EcoBillsUI,
  // Canvas Renderers
  RenderBankCard,
  RenderMarketChart,
  // Types
  type UserAccount,
  type EcoDatabaseConfig,
  type EcoStorageAdapter,
  type TransferResult,
  type RobResult,
  type CasinoBetResult,
  type StockConfig,
  type StockTradeResult,
  type HeistTarget,
  type UserPet,
  type BankVaultTier,
  type CreditScoreData,
  type LoanOffer,
  type MunicipalBill,
};
```
