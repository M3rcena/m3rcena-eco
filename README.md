<div align="center">
  <h1>🪙 @m3rcena/eco</h1>
  <p><strong>The ultimate enterprise-grade Discord.js v14 economy, progression, and casino engine.</strong></p>
  <p>
    <a href="https://www.npmjs.com/package/@m3rcena/eco"><img src="https://img.shields.io/npm/v/@m3rcena/eco.svg?style=flat-square" alt="NPM Version" /></a>
    <a href="https://nodejs.org"><img src="https://img.shields.io/badge/node-%3E%3D22.0.0-brightgreen.svg?style=flat-square" alt="Node Support" /></a>
    <a href="https://github.com/M3rcena/m3rcena-eco/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-Apache--2.0-blue.svg?style=flat-square" alt="License" /></a>
  </p>
</div>

---

## 🌟 Highlights

- 🏦 **Dual-Currency Banking**: Cash wallet & secure bank with upgradeable capacity and transfers.
- 🔥 **Daily Streaks & Jackpots**: Progressive daily rewards with 7-day milestone 2x bonuses.
- 💼 **Career Progression**: Multi-tier jobs (Intern to Syndicate Boss), shifts, and salary bonuses.
- 🛍️ **Shop & Inventory**: Rich item catalog with active consumable effects (Padlock shields, Energy Drinks, Lucky Coins).
- 🏢 **Passive Businesses**: Buy & upgrade companies (Lemonade Stands, Tech Startups, Space Cargo) with offline earnings.
- 🎰 **Casino Suite**: Full Blackjack engine, Coinflip, Roulette, Slots with jackpots, Dice, and Crash.
- 🏆 **Leaderboards**: Ranked Net Worth calculations and Discord markdown formatting with medals.
- 🌐 **Dashboard Bridge**: Native integration with `@m3rcena/bridge` for real-time WebSocket syncing and presence-filtered audio cues.
- ⚡ **Next-Gen Performance**: Dual ESM/CJS, TypeScript 7.0 definitions, zero bloat, and sub-millisecond execution.

---

## 📦 Installation

```bash
npm install @m3rcena/eco @m3rcena/bridge discord.js
```

> **Note**: Requires Node.js **22.0.0+** (LTS 22, 24, 26). Node 20 is EOL and unsupported.

---

## 🚀 Quick Example

```typescript
import { Client, GatewayIntentBits } from "discord.js";
import { EcoManager, JsonEcoStorage } from "@m3rcena/eco";

const eco = new EcoManager({
  currencySymbol: "🪙",
  currencyName: "Coins",
  storage: new JsonEcoStorage("./data/economy.json"),
});

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages] });

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === "daily") {
    const res = await eco.daily(interaction.user.id);
    if (!res.success) {
      return interaction.reply(`⏳ On cooldown! Try again later.`);
    }
    return interaction.reply(`🎉 You claimed **🪙 ${res.amount.toLocaleString()}**! Streak: ${res.streak} days 🔥`);
  }

  if (interaction.commandName === "coinflip") {
    const bet = interaction.options.getInteger("amount", true);
    const choice = interaction.options.getString("choice", true) as "heads" | "tails";
    const res = await eco.coinflip(interaction.user.id, bet, choice);
    return interaction.reply(res.details);
  }
});

client.login(process.env.DISCORD_TOKEN);
```

---

## 📖 Complete Documentation

For detailed guides, API reference, custom storage adapters, and bridge setup, see [DOCUMENTATION.md](./DOCUMENTATION.md).

---

## 🛡️ License

Apache-2.0 © [M3rcena Development](https://github.com/M3rcena)

