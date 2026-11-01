# Changelog

All notable changes to `@m3rcena/eco` will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
- **Modern Node.js Engine Support**:
  - Built for Node.js 22 LTS, 24 LTS, and 26 LTS.
  - TypeScript 7.0 with dual CJS and ESM exports and `.d.cts` / `.d.mts` definitions via Rolldown.

