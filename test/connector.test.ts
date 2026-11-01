import { describe, it } from "node:test";
import assert from "node:assert";
import { EventEmitter } from "node:events";
import { EcoManager } from "../src/EcoManager.js";
import { EcoWekyConnector } from "../src/connector/EcoWekyConnector.js";

class MockWekyManager extends EventEmitter {
  public leaderboard = {
    async getPlayer(userId: string) {
      return { id: userId, winStreak: 3 };
    },
  };
}

describe("EcoManager <-> Weky Minigames Connector", () => {
  it("connects Weky minigames and initializes EcoWekyConnector", () => {
    const eco = new EcoManager({ storage: "memory" });
    const mockWeky = new MockWekyManager();

    const connector = eco.connectWeky(mockWeky, {
      defaultWinReward: 150,
      defaultLossPenalty: 25,
      streakBonus: 10,
    });

    assert.ok(connector instanceof EcoWekyConnector);
  });

  it("escrows and resolves a PvP wager match", async () => {
    const eco = new EcoManager({ defaultWalletBalance: 0, storage: "memory" });
    await eco.addWallet("p1", 500);
    await eco.addWallet("p2", 500);

    const mockWeky = new MockWekyManager();
    const connector = eco.connectWeky(mockWeky, { wagerHouseFee: 10 });

    const createRes = await connector.createWager({
      wagerId: "wager_match_1",
      player1Id: "p1",
      player2Id: "p2",
      amount: 100,
      game: "rps",
    });

    assert.strictEqual(createRes.success, true);
    assert.strictEqual((await eco.getBalance("p1")).wallet, 400);
    assert.strictEqual((await eco.getBalance("p2")).wallet, 400);

    const resolveRes = await connector.resolveWager("wager_match_1", "p1");
    assert.ok(resolveRes);
    // 200 pot - 10% (20) = 180
    assert.strictEqual(resolveRes.amount, 180);
    assert.strictEqual((await eco.getBalance("p1")).wallet, 400 + 180);
  });

  it("rewards winning minigames automatically with streak bonus", async () => {
    const eco = new EcoManager({ storage: "memory" });
    const mockWeky = new MockWekyManager();
    const connector = eco.connectWeky(mockWeky, {
      defaultWinReward: 100,
      streakBonus: 10,
    });

    const initial = (await eco.getBalance("p1")).wallet;
    mockWeky.emit("gameOver", {
      game: "fight",
      user: { id: "p1" },
      outcome: "WIN",
      score: 0,
    });

    await new Promise((r) => setTimeout(r, 50));
    // 100 winReward + 3 streak * 10 = 130
    const finalBal = (await eco.getBalance("p1")).wallet;
    assert.strictEqual(finalBal, initial + 130);
  });
});
