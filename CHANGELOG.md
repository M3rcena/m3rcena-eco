# Changelog

All notable changes to `@m3rcena/eco` will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [14.28.1] - 2026-11-05

### 🚀 Enhancements & Compatibility

#### Added
- **Discord.js v14.28.1 Compatibility**:
  - Full compatibility with Discord.js `14.28.1` and `Events.ClientReady` lifecycle.
- **Zero-Dependency Native SQLite Storage (`SqliteEcoStorage`)**:
  - Built-in persistent storage adapter utilizing Node.js 22+ native `node:sqlite` DatabaseSync with WAL journal mode.
  - Automatic table initialization for `eco_accounts` and `eco_kv`.
- **Enterprise Prisma ORM Adapter (`PrismaEcoStorage`)**:
  - Auto-migrating Prisma storage with auto-schema injection and raw SQL fallbacks for PostgreSQL, MySQL, and SQLite.
  - Schema migration helpers (`PRISMA_ECO_MODEL`, `applyPrismaEcoModel`).
- **Rust-Style Submodule Resolver & Local Hosting**:
  - Local-first Git submodule detection via `@m3rcena/eco/resolver`.
  - Zero-config runtime interception flag via `@m3rcena/eco/register`.
  - Standalone CLI host service via `@m3rcena/eco/host` (`hostEco`).
- **Terminal Update Notifier**:
  - Symmetrical terminal notification box with semver comparison (`checkPackageUpdates`).
- **Strongly-Typed Event Emitter**:
  - Comprehensive TypeScript definition for all `EcoEvents` parameters across `on`, `once`, and `off`.
- **Synchronized with `@m3rcena/bridge` v14.28.1**:
  - Full real-time bi-directional action dispatching, debit card REST streaming, and presence-filtered audio cues.

---

## [14.28.0] - 2026-11-01

### Added
- **Core Dual-Currency Banking Engine (`BankManager`)**:
  - Liquid cash (`wallet`) and protected savings (`bank`).
  - Upgradeable bank capacity (`bankCapacity`).
  - Full deposit and withdrawal flows with validation.
  - Inter-user transfers with configurable percentage transaction fees.
  - Safe bounds prevention against overdrafts and negative values.
- **Earning & Progression Systems (`RewardManager`)**:
  - Daily rewards with streak counters and 7-day milestone 2x jackpots.
  - Weekly and monthly milestone rewards.
  - Hourly allowances.
  - Work shifts with dynamic wage calculations, career multipliers, and XP leveling.
  - Begging mechanic with quirky NPC quotes and random payouts.
  - Crime mechanic with risk/reward calculation and bail fines.
  - PvP robbery with protection shields (Titanium Padlock) and fine splitting.
- **Career & Employment Progression (`CareerManager`)**:
  - Full job catalog from Junior Intern to Syndicate Boss.
  - Level-gated job applications.
  - Shift requirements and automatic promotions.
  - Increasing career salary multipliers (+25% per career rank).
- **Shop & Inventory System (`ShopManager`)**:
  - Rich catalog of consumables, collectibles, tools, and upgrades.
  - Item purchasing and resale value economics.
  - Active effects framework (`shield`, `cooldown_reset`, `gamble_luck`, `xp_boost`, `bank_capacity`, `lottery`).
  - Automatic expiration cleaning and consumption on use.
- **Passive Business Investment (`BusinessManager`)**:
  - Enterprises from Lemonade Stands to Orbital Cargo Logistics.
  - Multi-tier facility upgrades.
  - Employee recruitment to scale hourly passive revenue.
  - Offline accumulation calculations capped at 24 hours.
  - Single-click profit harvesting.
- **Casino & High-Stakes Gambling Suite (`CasinoManager`)**:
  - Interactive Blackjack engine with soft Aces, dealer standing on 17, natural 3:2 payout, and double-down mechanics.
  - Coinflip (Heads/Tails) with 2x payouts.
  - Dice rolls (High/Low, exact 1-6 prediction with 6x payout).
  - Slot machine with animated reels, multi-tier symbol combinations, and triple-7 jackpot.
  - European-style Roulette with Red/Black, Even/Odd, and single number 36x payouts.
  - Crash simulator with exponential multiplier curves and cash out targets.
  - Active luck effect integration (`gamble_luck` boosts odds).
- **Leaderboards & Net Worth (`LeaderboardManager`)**:
  - Dynamic net worth calculation (cash + bank + business valuation + inventory).
  - Top 10 rankings by Net Worth, Wallet, Bank, Level, and Streaks.
  - Formatted Discord markdown strings with gold, silver, and bronze medals.
- **Pluggable Storage Adapters**:
  - `MemoryEcoStorage`: Ultra-fast in-memory storage for testing and ephemeral bots.
  - `JsonEcoStorage`: Persistent JSON storage with atomic writes and directory auto-creation.
  - `EcoStorageAdapter` interface for easy MongoDB / PostgreSQL / Redis implementation.
- **Native `@m3rcena/bridge` Integration**:
  - Auto-registers the `"economy"` module with dashboard gateways.
  - Real-time action dispatching for wallet changes, bank deposits, casino outcomes, and shop trades.
  - Real-time scoped audio cues (`coin_drop`, `win`, `purchase`, `rob_siren`) with presence filtering.
- **Stock & Cryptocurrency Exchange (`StockMarketManager`)**:
  - Simulated equities and crypto ($AETH, $NEXU, $CORE, ₿BIT, ΞETH).
  - Volatility engine, Bull/Bear market shifts, 24h change %, and price history.
  - User portfolios with weighted cost basis and real-time unrealized PnL.
  - Real-time market candlestick / sparkline canvas charting (`RenderMarketChart`).
- **Multiplayer Syndicate Bank Heists (`HeistManager`)**:
  - Vault target catalog from Nightshift Mart Safe to Federal Reserve Sub-Basement.
  - Role recruitment system (`Hacker`, `Driver`, `Demolitionist`, `Muscle`).
  - Cooperative crew breach simulation with loot split calculation and SWAT bail fines.
- **Companion Pets & Foraging Expeditions (`PetManager`)**:
  - Adoptable companions (Cybernetic K9, Lucky Cat, Obsidian Drake, Void Phoenix).
  - Pet leveling, hunger decay, happiness metrics, and feeding mechanics.
  - Timed foraging expeditions returning randomized coins, XP, and items.
- **Quantum Mystery Loot Crates (`CrateManager`)**:
  - Multi-tier mystery crates (`Common`, `Rare`, `Epic`, `Legendary`, `Mythic`).
  - Weighted drop distribution tables with randomized coin bonuses and shop items.
- **Visual Canvas Generation (`@napi-rs/canvas`)**:
  - `RenderBankCard`: 850x500 high-res debit cards with dynamic tier gradients, laser chips, contactless arcs, user avatars, and net worth stamping.
  - `RenderMarketChart`: 800x400 neon candlestick/sparkline charts with gradient fills and 24h change indicators.
- **Ready-to-Run Discord Components V2 UI Modules (`src/ui/`)**:
  - `EcoProfileUI`: Financial passport with visual debit card and tabbed views (`Overview`, `Backpack`, `Businesses`, `Stocks`, `Pets`).
  - `EcoStockMarketUI`: Interactive live trading terminal with chart attachment, ticker select, buy/sell buttons, and live refresh.
  - `EcoHeistUI`: Interactive syndicate heist lobby with role claim buttons and breach simulation.
  - `EcoBlackjackUI`: VIP Blackjack table with Components V2 buttons (`Hit`, `Stand`, `Double Down`).
  - `EcoCrateUI`: Animated mystery loot crate unboxing terminal.
  - `EcoShopUI`: Category-filtered marketplace with interactive select menus and buy buttons.
  - `EcoLeaderboardUI`: Paginated server leaderboards with metric selection.
- **Modern Node.js Engine Support**:
  - Built for Node.js 22 LTS, 24 LTS, and 26 LTS.
  - TypeScript 7.0 with dual CJS and ESM exports and `.d.cts` / `.d.mts` definitions via Rolldown.

