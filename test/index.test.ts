/**
 * @m3rcena/eco
 * Comprehensive Test Suite for the Economy Engine.
 *
 * @copyright 2026 M3rcena Development. All rights reserved.
 * @license Apache-2.0
 */

import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";

import {
  EcoManager,
  MemoryEcoStorage,
  JsonEcoStorage,
  DEFAULT_JOBS,
  DEFAULT_SHOP_ITEMS,
  DEFAULT_BUSINESS_CATALOG,
  RenderBankCard,
  RenderMarketChart,
} from "../src/index.js";
import { M3rcenaBridge } from "@m3rcena/bridge";

describe("EcoManager Core Banking & Wallet", () => {
  let eco: EcoManager;

  before(() => {
    eco = new EcoManager({
      defaultWalletBalance: 1000,
      defaultBankCapacity: 15000,
      transactionFeePercentage: 0.05, // 5% transfer fee
    });
  });

  test("initializes default user account properly", async () => {
    const acc = await eco.getAccount("user_1");
    assert.equal(acc.userId, "user_1");
    assert.equal(acc.wallet, 1000);
    assert.equal(acc.bank, 0);
    assert.equal(acc.bankCapacity, 15000);
    assert.equal(acc.level, 1);
  });

  test("deposits funds into bank up to capacity", async () => {
    // Deposit 600
    const res1 = await eco.deposit("user_1", 600);
    assert.equal(res1.success, true);
    assert.equal(res1.deposited, 600);
    assert.equal(res1.wallet, 400);
    assert.equal(res1.bank, 600);

    // Deposit all remaining (400)
    const res2 = await eco.deposit("user_1", "all");
    assert.equal(res2.success, true);
    assert.equal(res2.deposited, 400);
    assert.equal(res2.wallet, 0);
    assert.equal(res2.bank, 1000);
  });

  test("withdraws funds from bank to wallet", async () => {
    const res = await eco.withdraw("user_1", 300);
    assert.equal(res.success, true);
    assert.equal(res.withdrawn, 300);
    assert.equal(res.wallet, 300);
    assert.equal(res.bank, 700);
  });

  test("handles transfer between users with transaction fees", async () => {
    // User 1 has 300 in wallet. Transfer 200 to User 2
    const res = await eco.transfer("user_1", "user_2", 200);
    assert.equal(res.success, true);
    // Fee 5% of 200 = 10, recipient receives 190
    assert.equal(res.fee, 10);
    assert.equal(res.amount, 190);

    const user1 = await eco.getAccount("user_1");
    assert.equal(user1.wallet, 100);

    const user2 = await eco.getAccount("user_2");
    // Default 1000 + 190 received = 1190
    assert.equal(user2.wallet, 1190);
  });

  test("prevents self-transfers and overdraft transfers", async () => {
    const selfRes = await eco.transfer("user_1", "user_1", 50);
    assert.equal(selfRes.success, false);

    const overdraftRes = await eco.transfer("user_1", "user_2", 999999);
    assert.equal(overdraftRes.success, false);
  });
});

describe("EcoManager Rewards, Streaks, Work & Robbery", () => {
  let eco: EcoManager;

  before(() => {
    eco = new EcoManager({
      cooldowns: {
        daily: 24 * 60 * 60 * 1000,
        work: 30 * 60 * 1000,
        beg: 5 * 60 * 1000,
        crime: 45 * 60 * 1000,
        rob: 2 * 60 * 60 * 1000,
      },
    });
  });

  test("claims daily reward and advances streak", async () => {
    const d1 = await eco.daily("worker_1");
    assert.equal(d1.success, true);
    assert.equal(d1.streak, 1);
    assert.equal(d1.jackpotMilestone, false);
    assert.ok(d1.rewardAmount >= 1000);

    // Immediately claiming again should fail on cooldown
    const d2 = await eco.daily("worker_1");
    assert.equal(d2.success, false);
    assert.ok(d2.cooldownRemainingMs! > 0);
  });

  test("completes work shift and rewards XP & Cash", async () => {
    const w1 = await eco.work("worker_2");
    assert.equal(w1.success, true);
    assert.ok(w1.earned! > 0);
    assert.ok(w1.xpEarned! > 0);

    // On cooldown
    const w2 = await eco.work("worker_2");
    assert.equal(w2.success, false);
    assert.ok(w2.cooldownRemainingMs! > 0);
  });

  test("begs random NPCs for cash", async () => {
    const b = await eco.beg("beggar_1");
    assert.ok(typeof b.success === "boolean");
    if (b.success) {
      assert.ok(b.earned > 0);
      assert.ok(b.donor.length > 0);
    } else {
      assert.ok(b.quote.length > 0);
    }
  });

  test("commits crime with high risk / reward mechanics", async () => {
    const c = await eco.crime("criminal_1");
    if (c.success) {
      assert.ok(c.earned! > 0);
    } else {
      assert.ok(c.fine! >= 0);
    }
  });

  test("handles robbery and shield protection with titanium padlock", async () => {
    await eco.addWallet("victim_1", 5000);
    await eco.addWallet("thief_1", 2000);

    // Protect victim with titanium padlock item
    await eco.buyItem("victim_1", "padlock", 1);
    await eco.useItem("victim_1", "padlock");

    // Thief attempts to rob protected victim
    const robBlocked = await eco.rob("thief_1", "victim_1");
    assert.equal(robBlocked.success, false);
    assert.equal(robBlocked.blockedByShield, true);

    // Shield should now be consumed
    const victimAcc = await eco.getAccount("victim_1");
    assert.equal(victimAcc.activeEffects.length, 0);

    // Reset rob cooldown for second robbery test
    const thiefAcc = await eco.getAccount("thief_1");
    thiefAcc.streak.lastRob = undefined;
    await eco.storage.saveAccount(thiefAcc);

    // Second robbery without shield
    const rob2 = await eco.rob("thief_1", "victim_1");
    assert.equal(rob2.blockedByShield, false);
  });
});

describe("EcoManager Career & Job System", () => {
  let eco: EcoManager;

  before(() => {
    eco = new EcoManager();
  });

  test("lists available jobs", () => {
    const jobs = eco.careers.getJobs();
    assert.ok(jobs.length >= 6);
    assert.ok(jobs.some((j) => j.id === "intern"));
    assert.ok(jobs.some((j) => j.id === "software_engineer"));
  });

  test("enforces minimum level requirement when applying", async () => {
    // Level 1 user tries applying for software engineer (requires Level 5)
    const res = await eco.careers.apply("fresh_user", "software_engineer");
    assert.equal(res.success, false);
    assert.match(res.error!, /Level 5/);

    // Can apply for Level 1 Intern
    const internRes = await eco.careers.apply("fresh_user", "intern");
    assert.equal(internRes.success, true);
    assert.equal(internRes.job?.id, "intern");
  });

  test("promotes user after completing required shifts", async () => {
    // Intern needs 3 shifts to get promoted
    const shift1 = await eco.careers.recordShift("fresh_user");
    assert.equal(shift1.promoted, false);

    const shift2 = await eco.careers.recordShift("fresh_user");
    assert.equal(shift2.promoted, false);

    const shift3 = await eco.careers.recordShift("fresh_user");
    assert.equal(shift3.promoted, true);
    assert.equal(shift3.newCareerLevel, 2);
    assert.ok(shift3.promotionBonus! > 0);
  });

  test("calculates increased salary with promotions", () => {
    const salaryLvl1 = eco.careers.calculateSalary({
      jobId: "intern",
      jobTitle: "Junior Intern",
      level: 1,
      shiftsCompleted: 0,
    });
    const salaryLvl3 = eco.careers.calculateSalary({
      jobId: "intern",
      jobTitle: "Junior Intern",
      level: 3,
      shiftsCompleted: 0,
    });

    assert.equal(salaryLvl1, 250);
    assert.ok(salaryLvl3 > salaryLvl1);
  });
});

describe("EcoManager Shop, Inventory & Consumables", () => {
  let eco: EcoManager;

  before(async () => {
    eco = new EcoManager();
    await eco.addWallet("shopper_1", 100000);
  });

  test("browses shop items", () => {
    const items = eco.shop.getItems();
    assert.ok(items.length >= 7);
    assert.ok(items.some((i) => i.id === "padlock"));
    assert.ok(items.some((i) => i.id === "energy_drink"));
  });

  test("purchases items into inventory", async () => {
    const buyRes = await eco.buyItem("shopper_1", "energy_drink", 3);
    assert.equal(buyRes.success, true);
    assert.equal(buyRes.quantity, 3);
    assert.equal(buyRes.totalCost, 800 * 3);

    const inv = await eco.getInventory("shopper_1");
    const item = inv.find((i) => i.itemId === "energy_drink");
    assert.ok(item);
    assert.equal(item.quantity, 3);
  });

  test("sells items from inventory", async () => {
    const sellRes = await eco.sellItem("shopper_1", "energy_drink", 1);
    assert.equal(sellRes.success, true);
    assert.equal(sellRes.quantity, 1);
    assert.equal(sellRes.earned, 400);

    const inv = await eco.getInventory("shopper_1");
    const item = inv.find((i) => i.itemId === "energy_drink");
    assert.equal(item?.quantity, 2);
  });

  test("uses energy drink to reset work cooldown", async () => {
    // Put user on work cooldown
    const acc = await eco.getAccount("shopper_1");
    acc.streak.lastWork = Date.now();
    await eco.storage.saveAccount(acc);

    // Using energy drink resets cooldown
    const useRes = await eco.useItem("shopper_1", "energy_drink");
    assert.equal(useRes.success, true);
    assert.match(useRes.message, /cooldown has been completely reset/);

    const updated = await eco.getAccount("shopper_1");
    assert.equal(updated.streak.lastWork, undefined);
  });

  test("uses Swiss Vault Key to permanently expand bank capacity", async () => {
    await eco.buyItem("shopper_1", "bank_vault_key", 1);
    const initialCap = (await eco.getAccount("shopper_1")).bankCapacity;

    const res = await eco.useItem("shopper_1", "bank_vault_key");
    assert.equal(res.success, true);

    const finalCap = (await eco.getAccount("shopper_1")).bankCapacity;
    assert.equal(finalCap, initialCap + 25000);
  });
});

describe("EcoManager Business Enterprises & Passive Income", () => {
  let eco: EcoManager;

  before(async () => {
    eco = new EcoManager();
    await eco.addWallet("mogul_1", 500000);
  });

  test("purchases a business enterprise", async () => {
    const res = await eco.buyBusiness("mogul_1", "lemonade_stand");
    assert.equal(res.success, true);
    assert.equal(res.business?.businessId, "lemonade_stand");
    assert.equal(res.business?.level, 1);
  });

  test("upgrades business facility level", async () => {
    const res = await eco.upgradeBusiness("mogul_1", "lemonade_stand");
    assert.equal(res.success, true);
    assert.equal(res.newLevel, 2);
    assert.ok(res.upgradeCost > 0);
  });

  test("hires employees to boost revenue", async () => {
    const res = await eco.hireEmployees("mogul_1", "lemonade_stand", 3);
    assert.equal(res.success, true);
    assert.equal(res.totalEmployees, 3);
    assert.ok(res.cost > 0);
  });

  test("accumulates and collects passive revenue", async () => {
    // Simulate time elapsed by setting lastCollected to 5 hours ago
    const acc = await eco.getAccount("mogul_1");
    const biz = acc.businesses.find((b) => b.businessId === "lemonade_stand")!;
    biz.lastCollected = Date.now() - 5 * 60 * 60 * 1000;
    await eco.storage.saveAccount(acc);

    const pending = eco.businesses.calculatePendingRevenue(biz);
    assert.ok(pending > 0);

    const initialWallet = (await eco.getAccount("mogul_1")).wallet;
    const colRes = await eco.collectBusinessRevenue("mogul_1");
    assert.equal(colRes.success, true);
    assert.equal(colRes.collected, pending);
    assert.equal(colRes.newWallet, initialWallet + pending);
  });
});

describe("EcoManager Casino & Gambling Suite", () => {
  let eco: EcoManager;

  before(async () => {
    eco = new EcoManager();
    await eco.addWallet("gambler_1", 100000);
  });

  test("plays coinflip", async () => {
    const res = await eco.coinflip("gambler_1", 500, "heads");
    assert.equal(res.game, "coinflip");
    assert.equal(res.betAmount, 500);
    assert.ok(["win", "lose"].includes(res.outcome));
    if (res.outcome === "win") {
      assert.equal(res.payout, 1000);
      assert.equal(res.profit, 500);
    } else {
      assert.equal(res.payout, 0);
      assert.equal(res.profit, -500);
    }
  });

  test("plays dice with high/low and exact predictions", async () => {
    const res1 = await eco.dice("gambler_1", 200, "high");
    assert.equal(res1.game, "dice");
    assert.ok(["win", "lose"].includes(res1.outcome));

    const res2 = await eco.dice("gambler_1", 100, 6);
    assert.equal(res2.game, "dice");
    if (res2.outcome === "win") {
      assert.equal(res2.multiplier, 6);
      assert.equal(res2.payout, 600);
    }
  });

  test("spins the slots reels", async () => {
    const res = await eco.slots("gambler_1", 300);
    assert.equal(res.game, "slots");
    assert.ok(res.details.includes("["));
  });

  test("plays roulette with color bets", async () => {
    const res = await eco.roulette("gambler_1", 400, "red");
    assert.equal(res.game, "roulette");
    assert.ok(res.details.includes("Roulette"));
  });

  test("runs crash multiplier simulator", async () => {
    const res = await eco.crash("gambler_1", 200, 1.5);
    assert.equal(res.game, "crash");
    assert.ok(res.details.includes("x"));
  });

  test("executes interactive Blackjack game", async () => {
    const game = await eco.startBlackjack("gambler_1", 500);
    assert.equal(game.userId, "gambler_1");
    assert.equal(game.playerHand.length, 2);
    assert.equal(game.dealerHand.length, 2);

    if (!game.finished) {
      // Stand and see dealer outcome
      const finishedGame = await eco.blackjackStand(game.gameId);
      assert.equal(finishedGame.finished, true);
      assert.ok(finishedGame.dealerHand.length >= 2);
    }
  });
});

describe("EcoManager Leaderboards & Net Worth", () => {
  let eco: EcoManager;

  before(async () => {
    eco = new EcoManager({ defaultWalletBalance: 0, defaultBankCapacity: 100000 });

    // Setup 3 players with varying assets
    await eco.addWallet("whale", 100000);
    await eco.deposit("whale", 80000);

    await eco.addWallet("shark", 50000);
    await eco.buyBusiness("shark", "lemonade_stand");

    await eco.addWallet("minnow", 2000);
  });

  test("calculates total net worth correctly", async () => {
    const whaleAcc = await eco.getAccount("whale");
    const netWorth = eco.leaderboards.calculateNetWorth(whaleAcc);
    // Wallet 20,000 + Bank 80,000 = 100,000
    assert.equal(netWorth, 100000);
  });

  test("ranks leaderboard by net worth", async () => {
    const lb = await eco.getLeaderboard("net_worth", 10);
    assert.equal(lb.length, 3);
    assert.equal(lb[0].userId, "whale");
    assert.equal(lb[0].rank, 1);
    assert.equal(lb[1].userId, "shark");
    assert.equal(lb[1].rank, 2);
    assert.equal(lb[2].userId, "minnow");
    assert.equal(lb[2].rank, 3);
  });

  test("formats leaderboard into clean markdown with medals", async () => {
    const formatted = await eco.formatLeaderboard("net_worth");
    assert.match(formatted, /Top Economy Leaderboard/);
    assert.match(formatted, /🥇/);
    assert.match(formatted, /🥈/);
    assert.match(formatted, /🥉/);
  });
});

describe("EcoManager Storage Persistence", () => {
  let tmpDir: string;
  let filePath: string;

  before(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "eco-storage-test-"));
    filePath = path.join(tmpDir, "economy.json");
  });

  after(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  test("persists accounts to disk with JsonEcoStorage", async () => {
    const storage1 = new JsonEcoStorage(filePath);
    const eco1 = new EcoManager({ storage: storage1, defaultWalletBalance: 500 });

    await eco1.addWallet("persistent_user", 7500);
    await eco1.deposit("persistent_user", 5000);

    // Verify file exists on disk
    const stat = await fs.stat(filePath);
    assert.ok(stat.size > 0);

    // Create a new instance pointing to same file
    const storage2 = new JsonEcoStorage(filePath);
    const eco2 = new EcoManager({ storage: storage2 });

    const acc = await eco2.getAccount("persistent_user");
    assert.equal(acc.bank, 5000);
    assert.equal(acc.wallet, 3000); // 500 default + 7500 added - 5000 deposited
  });
});

describe("EcoManager Dashboard Bridge Integration", () => {
  let bridge: M3rcenaBridge;
  let eco: EcoManager;
  const capturedActions: any[] = [];
  const capturedAudioCues: any[] = [];

  before(() => {
    bridge = new M3rcenaBridge();

    // Listen to bridge events
    bridge.on("action", (action) => {
      capturedActions.push(action);
    });

    bridge.on("audioCue", (cue) => {
      capturedAudioCues.push(cue);
    });

    eco = new EcoManager({ bridge, defaultWalletBalance: 10000 });
  });

  test("registers economy module in the bridge", () => {
    const modules = bridge.getRegisteredModules();
    assert.ok(modules.includes("economy"));
  });

  test("dispatches live bridge action and audio cues on financial activity", async () => {
    await eco.addWallet("bridge_user", 2500);

    // Verify action was captured
    const walletAction = capturedActions.find((a) => a.action === "wallet:add");
    assert.ok(walletAction);
    assert.equal(walletAction.module, "economy");
    assert.equal(walletAction.playerId, "bridge_user");
    assert.equal(walletAction.payload.amount, 2500);

    // Verify audio cue was captured
    const soundCue = capturedAudioCues.find((c) => c.sound === "coin_drop");
    assert.ok(soundCue);
    assert.equal(soundCue.userId, "bridge_user");
  });

  test("dispatches shop purchase action with purchase sound", async () => {
    await eco.buyItem("bridge_user", "energy_drink", 1);

    const buyAction = capturedActions.find((a) => a.action === "shop:buy");
    assert.ok(buyAction);

    const purchaseSound = capturedAudioCues.find((c) => c.sound === "purchase");
    assert.ok(purchaseSound);
  });

  test("supports fluent bridge.use(eco) and eco.connectBridge(bridge)", () => {
    const standaloneBridge = new M3rcenaBridge();
    const standaloneEco = new EcoManager();

    standaloneBridge.use(standaloneEco);
    assert.ok(standaloneBridge.getMountedRouters().some((r) => r.basePath === "/api/eco"));

    const secondBridge = new M3rcenaBridge();
    standaloneEco.connectBridge(secondBridge);
    assert.ok(secondBridge.getMountedRouters().some((r) => r.basePath === "/api/eco"));
  });
});

describe("EcoManager Stock & Crypto Market Exchange", () => {
  let eco: EcoManager;

  before(() => {
    eco = new EcoManager({ defaultWalletBalance: 500000 });
  });

  test("lists active simulated stocks and crypto assets", () => {
    const stocks = eco.getStocks();
    assert.ok(stocks.length >= 5);
    const aeth = eco.getStock("$AETH");
    assert.ok(aeth);
    assert.equal(aeth.symbol, "$AETH");
  });

  test("buys shares of stock and updates portfolio", async () => {
    const res = await eco.buyStock("trader_1", "$AETH", 10);
    assert.equal(res.symbol, "$AETH");
    assert.equal(res.shares, 10);
    assert.ok(res.totalAmount > 0);

    const portfolio = await eco.getStockPortfolio("trader_1");
    const pos = portfolio.positions.find((p) => p.symbol === "$AETH");
    assert.ok(pos);
    assert.equal(pos.shares, 10);
    assert.ok(portfolio.totalPortfolioValue > 0);
  });

  test("sells shares and calculates realized profit/loss", async () => {
    const res = await eco.sellStock("trader_1", "$AETH", 5);
    assert.equal(res.symbol, "$AETH");
    assert.equal(res.shares, 5);
    assert.ok(res.totalAmount > 0);

    const portfolio = await eco.getStockPortfolio("trader_1");
    const pos = portfolio.positions.find((p) => p.symbol === "$AETH");
    assert.ok(pos);
    assert.equal(pos.shares, 5);
  });

  test("ticks stock market prices and maintains history", () => {
    const aethBefore = eco.getStock("$AETH")!;
    const historyLenBefore = aethBefore.history.length;

    eco.tickStockMarket();

    const aethAfter = eco.getStock("$AETH")!;
    assert.ok(aethAfter.currentPrice > 0);
    assert.ok(aethAfter.history.length >= historyLenBefore);
  });
});

describe("EcoManager Multiplayer Syndicate Heists", () => {
  let eco: EcoManager;

  before(() => {
    eco = new EcoManager({ defaultWalletBalance: 100000 });
  });

  test("lists target vaults with difficulty and bounty brackets", () => {
    const targets = eco.getHeistTargets();
    assert.ok(targets.length >= 3);
    const mart = targets.find((t) => t.id === "corner_store");
    assert.ok(mart);
    assert.equal(mart.difficulty, "EASY");
  });

  test("creates a heist lobby and recruits crew members with roles", async () => {
    const session = await eco.createHeist("mastermind", "corner_store");
    assert.equal(session.initiatorId, "mastermind");
    assert.equal(session.phase, "LOBBY");
    assert.equal(session.crew.length, 1);

    const joinRes = await eco.joinHeist(session.id, "getaway_driver", "DRIVER", "Speedy");
    assert.equal(joinRes.success, true);
    assert.equal(joinRes.session.crew.length, 2);
  });

  test("executes heist and distributes loot or bails crew", async () => {
    const session = await eco.createHeist("boss", "corner_store");
    const outcome = await eco.executeHeist(session.id);

    assert.ok(typeof outcome.success === "boolean");
    assert.equal(outcome.crewCount, 1);
    if (outcome.success) {
      assert.ok(outcome.totalLoot > 0);
      assert.ok(outcome.sharePerPlayer > 0);
    } else {
      assert.ok((outcome.finePerPlayer || 0) > 0);
    }
  });
});

describe("EcoManager Companion Pets & Foraging", () => {
  let eco: EcoManager;

  before(() => {
    eco = new EcoManager({ defaultWalletBalance: 200000 });
  });

  test("browses available pet catalog", () => {
    const pets = eco.getAvailablePets();
    assert.ok(pets.length >= 3);
    const k9 = pets.find((p) => p.id === "cyber_hound");
    assert.ok(k9);
    assert.equal(k9.species, "Canine");
  });

  test("adopts a pet and saves to shelter", async () => {
    const pet = await eco.adoptPet("trainer_1", "cyber_hound", "Bolt");
    assert.equal(pet.name, "Bolt");
    assert.equal(pet.species, "Canine");
    assert.equal(pet.level, 1);

    const shelter = await eco.getUserPets("trainer_1");
    assert.equal(shelter.length, 1);
    assert.equal(shelter[0].name, "Bolt");
  });

  test("feeds pet and restores hunger / awards XP", async () => {
    const res = await eco.feedPet("trainer_1", "cyber_hound");
    assert.equal(res.success, true);
    assert.ok(res.pet.hunger >= 100);
    assert.ok(res.pet.xp > 0);
  });

  test("dispatches pet on expedition and rejects premature claim", async () => {
    const exp = await eco.sendPetExpedition("trainer_1", "cyber_hound");
    assert.equal(exp.success, true);
    assert.ok(exp.finishesAt > Date.now());

    await assert.rejects(
      async () => {
        await eco.claimPetExpedition("trainer_1", "cyber_hound");
      },
      /Expedition still in progress/
    );
  });
});

describe("EcoManager Mystery Loot Crates", () => {
  let eco: EcoManager;

  before(() => {
    eco = new EcoManager({ defaultWalletBalance: 500000 });
  });

  test("retrieves crate prices per tier", () => {
    assert.equal(eco.getCratePrice("common"), 5000);
    assert.equal(eco.getCratePrice("rare"), 25000);
    assert.equal(eco.getCratePrice("epic"), 100000);
  });

  test("unboxes a rare mystery crate and receives coins and XP", async () => {
    const reward = await eco.openCrate("loot_goblin", "rare");
    assert.equal(reward.tier, "rare");
    assert.ok(reward.coins > 0);
    assert.ok(reward.xp > 0);
  });

  test("fails to open crate without sufficient wallet balance", async () => {
    await assert.rejects(
      async () => {
        await eco.openCrate("broke_user", "mythic");
      },
      /Insufficient funds/
    );
  });
});

describe("EcoManager Canvas Debit Card & Chart Renderers", () => {
  test("renders high-resolution debit card image buffer", async () => {
    const cardBuffer = await RenderBankCard.renderCard({
      username: "d4rk.s0ul",
      wallet: 45200,
      bank: 250000,
      netWorth: 295200,
      currencySymbol: "🪙",
    });

    assert.ok(cardBuffer);
    assert.ok(cardBuffer instanceof Buffer);
    assert.ok(cardBuffer.length > 5000);
  });

  test("renders stock price chart with sparkline / candlestick buffer", async () => {
    const chartBuffer = await RenderMarketChart.renderChart({
      symbol: "$AETH",
      name: "Aether AI Robotics",
      currentPrice: 145.5,
      change24h: 3.75,
      history: [138, 140, 142, 141, 144, 145.5],
    });

    assert.ok(chartBuffer);
    assert.ok(chartBuffer instanceof Buffer);
    assert.ok(chartBuffer.length > 5000);
  });
});

describe("EcoManager Real Economy: Bank Vaults & Compound Interest", () => {
  let eco: EcoManager;

  before(() => {
    eco = new EcoManager({ defaultWalletBalance: 500000 });
  });

  test("inspects initial tier 1 vault", async () => {
    const vault = await eco.getUserVault("vault_user");
    assert.equal(vault.currentTier.tier, 1);
    assert.equal(vault.currentTier.capacity, 10000);
    assert.ok(vault.nextTier);
    assert.equal(vault.nextTier.tier, 2);
  });

  test("upgrades bank vault and increases storage capacity", async () => {
    const res = await eco.upgradeVault("vault_user");
    assert.equal(res.success, true);
    assert.equal(res.newTier.tier, 2);
    assert.equal(res.newCapacity, 50000);

    const updated = await eco.getUserVault("vault_user");
    assert.equal(updated.currentTier.tier, 2);
    assert.equal(updated.capacity, 50000);
  });
});

describe("EcoManager Real Economy: Credit Score, Loans & Debt", () => {
  let eco: EcoManager;

  before(() => {
    eco = new EcoManager({ defaultWalletBalance: 10000 });
  });

  test("initializes default FICO credit score at 650 (FAIR)", async () => {
    const credit = await eco.getCreditScore("borrower_1");
    assert.equal(credit.score, 650);
    assert.equal(credit.rating, "FAIR");
    assert.equal(credit.loansRepaid, 0);
  });

  test("approves eligible starter loan and disburses principal to wallet", async () => {
    const balBefore = (await eco.getBalance("borrower_1")).wallet;
    const res = await eco.applyLoan("borrower_1", "starter");
    assert.equal(res.success, true);
    assert.ok(res.loan);
    assert.equal(res.loan.principal, 10000);

    const balAfter = (await eco.getBalance("borrower_1")).wallet;
    assert.equal(balAfter, balBefore + 10000);

    const loans = await eco.getUserLoans("borrower_1");
    assert.equal(loans.length, 1);
    assert.equal(loans[0].status, "active");
  });

  test("repays loan, settles debt, and boosts credit score", async () => {
    const loans = await eco.getUserLoans("borrower_1");
    const activeLoan = loans[0];

    const repayRes = await eco.repayLoan("borrower_1", activeLoan.id, "all");
    assert.equal(repayRes.success, true);
    assert.equal(repayRes.isFullyPaid, true);
    assert.ok(repayRes.newCreditScore > 650);

    const credit = await eco.getCreditScore("borrower_1");
    assert.ok(credit.score > 650);
    assert.equal(credit.loansRepaid, 1);
  });
});

describe("EcoManager Real Economy: Municipal Bills, Taxes & Audits", () => {
  let eco: EcoManager;

  before(() => {
    eco = new EcoManager({ defaultWalletBalance: 200000 });
  });

  test("generates utility bills and wealth taxes", async () => {
    const res = await eco.generateBillsIfDue("citizen_1");
    assert.equal(res.generated, true);
    assert.ok(res.newBills.length > 0);
    assert.ok(res.totalBilled > 0);

    const pending = await eco.getPendingBills("citizen_1");
    assert.ok(pending.length > 0);
  });

  test("settles all municipal bills and grants Good Citizen bonus", async () => {
    const res = await eco.payAllBills("citizen_1");
    assert.equal(res.success, true);
    assert.ok(res.paidCount > 0);

    const pendingAfter = await eco.getPendingBills("citizen_1");
    assert.equal(pendingAfter.length, 0);
  });
});

describe("EcoManager Bridge Package Router REST Gateway", () => {
  let eco: EcoManager;

  before(() => {
    eco = new EcoManager({ defaultWalletBalance: 50000 });
  });

  test("handles GET /account/:userId via router", async () => {
    const res = await eco.router!.handleRequest({
      method: "GET",
      url: "/api/eco/account/router_user",
      path: "/api/eco/account/router_user",
      subPath: "/account/router_user",
      params: {},
      query: {},
      headers: {},
    });

    assert.ok(res);
    assert.equal(res.status, 200);
    assert.equal(res.body.userId, "router_user");
    assert.equal(res.body.wallet, 50000);
    assert.ok(res.body.creditScore);
    assert.ok(res.body.vault);
  });

  test("handles GET /cards/debit/:userId and renders customized canvas image", async () => {
    const res = await eco.router!.handleRequest({
      method: "GET",
      url: "/api/eco/cards/debit/router_user?bankName=CYBER%20CREDIT%20UNION",
      path: "/api/eco/cards/debit/router_user",
      subPath: "/cards/debit/router_user",
      params: {},
      query: { bankName: "CYBER CREDIT UNION" },
      headers: {},
    });

    assert.ok(res);
    assert.equal(res.status, 200);
    assert.equal(res.contentType, "image/png");
    assert.ok(res.isBuffer);
    assert.ok(Buffer.isBuffer(res.body));
    assert.ok(res.body.length > 5000);
  });

  after(() => {
    process.exit(0);
  });
});



