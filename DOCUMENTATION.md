# @m3rcena/eco Documentation

> 📚 **Official GitHub Wiki**: Complete architecture guides, real economy tutorials, and API references are organized in the dedicated **[@m3rcena/eco Official Wiki](https://github.com/M3rcena/m3rcena-eco/wiki)**:
> - **[Architecture & Storage](https://github.com/M3rcena/m3rcena-eco/wiki/Architecture)**
> - **[Real Economy: Bank Vaults, Loans, Bills & Taxes](https://github.com/M3rcena/m3rcena-eco/wiki/Real-Economy)**
> - **[Careers, Jobs, Shop & Businesses](https://github.com/M3rcena/m3rcena-eco/wiki/Careers-and-Shop)**
> - **[Casino & Gambling Suite](https://github.com/M3rcena/m3rcena-eco/wiki/Casino-Suite)**
> - **[Stocks, Heists, Pets & Loot Crates](https://github.com/M3rcena/m3rcena-eco/wiki/Stocks-Heists-and-Pets)**
> - **[Dashboard Bridge Integration](https://github.com/M3rcena/m3rcena-eco/wiki/Bridge-Integration)**

The ultimate enterprise-grade Discord.js v14 economy, progression, and casino engine.

---

## Table of Contents
1. [Overview & Architecture](#overview--architecture)
2. [Installation & Requirements](#installation--requirements)
3. [Quickstart Example](#quickstart-example)
4. [EcoManager API Reference](#ecomanager-api-reference)
5. [Banking & Dual-Currency System](#banking--dual-currency-system)
6. [Daily Streaks, Work, Crime & Robbery](#daily-streaks-work-crime--robbery)
7. [Career Progression & Jobs](#career-progression--jobs)
8. [Shop, Inventory & Consumable Buffs](#shop-inventory--consumable-buffs)
9. [Passive Business Investment](#passive-business-investment)
10. [Casino & High-Stakes Gambling Suite](#casino--high-stakes-gambling-suite)
11. [Leaderboards & Net Worth](#leaderboards--net-worth)
12. [Pluggable Storage Adapters](#pluggable-storage-adapters)
13. [Web Dashboard Bridge Integration (@m3rcena/bridge)](#web-dashboard-bridge-integration-m3rcenabridge)

---

## Overview & Architecture

`@m3rcena/eco` provides a comprehensive, feature-complete economy system designed for modern Discord.js bots. It splits functionality into dedicated, high-performance managers while offering a clean, unified top-level API through `EcoManager`.

```
                  ┌─────────────────────────────────────────┐
                  │               EcoManager                │
                  └────┬──────┬──────┬──────┬──────┬────┬───┘
                       │      │      │      │      │    │
       ┌───────────────┘      │      │      │      │    └────────────────┐
       ▼                      ▼      ▼      ▼      ▼                     ▼
┌─────────────┐  ┌───────────────┐ ┌───────────────┐ ┌────────────────┐ ┌────────────────┐
│ BankManager │  │ RewardManager │ │ CareerManager │ │ BusinessManager│ │ CasinoManager  │
└─────────────┘  └───────────────┘ └───────────────┘ └────────────────┘ └────────────────┘
       │                      │            │               │                    │
       └──────────────────────┴────────────┼───────────────┴────────────────────┘
                                           ▼
                                 ┌───────────────────┐
                                 │ EcoStorageAdapter │
                                 │ (Memory / JSON)   │
                                 └───────────────────┘
```

---

## Installation & Requirements

- **Node.js**: `^22.0.0`, `^24.0.0`, or `^26.0.0` (Node 20 is EOL and unsupported).
- **Discord.js**: `^14.0.0`.

```bash
npm install @m3rcena/eco @m3rcena/bridge discord.js
```

---

## Quickstart Example

```typescript
import { Client, GatewayIntentBits } from "discord.js";
import { EcoManager, JsonEcoStorage } from "@m3rcena/eco";

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages] });

// Initialize persistent economy engine
const eco = new EcoManager({
  currencySymbol: "🪙",
  currencyName: "Coins",
  defaultWalletBalance: 1000,
  defaultBankCapacity: 15000,
  storage: new JsonEcoStorage("./data/economy.json"),
});

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const { commandName, user } = interaction;

  if (commandName === "balance") {
    const bal = await eco.getBalance(user.id);
    return interaction.reply({
      content: `💰 **${user.username}'s Finances**\n• Wallet: 🪙 ${bal.wallet.toLocaleString()}\n• Bank: 🪙 ${bal.bank.toLocaleString()} / ${bal.bankCapacity.toLocaleString()}\n• Net Worth: 🪙 ${bal.netWorth.toLocaleString()}`,
    });
  }

  if (commandName === "daily") {
    const res = await eco.daily(user.id);
    if (!res.success) {
      const mins = Math.ceil(res.remainingMs! / 60000);
      return interaction.reply(`⏳ You've already claimed today! Check back in ${mins} minutes.`);
    }
    return interaction.reply(`🎉 Claimed daily reward: **🪙 ${res.amount.toLocaleString()}**! Daily streak: **${res.streak} days** 🔥`);
  }
});

client.login(process.env.DISCORD_TOKEN);
```

---

## EcoManager API Reference

### Constructor Options

```typescript
export interface EcoManagerOptions {
  currencySymbol?: string;          // Default: "🪙"
  currencyName?: string;            // Default: "Coins"
  defaultBankCapacity?: number;     // Default: 10,000
  defaultWalletBalance?: number;    // Default: 500
  bankInterestRate?: number;        // Default: 0
  transactionFeePercentage?: number;// e.g. 0.05 for 5% transfer fee
  storage?: EcoStorageAdapter;      // Default: MemoryEcoStorage
  bridge?: M3rcenaBridge;           // Optional dashboard bridge
  cooldowns?: {
    daily?: number;                 // Default: 24h
    weekly?: number;                // Default: 7d
    monthly?: number;               // Default: 30d
    hourly?: number;                // Default: 1h
    work?: number;                  // Default: 30m
    beg?: number;                   // Default: 5m
    crime?: number;                 // Default: 45m
    rob?: number;                   // Default: 2h
  };
}
```

---

## Banking & Dual-Currency System

The dual-currency model safeguards user funds against robbery while rewarding bank capacity upgrades.

### Methods
- `eco.getBalance(userId, guildId?)`: Returns `{ wallet, bank, bankCapacity, netWorth }`.
- `eco.deposit(userId, amount | "all", guildId?)`: Deposits wallet funds into bank up to capacity.
- `eco.withdraw(userId, amount | "all", guildId?)`: Withdraws bank funds into wallet.
- `eco.transfer(fromUserId, toUserId, amount, guildId?)`: Transfers cash between players with percentage fees.
- `eco.addWallet(userId, amount, guildId?)`: Directly awards wallet funds.
- `eco.removeWallet(userId, amount, guildId?)`: Directly removes wallet funds.

---

## Daily Streaks, Work, Crime & Robbery

### Daily Streaks & Jackpots
- Daily reward increases by +100 coins per streak day.
- Every 7-day milestone triggers a **2x Jackpot Bonus**!

### Work Shifts & XP Progression
- `eco.work(userId, guildId?)`: Awards wages + experience points (XP). Automatically increases level and bank capacity.

### High-Risk Crimes & Robbery
- `eco.crime(userId, guildId?)`: 55% success rate for high payouts, 45% fail rate resulting in bail fines.
- `eco.rob(robberId, victimId, guildId?)`: Steals 20%-60% of victim's wallet. If the victim has an active **Titanium Padlock Shield**, the robbery is blocked, the shield is consumed, and the robber is fined!

---

## Career Progression & Jobs

Users can build a career path with promotions and higher salaries.

### Default Careers Catalog
| Job ID | Title | Min Level | Base Salary | Shifts for Promotion |
|--------|-------|-----------|-------------|----------------------|
| `intern` | Junior Intern | Level 1 | 🪙 250 | 3 shifts |
| `barista` | Artisan Barista | Level 2 | 🪙 500 | 5 shifts |
| `software_engineer` | Full-Stack Developer | Level 5 | 🪙 1,400 | 8 shifts |
| `data_scientist` | AI & Data Scientist | Level 10 | 🪙 3,000 | 12 shifts |
| `investment_banker` | Wall Street Banker | Level 15 | 🪙 6,500 | 15 shifts |
| `cyber_syndicate_lead` | Syndicate Boss | Level 20 | 🪙 12,500 | 20 shifts |

---

## Shop, Inventory & Consumable Buffs

### Default Shop Catalog
- **Titanium Padlock** (`padlock`): Blocks the next robbery attempt. Lasts 24 hours.
- **Cyber Caffeine Overdrive** (`energy_drink`): Instantly resets work shift cooldown.
- **Enchanted Gold Coin** (`lucky_coin`): Boosts casino winning probability for 1 hour.
- **Elixir of Knowledge** (`xp_potion`): 2x XP boost for 2 hours.
- **Swiss Vault Key** (`bank_vault_key`): Permanently expands bank capacity by +25,000.
- **Mega Millions Scratch Ticket** (`lottery_ticket`): Instant scratch-off for up to 50,000 jackpot.
- **Rolex Submariner Gold** (`gold_watch`): High-value luxury collectible.

---

## Passive Business Investment

Players can purchase and upgrade passive revenue streams that accumulate profits even while offline.

### Business Catalog
1. **Artisanal Lemonade Stand** (Base Cost: 🪙 3,000 | Base Hourly: 🪙 200)
2. **Urban Espresso Lounge** (Base Cost: 🪙 12,500 | Base Hourly: 🪙 950)
3. **AI SaaS Enterprise** (Base Cost: 🪙 65,000 | Base Hourly: 🪙 5,200)
4. **Geothermal Crypto Mine** (Base Cost: 🪙 280,000 | Base Hourly: 🪙 24,000)
5. **Orbital Cargo Logistics** (Base Cost: 🪙 1,500,000 | Base Hourly: 🪙 150,000)

---

## Casino & High-Stakes Gambling Suite

### 1. Interactive Blackjack
Complete casino Blackjack engine with soft Aces, split decks, dealer drawing on soft 17, and natural 3:2 blackjack payouts.
```typescript
const game = await eco.startBlackjack(userId, 500);
// Player chooses to hit
const updated = await eco.blackjackHit(game.gameId);
// Or player stands
const final = await eco.blackjackStand(game.gameId);
```

### 2. Coinflip
`eco.coinflip(userId, amount, "heads" | "tails")` -> 2x payout on win.

### 3. Dice
`eco.dice(userId, amount, "high" | "low" | 1..6)` -> 2x on high/low, 6x on exact roll.

### 4. Slots
`eco.slots(userId, amount)` -> Multipliers up to 50x for Triple 7s.

### 5. Roulette
`eco.roulette(userId, amount, "red" | "black" | "green" | "even" | "odd" | 0..36)`.

### 6. Crash
`eco.crash(userId, amount, targetMultiplier)` -> Cash out before the rocket explodes.

---

## Pluggable Storage Adapters

### `JsonEcoStorage`
Atomic, file-based persistence that survives bot restarts:
```typescript
import { JsonEcoStorage } from "@m3rcena/eco";
const storage = new JsonEcoStorage("./data/economy.json");
```

### Custom Database Adapters
Implement `EcoStorageAdapter`:
```typescript
import { EcoStorageAdapter, UserAccount } from "@m3rcena/eco";

export class MongoEcoStorage implements EcoStorageAdapter {
  async getAccount(userId: string, guildId?: string): Promise<UserAccount | null> { /* ... */ }
  async saveAccount(account: UserAccount): Promise<void> { /* ... */ }
  async getAllAccounts(guildId?: string): Promise<UserAccount[]> { /* ... */ }
}
```

---

## Web Dashboard Bridge Integration (@m3rcena/bridge)

Connect `@m3rcena/eco` to `@m3rcena/bridge` to stream economy changes live to your React / Next.js web dashboard:

```typescript
import { M3rcenaBridge } from "@m3rcena/bridge";
import { EcoManager } from "@m3rcena/eco";

const bridge = new M3rcenaBridge({
  requireOnlinePresenceForAudio: true, // Audio cues only play when user has the dashboard open!
});

// Pattern A: Pass bridge into constructor options
const eco = new EcoManager({ bridge });

// Pattern B: Or mount directly with fluent bridge.use()
// bridge.use(eco);

// Pattern C: Or via connection handshake method
// eco.connectBridge(bridge);
```

### Real-Time Dispatched Events
- `wallet:add`, `wallet:remove`
- `bank:deposit`, `bank:withdraw`, `bank:transfer`
- `shop:buy`, `shop:sell`, `shop:use`
- `business:buy`, `business:upgrade`, `business:collect`
- `casino:blackjack_win`, `casino:coinflip`, `casino:slots`, `casino:crash`
- Live Audio Cues: `coin_drop`, `win`, `purchase`, `rob_siren`

