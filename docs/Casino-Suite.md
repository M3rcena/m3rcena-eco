# 🎰 Next-Gen Casino & High-Stakes Gambling Suite

`@m3rcena/eco` features an integrated casino suite built on native **Discord Components V2** and decoupled headless engines.

---

## 🃏 1. Discord Components V2 Blackjack

A full-fledged casino Blackjack table rendered entirely with native Discord action rows, buttons, and state indicators.

### Features
- 🂠 Standard 6-deck shoe with automated reshuffling.
- ⚡ Actions: **Hit**, **Stand**, **Double Down**, and **Split**.
- 🏆 Dealer hits on soft 17; Natural Blackjack pays **3:2**.
- 🛡️ Double-down instantly doubles wager and deals exactly one card.

### Launching an Interactive Match
```typescript
client.on("interactionCreate", async (interaction) => {
  if (interaction.commandName === "blackjack") {
    const bet = interaction.options.getInteger("bet") || 100;
    
    // Launches interactive session in Discord
    await eco.ui.renderBlackjack(interaction, interaction.user.id, bet);
  }
});
```

---

## 🍒 2. High-Volatility Slots

Classic 3-reel slot machine with animated spinning feedback and multiplier payouts.

### Payout Table

| Match | Combination | Multiplier |
| :--- | :---: | :---: |
| 🍒 Cherries | Any 2 | **2x** |
| 🍋 Lemons | 3-of-a-kind | **5x** |
| 🍇 Grapes | 3-of-a-kind | **10x** |
| 🔔 Bells | 3-of-a-kind | **25x** |
| 💎 Diamonds | 3-of-a-kind | **50x** |
| 👑 Crown | 3-of-a-kind | **100x** |
| 7️⃣ **Lucky Sevens** | 3-of-a-kind | **Jackpot (250x)** |

### Programmatic Execution
```typescript
const round = await eco.casino.playSlots(userId, 500);

console.log(`Reels: [ ${round.reels.join(" | ")} ]`);
if (round.won) {
  console.log(`🎉 WON $${round.payout}! (Multiplier: ${round.multiplier}x)`);
} else {
  console.log("Better luck next time!");
}
```

---

## 🎡 3. European Roulette

Realistic roulette table with a single zero ($2.70\%$ house edge).

### Supported Bet Types
* **Red / Black**: Pays `1:1`
* **Odd / Even**: Pays `1:1`
* **Low (1–18) / High (19–36)**: Pays `1:1`
* **Dozens (1–12, 13–24, 25–36)**: Pays `2:1`
* **Columns**: Pays `2:1`
* **Straight (Exact number 0–36)**: Pays `35:1`

```typescript
const spin = await eco.casino.playRoulette(userId, {
  betType: "red",
  amount: 2500,
});

console.log(`Ball landed on ${spin.winningNumber} (${spin.color})`);
console.log(`Payout: $${spin.payout}`);
```

---

## 🚀 4. Crash Multiplier Game

Real-time multiplier game where players watch the multiplier climb from `1.00x` up to `100.00x+`. Cash out before the crash or lose your wager!

```typescript
// Start a crash round
const game = await eco.casino.startCrash(userId, 1000);

// Cash out at 2.45x
const cashout = await eco.casino.cashoutCrash(userId, game.id);
console.log(`Cashed out at ${cashout.multiplier}x! Profit: $${cashout.profit}`);
```

---

## 🪙 5. Coinflip & Dice

High-speed betting for quick stakes:

```typescript
// Coinflip
const flip = await eco.casino.playCoinflip(userId, "heads", 500);
console.log(`Result: ${flip.result}! ${flip.won ? "Won $1,000" : "Lost $500"}`);

// Dice Roll (Over/Under)
const roll = await eco.casino.playDice(userId, { prediction: "over", target: 50, bet: 300 });
console.log(`Rolled ${roll.diceValue}! Won: ${roll.won}`);
```
