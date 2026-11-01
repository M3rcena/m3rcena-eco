# 🪙 Welcome to @m3rcena/eco Documentation

Welcome to the official documentation for **`@m3rcena/eco`** — the ultimate enterprise-grade Discord.js v14 economy, banking, progression, and casino engine.

---

## 🌟 What is @m3rcena/eco?

`@m3rcena/eco` brings real-world macroeconomic mechanics to Discord bots. Instead of a trivial wallet/bank counter, `@m3rcena/eco` provides a comprehensive financial ecosystem:

* 🏦 **Advanced Banking & Vaults**: 6 upgradeable vault tiers with daily compound interest and FDIC-style insurance caps.
* 💳 **FICO Credit Scoring (300–850)**: Mathematical credit algorithm evaluating loan repayment history, credit utilization, and debt defaults.
* 📜 **Collateralized Bank Loans**: 4 borrowing tiers with dynamic interest rates, payment schedules, and debt collection consequences (wage garnishment, asset repossession).
* ⚡ **Municipal Utility Bills**: Realistic electricity, water, and property maintenance bills generated dynamically.
* 🏛️ **Progressive Wealth Taxes**: Progressive tax brackets (2%–8%) with high-stakes Swiss offshore tax evasion mechanics and IRS audits.
* 💼 **Dynamic Career Tracks**: 7 professional tiers, work shifts, promotion criteria, and hourly wage scaling.
* 🏬 **Backpack Inventory & Enterprises**: Dynamic item store, inventory management, and passive income businesses.
* 🎰 **Next-Gen Casino Suite**: Discord Components V2 interactive Blackjack, Slots, Roulette, Crash, Coinflip, and Dice.
* 📈 **Simulated Stock Market**: Live market simulator with bull/bear cycles and Rust-powered (`@napi-rs/canvas`) candlestick charts.
* 🚨 **Syndicate Multiplayer Heists**: Cooperative crew-based bank robberies with roles (Hacker, Driver, Muscle) and police heat.
* 🌉 **First-Class Bridge Integration**: Native `EcoBridgeRouter` connects seamlessly with `@m3rcena/bridge` for web dashboards.

---

## 🚀 Quick Navigation

| Guide | Description |
| :--- | :--- |
| 🏦 **[Real Economy & Banking](Real-Economy.md)** | Vault tiers, compound interest, credit score calculation, loans, bills, taxes, and Swiss evasion. |
| 💼 **[Careers, Shop & Businesses](Careers-and-Shop.md)** | Work shifts, promotions, backpack items, inventory trading, and passive income enterprises. |
| 🎰 **[Next-Gen Casino Suite](Casino-Suite.md)** | Discord Components V2 Blackjack, Roulette, Slots, Crash, Coinflip, and Dice. |
| 📈 **[Stocks, Heists & Pets](Stocks-Heists-and-Pets.md)** | Simulated stock exchange, candlestick chart generator, multiplayer bank heists, pets, and crates. |
| 🌉 **[Dashboard Bridge Integration](Bridge-Integration.md)** | Connecting `@m3rcena/eco` to `@m3rcena/bridge` and web dashboards. |
| 🏗️ **[Architecture & Storage](Architecture.md)** | `EcoManager` options, storage adapters (Memory, JSON, SQLite, MongoDB), and events. |

---

## 📦 Installation

```bash
# npm
npm install @m3rcena/eco

# pnpm
pnpm add @m3rcena/eco

# yarn
yarn add @m3rcena/eco
```

### System Requirements
* **Node.js**: `>= 22.0.0`
* **Discord.js**: `^14.16.0`
* **TypeScript**: `>= 5.0`

---

## ⚡ 60-Second Quickstart

```typescript
import { Client, GatewayIntentBits } from "discord.js";
import { EcoManager } from "@m3rcena/eco";

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages],
});

// 1. Initialize Eco Manager
export const eco = new EcoManager({
  currencySymbol: "🪙",
  startingBalance: 1000,
  taxRatePercent: 5,
});

// 2. Slash Command Example: Check Balance & Vault
client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === "profile") {
    // Render native Components V2 container
    await eco.ui.renderProfile(interaction, interaction.user.id);
  }

  if (interaction.commandName === "work") {
    const shift = await eco.careers.work(interaction.user.id);
    await interaction.reply({
      content: `💼 You completed your shift as **${shift.jobTitle}** and earned **${shift.earned} 🪙**!`,
    });
  }
});

client.login(process.env.DISCORD_TOKEN);
```

---

*Need help? Check out our [Real Economy Guide](Real-Economy.md) or explore the [Bridge Integration Guide](Bridge-Integration.md).*
