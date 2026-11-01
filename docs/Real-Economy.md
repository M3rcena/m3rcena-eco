# 🏦 Real Economy: Bank Vaults, Loans, Bills & Taxes

`@m3rcena/eco` introduces a macroeconomic engine designed to eliminate runaway bot inflation and mimic real-world financial systems.

---

## 🔒 1. Bank Vault Tiers & Compound Interest

Standard checking accounts are vulnerable to robbery and inflation. Players can upgrade to high-security **Bank Vaults** to protect their wealth and earn daily compound interest.

### Vault Tier Breakdown

| Tier | Name | Upgrade Cost | Storage Capacity | Daily Interest Yield | Robbery Protection |
| :---: | :--- | :---: | :---: | :---: | :---: |
| **1** | 🥉 Bronze Vault | *Free* | $50,000 | 0.10% / day | 25% |
| **2** | 🥈 Silver Vault | $15,000 | $250,000 | 0.25% / day | 50% |
| **3** | 🥇 Gold Vault | $75,000 | $1,000,000 | 0.50% / day | 75% |
| **4** | 💎 Platinum Vault | $250,000 | $5,000,000 | 0.85% / day | 90% |
| **5** | 👑 Diamond Vault | $1,000,000 | $25,000,000 | 1.15% / day | 98% |
| **6** | 🌌 Vibranium Vault | $5,000,000 | Unlimited | 1.50% / day | 100% (Immune) |

### Upgrading a Vault Programmatically
```typescript
const result = await eco.vaults.upgrade(userId);

if (result.success) {
  console.log(`Vault upgraded to ${result.vault.name}! New capacity: $${result.vault.capacity}`);
} else {
  console.error(`Upgrade failed: ${result.reason}`);
}
```

---

## 💳 2. FICO Credit Scoring System (300–850)

Just like in real life, players cannot simply borrow unlimited funds. `@m3rcena/eco` implements an algorithmic credit score ranging from **300 (Poor)** to **850 (Exceptional)**.

### Credit Score Calculation Factors
- **Payment History (35%)**: On-time loan repayments increase score by +15–30 points.
- **Credit Utilization (30%)**: Borrowing near maximum limits lowers score.
- **Length of Credit History (15%)**: Older accounts with good standing gain bonus points.
- **Default Penalties (-80 pts)**: Missed loan payments incur severe score drops.

```typescript
const score = await eco.loans.getCreditScore(userId);
console.log(`Credit Score: ${score.rating} (${score.score} / 850)`);
```

---

## 📜 3. Bank Loans & Debt Collection

Players can apply for collateralized loans to fund business ventures, stock trades, or equipment.

### Loan Tiers

| Tier | Name | Max Borrowing | Minimum Credit Score | Interest Rate | Repayment Term |
| :--- | :--- | :---: | :---: | :---: | :---: |
| **Starter** | Personal Microloan | $10,000 | 450 | 5% | 7 days |
| **Business** | Commercial Loan | $100,000 | 600 | 8% | 14 days |
| **Corporate** | Expansion Credit | $500,000 | 720 | 12% | 30 days |
| **Syndicate** | Empire Leveraged Debt | $2,500,000 | 800 | 15% | 60 days |

### Applying for a Loan
```typescript
const loan = await eco.loans.applyForLoan(userId, {
  tier: "Business",
  amount: 75000,
});

if (loan.approved) {
  console.log(`Loan #${loan.id} approved! Principal deposited into bank.`);
}
```

### Repaying Installments
```typescript
const payment = await eco.loans.repay(userId, loanId, 15000);
console.log(`Remaining balance: $${payment.remainingBalance}`);
```

### ⚠️ Debt Default & Wage Garnishment
If a player fails to repay within the grace period:
1. Credit score drops by **-80 points**.
2. Checking account is frozen.
3. **Wage Garnishment**: 40% of all future work and business earnings are automatically seized by debt collectors until the balance is cleared!

---

## ⚡ 4. Municipal Utility Bills

Owning enterprises and luxury vaults incurs periodic municipal maintenance bills:
- **Electricity & Grid Power**: Scaled by owned businesses and mining rigs.
- **Water & Facility Sanitation**: Based on real estate properties.
- **Security & Armed Escort**: Based on vault tier.

```typescript
// Fetch pending bills
const pendingBills = await eco.taxes.getPendingBills(userId);

// Pay a bill
const receipt = await eco.taxes.payBill(userId, pendingBills[0].id);
console.log(`Bill paid: ${receipt.utilityType} ($${receipt.amount})`);
```

Unpaid bills result in utility cutoffs (halting passive business revenue) and municipal fines.

---

## 🏛️ 5. Progressive Wealth Taxes & Swiss Offshore Evasion

To maintain economic balance and prevent runaway oligarchies, `@m3rcena/eco` enforces a progressive marginal tax bracket:

### Tax Brackets

| Net Worth Bracket | Marginal Tax Rate |
| :--- | :---: |
| **$0 – $50,000** | 0% (Tax exempt) |
| **$50,001 – $250,000** | 2% |
| **$250,001 – $1,000,000** | 4% |
| **$1,000,001 – $10,000,000** | 6% |
| **$10,000,001+** | 8% |

### 🇨🇭 Swiss Offshore Banking & IRS Audits
Wealthy players can attempt to stash funds in unmonitored **Swiss Offshore Accounts** to shield capital from municipal wealth taxes.

```typescript
// Deposit funds to Swiss offshore account
await eco.taxes.depositOffshore(userId, 500000);
```

**The Catch**: The municipal tax authority performs random tax audits.
- If caught with undeclared offshore assets, players face:
  - Total forfeiture of hidden funds.
  - A 200% tax penalty fine.
  - Immediate credit score degradation.
