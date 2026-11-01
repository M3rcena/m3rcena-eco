# 🏗️ Architecture & Storage Adapters

This document details the internal design, ledger system, storage adapters, and event lifecycle of **`@m3rcena/eco`**.

---

## 🏛️ System Architecture

`@m3rcena/eco` is structured into decoupled domain modules managed by the master orchestrator, `EcoManager`:

```text
 ┌─────────────────────────────────────────────────────────────┐
 │                         EcoManager                          │
 └──────────────────────────────┬──────────────────────────────┘
                                │
        ┌───────────────────────┼───────────────────────┐
        ▼                       ▼                       ▼
 ┌──────────────┐        ┌──────────────┐        ┌──────────────┐
 │ Real Economy │        │ Progression  │        │ High Stakes  │
 │  • Bank      │        │  • Careers   │        │  • Casino    │
 │  • Vaults    │        │  • Shop      │        │  • Stocks    │
 │  • Loans     │        │  • Inventory │        │  • Heists    │
 │  • Bills/Tax │        │  • Business  │        │  • Pets      │
 └──────┬───────┘        └──────┬───────┘        └──────┬───────┘
        │                       │                       │
        └───────────────────────┼───────────────────────┘
                                │
                                ▼
 ┌─────────────────────────────────────────────────────────────┐
 │               Pluggable Storage Layer (EcoStorage)          │
 │   • MemoryAdapter  • JsonFileAdapter  • SQLite / MongoDB    │
 └─────────────────────────────────────────────────────────────┘
```

---

## ⚙️ `EcoManager` Options Reference

```typescript
import { EcoManager } from "@m3rcena/eco";

const eco = new EcoManager({
  currencySymbol: "🪙",
  startingBalance: 1000,
  startingBankBalance: 0,
  taxRatePercent: 5,
  taxIntervalHours: 24,
  billIntervalHours: 48,
  interestIntervalHours: 24,
  maxWalletCap: 10_000_000,
  storage: myCustomStorageAdapter,
});
```

| Option | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `currencySymbol` | `string` | `"🪙"` | Display symbol for the primary currency. |
| `startingBalance` | `number` | `500` | Initial cash given to new players. |
| `startingBankBalance` | `number` | `0` | Initial balance deposited into standard checking account. |
| `taxRatePercent` | `number` | `5` | Baseline municipal tax rate. |
| `taxIntervalHours` | `number` | `24` | Frequency of tax assessment in hours. |
| `billIntervalHours` | `number` | `48` | Frequency of utility bill generation in hours. |
| `interestIntervalHours`| `number` | `24` | Frequency of compound vault interest payouts. |
| `maxWalletCap` | `number` | `Infinity` | Maximum cash allowed in physical wallet before forcing vault deposit. |
| `storage` | `EcoStorage` | `MemoryAdapter`| Persistence layer adapter. |

---

## 💾 Pluggable Storage Adapters

All player ledgers, loans, vault records, stock portfolios, and items are managed via the `EcoStorage` interface:

```typescript
export interface EcoStorage {
  getUser(userId: string): Promise<EcoUserData | null>;
  setUser(userId: string, data: EcoUserData): Promise<void>;
  updateUser(userId: string, patch: Partial<EcoUserData>): Promise<EcoUserData>;
  getAllUsers(): Promise<EcoUserData[]>;
  deleteUser(userId: string): Promise<boolean>;
}
```

### 1. Built-in `MemoryStorageAdapter` (Default)
Ideal for testing or ephemeral instances. Sub-millisecond performance.

### 2. Built-in `JsonFileStorageAdapter`
Persists state safely to disk in a human-readable JSON database with atomic writes:
```typescript
import { EcoManager, JsonFileStorageAdapter } from "@m3rcena/eco";

const eco = new EcoManager({
  storage: new JsonFileStorageAdapter("./data/economy.json"),
});
```

### 3. Custom Database Adapter (PostgreSQL, SQLite, Prisma, MongoDB)
Implement `EcoStorage` with your preferred ORM:
```typescript
import { EcoStorage, EcoUserData } from "@m3rcena/eco";

export class PrismaEcoStorage implements EcoStorage {
  constructor(private prisma: any) {}

  async getUser(userId: string): Promise<EcoUserData | null> {
    const record = await this.prisma.economyAccount.findUnique({ where: { userId } });
    return record ? JSON.parse(record.data) : null;
  }

  async setUser(userId: string, data: EcoUserData): Promise<void> {
    await this.prisma.economyAccount.upsert({
      where: { userId },
      update: { data: JSON.stringify(data), updatedAt: new Date() },
      create: { userId, data: JSON.stringify(data) },
    });
  }

  // ... implement updateUser, getAllUsers, deleteUser
}
```

---

## 📡 Lifecycle Events

`EcoManager` is an `EventEmitter` providing strongly typed hooks into every economic transaction:

```typescript
// Balance changes
eco.on("balanceChange", (event) => {
  console.log(`User ${event.userId}: ${event.type} ${event.amount} ${eco.options.currencySymbol}`);
});

// Vault upgrades
eco.on("vaultUpgrade", (event) => {
  console.log(`User ${event.userId} upgraded vault to Tier ${event.newTier}!`);
});

// Loan approvals & defaults
eco.on("loanApproved", (loan) => {
  console.log(`Loan #${loan.id} approved for ${loan.userId}: $${loan.principal}`);
});

eco.on("loanDefaulted", (event) => {
  console.warn(`DEBT ALERT: User ${event.userId} defaulted on loan #${event.loanId}! Garnish wages.`);
});

// Tax assessments
eco.on("taxCollected", (event) => {
  console.log(`Tax revenue collected: $${event.taxPaid} from user ${event.userId}`);
});
```
