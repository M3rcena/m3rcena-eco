# 📈 Stocks, Syndicate Heists, Pets & Crates

This guide details high-engagement advanced modules in **`@m3rcena/eco`**: the simulated stock market, multiplayer bank heists, companion pets, and mystery loot crates.

---

## 📈 1. Simulated Stock Market & Candlestick Charts

`@m3rcena/eco` features an algorithmic simulated stock exchange driven by a mathematical market maker with realistic momentum, volatility, and bull/bear market cycles.

### Default Market Tickers

| Ticker | Sector | Volatility | Base Price |
| :--- | :--- | :---: | :---: |
| **`APEX`** | Big Tech | Moderate | $250.00 |
| **`GLD`** | Commodities & Gold | Very Low | $1,800.00 |
| **`BYTE`** | Decentralized Crypto | Extreme | $45.00 |
| **`TITN`** | Industrial & Heavy Machinery | Low | $120.00 |
| **`NOVA`** | Aerospace Defense | High | $380.00 |

### Buying & Selling Stocks
```typescript
// Buy 10 shares of APEX
const order = await eco.stocks.buy(userId, "APEX", 10);
console.log(`Bought 10 shares of APEX at $${order.executionPrice}/share. Total: $${order.totalCost}`);

// Sell shares
const sale = await eco.stocks.sell(userId, "APEX", 5);
console.log(`Sold 5 shares! Realized Profit/Loss: $${sale.realizedPnL}`);
```

### 📊 High-Performance Candlestick Chart Generation
Using `@napi-rs/canvas`, `@m3rcena/eco` renders 60-period candlestick PNG charts on-the-fly:

```typescript
const chartBuffer = await eco.stocks.renderChart("APEX", {
  period: "1h",
  candleCount: 30,
  theme: "dark",
});

// Send PNG directly to Discord or return via REST API
await interaction.reply({
  files: [{ attachment: chartBuffer, name: "apex-chart.png" }],
});
```

---

## 🚨 2. Syndicate Multiplayer Bank Heists

A cooperative multiplayer system where up to 4 players assemble a criminal crew to rob the Federal Reserve:

### Crew Roles
* 🧠 **The Mastermind**: Coordinates escape routes and hacks security cameras.
* 💻 **The Hacker**: Disables lasers and cracks electronic vault time-locks.
* 🔫 **The Muscle**: Repels armed security guards and holds hostages.
* 🚗 **The Getaway Driver**: Minimizes police heat and secures the final escape.

### Initiating a Heist
```typescript
// Create heist lobby
const heist = await eco.heists.createLobby({
  leaderId: userId,
  targetVault: "Federal Reserve",
  approach: "stealth", // or "loud"
});

// Crew members join
await eco.heists.joinLobby(heist.id, friendId, "Hacker");

// Execute heist
const result = await eco.heists.execute(heist.id);

if (result.success) {
  console.log(`🎉 HEIST SUCCESS! Total take: $${result.totalLoot}`);
  console.log(`Each member received: $${result.sharePerMember}`);
} else {
  console.log(`🚨 BUSTED! The crew was arrested by SWAT. Bail cost: $${result.bailCost}`);
}
```

---

## 🐾 3. Companion Pets & Passive Buffs

Players can adopt, feed, and level up companion pets that confer active statistical benefits to their owner:

### Pet Species & Buffs

| Pet | Species | Active Buff |
| :--- | :--- | :--- |
| 🐺 **Ghost Wolf** | Beast | +15% protection against incoming muggings. |
| 🦅 **Cyber Falcon** | Tech | +10% wage bonus on all career work shifts. |
| 🐉 **Golden Wyrm** | Mythic | +5% luck boost across all Casino games. |
| 🐱 **Lucky Neko** | Familiar | Decreases municipal tax rate by 1.5%. |

### Leveling Up Pets
```typescript
// Feed pet
await eco.pets.feed(userId, petId);

// Check current stats
const pet = await eco.pets.getPet(userId, petId);
console.log(`${pet.name} (Lvl ${pet.level}) - Happiness: ${pet.happiness}%`);
```

---

## 📦 4. Mystery Loot Crates

Provide exciting randomized reward loops:

```typescript
// Open a Legendary Loot Crate
const unboxing = await eco.crates.open(userId, "legendary_crate");

console.log(`🎁 Unboxed: ${unboxing.reward.name} (${unboxing.reward.rarity})!`);
if (unboxing.reward.cash) console.log(`Cash payout: $${unboxing.reward.cash}`);
if (unboxing.reward.item) console.log(`Item granted: ${unboxing.reward.item.id}`);
```
