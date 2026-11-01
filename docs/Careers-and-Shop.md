# 💼 Careers, Shop, Backpack & Enterprises

This guide covers progression systems in **`@m3rcena/eco`**: employment careers, the dynamic marketplace, backpack inventory, and passive income businesses.

---

## 👔 1. Dynamic Career Tracks

Players can climb corporate ladders from unpaid interns to Fortune 500 CEOs.

### Career Levels & Compensation

| Tier | Title | Base Hourly Wage | Shift Cooldown | Promotion Requirements |
| :---: | :--- | :---: | :---: | :--- |
| **1** | ☕ Corporate Intern | $50 | 30 mins | 0 shifts |
| **2** | 💻 Junior Associate | $150 | 45 mins | 10 completed shifts |
| **3** | 📊 Senior Specialist | $350 | 60 mins | 25 shifts + College Degree item |
| **4** | 🎯 Department Lead | $800 | 90 mins | 50 shifts + Credit Score $\ge$ 650 |
| **5** | 👔 Managing Director | $1,800 | 2 hours | 100 shifts + Business Enterprise |
| **6** | 💎 Executive Vice President | $4,500 | 3 hours | 200 shifts + Credit Score $\ge$ 750 |
| **7** | 👑 Chief Executive Officer (CEO) | $12,000 | 4 hours | 500 shifts + $5M Net Worth |

### Working a Shift
```typescript
const shift = await eco.careers.work(userId);

console.log(`Worked shift as ${shift.jobTitle}!`);
console.log(`Earned: $${shift.basePay} + $${shift.bonusPay} bonus = $${shift.totalEarned}`);
```

### Applying for Promotion
```typescript
const promo = await eco.careers.promote(userId);
if (promo.success) {
  console.log(`Congratulations! Promoted to ${promo.newTitle}!`);
} else {
  console.log(`Promotion denied: ${promo.reason}`);
}
```

---

## 🏬 2. Dynamic Shop & Backpack Inventory

`@m3rcena/eco` includes an extensible item catalog supporting custom items, rarities, durability, and active buffs.

### Pre-Configured Item Catalog

| Item | Rarity | Price | Effect |
| :--- | :--- | :---: | :--- |
| ☕ **Espresso Shot** | Common | $25 | Halves current work shift cooldown. |
| 🎓 **College Degree** | Rare | $10,000 | Unlocks Senior Specialist promotion track. |
| 🛡️ **Kevlar Armor** | Epic | $25,000 | 50% chance to repel incoming robbery/mugging. |
| 🔑 **Vault Lockbox** | Rare | $15,000 | Grants 1 additional inventory slot. |
| 🍀 **Lucky Clover** | Epic | $50,000 | Boosts casino win rate by +5% for 1 hour. |
| 🪪 **Swiss Passport** | Legendary | $250,000 | Decreases IRS audit chance on offshore accounts by 40%. |

### Purchasing & Using Items
```typescript
// Buy item from the shop
const purchase = await eco.shop.buy(userId, "espresso_shot", 2);

// Inspect player backpack inventory
const inventory = await eco.inventory.getItems(userId);

// Use consumable item
const usage = await eco.inventory.useItem(userId, "espresso_shot");
console.log(usage.message); // "Espresso consumed! Work cooldown halved."
```

### Trading Items Between Players
```typescript
await eco.inventory.transferItem({
  fromUserId: "user_alice",
  toUserId: "user_bob",
  itemId: "lucky_clover",
  quantity: 1,
});
```

---

## 🏢 3. Passive Income Enterprises

Players can invest surplus capital into automated commercial businesses that generate hourly passive revenue:

| Enterprise | Investment Cost | Hourly Revenue | Upkeep / Bill Cost | Risk Level |
| :--- | :---: | :---: | :---: | :---: |
| ☕ **Coffee Franchise** | $25,000 | $150 / hr | $20 / hr | Low |
| 💻 **Software Agency** | $100,000 | $750 / hr | $120 / hr | Medium |
| 🍸 **Nightclub & Lounge** | $350,000 | $3,000 / hr | $600 / hr | Medium-High |
| ⛏️ **Crypto Mining Farm** | $1,200,000 | $12,500 / hr | $3,500 / hr (Power) | High |

### Founding an Enterprise
```typescript
const business = await eco.businesses.found(userId, "Software Agency");
console.log(`Enterprise founded: ${business.name}! Earning $${business.hourlyRevenue}/hr.`);
```

### Collecting Accumulated Profits
```typescript
const payout = await eco.businesses.collectRevenue(userId);
console.log(`Collected $${payout.totalCollected} in passive profits!`);
```
