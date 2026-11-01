import { test, describe } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";

import {
  EcoManager,
  SqliteEcoStorage,
  PrismaEcoStorage,
  EcoDatabaseHandler,
  applyPrismaEcoModel,
  compareSemver,
  stripAnsi,
  boxConsole,
} from "../src/index.js";

describe("EcoManager SQLite & Prisma Database Handler", () => {
  const tmpDir = path.join(os.tmpdir(), `eco-db-test-${Date.now()}`);
  const sqliteFile = path.join(tmpDir, "test-eco.sqlite");

  test("SqliteEcoStorage saves and retrieves user accounts with indexing", async () => {
    await fs.mkdir(tmpDir, { recursive: true });
    const storage = new SqliteEcoStorage({ path: sqliteFile });

    const dummyAcc = {
      userId: "sqlite_user_1",
      guildId: "guild_a",
      wallet: 2500,
      bank: 7500,
      bankCapacity: 20000,
      xp: 150,
      level: 3,
      streak: { daily: 5 },
      inventory: [],
      businesses: [],
      activeEffects: [],
      stats: { totalEarned: 10000, totalSpent: 0, totalGambled: 0, totalGambleWon: 0, totalRobbed: 0, timesRobbed: 0, jobsCompleted: 2, itemsBought: 0 },
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    await storage.saveAccount(dummyAcc);
    const fetched = await storage.getAccount("sqlite_user_1", "guild_a");
    assert.ok(fetched);
    assert.equal(fetched.userId, "sqlite_user_1");
    assert.equal(fetched.wallet, 2500);
    assert.equal(fetched.bank, 7500);
    assert.equal(fetched.level, 3);

    // Leaderboards
    const top = await storage.getTopAccounts("netWorth", 5, "guild_a");
    assert.equal(top.length, 1);
    assert.equal(top[0].userId, "sqlite_user_1");

    storage.close();
  });

  test("EcoDatabaseHandler resolves 'sqlite' and creates functional manager", async () => {
    const sqliteManagerFile = path.join(tmpDir, "manager-eco.sqlite");
    const ecoSqlite = new EcoManager({
      database: { type: "sqlite", path: sqliteManagerFile },
      notifyUpdates: false,
    });

    const acc = await ecoSqlite.getAccount("sqlite_bot_user", "g1");
    assert.ok(acc);
    assert.equal(acc.userId, "sqlite_bot_user");

    await ecoSqlite.deposit("sqlite_bot_user", 200, "g1");
    const bal = await ecoSqlite.getBalance("sqlite_bot_user", "g1");
    assert.equal(bal.bank, 200);

    (ecoSqlite.storage as any).close?.();
  });

  test("PrismaEcoStorage operates seamlessly with PrismaClient delegates", async () => {
    const mockDb: Record<string, any> = {};

    const mockPrisma = {
      ecoAccount: {
        async findUnique({ where }: any) {
          const key = `${where.userId_guildId.guildId}_${where.userId_guildId.userId}`;
          return mockDb[key] || null;
        },
        async upsert({ where, update, create }: any) {
          const key = `${where.userId_guildId.guildId}_${where.userId_guildId.userId}`;
          mockDb[key] = { ...(mockDb[key] || create), ...update };
          return mockDb[key];
        },
        async findMany({ where }: any) {
          return Object.values(mockDb).filter((rec: any) => !where?.guildId || rec.guildId === where.guildId);
        },
      },
    };

    const prismaStorage = new PrismaEcoStorage({ client: mockPrisma });
    const acc = {
      userId: "prisma_user_1",
      guildId: "guild_p",
      wallet: 9999,
      bank: 50000,
      bankCapacity: 100000,
      xp: 500,
      level: 10,
      streak: { daily: 12 },
      inventory: [],
      businesses: [],
      activeEffects: [],
      stats: { totalEarned: 59999, totalSpent: 0, totalGambled: 0, totalGambleWon: 0, totalRobbed: 0, timesRobbed: 0, jobsCompleted: 20, itemsBought: 5 },
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    await prismaStorage.saveAccount(acc);
    const retrieved = await prismaStorage.getAccount("prisma_user_1", "guild_p");
    assert.ok(retrieved);
    assert.equal(retrieved.userId, "prisma_user_1");
    assert.equal(retrieved.wallet, 9999);
    assert.equal(retrieved.level, 10);
  });

  test("applyPrismaEcoModel appends EcoAccount model to schema.prisma if missing", async () => {
    const schemaFile = path.join(tmpDir, "schema.prisma");
    await fs.writeFile(schemaFile, 'datasource db { provider = "postgresql" }\n', "utf-8");

    const applied = applyPrismaEcoModel(schemaFile);
    assert.equal(applied, true);

    const content = await fs.readFile(schemaFile, "utf-8");
    assert.ok(content.includes("model EcoAccount"));

    const appliedAgain = applyPrismaEcoModel(schemaFile);
    assert.equal(appliedAgain, false);
  });

  test("Terminal Update Notifier helpers work correctly", async () => {
    assert.equal(compareSemver("14.28.0", "14.29.0"), -1);
    assert.equal(compareSemver("14.29.0", "14.28.0"), 1);
    assert.equal(compareSemver("14.28.0", "14.28.0"), 0);

    const colored = "\x1b[32mAntigravity\x1b[39m";
    assert.equal(stripAnsi(colored), "Antigravity");

    boxConsole(["Test Line 1", "Test Line 2"]);
  });
});
