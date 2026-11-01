# 🌉 Connecting @m3rcena/eco to the Dashboard Bridge

This guide explains how to connect `@m3rcena/eco` to `@m3rcena/bridge` to power real-time web dashboards, headless banking operations, and canvas card generation.

---

## 🚀 Mounting `EcoBridgeRouter`

`@m3rcena/eco` exports a dedicated `EcoBridgeRouter` that mounts cleanly into the Bridge controller with one line of code:

```typescript
import { M3rcenaBridge, BridgeServer } from "@m3rcena/bridge";
import { EcoManager, EcoBridgeRouter } from "@m3rcena/eco";

// 1. Initialize Eco Manager
export const eco = new EcoManager({
  currencySymbol: "🪙",
  startingBalance: 1000,
});

// 2. Initialize Bridge
export const bridge = new M3rcenaBridge();

// 3. Mount Eco Router into Bridge
bridge.mountPackage(new EcoBridgeRouter(eco));

// 4. Start Gateway Server
const server = new BridgeServer(bridge, { port: 4000 });
await server.start();

console.log("🌉 Eco REST and WebSocket routes mounted at http://localhost:4000/api/eco");
```

---

## 📬 Exposed REST Endpoints (`/api/eco`)

Once mounted, the Bridge gateway handles requests targeting `/api/eco/*`:

### 1. User Economic Profile
* **Endpoint**: `GET /api/eco/profile/:userId`
* **Response**:
```json
{
  "userId": "102794864",
  "wallet": 14500,
  "bank": 250000,
  "netWorth": 264500,
  "creditScore": 745,
  "creditRating": "Very Good",
  "vault": {
    "tier": 3,
    "name": "Gold Vault",
    "capacity": 1000000,
    "dailyInterestRate": 0.005
  },
  "job": {
    "title": "Managing Director",
    "tier": 5,
    "hourlyWage": 1800
  },
  "activeLoans": [],
  "pendingBillsCount": 1
}
```

---

### 2. Upgrade Bank Vault
* **Endpoint**: `POST /api/eco/vault/upgrade`
* **Request Body**:
```json
{
  "userId": "102794864"
}
```
* **Response**:
```json
{
  "success": true,
  "newTier": 4,
  "name": "Platinum Vault",
  "newCapacity": 5000000,
  "cost": 250000
}
```

---

### 3. Apply for Bank Loan
* **Endpoint**: `POST /api/eco/loan/apply`
* **Request Body**:
```json
{
  "userId": "102794864",
  "tier": "Business",
  "amount": 50000
}
```
* **Response**:
```json
{
  "success": true,
  "loanId": "loan_84712",
  "principal": 50000,
  "interestRate": 0.08,
  "totalDue": 54000,
  "dueDate": 1763193600000
}
```

---

### 4. Headless Casino Round
* **Endpoint**: `POST /api/eco/casino/play`
* **Request Body**:
```json
{
  "userId": "102794864",
  "game": "slots",
  "bet": 500
}
```
* **Response**:
```json
{
  "success": true,
  "game": "slots",
  "reels": ["🍒", "🍒", "🍒"],
  "won": true,
  "payout": 2500,
  "multiplier": 5
}
```

---

### 5. On-Demand Debit Card Canvas Image
* **Endpoint**: `GET /api/eco/cards/bank-card?userId=102794864`
* **Content-Type**: `image/png`
* **Returns**: A high-resolution, custom-styled metallic bank debit card displaying the user's name, avatar, account number, credit score, and vault tier badge. Perfect for embedding directly in web dashboards:
```html
<img src="http://localhost:4000/api/eco/cards/bank-card?userId=102794864" alt="Bank Card" />
```

---

### 6. Stock Market Candlestick Chart
* **Endpoint**: `GET /api/eco/cards/candlestick?ticker=APEX`
* **Content-Type**: `image/png`
* **Returns**: A real-time OHLC candlestick financial chart rendered with `@napi-rs/canvas`.

---

## ⚡ WebSocket Real-Time Synchronization

Whenever a player makes a transaction (in Discord or from the dashboard), `@m3rcena/eco` notifies the Bridge to broadcast updates:

```typescript
// Listening on the dashboard frontend
import { BridgeClient } from "@m3rcena/bridge/client";

const client = new BridgeClient({ url: "ws://localhost:4000/bridge" });

client.on("notification", (notif) => {
  if (notif.module === "eco") {
    console.log("Financial Alert:", notif.title, notif.message);
  }
});
```

Web developers can now construct completely custom frontend UI themes, charts, and animations while the Bridge and `@m3rcena/eco` guarantee financial integrity and anti-exploit enforcement!
