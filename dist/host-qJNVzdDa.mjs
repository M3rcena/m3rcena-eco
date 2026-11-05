import { getAllPackageResolutions, printResolutionSummary } from "./resolver.mjs";
import fs from "fs";
import path from "path";
import fs$1 from "node:fs";
import path$1 from "node:path";
import { DatabaseSync } from "node:sqlite";
import { createCanvas, loadImage } from "@napi-rs/canvas";
import { EventEmitter } from "node:events";
import http from "node:http";
// src/storage/EcoStorage.ts
/**
* @m3rcena/eco
* Pluggable Storage Adapters for Economy Accounts and Data.
*
* @copyright 2026 M3rcena Development. All rights reserved.
* @license Apache-2.0
*/
function createDefaultAccount(userId, guildId, defaultWallet = 500, defaultBankCap = 1e4) {
	return {
		userId,
		guildId,
		wallet: defaultWallet,
		bank: 0,
		bankCapacity: defaultBankCap,
		xp: 0,
		level: 1,
		streak: { daily: 0 },
		inventory: [],
		businesses: [],
		activeEffects: [],
		stats: {
			totalEarned: defaultWallet,
			totalSpent: 0,
			totalGambled: 0,
			totalGambleWon: 0,
			totalRobbed: 0,
			timesRobbed: 0,
			jobsCompleted: 0,
			itemsBought: 0
		},
		createdAt: Date.now(),
		updatedAt: Date.now()
	};
}
var MemoryEcoStorage = class {
	accounts = /* @__PURE__ */ new Map();
	makeKey(userId, guildId) {
		return guildId ? `${guildId}_${userId}` : userId;
	}
	async getAccount(userId, guildId) {
		const key = this.makeKey(userId, guildId);
		const acc = this.accounts.get(key);
		return acc ? JSON.parse(JSON.stringify(acc)) : null;
	}
	async saveAccount(account) {
		const key = this.makeKey(account.userId, account.guildId);
		account.updatedAt = Date.now();
		this.accounts.set(key, JSON.parse(JSON.stringify(account)));
	}
	async getTopAccounts(sortBy = "netWorth", limit = 10, guildId) {
		let list = Array.from(this.accounts.values());
		if (guildId) list = list.filter((a) => a.guildId === guildId);
		const sortFn = (a, b) => {
			if (sortBy === "wallet") return b.wallet - a.wallet;
			if (sortBy === "bank") return b.bank - a.bank;
			if (sortBy === "level") return b.level - a.level;
			const nwA = a.wallet + a.bank;
			return b.wallet + b.bank - nwA;
		};
		return list.sort(sortFn).slice(0, limit);
	}
	async getAllAccounts(guildId) {
		let list = Array.from(this.accounts.values());
		if (guildId) list = list.filter((a) => a.guildId === guildId);
		return list;
	}
};
var JsonEcoStorage = class {
	filePath;
	cache = {};
	loaded = false;
	constructor(filePath = "./eco-data.json") {
		this.filePath = path.resolve(process.cwd(), filePath);
	}
	makeKey(userId, guildId) {
		return guildId ? `${guildId}_${userId}` : userId;
	}
	async ensureLoaded() {
		if (this.loaded) return;
		try {
			if (fs.existsSync(this.filePath)) {
				const raw = await fs.promises.readFile(this.filePath, "utf-8");
				this.cache = JSON.parse(raw);
			}
		} catch {
			this.cache = {};
		}
		this.loaded = true;
	}
	async persist() {
		try {
			const dir = path.dirname(this.filePath);
			if (!fs.existsSync(dir)) await fs.promises.mkdir(dir, { recursive: true });
			await fs.promises.writeFile(this.filePath, JSON.stringify(this.cache, null, 2), "utf-8");
		} catch (err) {
			console.error("[JsonEcoStorage] Failed to save accounts to disk:", err);
		}
	}
	async getAccount(userId, guildId) {
		await this.ensureLoaded();
		const key = this.makeKey(userId, guildId);
		const acc = this.cache[key];
		return acc ? JSON.parse(JSON.stringify(acc)) : null;
	}
	async saveAccount(account) {
		await this.ensureLoaded();
		const key = this.makeKey(account.userId, account.guildId);
		account.updatedAt = Date.now();
		this.cache[key] = JSON.parse(JSON.stringify(account));
		await this.persist();
	}
	async getTopAccounts(sortBy = "netWorth", limit = 10, guildId) {
		await this.ensureLoaded();
		let list = Object.values(this.cache);
		if (guildId) list = list.filter((a) => a.guildId === guildId);
		const sortFn = (a, b) => {
			if (sortBy === "wallet") return b.wallet - a.wallet;
			if (sortBy === "bank") return b.bank - a.bank;
			if (sortBy === "level") return b.level - a.level;
			const nwA = a.wallet + a.bank;
			return b.wallet + b.bank - nwA;
		};
		return list.sort(sortFn).slice(0, limit);
	}
	async getAllAccounts(guildId) {
		await this.ensureLoaded();
		let list = Object.values(this.cache);
		if (guildId) list = list.filter((a) => a.guildId === guildId);
		return list;
	}
};
// src/storage/SqliteEcoStorage.ts
/**
* @m3rcena/eco
* Native SQLite Storage Adapter using node:sqlite (Node.js >= 22.0.0).
* Provides fast, zero-dependency, transactional local database storage.
*
* @copyright 2026 M3rcena Development. All rights reserved.
* @license Apache-2.0
*/
var SqliteEcoStorage = class {
	db;
	dbPath;
	constructor(options = "./eco.sqlite") {
		const rawPath = typeof options === "string" ? options : options.path || "./eco.sqlite";
		if (rawPath === ":memory:") this.dbPath = ":memory:";
		else {
			this.dbPath = path$1.resolve(process.cwd(), rawPath);
			const dir = path$1.dirname(this.dbPath);
			if (!fs$1.existsSync(dir)) fs$1.mkdirSync(dir, { recursive: true });
		}
		this.db = new DatabaseSync(this.dbPath);
		if (typeof options === "object" ? options.walMode ?? true : true) try {
			this.db.exec("PRAGMA journal_mode = WAL;");
		} catch {}
		this.initTables();
	}
	initTables() {
		this.db.exec(`
      CREATE TABLE IF NOT EXISTS eco_accounts (
        user_id TEXT NOT NULL,
        guild_id TEXT NOT NULL DEFAULT '',
        wallet REAL NOT NULL DEFAULT 0,
        bank REAL NOT NULL DEFAULT 0,
        level INTEGER NOT NULL DEFAULT 1,
        data TEXT NOT NULL,
        updated_at INTEGER NOT NULL,
        PRIMARY KEY (user_id, guild_id)
      );

      CREATE INDEX IF NOT EXISTS idx_eco_accounts_guild ON eco_accounts (guild_id);
      CREATE INDEX IF NOT EXISTS idx_eco_accounts_wallet ON eco_accounts (wallet DESC);
      CREATE INDEX IF NOT EXISTS idx_eco_accounts_bank ON eco_accounts (bank DESC);
      CREATE INDEX IF NOT EXISTS idx_eco_accounts_level ON eco_accounts (level DESC);
      CREATE INDEX IF NOT EXISTS idx_eco_accounts_updated ON eco_accounts (updated_at DESC);
    `);
	}
	async getAccount(userId, guildId) {
		const gid = guildId || "";
		const row = this.db.prepare("SELECT data FROM eco_accounts WHERE user_id = ? AND guild_id = ? LIMIT 1").get(userId, gid);
		if (!row || !row.data) return null;
		try {
			return JSON.parse(row.data);
		} catch {
			return null;
		}
	}
	async saveAccount(account) {
		account.updatedAt = Date.now();
		const gid = account.guildId || "";
		const payload = JSON.stringify(account);
		this.db.prepare(`
      INSERT INTO eco_accounts (user_id, guild_id, wallet, bank, level, data, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(user_id, guild_id) DO UPDATE SET
        wallet = excluded.wallet,
        bank = excluded.bank,
        level = excluded.level,
        data = excluded.data,
        updated_at = excluded.updated_at
    `).run(account.userId, gid, account.wallet, account.bank, account.level, payload, account.updatedAt);
	}
	async getTopAccounts(sortBy = "netWorth", limit = 10, guildId) {
		const gid = guildId || null;
		let query;
		if (sortBy === "wallet") query = gid ? "SELECT data FROM eco_accounts WHERE guild_id = ? ORDER BY wallet DESC LIMIT ?" : "SELECT data FROM eco_accounts ORDER BY wallet DESC LIMIT ?";
		else if (sortBy === "bank") query = gid ? "SELECT data FROM eco_accounts WHERE guild_id = ? ORDER BY bank DESC LIMIT ?" : "SELECT data FROM eco_accounts ORDER BY bank DESC LIMIT ?";
		else if (sortBy === "level") query = gid ? "SELECT data FROM eco_accounts WHERE guild_id = ? ORDER BY level DESC LIMIT ?" : "SELECT data FROM eco_accounts ORDER BY level DESC LIMIT ?";
		else query = gid ? "SELECT data FROM eco_accounts WHERE guild_id = ? ORDER BY (wallet + bank) DESC LIMIT ?" : "SELECT data FROM eco_accounts ORDER BY (wallet + bank) DESC LIMIT ?";
		const stmt = this.db.prepare(query);
		const rows = gid ? stmt.all(gid, limit) : stmt.all(limit);
		const result = [];
		for (const r of rows) try {
			if (r && r.data) result.push(JSON.parse(r.data));
		} catch {}
		return result;
	}
	async getAllAccounts(guildId) {
		const gid = guildId || null;
		const query = gid ? "SELECT data FROM eco_accounts WHERE guild_id = ?" : "SELECT data FROM eco_accounts";
		const stmt = this.db.prepare(query);
		const rows = gid ? stmt.all(gid) : stmt.all();
		const result = [];
		for (const r of rows) try {
			if (r && r.data) result.push(JSON.parse(r.data));
		} catch {}
		return result;
	}
	/**
	* Closes the SQLite database connection.
	*/
	close() {
		try {
			this.db.close();
		} catch {}
	}
};
// src/storage/PrismaEcoStorage.ts
/**
* @m3rcena/eco
* Enterprise Prisma Storage Adapter.
* Integrates directly with existing PrismaClient instances with automated table migration
* and native fallback to raw SQL queries if models haven't been compiled yet.
*
* @copyright 2026 M3rcena Development. All rights reserved.
* @license Apache-2.0
*/
/**
* Prisma Schema snippet that developers can paste into their schema.prisma.
*/
const PRISMA_ECO_MODEL = `
// Added by @m3rcena/eco
model EcoAccount {
  userId    String
  guildId   String   @default("")
  wallet    Float    @default(0)
  bank      Float    @default(0)
  level     Int      @default(1)
  data      String
  updatedAt DateTime @updatedAt

  @@id([userId, guildId])
  @@index([guildId])
}
`.trim();
/**
* Automatically inspects and appends the EcoAccount model to a schema.prisma file if missing.
* @param schemaPath Path to schema.prisma (default: "prisma/schema.prisma")
* @returns True if model was appended, false if already present or schema file not found.
*/
function applyPrismaEcoModel(schemaPath = "prisma/schema.prisma") {
	try {
		const resolved = path$1.resolve(process.cwd(), schemaPath);
		if (!fs$1.existsSync(resolved)) return false;
		const content = fs$1.readFileSync(resolved, "utf-8");
		if (content.includes("model EcoAccount")) return false;
		const updated = `${content.trim()}\n\n${PRISMA_ECO_MODEL}\n`;
		fs$1.writeFileSync(resolved, updated, "utf-8");
		return true;
	} catch (err) {
		console.error("[applyPrismaEcoModel] Failed to append model to schema:", err);
		return false;
	}
}
var PrismaEcoStorage = class {
	client;
	modelName;
	tableName;
	autoMigrate;
	migrated = false;
	constructor(options) {
		if (options && options.client) {
			this.client = options.client;
			this.modelName = options.model || "ecoAccount";
			this.tableName = options.tableName || "EcoAccount";
			this.autoMigrate = options.autoMigrate ?? true;
		} else {
			this.client = options;
			this.modelName = "ecoAccount";
			this.tableName = "EcoAccount";
			this.autoMigrate = true;
		}
	}
	async ensureMigrated() {
		if (this.migrated || !this.autoMigrate || !this.client) return;
		this.migrated = true;
		if (this.client[this.modelName]) return;
		if (typeof this.client.$executeRawUnsafe === "function") try {
			await this.client.$executeRawUnsafe(`
          CREATE TABLE IF NOT EXISTS "${this.tableName}" (
            "userId" VARCHAR(191) NOT NULL,
            "guildId" VARCHAR(191) NOT NULL DEFAULT '',
            "wallet" DOUBLE PRECISION NOT NULL DEFAULT 0,
            "bank" DOUBLE PRECISION NOT NULL DEFAULT 0,
            "level" INTEGER NOT NULL DEFAULT 1,
            "data" TEXT NOT NULL,
            "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY ("userId", "guildId")
          );
        `);
		} catch {
			try {
				await this.client.$executeRawUnsafe(`
            CREATE TABLE IF NOT EXISTS ${this.tableName} (
              userId TEXT NOT NULL,
              guildId TEXT NOT NULL DEFAULT '',
              wallet REAL NOT NULL DEFAULT 0,
              bank REAL NOT NULL DEFAULT 0,
              level INTEGER NOT NULL DEFAULT 1,
              data TEXT NOT NULL,
              updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
              PRIMARY KEY (userId, guildId)
            );
          `);
			} catch {}
		}
	}
	async getAccount(userId, guildId) {
		await this.ensureMigrated();
		const gid = guildId || "";
		const delegate = this.client[this.modelName];
		if (delegate && typeof delegate.findUnique === "function") try {
			const record = await delegate.findUnique({ where: { userId_guildId: {
				userId,
				guildId: gid
			} } });
			if (!record || !record.data) return null;
			return typeof record.data === "string" ? JSON.parse(record.data) : record.data;
		} catch {
			try {
				const record = await delegate.findFirst({ where: {
					userId,
					guildId: gid
				} });
				if (!record || !record.data) return null;
				return typeof record.data === "string" ? JSON.parse(record.data) : record.data;
			} catch {
				return null;
			}
		}
		if (typeof this.client.$queryRawUnsafe === "function") try {
			const rows = await this.client.$queryRawUnsafe(`SELECT "data" FROM "${this.tableName}" WHERE "userId" = $1 AND "guildId" = $2 LIMIT 1`, userId, gid);
			if (rows && rows.length > 0 && rows[0].data) return JSON.parse(rows[0].data);
		} catch {
			try {
				const rows = await this.client.$queryRawUnsafe(`SELECT data FROM ${this.tableName} WHERE userId = ? AND guildId = ? LIMIT 1`, userId, gid);
				if (rows && rows.length > 0 && rows[0].data) return JSON.parse(rows[0].data);
			} catch {
				return null;
			}
		}
		return null;
	}
	async saveAccount(account) {
		await this.ensureMigrated();
		account.updatedAt = Date.now();
		const gid = account.guildId || "";
		const serialized = JSON.stringify(account);
		const delegate = this.client[this.modelName];
		if (delegate && typeof delegate.upsert === "function") try {
			await delegate.upsert({
				where: { userId_guildId: {
					userId: account.userId,
					guildId: gid
				} },
				update: {
					wallet: account.wallet,
					bank: account.bank,
					level: account.level,
					data: serialized,
					updatedAt: new Date(account.updatedAt)
				},
				create: {
					userId: account.userId,
					guildId: gid,
					wallet: account.wallet,
					bank: account.bank,
					level: account.level,
					data: serialized,
					updatedAt: new Date(account.updatedAt)
				}
			});
			return;
		} catch {}
		if (typeof this.client.$executeRawUnsafe === "function") try {
			await this.client.$executeRawUnsafe(`
          INSERT INTO "${this.tableName}" ("userId", "guildId", "wallet", "bank", "level", "data", "updatedAt")
          VALUES ($1, $2, $3, $4, $5, $6, NOW())
          ON CONFLICT ("userId", "guildId") DO UPDATE SET
            "wallet" = EXCLUDED."wallet",
            "bank" = EXCLUDED."bank",
            "level" = EXCLUDED."level",
            "data" = EXCLUDED."data",
            "updatedAt" = NOW()
          `, account.userId, gid, account.wallet, account.bank, account.level, serialized);
		} catch {
			await this.client.$executeRawUnsafe(`
          INSERT INTO ${this.tableName} (userId, guildId, wallet, bank, level, data, updatedAt)
          VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
          ON CONFLICT(userId, guildId) DO UPDATE SET
            wallet = excluded.wallet,
            bank = excluded.bank,
            level = excluded.level,
            data = excluded.data,
            updatedAt = CURRENT_TIMESTAMP
          `, account.userId, gid, account.wallet, account.bank, account.level, serialized);
		}
	}
	async getTopAccounts(sortBy = "netWorth", limit = 10, guildId) {
		await this.ensureMigrated();
		const gid = guildId || void 0;
		const delegate = this.client[this.modelName];
		if (delegate && typeof delegate.findMany === "function") try {
			let orderBy = {};
			if (sortBy === "wallet") orderBy = { wallet: "desc" };
			else if (sortBy === "bank") orderBy = { bank: "desc" };
			else if (sortBy === "level") orderBy = { level: "desc" };
			const list = (await delegate.findMany({
				where: gid ? { guildId: gid } : void 0,
				orderBy: Object.keys(orderBy).length > 0 ? orderBy : void 0,
				take: sortBy === "netWorth" ? void 0 : limit
			})).map((r) => typeof r.data === "string" ? JSON.parse(r.data) : r.data).filter(Boolean);
			if (sortBy === "netWorth") {
				list.sort((a, b) => b.wallet + b.bank - (a.wallet + a.bank));
				return list.slice(0, limit);
			}
			return list;
		} catch {}
		return (await this.getAllAccounts(guildId)).sort((a, b) => {
			if (sortBy === "wallet") return b.wallet - a.wallet;
			if (sortBy === "bank") return b.bank - a.bank;
			if (sortBy === "level") return b.level - a.level;
			return b.wallet + b.bank - (a.wallet + a.bank);
		}).slice(0, limit);
	}
	async getAllAccounts(guildId) {
		await this.ensureMigrated();
		const gid = guildId || void 0;
		const delegate = this.client[this.modelName];
		if (delegate && typeof delegate.findMany === "function") try {
			return (await delegate.findMany({ where: gid ? { guildId: gid } : void 0 })).map((r) => typeof r.data === "string" ? JSON.parse(r.data) : r.data).filter(Boolean);
		} catch {}
		if (typeof this.client.$queryRawUnsafe === "function") try {
			return (gid ? await this.client.$queryRawUnsafe(`SELECT data FROM ${this.tableName} WHERE guildId = ?`, gid) : await this.client.$queryRawUnsafe(`SELECT data FROM ${this.tableName}`)).map((r) => JSON.parse(r.data)).filter(Boolean);
		} catch {
			return [];
		}
		return [];
	}
};
// src/storage/EcoDatabaseHandler.ts
/**
* @m3rcena/eco
* Unified Database Handler and Factory for SQLite, Prisma, JSON, and Memory storage.
*
* @copyright 2026 M3rcena Development. All rights reserved.
* @license Apache-2.0
*/
var EcoDatabaseHandler = class {
	/**
	* Instantiates the requested database storage adapter based on developer configuration.
	*/
	static create(config) {
		if (!config || config === "memory") return new MemoryEcoStorage();
		if (config === "sqlite") return new SqliteEcoStorage("./eco.sqlite");
		if (config === "json") return new JsonEcoStorage("./eco-data.json");
		if (typeof config === "object") {
			if (config.type === "sqlite") return new SqliteEcoStorage(config.path || "./eco.sqlite");
			if (config.type === "prisma") return new PrismaEcoStorage({
				client: config.client,
				model: config.model || "ecoAccount",
				autoMigrate: config.autoMigrate ?? true
			});
			if (config.type === "json") return new JsonEcoStorage(config.path || "./eco-data.json");
			if (config.type === "memory") return new MemoryEcoStorage();
		}
		return new MemoryEcoStorage();
	}
	/**
	* Helper utility to automatically append the EcoAccount model to schema.prisma.
	*/
	static applyPrismaSchema(schemaPath = "prisma/schema.prisma") {
		return applyPrismaEcoModel(schemaPath);
	}
};
/**
* Convenience helper to resolve an EcoStorageAdapter from either an existing storage instance or database config.
*/
function resolveEcoStorage(options) {
	if (options.storage && typeof options.storage === "object" && typeof options.storage.getAccount === "function") return options.storage;
	if (typeof options.storage === "string") return EcoDatabaseHandler.create(options.storage);
	if (options.database) return EcoDatabaseHandler.create(options.database);
	return new MemoryEcoStorage();
}
// src/modules/BankManager.ts
/**
* @m3rcena/eco
* Bank & Wallet Management System.
*
* @copyright 2026 M3rcena Development. All rights reserved.
* @license Apache-2.0
*/
var BankManager = class {
	storage;
	defaultWallet;
	defaultBankCap;
	transactionFee;
	constructor(storage, options = {}) {
		this.storage = storage;
		this.defaultWallet = options.defaultWallet ?? 500;
		this.defaultBankCap = options.defaultBankCap ?? 1e4;
		this.transactionFee = options.transactionFee ?? 0;
	}
	async getAccount(userId, guildId) {
		let acc = await this.storage.getAccount(userId, guildId);
		if (!acc) {
			acc = createDefaultAccount(userId, guildId, this.defaultWallet, this.defaultBankCap);
			await this.storage.saveAccount(acc);
		}
		return acc;
	}
	async saveAccount(account) {
		await this.storage.saveAccount(account);
	}
	/**
	* Deposits cash from wallet into the bank up to bank capacity.
	*/
	async deposit(userId, amount, guildId) {
		const acc = await this.getAccount(userId, guildId);
		const availableSpace = Math.max(0, acc.bankCapacity - acc.bank);
		if (availableSpace <= 0) return {
			success: false,
			deposited: 0,
			wallet: acc.wallet,
			bank: acc.bank,
			error: "Bank capacity is full!"
		};
		const maxCanDeposit = Math.min(acc.wallet, availableSpace);
		const toDeposit = amount === "all" ? maxCanDeposit : Math.min(amount, maxCanDeposit);
		if (toDeposit <= 0) return {
			success: false,
			deposited: 0,
			wallet: acc.wallet,
			bank: acc.bank,
			error: "No funds available to deposit."
		};
		acc.wallet -= toDeposit;
		acc.bank += toDeposit;
		await this.saveAccount(acc);
		return {
			success: true,
			deposited: toDeposit,
			wallet: acc.wallet,
			bank: acc.bank
		};
	}
	/**
	* Withdraws cash from bank to wallet.
	*/
	async withdraw(userId, amount, guildId) {
		const acc = await this.getAccount(userId, guildId);
		const toWithdraw = amount === "all" ? acc.bank : Math.min(amount, acc.bank);
		if (toWithdraw <= 0) return {
			success: false,
			withdrawn: 0,
			wallet: acc.wallet,
			bank: acc.bank,
			error: "Insufficient bank funds."
		};
		acc.bank -= toWithdraw;
		acc.wallet += toWithdraw;
		await this.saveAccount(acc);
		return {
			success: true,
			withdrawn: toWithdraw,
			wallet: acc.wallet,
			bank: acc.bank
		};
	}
	/**
	* Transfers funds from one user's wallet to another.
	*/
	async transfer(fromUserId, toUserId, amount, guildId) {
		if (fromUserId === toUserId) return {
			success: false,
			fromUserId,
			toUserId,
			amount: 0,
			fee: 0,
			fromWallet: 0,
			toWallet: 0,
			error: "Cannot transfer funds to yourself."
		};
		if (amount <= 0) return {
			success: false,
			fromUserId,
			toUserId,
			amount: 0,
			fee: 0,
			fromWallet: 0,
			toWallet: 0,
			error: "Transfer amount must be greater than zero."
		};
		const sender = await this.getAccount(fromUserId, guildId);
		if (sender.wallet < amount) return {
			success: false,
			fromUserId,
			toUserId,
			amount: 0,
			fee: 0,
			fromWallet: sender.wallet,
			toWallet: 0,
			error: "Insufficient wallet funds."
		};
		const fee = Math.floor(amount * this.transactionFee);
		const amountReceived = amount - fee;
		const receiver = await this.getAccount(toUserId, guildId);
		sender.wallet -= amount;
		sender.stats.totalSpent += amount;
		receiver.wallet += amountReceived;
		receiver.stats.totalEarned += amountReceived;
		await this.saveAccount(sender);
		await this.saveAccount(receiver);
		return {
			success: true,
			fromUserId,
			toUserId,
			amount: amountReceived,
			fee,
			fromWallet: sender.wallet,
			toWallet: receiver.wallet
		};
	}
	/**
	* Upgrades bank capacity for a fee.
	*/
	async upgradeCapacity(userId, additionalCapacity, cost, guildId) {
		const acc = await this.getAccount(userId, guildId);
		if (acc.wallet < cost) return {
			success: false,
			newCapacity: acc.bankCapacity,
			wallet: acc.wallet,
			error: `Insufficient funds. Upgrade requires ${cost} coins.`
		};
		acc.wallet -= cost;
		acc.bankCapacity += additionalCapacity;
		acc.stats.totalSpent += cost;
		await this.saveAccount(acc);
		return {
			success: true,
			newCapacity: acc.bankCapacity,
			wallet: acc.wallet
		};
	}
	/**
	* Adds cash to wallet.
	*/
	async addWallet(userId, amount, guildId) {
		const { newBalance } = await this.modifyWallet(userId, Math.max(0, amount), guildId);
		return newBalance;
	}
	/**
	* Removes cash from wallet.
	*/
	async removeWallet(userId, amount, guildId) {
		const { newBalance } = await this.modifyWallet(userId, -Math.abs(amount), guildId);
		return newBalance;
	}
	/**
	* Adds or subtracts wallet balance directly (admin/reward action).
	*/
	async modifyWallet(userId, delta, guildId) {
		const acc = await this.getAccount(userId, guildId);
		acc.wallet = Math.max(0, acc.wallet + delta);
		if (delta > 0) acc.stats.totalEarned += delta;
		if (delta < 0) acc.stats.totalSpent += Math.abs(delta);
		await this.saveAccount(acc);
		return { newBalance: acc.wallet };
	}
};
// src/modules/RewardManager.ts
/**
* @m3rcena/eco
* Earning, Daily Streaks, Work, Crime, and Robbery System.
*
* @copyright 2026 M3rcena Development. All rights reserved.
* @license Apache-2.0
*/
const DEFAULT_COOLDOWNS = {
	daily: 864e5,
	weekly: 6048e5,
	monthly: 2592e6,
	hourly: 36e5,
	work: 18e5,
	beg: 3e5,
	crime: 27e5,
	rob: 72e5
};
const BEG_RESPONSES = [
	{
		npc: "Mr. Beast",
		quote: "I just tipped you a chunk of cash!",
		min: 100,
		max: 400
	},
	{
		npc: "Generous Grandma",
		quote: "Here is some sweet candy money, dear.",
		min: 50,
		max: 200
	},
	{
		npc: "Homeless Veteran",
		quote: "Sharing what little I have left, stay safe.",
		min: 10,
		max: 80
	},
	{
		npc: "Tech Bro",
		quote: "Take some crypto change, to the moon!",
		min: 80,
		max: 350
	},
	{
		npc: "Street Busker",
		quote: "A little coin for appreciating my tunes.",
		min: 40,
		max: 150
	}
];
var RewardManager = class {
	bank;
	cooldowns;
	constructor(bank, customCooldowns = {}) {
		this.bank = bank;
		this.cooldowns = {
			...DEFAULT_COOLDOWNS,
			...customCooldowns
		};
	}
	checkCooldown(lastUsed, cooldownMs) {
		if (!lastUsed) return {
			onCooldown: false,
			remainingMs: 0
		};
		const elapsed = Date.now() - lastUsed;
		if (elapsed < cooldownMs) return {
			onCooldown: true,
			remainingMs: cooldownMs - elapsed
		};
		return {
			onCooldown: false,
			remainingMs: 0
		};
	}
	/**
	* Claims the daily reward with streak multipliers.
	*/
	async claimDaily(userId, guildId) {
		const acc = await this.bank.getAccount(userId, guildId);
		const { onCooldown, remainingMs } = this.checkCooldown(acc.streak.lastDaily, this.cooldowns.daily);
		if (onCooldown) return {
			success: false,
			amount: 0,
			rewardAmount: 0,
			streak: acc.streak.daily,
			isMilestone: false,
			jackpotMilestone: false,
			remainingMs,
			cooldownRemainingMs: remainingMs
		};
		const currentStreak = acc.streak.lastDaily && Date.now() - acc.streak.lastDaily > 1728e5 ? 1 : (acc.streak.daily || 0) + 1;
		acc.streak.daily = currentStreak;
		acc.streak.lastDaily = Date.now();
		const isMilestone = currentStreak % 7 === 0;
		const baseAmount = 1e3 + Math.min(currentStreak, 30) * 100;
		const finalAmount = isMilestone ? baseAmount * 2 : baseAmount;
		acc.wallet += finalAmount;
		acc.stats.totalEarned += finalAmount;
		acc.xp += 100;
		this.checkLevelUp(acc);
		await this.bank.saveAccount(acc);
		return {
			success: true,
			amount: finalAmount,
			rewardAmount: finalAmount,
			streak: currentStreak,
			isMilestone,
			jackpotMilestone: isMilestone
		};
	}
	/**
	* Claims weekly reward bonus.
	*/
	async claimWeekly(userId, guildId) {
		const acc = await this.bank.getAccount(userId, guildId);
		const { onCooldown, remainingMs } = this.checkCooldown(acc.streak.lastWeekly, this.cooldowns.weekly);
		if (onCooldown) return {
			success: false,
			amount: 0,
			rewardAmount: 0,
			remainingMs,
			cooldownRemainingMs: remainingMs
		};
		const reward = 5e3 + acc.level * 500;
		acc.wallet += reward;
		acc.stats.totalEarned += reward;
		acc.xp += 300;
		acc.streak.lastWeekly = Date.now();
		this.checkLevelUp(acc);
		await this.bank.saveAccount(acc);
		return {
			success: true,
			amount: reward,
			rewardAmount: reward
		};
	}
	/**
	* Claims monthly reward bonus.
	*/
	async claimMonthly(userId, guildId) {
		const acc = await this.bank.getAccount(userId, guildId);
		const { onCooldown, remainingMs } = this.checkCooldown(acc.streak.lastMonthly, this.cooldowns.monthly);
		if (onCooldown) return {
			success: false,
			amount: 0,
			rewardAmount: 0,
			remainingMs,
			cooldownRemainingMs: remainingMs
		};
		const reward = 25e3 + acc.level * 2500;
		acc.wallet += reward;
		acc.stats.totalEarned += reward;
		acc.xp += 1500;
		acc.streak.lastMonthly = Date.now();
		this.checkLevelUp(acc);
		await this.bank.saveAccount(acc);
		return {
			success: true,
			amount: reward,
			rewardAmount: reward
		};
	}
	/**
	* Claims hourly allowance.
	*/
	async claimHourly(userId, guildId) {
		const acc = await this.bank.getAccount(userId, guildId);
		const { onCooldown, remainingMs } = this.checkCooldown(acc.streak.lastHourly, this.cooldowns.hourly);
		if (onCooldown) return {
			success: false,
			amount: 0,
			rewardAmount: 0,
			remainingMs,
			cooldownRemainingMs: remainingMs
		};
		const reward = 150 + acc.level * 25;
		acc.wallet += reward;
		acc.stats.totalEarned += reward;
		acc.streak.lastHourly = Date.now();
		await this.bank.saveAccount(acc);
		return {
			success: true,
			amount: reward,
			rewardAmount: reward
		};
	}
	/**
	* Completes a work shift.
	*/
	async work(userId, guildId, bonusSalary = 0) {
		const acc = await this.bank.getAccount(userId, guildId);
		const { onCooldown, remainingMs } = this.checkCooldown(acc.streak.lastWork, this.cooldowns.work);
		if (onCooldown) return {
			success: false,
			earned: 0,
			earnedAmount: 0,
			xp: 0,
			xpEarned: 0,
			jobTitle: acc.career?.jobTitle || "Freelancer",
			remainingMs,
			cooldownRemainingMs: remainingMs
		};
		const jobTitle = acc.career?.jobTitle || "Freelancer";
		const baseSalary = bonusSalary > 0 ? bonusSalary : acc.career ? 300 + acc.career.level * 150 : 200;
		const variance = Math.floor(Math.random() * 100) - 30;
		const earned = Math.max(50, baseSalary + variance);
		const xpEarned = 50 + (acc.career?.level || 1) * 10;
		acc.wallet += earned;
		acc.stats.totalEarned += earned;
		acc.stats.jobsCompleted++;
		acc.xp += xpEarned;
		acc.streak.lastWork = Date.now();
		if (acc.career) acc.career.shiftsCompleted++;
		this.checkLevelUp(acc);
		await this.bank.saveAccount(acc);
		return {
			success: true,
			earned,
			earnedAmount: earned,
			xp: xpEarned,
			xpEarned,
			jobTitle
		};
	}
	/**
	* Begs for coins from random NPCs.
	*/
	async beg(userId, guildId) {
		const acc = await this.bank.getAccount(userId, guildId);
		const { onCooldown, remainingMs } = this.checkCooldown(acc.streak.lastBeg, this.cooldowns.beg);
		if (onCooldown) return {
			success: false,
			earned: 0,
			npc: "",
			donor: "",
			quote: "",
			remainingMs,
			cooldownRemainingMs: remainingMs
		};
		const isSuccess = Math.random() > .2;
		acc.streak.lastBeg = Date.now();
		if (!isSuccess) {
			await this.bank.saveAccount(acc);
			return {
				success: false,
				earned: 0,
				npc: "Grumpy Stranger",
				donor: "Grumpy Stranger",
				quote: "Get a job, kid! Nothing for you."
			};
		}
		const pick = BEG_RESPONSES[Math.floor(Math.random() * BEG_RESPONSES.length)];
		const earned = Math.floor(Math.random() * (pick.max - pick.min + 1)) + pick.min;
		acc.wallet += earned;
		acc.stats.totalEarned += earned;
		await this.bank.saveAccount(acc);
		return {
			success: true,
			earned,
			npc: pick.npc,
			donor: pick.npc,
			quote: pick.quote
		};
	}
	/**
	* Attempts an illicit crime for high stakes.
	*/
	async commitCrime(userId, guildId) {
		const acc = await this.bank.getAccount(userId, guildId);
		const { onCooldown, remainingMs } = this.checkCooldown(acc.streak.lastCrime, this.cooldowns.crime);
		if (onCooldown) return {
			success: false,
			payout: 0,
			earned: 0,
			fine: 0,
			message: "Police heat is too high!",
			remainingMs,
			cooldownRemainingMs: remainingMs
		};
		acc.streak.lastCrime = Date.now();
		if (Math.random() < .55) {
			const payout = Math.floor(Math.random() * 800) + 400;
			acc.wallet += payout;
			acc.stats.totalEarned += payout;
			acc.xp += 120;
			this.checkLevelUp(acc);
			await this.bank.saveAccount(acc);
			return {
				success: true,
				payout,
				earned: payout,
				fine: 0,
				message: `You successfully hacked a high-frequency trading server and laundered ${payout} coins!`
			};
		} else {
			const fine = Math.min(acc.wallet, Math.floor(Math.random() * 400) + 200);
			acc.wallet -= fine;
			acc.stats.totalSpent += fine;
			await this.bank.saveAccount(acc);
			return {
				success: false,
				payout: 0,
				earned: 0,
				fine,
				message: `The police caught you red-handed! You paid a bail fine of ${fine} coins.`
			};
		}
	}
	/**
	* Alias for commitCrime.
	*/
	async crime(userId, guildId) {
		return this.commitCrime(userId, guildId);
	}
	/**
	* Attempts to rob another player's wallet.
	*/
	async rob(robberId, victimId, guildId) {
		if (robberId === victimId) return {
			success: false,
			robberId,
			victimId,
			amountStolen: 0,
			robberWallet: 0,
			victimWallet: 0,
			message: "You cannot rob yourself!"
		};
		const robber = await this.bank.getAccount(robberId, guildId);
		const { onCooldown } = this.checkCooldown(robber.streak.lastRob, this.cooldowns.rob);
		if (onCooldown) return {
			success: false,
			robberId,
			victimId,
			amountStolen: 0,
			robberWallet: robber.wallet,
			victimWallet: 0,
			message: "You are currently laying low. Wait before planning another robbery!"
		};
		if (robber.wallet < 200) return {
			success: false,
			robberId,
			victimId,
			amountStolen: 0,
			robberWallet: robber.wallet,
			victimWallet: 0,
			message: "You need at least 200 coins in your wallet to cover police fines if you fail!"
		};
		const victim = await this.bank.getAccount(victimId, guildId);
		if (victim.wallet < 100) return {
			success: false,
			robberId,
			victimId,
			amountStolen: 0,
			robberWallet: robber.wallet,
			victimWallet: victim.wallet,
			message: "Your target is broke! They have less than 100 coins in their wallet."
		};
		robber.streak.lastRob = Date.now();
		const shieldIdx = victim.activeEffects.findIndex((e) => e.type === "shield" && e.expiresAt > Date.now());
		if (shieldIdx !== -1) {
			victim.activeEffects.splice(shieldIdx, 1);
			const fine = Math.min(robber.wallet, 250);
			robber.wallet -= fine;
			robber.stats.totalSpent += fine;
			victim.stats.timesRobbed++;
			await this.bank.saveAccount(robber);
			await this.bank.saveAccount(victim);
			return {
				success: false,
				robberId,
				victimId,
				amountStolen: 0,
				finePaid: fine,
				blockedByShield: true,
				robberWallet: robber.wallet,
				victimWallet: victim.wallet,
				message: `Robbery failed! Target was protected by a high-security padlock shield. You paid ${fine} coins in fines!`
			};
		}
		if (Math.random() < .5) {
			const percent = Math.random() * .4 + .2;
			const stolen = Math.floor(victim.wallet * percent);
			victim.wallet -= stolen;
			victim.stats.timesRobbed++;
			robber.wallet += stolen;
			robber.stats.totalRobbed += stolen;
			robber.stats.totalEarned += stolen;
			await this.bank.saveAccount(robber);
			await this.bank.saveAccount(victim);
			return {
				success: true,
				robberId,
				victimId,
				amountStolen: stolen,
				blockedByShield: false,
				robberWallet: robber.wallet,
				victimWallet: victim.wallet,
				message: `Heist successful! You stealthily stole ${stolen} coins from their wallet!`
			};
		} else {
			const fine = Math.min(robber.wallet, Math.floor(victim.wallet * .2) + 150);
			robber.wallet -= fine;
			robber.stats.totalSpent += fine;
			const comp = Math.floor(fine * .5);
			victim.wallet += comp;
			await this.bank.saveAccount(robber);
			await this.bank.saveAccount(victim);
			return {
				success: false,
				robberId,
				victimId,
				amountStolen: 0,
				finePaid: fine,
				blockedByShield: false,
				robberWallet: robber.wallet,
				victimWallet: victim.wallet,
				message: `You tripped the silent alarm and got tackled! You were fined ${fine} coins (half given to victim as compensation).`
			};
		}
	}
	checkLevelUp(acc) {
		const requiredXp = acc.level * 500;
		if (acc.xp >= requiredXp) {
			acc.level++;
			acc.bankCapacity += 2500;
			return true;
		}
		return false;
	}
};
// src/modules/CareerManager.ts
/**
* @m3rcena/eco
* Career & Job Progression System.
*
* @copyright 2026 M3rcena Development. All rights reserved.
* @license Apache-2.0
*/
const DEFAULT_JOBS = [
	{
		id: "intern",
		title: "Junior Intern",
		category: "Corporate",
		baseSalary: 250,
		minLevel: 1,
		requiredShiftsForPromotion: 3,
		description: "Get coffee and organize files. A humble start.",
		perk: "+5% Work XP bonus"
	},
	{
		id: "barista",
		title: "Artisan Barista",
		category: "Hospitality",
		baseSalary: 500,
		minLevel: 2,
		requiredShiftsForPromotion: 5,
		description: "Brew espresso and master latte art for demanding customers.",
		perk: "Free daily energy boost"
	},
	{
		id: "software_engineer",
		title: "Full-Stack Developer",
		category: "Technology",
		baseSalary: 1400,
		minLevel: 5,
		requiredShiftsForPromotion: 8,
		description: "Write robust code, debug edge cases, and push releases.",
		perk: "+15% Salary bonus on promotions"
	},
	{
		id: "data_scientist",
		title: "AI & Data Scientist",
		category: "Technology",
		baseSalary: 3e3,
		minLevel: 10,
		requiredShiftsForPromotion: 12,
		description: "Train neural networks and unlock algorithmic profits.",
		perk: "Increased Lucky Streak chance"
	},
	{
		id: "investment_banker",
		title: "Wall Street Banker",
		category: "Finance",
		baseSalary: 6500,
		minLevel: 15,
		requiredShiftsForPromotion: 15,
		description: "Leverage derivatives and manage multi-million dollar portfolios.",
		perk: "+20% Bank deposit capacity bonus"
	},
	{
		id: "cyber_syndicate_lead",
		title: "Syndicate Boss",
		category: "Underground",
		baseSalary: 12500,
		minLevel: 20,
		requiredShiftsForPromotion: 20,
		description: "Command underground operations from the shadows.",
		perk: "+25% Crime payout bonus"
	}
];
var CareerManager = class {
	bank;
	jobs = /* @__PURE__ */ new Map();
	constructor(bank, initialJobs = DEFAULT_JOBS) {
		this.bank = bank;
		for (const job of initialJobs) this.jobs.set(job.id, job);
	}
	/**
	* Returns all available jobs.
	*/
	getJobs() {
		return Array.from(this.jobs.values());
	}
	/**
	* Retrieves a job by ID.
	*/
	getJob(jobId) {
		return this.jobs.get(jobId);
	}
	/**
	* Registers a new custom job.
	*/
	registerJob(job) {
		this.jobs.set(job.id, job);
	}
	/**
	* Returns a user's current career.
	*/
	async getCareer(userId, guildId) {
		return (await this.bank.getAccount(userId, guildId)).career ?? null;
	}
	/**
	* Applies for a job. User must meet the minimum level requirement.
	*/
	async apply(userId, jobId, guildId) {
		const job = this.jobs.get(jobId);
		if (!job) return {
			success: false,
			error: `Job with ID "${jobId}" does not exist.`
		};
		const acc = await this.bank.getAccount(userId, guildId);
		if (acc.level < job.minLevel) return {
			success: false,
			error: `You need to be at least Level ${job.minLevel} to apply for ${job.title}. (Your level: ${acc.level})`
		};
		if (acc.career?.jobId === jobId) return {
			success: false,
			error: `You are already employed as a ${job.title}!`
		};
		acc.career = {
			jobId: job.id,
			jobTitle: job.title,
			level: 1,
			shiftsCompleted: 0,
			lastPromoted: Date.now()
		};
		await this.bank.saveAccount(acc);
		return {
			success: true,
			job
		};
	}
	/**
	* Resigns from the current career.
	*/
	async resign(userId, guildId) {
		const acc = await this.bank.getAccount(userId, guildId);
		if (!acc.career) return {
			success: false,
			error: "You are not currently employed in any career."
		};
		const prev = acc.career.jobTitle;
		acc.career = void 0;
		await this.bank.saveAccount(acc);
		return {
			success: true,
			previousJob: prev
		};
	}
	/**
	* Records a shift worked and checks for a promotion.
	*/
	async recordShift(userId, guildId) {
		const acc = await this.bank.getAccount(userId, guildId);
		if (!acc.career) return {
			hasCareer: false,
			promoted: false
		};
		const job = this.jobs.get(acc.career.jobId);
		if (!job) return {
			hasCareer: true,
			promoted: false
		};
		acc.career.shiftsCompleted += 1;
		let promoted = false;
		let bonus = 0;
		const requiredShifts = job.requiredShiftsForPromotion * acc.career.level;
		if (acc.career.shiftsCompleted >= requiredShifts) {
			acc.career.level += 1;
			acc.career.shiftsCompleted = 0;
			acc.career.lastPromoted = Date.now();
			promoted = true;
			bonus = job.baseSalary * 2 * acc.career.level;
			acc.wallet += bonus;
			acc.stats.totalEarned += bonus;
		}
		await this.bank.saveAccount(acc);
		return {
			hasCareer: true,
			promoted,
			newCareerLevel: acc.career.level,
			promotionBonus: bonus,
			shiftsCompleted: acc.career.shiftsCompleted,
			job
		};
	}
	/**
	* Computes salary for a user based on their career and career level.
	*/
	calculateSalary(career) {
		if (!career) return 0;
		const job = this.jobs.get(career.jobId);
		if (!job) return 0;
		const multiplier = 1 + (career.level - 1) * .25;
		return Math.floor(job.baseSalary * multiplier);
	}
};
// src/modules/ShopManager.ts
/**
* @m3rcena/eco
* Shop, Inventory & Consumable Buff Items System.
*
* @copyright 2026 M3rcena Development. All rights reserved.
* @license Apache-2.0
*/
const DEFAULT_SHOP_ITEMS = [
	{
		id: "padlock",
		name: "Titanium Padlock",
		description: "Equips a high-security lock to your wallet. Automatically blocks the next robbery attempt!",
		price: 1500,
		category: "tool",
		consumable: true,
		usableEffect: "shield",
		effectDurationMs: 864e5,
		resaleValue: 750
	},
	{
		id: "energy_drink",
		name: "Cyber Caffeine Overdrive",
		description: "Instant caffeine rush! Immediately resets your work shift cooldown.",
		price: 800,
		category: "consumable",
		consumable: true,
		usableEffect: "cooldown_reset",
		resaleValue: 400
	},
	{
		id: "lucky_coin",
		name: "Enchanted Gold Coin",
		description: "A mystical coin favored by fortune. Grants +15% casino winning probability for 1 hour.",
		price: 2500,
		category: "consumable",
		consumable: true,
		usableEffect: "gamble_luck",
		effectDurationMs: 36e5,
		resaleValue: 1200
	},
	{
		id: "xp_potion",
		name: "Elixir of Knowledge",
		description: "Ancient brew that accelerates learning. Doubles all XP gains for 2 hours.",
		price: 2e3,
		category: "consumable",
		consumable: true,
		usableEffect: "xp_boost",
		effectDurationMs: 72e5,
		resaleValue: 1e3
	},
	{
		id: "bank_vault_key",
		name: "Swiss Vault Key",
		description: "Upgrades your safe deposit box, permanently expanding your bank capacity by +25,000.",
		price: 15e3,
		category: "upgrade",
		consumable: true,
		usableEffect: "bank_capacity",
		effectMagnitude: 25e3,
		resaleValue: 8e3
	},
	{
		id: "lottery_ticket",
		name: "Mega Millions Scratch Ticket",
		description: "Scratch to win! Offers a chance to win up to 50,000 cash.",
		price: 500,
		category: "consumable",
		consumable: true,
		usableEffect: "lottery",
		resaleValue: 100
	},
	{
		id: "gold_watch",
		name: "Rolex Submariner Gold",
		description: "A luxury timepiece that exudes status and class.",
		price: 12e3,
		category: "collectible",
		consumable: false,
		resaleValue: 9500
	},
	{
		id: "diamond_trophy",
		name: "Championship Diamond Trophy",
		description: "A solid diamond trophy celebrating legendary wealth.",
		price: 5e4,
		category: "collectible",
		consumable: false,
		resaleValue: 42e3
	}
];
var ShopManager = class {
	bank;
	items = /* @__PURE__ */ new Map();
	constructor(bank, initialItems = DEFAULT_SHOP_ITEMS) {
		this.bank = bank;
		for (const item of initialItems) this.items.set(item.id, item);
	}
	/**
	* Returns all items currently in the shop.
	*/
	getItems() {
		return Array.from(this.items.values());
	}
	/**
	* Retrieves an item by ID.
	*/
	getItem(itemId) {
		return this.items.get(itemId);
	}
	/**
	* Registers a new item or updates an existing one in the shop catalog.
	*/
	registerItem(item) {
		this.items.set(item.id, item);
	}
	/**
	* Cleans expired effects from an account.
	*/
	cleanExpiredEffects(effects) {
		const now = Date.now();
		return effects.filter((e) => e.expiresAt > now);
	}
	/**
	* Purchases one or more units of an item.
	*/
	async buy(userId, itemId, quantity = 1, guildId) {
		if (quantity <= 0) return {
			success: false,
			quantity,
			totalCost: 0,
			newWallet: 0,
			error: "Quantity must be greater than zero."
		};
		const item = this.items.get(itemId);
		if (!item) return {
			success: false,
			quantity,
			totalCost: 0,
			newWallet: 0,
			error: `Item "${itemId}" not found in the shop.`
		};
		const acc = await this.bank.getAccount(userId, guildId);
		const totalCost = item.price * quantity;
		if (acc.wallet < totalCost) return {
			success: false,
			item,
			quantity,
			totalCost,
			newWallet: acc.wallet,
			error: `Insufficient funds in your wallet! Needed: ${totalCost}, Available: ${acc.wallet}.`
		};
		acc.wallet -= totalCost;
		acc.stats.totalSpent += totalCost;
		acc.stats.itemsBought += quantity;
		const existing = acc.inventory.find((i) => i.itemId === item.id);
		if (existing) existing.quantity += quantity;
		else acc.inventory.push({
			id: `${item.id}_${Date.now()}`,
			itemId: item.id,
			name: item.name,
			description: item.description,
			quantity,
			category: item.category,
			acquiredAt: Date.now()
		});
		await this.bank.saveAccount(acc);
		return {
			success: true,
			item,
			quantity,
			totalCost,
			newWallet: acc.wallet
		};
	}
	/**
	* Sells an item from inventory back to the store.
	*/
	async sell(userId, itemId, quantity = 1, guildId) {
		if (quantity <= 0) return {
			success: false,
			quantity,
			earned: 0,
			newWallet: 0,
			error: "Quantity must be greater than zero."
		};
		const acc = await this.bank.getAccount(userId, guildId);
		const invIndex = acc.inventory.findIndex((i) => i.itemId === itemId);
		if (invIndex === -1 || acc.inventory[invIndex].quantity < quantity) {
			const owned = invIndex !== -1 ? acc.inventory[invIndex].quantity : 0;
			return {
				success: false,
				quantity,
				earned: 0,
				newWallet: acc.wallet,
				error: `You do not own ${quantity}x of this item (owned: ${owned}).`
			};
		}
		const shopItem = this.items.get(itemId);
		const totalEarned = (shopItem?.resaleValue ?? (shopItem ? Math.floor(shopItem.price * .6) : 100)) * quantity;
		acc.inventory[invIndex].quantity -= quantity;
		if (acc.inventory[invIndex].quantity <= 0) acc.inventory.splice(invIndex, 1);
		acc.wallet += totalEarned;
		acc.stats.totalEarned += totalEarned;
		await this.bank.saveAccount(acc);
		return {
			success: true,
			item: shopItem,
			quantity,
			earned: totalEarned,
			newWallet: acc.wallet
		};
	}
	/**
	* Uses/consumes an item from the user's inventory.
	*/
	async use(userId, itemId, guildId) {
		const acc = await this.bank.getAccount(userId, guildId);
		const invIndex = acc.inventory.findIndex((i) => i.itemId === itemId);
		if (invIndex === -1 || acc.inventory[invIndex].quantity <= 0) return {
			success: false,
			message: "",
			error: "You do not have this item in your inventory."
		};
		const shopItem = this.items.get(itemId);
		if (!shopItem || !shopItem.consumable) return {
			success: false,
			message: "",
			error: "This item cannot be consumed or used directly."
		};
		acc.inventory[invIndex].quantity -= 1;
		if (acc.inventory[invIndex].quantity <= 0) acc.inventory.splice(invIndex, 1);
		acc.activeEffects = this.cleanExpiredEffects(acc.activeEffects);
		let message = `You used ${shopItem.name}.`;
		let activeEffect;
		let lotteryWon;
		switch (shopItem.usableEffect) {
			case "shield": {
				const duration = shopItem.effectDurationMs ?? 864e5;
				activeEffect = {
					id: `shield_${Date.now()}`,
					name: "Titanium Shield",
					type: "shield",
					magnitude: 1,
					expiresAt: Date.now() + duration
				};
				acc.activeEffects = acc.activeEffects.filter((e) => e.type !== "shield");
				acc.activeEffects.push(activeEffect);
				message = `🛡️ ${shopItem.name} activated! Your wallet is protected from the next robbery attempt for 24 hours.`;
				break;
			}
			case "cooldown_reset":
				acc.streak.lastWork = void 0;
				message = `⚡ ${shopItem.name} consumed! Your work shift cooldown has been completely reset. You can work now!`;
				break;
			case "gamble_luck": {
				const duration = shopItem.effectDurationMs ?? 36e5;
				activeEffect = {
					id: `luck_${Date.now()}`,
					name: "Lady Luck's Favor",
					type: "gamble_luck",
					magnitude: 15,
					expiresAt: Date.now() + duration
				};
				acc.activeEffects = acc.activeEffects.filter((e) => e.type !== "gamble_luck");
				acc.activeEffects.push(activeEffect);
				message = `🍀 ${shopItem.name} activated! You have +15% enhanced luck at the casino for the next hour!`;
				break;
			}
			case "xp_boost": {
				const duration = shopItem.effectDurationMs ?? 72e5;
				activeEffect = {
					id: `xp_${Date.now()}`,
					name: "Double XP Elixir",
					type: "xp_boost",
					magnitude: 2,
					expiresAt: Date.now() + duration
				};
				acc.activeEffects = acc.activeEffects.filter((e) => e.type !== "xp_boost");
				acc.activeEffects.push(activeEffect);
				message = `✨ ${shopItem.name} activated! You will receive 2x XP from all jobs and activities for 2 hours!`;
				break;
			}
			case "bank_capacity": {
				const increase = shopItem.effectMagnitude ?? 25e3;
				acc.bankCapacity += increase;
				message = `🔑 ${shopItem.name} used! Your bank capacity has been permanently increased by +${increase.toLocaleString()}! New Capacity: ${acc.bankCapacity.toLocaleString()}.`;
				break;
			}
			case "lottery": {
				const roll = Math.random() * 100;
				if (roll < 40) {
					lotteryWon = 0;
					message = `🎫 You scratched the ticket... Unfortunately, it was a blank! Better luck next time!`;
				} else if (roll < 75) {
					lotteryWon = Math.floor(Math.random() * 800) + 200;
					acc.wallet += lotteryWon;
					acc.stats.totalEarned += lotteryWon;
					message = `🎫 Winning ticket! You won ${lotteryWon.toLocaleString()} in cash!`;
				} else if (roll < 95) {
					lotteryWon = Math.floor(Math.random() * 7500) + 2500;
					acc.wallet += lotteryWon;
					acc.stats.totalEarned += lotteryWon;
					message = `🎉 Big Win! You matched 3 lucky stars and won ${lotteryWon.toLocaleString()}!`;
				} else {
					lotteryWon = Math.floor(Math.random() * 25e3) + 25e3;
					acc.wallet += lotteryWon;
					acc.stats.totalEarned += lotteryWon;
					message = `💎 💥 JACKPOT! You scratched off the GRAND PRIZE of ${lotteryWon.toLocaleString()}!`;
				}
				break;
			}
			default: message = `You used ${shopItem.name}.`;
		}
		await this.bank.saveAccount(acc);
		return {
			success: true,
			message,
			item: shopItem,
			effect: activeEffect,
			lotteryWon
		};
	}
	/**
	* Retrieves active, unexpired effects for a user.
	*/
	async getActiveEffects(userId, guildId) {
		const acc = await this.bank.getAccount(userId, guildId);
		acc.activeEffects = this.cleanExpiredEffects(acc.activeEffects);
		return acc.activeEffects;
	}
	/**
	* Checks if a user has a specific effect active.
	*/
	async hasActiveEffect(userId, effectType, guildId) {
		return (await this.getActiveEffects(userId, guildId)).some((e) => e.type === effectType);
	}
	/**
	* Consumes an active effect (e.g. shield is spent when blocking robbery).
	*/
	async consumeActiveEffect(userId, effectType, guildId) {
		const acc = await this.bank.getAccount(userId, guildId);
		acc.activeEffects = this.cleanExpiredEffects(acc.activeEffects);
		const idx = acc.activeEffects.findIndex((e) => e.type === effectType);
		if (idx !== -1) {
			acc.activeEffects.splice(idx, 1);
			await this.bank.saveAccount(acc);
			return true;
		}
		return false;
	}
	/**
	* Returns a user's inventory.
	*/
	async getInventory(userId, guildId) {
		return (await this.bank.getAccount(userId, guildId)).inventory;
	}
};
// src/modules/BusinessManager.ts
/**
* @m3rcena/eco
* Passive Business Investment & Automation System.
*
* @copyright 2026 M3rcena Development. All rights reserved.
* @license Apache-2.0
*/
const DEFAULT_BUSINESS_CATALOG = [
	{
		id: "lemonade_stand",
		name: "Artisanal Lemonade Stand",
		category: "Small Business",
		baseCost: 3e3,
		baseHourlyRevenue: 200,
		upgradeCostMultiplier: 1.45,
		revenueMultiplier: 1.35,
		maxLevel: 10,
		description: "A friendly neighborhood refreshment stand. Low investment, steady starter income."
	},
	{
		id: "coffee_shop",
		name: "Urban Espresso Lounge",
		category: "Hospitality",
		baseCost: 12500,
		baseHourlyRevenue: 950,
		upgradeCostMultiplier: 1.5,
		revenueMultiplier: 1.4,
		maxLevel: 10,
		description: "Hip cafe serving pour-overs and pastries to bustling city commuters."
	},
	{
		id: "tech_startup",
		name: "AI SaaS Enterprise",
		category: "Technology",
		baseCost: 65e3,
		baseHourlyRevenue: 5200,
		upgradeCostMultiplier: 1.6,
		revenueMultiplier: 1.45,
		maxLevel: 15,
		description: "High-growth tech company delivering subscription AI services globally."
	},
	{
		id: "crypto_mine",
		name: "Geothermal Crypto Mine",
		category: "Finance & Web3",
		baseCost: 28e4,
		baseHourlyRevenue: 24e3,
		upgradeCostMultiplier: 1.7,
		revenueMultiplier: 1.5,
		maxLevel: 20,
		description: "Mega-scale ASIC mining facility powered by green renewable energy."
	},
	{
		id: "space_corp",
		name: "Orbital Cargo Logistics",
		category: "Aerospace",
		baseCost: 15e5,
		baseHourlyRevenue: 15e4,
		upgradeCostMultiplier: 1.85,
		revenueMultiplier: 1.6,
		maxLevel: 25,
		description: "Interplanetary transport fleet delivering helium-3 and rare space minerals."
	}
];
var BusinessManager = class {
	bank;
	catalog = /* @__PURE__ */ new Map();
	maxAccumulationHours;
	constructor(bank, initialCatalog = DEFAULT_BUSINESS_CATALOG, maxAccumulationHours = 24) {
		this.bank = bank;
		this.maxAccumulationHours = maxAccumulationHours;
		for (const b of initialCatalog) this.catalog.set(b.id, b);
	}
	/**
	* Returns all available businesses in the catalog.
	*/
	getCatalog() {
		return Array.from(this.catalog.values());
	}
	/**
	* Retrieves business configuration by ID.
	*/
	getBusinessConfig(id) {
		return this.catalog.get(id);
	}
	/**
	* Registers a new custom business.
	*/
	registerBusiness(config) {
		this.catalog.set(config.id, config);
	}
	/**
	* Calculates the upgrade cost for a business from its current level.
	*/
	calculateUpgradeCost(business) {
		const config = this.catalog.get(business.businessId);
		if (!config) return 0;
		return Math.floor(config.baseCost * Math.pow(config.upgradeCostMultiplier, business.level));
	}
	/**
	* Calculates employee hiring cost for a business.
	*/
	calculateEmployeeHiringCost(business, count) {
		const config = this.catalog.get(business.businessId);
		if (!config) return 0;
		return Math.floor(config.baseCost * .15) * count;
	}
	/**
	* Calculates the hourly revenue generated by a business.
	*/
	calculateHourlyRevenue(business) {
		const config = this.catalog.get(business.businessId);
		if (!config) return 0;
		const levelMultiplier = Math.pow(config.revenueMultiplier, business.level - 1);
		const employeeBonus = 1 + business.employees * .1;
		return Math.floor(config.baseHourlyRevenue * levelMultiplier * employeeBonus);
	}
	/**
	* Computes pending unclaimed revenue for a business based on time elapsed.
	*/
	calculatePendingRevenue(business) {
		const elapsedMs = Math.max(0, Date.now() - business.lastCollected);
		const maxMs = this.maxAccumulationHours * 60 * 60 * 1e3;
		const effectiveElapsedMs = Math.min(elapsedMs, maxMs);
		const hourly = this.calculateHourlyRevenue(business);
		const hours = effectiveElapsedMs / 36e5;
		return Math.floor(hourly * hours);
	}
	/**
	* Retrieves all businesses owned by a user, enriched with pending revenue and stats.
	*/
	async getUserBusinesses(userId, guildId) {
		return (await this.bank.getAccount(userId, guildId)).businesses.map((b) => {
			const config = this.catalog.get(b.businessId);
			if (!config) return null;
			return {
				business: b,
				config,
				pendingRevenue: this.calculatePendingRevenue(b),
				hourlyRevenue: this.calculateHourlyRevenue(b),
				upgradeCost: this.calculateUpgradeCost(b)
			};
		}).filter((b) => b !== null);
	}
	/**
	* Purchases a new business enterprise.
	*/
	async buyBusiness(userId, businessId, guildId) {
		const config = this.catalog.get(businessId);
		if (!config) return {
			success: false,
			cost: 0,
			newWallet: 0,
			error: `Business "${businessId}" does not exist in the catalog.`
		};
		const acc = await this.bank.getAccount(userId, guildId);
		if (acc.businesses.some((b) => b.businessId === businessId)) return {
			success: false,
			cost: 0,
			newWallet: acc.wallet,
			error: `You already own ${config.name}! Upgrade your existing facility instead.`
		};
		if (acc.wallet < config.baseCost) return {
			success: false,
			cost: config.baseCost,
			newWallet: acc.wallet,
			error: `Insufficient funds! ${config.name} costs ${config.baseCost.toLocaleString()}, but you have ${acc.wallet.toLocaleString()}.`
		};
		acc.wallet -= config.baseCost;
		acc.stats.totalSpent += config.baseCost;
		const newBusiness = {
			id: `${businessId}_${Date.now()}`,
			businessId: config.id,
			name: config.name,
			level: 1,
			employees: 0,
			lastCollected: Date.now(),
			totalCollected: 0
		};
		acc.businesses.push(newBusiness);
		await this.bank.saveAccount(acc);
		return {
			success: true,
			business: newBusiness,
			cost: config.baseCost,
			newWallet: acc.wallet
		};
	}
	/**
	* Upgrades an existing business level.
	*/
	async upgradeBusiness(userId, businessId, guildId) {
		const acc = await this.bank.getAccount(userId, guildId);
		const bIndex = acc.businesses.findIndex((b) => b.businessId === businessId);
		if (bIndex === -1) return {
			success: false,
			newLevel: 0,
			upgradeCost: 0,
			newWallet: acc.wallet,
			error: "You do not own this business."
		};
		const business = acc.businesses[bIndex];
		const config = this.catalog.get(business.businessId);
		if (!config) return {
			success: false,
			newLevel: 0,
			upgradeCost: 0,
			newWallet: acc.wallet,
			error: "Business config not found."
		};
		if (business.level >= config.maxLevel) return {
			success: false,
			newLevel: business.level,
			upgradeCost: 0,
			newWallet: acc.wallet,
			error: `${business.name} is already at maximum level (${config.maxLevel})!`
		};
		const cost = this.calculateUpgradeCost(business);
		if (acc.wallet < cost) return {
			success: false,
			newLevel: business.level,
			upgradeCost: cost,
			newWallet: acc.wallet,
			error: `Insufficient funds to upgrade! Cost: ${cost.toLocaleString()}, Wallet: ${acc.wallet.toLocaleString()}.`
		};
		acc.wallet -= cost;
		acc.stats.totalSpent += cost;
		business.level += 1;
		await this.bank.saveAccount(acc);
		return {
			success: true,
			business,
			newLevel: business.level,
			upgradeCost: cost,
			newWallet: acc.wallet
		};
	}
	/**
	* Hires additional staff members to boost output.
	*/
	async hireEmployees(userId, businessId, count = 1, guildId) {
		if (count <= 0) return {
			success: false,
			totalEmployees: 0,
			cost: 0,
			newWallet: 0,
			error: "Count must be greater than zero."
		};
		const acc = await this.bank.getAccount(userId, guildId);
		const bIndex = acc.businesses.findIndex((b) => b.businessId === businessId);
		if (bIndex === -1) return {
			success: false,
			totalEmployees: 0,
			cost: 0,
			newWallet: acc.wallet,
			error: "You do not own this business."
		};
		const business = acc.businesses[bIndex];
		const maxEmployees = business.level * 5;
		if (business.employees + count > maxEmployees) return {
			success: false,
			totalEmployees: business.employees,
			cost: 0,
			newWallet: acc.wallet,
			error: `At Level ${business.level}, this business can only support up to ${maxEmployees} employees (current: ${business.employees}). Upgrade first!`
		};
		const cost = this.calculateEmployeeHiringCost(business, count);
		if (acc.wallet < cost) return {
			success: false,
			totalEmployees: business.employees,
			cost,
			newWallet: acc.wallet,
			error: `Insufficient funds! Hiring ${count} employee(s) costs ${cost.toLocaleString()}, Wallet: ${acc.wallet.toLocaleString()}.`
		};
		acc.wallet -= cost;
		acc.stats.totalSpent += cost;
		business.employees += count;
		await this.bank.saveAccount(acc);
		return {
			success: true,
			business,
			totalEmployees: business.employees,
			cost,
			newWallet: acc.wallet
		};
	}
	/**
	* Collects accumulated passive profits from all owned businesses or a specific business.
	*/
	async collectRevenue(userId, businessId, guildId) {
		const acc = await this.bank.getAccount(userId, guildId);
		if (acc.businesses.length === 0) return {
			success: false,
			collected: 0,
			newWallet: acc.wallet,
			summary: [],
			error: "You do not own any businesses yet."
		};
		const targets = businessId ? acc.businesses.filter((b) => b.businessId === businessId) : acc.businesses;
		if (targets.length === 0) return {
			success: false,
			collected: 0,
			newWallet: acc.wallet,
			summary: [],
			error: "Selected business not found."
		};
		let totalCollected = 0;
		const summary = [];
		for (const b of targets) {
			const revenue = this.calculatePendingRevenue(b);
			if (revenue > 0) {
				totalCollected += revenue;
				b.lastCollected = Date.now();
				b.totalCollected += revenue;
				summary.push({
					businessId: b.businessId,
					name: b.name,
					amount: revenue
				});
			}
		}
		if (totalCollected <= 0) return {
			success: false,
			collected: 0,
			newWallet: acc.wallet,
			summary: [],
			error: "No profits have accumulated yet! Check back in a little while."
		};
		acc.wallet += totalCollected;
		acc.stats.totalEarned += totalCollected;
		await this.bank.saveAccount(acc);
		return {
			success: true,
			collected: totalCollected,
			newWallet: acc.wallet,
			summary
		};
	}
};
// src/modules/CasinoManager.ts
/**
* @m3rcena/eco
* Casino & High-Stakes Gambling Engine.
*
* @copyright 2026 M3rcena Development. All rights reserved.
* @license Apache-2.0
*/
var CasinoManager = class {
	bank;
	shop;
	activeBlackjackGames = /* @__PURE__ */ new Map();
	constructor(bank, shop) {
		this.bank = bank;
		this.shop = shop;
	}
	setShopManager(shop) {
		this.shop = shop;
	}
	/**
	* Helper to check for active luck boost effect.
	*/
	async getLuckBoost(userId, guildId) {
		if (!this.shop) return 0;
		return await this.shop.hasActiveEffect(userId, "gamble_luck", guildId) ? .12 : 0;
	}
	/**
	* Pre-bet validation & deduction.
	*/
	async prepareBet(userId, betAmount, guildId) {
		if (betAmount <= 0) return {
			valid: false,
			error: "Bet amount must be greater than zero."
		};
		const acc = await this.bank.getAccount(userId, guildId);
		if (acc.wallet < betAmount) return {
			valid: false,
			error: `Insufficient wallet funds! Your bet: ${betAmount.toLocaleString()}, Wallet: ${acc.wallet.toLocaleString()}.`
		};
		acc.wallet -= betAmount;
		acc.stats.totalGambled += betAmount;
		await this.bank.saveAccount(acc);
		return { valid: true };
	}
	/**
	* Post-bet payout & stats recording.
	*/
	async finishBet(userId, payout, guildId) {
		const acc = await this.bank.getAccount(userId, guildId);
		if (payout > 0) {
			acc.wallet += payout;
			acc.stats.totalGambleWon += payout;
		}
		await this.bank.saveAccount(acc);
		return acc.wallet;
	}
	async coinflip(userId, betAmount, choice, guildId) {
		const prep = await this.prepareBet(userId, betAmount, guildId);
		if (!prep.valid) {
			const acc = await this.bank.getAccount(userId, guildId);
			return {
				game: "coinflip",
				betAmount,
				outcome: "lose",
				payout: 0,
				profit: -betAmount,
				multiplier: 0,
				details: prep.error ?? "Invalid bet",
				finalWallet: acc.wallet
			};
		}
		const winProbability = .5 + await this.getLuckBoost(userId, guildId);
		const isWin = Math.random() < winProbability;
		const landed = isWin ? choice : choice === "heads" ? "tails" : "heads";
		const payout = isWin ? betAmount * 2 : 0;
		const finalWallet = await this.finishBet(userId, payout, guildId);
		return {
			game: "coinflip",
			betAmount,
			outcome: isWin ? "win" : "lose",
			payout,
			profit: payout - betAmount,
			multiplier: isWin ? 2 : 0,
			details: isWin ? `🪙 Coin landed on **${landed.toUpperCase()}**! You called it correctly and doubled your bet!` : `🪙 Coin landed on **${landed.toUpperCase()}**. You called ${choice.toUpperCase()} and lost your bet.`,
			finalWallet
		};
	}
	async dice(userId, betAmount, prediction, guildId) {
		const prep = await this.prepareBet(userId, betAmount, guildId);
		if (!prep.valid) {
			const acc = await this.bank.getAccount(userId, guildId);
			return {
				game: "dice",
				betAmount,
				outcome: "lose",
				payout: 0,
				profit: -betAmount,
				multiplier: 0,
				details: prep.error ?? "Invalid bet",
				finalWallet: acc.wallet
			};
		}
		const roll = Math.floor(Math.random() * 6) + 1;
		let won = false;
		let multiplier = 0;
		if (typeof prediction === "number") {
			won = roll === prediction;
			multiplier = won ? 6 : 0;
		} else if (prediction === "high") {
			won = roll >= 4;
			multiplier = won ? 2 : 0;
		} else {
			won = roll <= 3;
			multiplier = won ? 2 : 0;
		}
		const payout = won ? betAmount * multiplier : 0;
		const finalWallet = await this.finishBet(userId, payout, guildId);
		return {
			game: "dice",
			betAmount,
			outcome: won ? "win" : "lose",
			payout,
			profit: payout - betAmount,
			multiplier,
			details: won ? `🎲 The die rolled a **${roll}**! Your prediction (${prediction}) was spot on! Payout: ${payout.toLocaleString()}` : `🎲 The die rolled a **${roll}**. Your prediction (${prediction}) was incorrect.`,
			finalWallet
		};
	}
	async slots(userId, betAmount, guildId) {
		const prep = await this.prepareBet(userId, betAmount, guildId);
		if (!prep.valid) {
			const acc = await this.bank.getAccount(userId, guildId);
			return {
				game: "slots",
				betAmount,
				outcome: "lose",
				payout: 0,
				profit: -betAmount,
				multiplier: 0,
				details: prep.error ?? "Invalid bet",
				finalWallet: acc.wallet
			};
		}
		const symbols = [
			"🍒",
			"🍋",
			"🍇",
			"🔔",
			"⭐",
			"💎",
			"7️⃣"
		];
		const luck = await this.getLuckBoost(userId, guildId);
		const pickSymbol = () => symbols[Math.floor(Math.random() * symbols.length)];
		let r1 = pickSymbol();
		let r2 = pickSymbol();
		let r3 = pickSymbol();
		if (luck > 0 && Math.random() < luck) {
			r2 = r1;
			if (Math.random() < .4) r3 = r1;
		}
		let multiplier = 0;
		let outcome = "lose";
		let detailMsg = `[ ${r1} | ${r2} | ${r3} ]`;
		if (r1 === r2 && r2 === r3) {
			outcome = "win";
			switch (r1) {
				case "7️⃣":
					multiplier = 50;
					detailMsg += " - 💥 TRIPLE SEVENS JACKPOT! (50x)";
					break;
				case "💎":
					multiplier = 30;
					detailMsg += " - 💎 DIAMOND EXTRAVAGANZA! (30x)";
					break;
				case "⭐":
					multiplier = 20;
					detailMsg += " - ⭐ SUPERNOVA MATCH! (20x)";
					break;
				case "🔔":
					multiplier = 10;
					detailMsg += " - 🔔 GOLDEN BELLS! (10x)";
					break;
				default:
					multiplier = 5;
					detailMsg += " - 🍇 FRUIT TRIPLET! (5x)";
			}
		} else if (r1 === r2 || r2 === r3 || r1 === r3) {
			outcome = "win";
			multiplier = 1.5;
			detailMsg += " - ✨ Double Match! (1.5x)";
		} else detailMsg += " - No match. Better luck next spin!";
		const payout = Math.floor(betAmount * multiplier);
		const finalWallet = await this.finishBet(userId, payout, guildId);
		return {
			game: "slots",
			betAmount,
			outcome,
			payout,
			profit: payout - betAmount,
			multiplier,
			details: detailMsg,
			finalWallet
		};
	}
	async roulette(userId, betAmount, betType, guildId) {
		const prep = await this.prepareBet(userId, betAmount, guildId);
		if (!prep.valid) {
			const acc = await this.bank.getAccount(userId, guildId);
			return {
				game: "roulette",
				betAmount,
				outcome: "lose",
				payout: 0,
				profit: -betAmount,
				multiplier: 0,
				details: prep.error ?? "Invalid bet",
				finalWallet: acc.wallet
			};
		}
		const redNumbers = [
			1,
			3,
			5,
			7,
			9,
			12,
			14,
			16,
			18,
			19,
			21,
			23,
			25,
			27,
			30,
			32,
			34,
			36
		];
		const landedNumber = Math.floor(Math.random() * 37);
		let landedColor = "black";
		if (landedNumber === 0) landedColor = "green";
		else if (redNumbers.includes(landedNumber)) landedColor = "red";
		let won = false;
		let multiplier = 0;
		if (typeof betType === "number") {
			won = landedNumber === betType;
			multiplier = won ? 36 : 0;
		} else if (betType === "green") {
			won = landedNumber === 0;
			multiplier = won ? 36 : 0;
		} else if (betType === "red" || betType === "black") {
			won = landedColor === betType;
			multiplier = won ? 2 : 0;
		} else if (betType === "even") {
			won = landedNumber > 0 && landedNumber % 2 === 0;
			multiplier = won ? 2 : 0;
		} else if (betType === "odd") {
			won = landedNumber > 0 && landedNumber % 2 !== 0;
			multiplier = won ? 2 : 0;
		}
		const payout = won ? betAmount * multiplier : 0;
		const finalWallet = await this.finishBet(userId, payout, guildId);
		const colorEmoji = landedColor === "red" ? "🔴" : landedColor === "black" ? "⚫" : "🟢";
		const details = won ? `🎡 Roulette ball stopped at ${colorEmoji} **${landedNumber} (${landedColor.toUpperCase()})**! Your bet on ${betType} won ${payout.toLocaleString()}!` : `🎡 Roulette ball stopped at ${colorEmoji} **${landedNumber} (${landedColor.toUpperCase()})**. You lost your bet on ${betType}.`;
		return {
			game: "roulette",
			betAmount,
			outcome: won ? "win" : "lose",
			payout,
			profit: payout - betAmount,
			multiplier,
			details,
			finalWallet
		};
	}
	async crash(userId, betAmount, targetMultiplier, guildId) {
		if (targetMultiplier < 1.01) {
			const acc = await this.bank.getAccount(userId, guildId);
			return {
				game: "crash",
				betAmount,
				outcome: "lose",
				payout: 0,
				profit: -betAmount,
				multiplier: 0,
				details: "Target multiplier must be at least 1.01x.",
				finalWallet: acc.wallet
			};
		}
		const prep = await this.prepareBet(userId, betAmount, guildId);
		if (!prep.valid) {
			const acc = await this.bank.getAccount(userId, guildId);
			return {
				game: "crash",
				betAmount,
				outcome: "lose",
				payout: 0,
				profit: -betAmount,
				multiplier: 0,
				details: prep.error ?? "Invalid bet",
				finalWallet: acc.wallet
			};
		}
		const rand = Math.random();
		let crashPoint = 1;
		if (rand >= .04) {
			crashPoint = Math.floor(.96 / (1 - rand) * 100) / 100;
			crashPoint = Math.max(1, crashPoint);
		}
		const won = targetMultiplier <= crashPoint;
		const multiplier = won ? targetMultiplier : 0;
		const payout = won ? Math.floor(betAmount * targetMultiplier) : 0;
		const finalWallet = await this.finishBet(userId, payout, guildId);
		const details = won ? `🚀 Rocket flew up to **${crashPoint.toFixed(2)}x**! You safely cashed out at **${targetMultiplier.toFixed(2)}x**! Won: ${payout.toLocaleString()}` : `💥 CRASH! Rocket exploded at **${crashPoint.toFixed(2)}x** before reaching your target of **${targetMultiplier.toFixed(2)}x**!`;
		return {
			game: "crash",
			betAmount,
			outcome: won ? "win" : "lose",
			payout,
			profit: payout - betAmount,
			multiplier,
			details,
			finalWallet
		};
	}
	buildDeck() {
		const suits = [
			"♠",
			"♥",
			"♦",
			"♣"
		];
		const ranks = [
			"2",
			"3",
			"4",
			"5",
			"6",
			"7",
			"8",
			"9",
			"10",
			"J",
			"Q",
			"K",
			"A"
		];
		const deck = [];
		for (const suit of suits) for (const rank of ranks) {
			let value = parseInt(rank, 10);
			if ([
				"J",
				"Q",
				"K"
			].includes(rank)) value = 10;
			if (rank === "A") value = 11;
			deck.push({
				suit,
				rank,
				value
			});
		}
		for (let i = deck.length - 1; i > 0; i--) {
			const j = Math.floor(Math.random() * (i + 1));
			[deck[i], deck[j]] = [deck[j], deck[i]];
		}
		return deck;
	}
	calculateHand(hand) {
		let total = 0;
		let aces = 0;
		for (const card of hand) {
			total += card.value;
			if (card.rank === "A") aces += 1;
		}
		while (total > 21 && aces > 0) {
			total -= 10;
			aces -= 1;
		}
		const isSoft = aces > 0;
		const isBust = total > 21;
		const isBlackjack = hand.length === 2 && total === 21;
		return {
			total,
			isSoft,
			isBust,
			isBlackjack
		};
	}
	/**
	* Starts an interactive Blackjack game session.
	*/
	async startBlackjackGame(userId, betAmount, guildId) {
		const prep = await this.prepareBet(userId, betAmount, guildId);
		if (!prep.valid) throw new Error(prep.error ?? "Invalid bet");
		const deck = this.buildDeck();
		const playerHand = [deck.pop(), deck.pop()];
		const dealerHand = [deck.pop(), deck.pop()];
		const pCalc = this.calculateHand(playerHand);
		const dCalc = this.calculateHand(dealerHand);
		const gameId = `bj_${userId}_${Date.now()}`;
		const state = {
			gameId,
			userId,
			guildId,
			betAmount,
			deck,
			playerHand,
			dealerHand,
			status: "playing",
			payout: 0,
			finished: false
		};
		if (pCalc.isBlackjack && dCalc.isBlackjack) {
			state.status = "push";
			state.payout = betAmount;
			state.finished = true;
			await this.finishBet(userId, state.payout, guildId);
		} else if (pCalc.isBlackjack) {
			state.status = "blackjack";
			state.payout = Math.floor(betAmount * 2.5);
			state.finished = true;
			await this.finishBet(userId, state.payout, guildId);
		} else if (dCalc.isBlackjack) {
			state.status = "dealer_win";
			state.payout = 0;
			state.finished = true;
			await this.finishBet(userId, 0, guildId);
		}
		if (!state.finished) this.activeBlackjackGames.set(gameId, state);
		return state;
	}
	/**
	* Player draws a card ("hit").
	*/
	async blackjackHit(gameId) {
		const game = this.activeBlackjackGames.get(gameId);
		if (!game || game.finished) throw new Error("Active Blackjack game not found.");
		game.playerHand.push(game.deck.pop());
		const pCalc = this.calculateHand(game.playerHand);
		if (pCalc.isBust) {
			game.status = "player_bust";
			game.payout = 0;
			game.finished = true;
			this.activeBlackjackGames.delete(gameId);
			await this.finishBet(game.userId, 0, game.guildId);
		} else if (pCalc.total === 21) return this.blackjackStand(gameId);
		return game;
	}
	/**
	* Player stands. Dealer resolves their hand according to standard casino rules (dealer hits until >= 17).
	*/
	async blackjackStand(gameId) {
		const game = this.activeBlackjackGames.get(gameId);
		if (!game || game.finished) throw new Error("Active Blackjack game not found.");
		const pCalc = this.calculateHand(game.playerHand);
		let dCalc = this.calculateHand(game.dealerHand);
		while (dCalc.total < 17) {
			game.dealerHand.push(game.deck.pop());
			dCalc = this.calculateHand(game.dealerHand);
		}
		game.finished = true;
		this.activeBlackjackGames.delete(gameId);
		if (dCalc.isBust) {
			game.status = "dealer_bust";
			game.payout = game.betAmount * 2;
		} else if (pCalc.total > dCalc.total) {
			game.status = "player_win";
			game.payout = game.betAmount * 2;
		} else if (pCalc.total < dCalc.total) {
			game.status = "dealer_win";
			game.payout = 0;
		} else {
			game.status = "push";
			game.payout = game.betAmount;
		}
		await this.finishBet(game.userId, game.payout, game.guildId);
		return game;
	}
	/**
	* Double down: doubles bet, receives exactly one card, and automatically stands.
	*/
	async blackjackDouble(gameId) {
		const game = this.activeBlackjackGames.get(gameId);
		if (!game || game.finished) throw new Error("Active Blackjack game not found.");
		const extraPrep = await this.prepareBet(game.userId, game.betAmount, game.guildId);
		if (!extraPrep.valid) throw new Error(`Cannot double down: ${extraPrep.error}`);
		game.betAmount *= 2;
		game.playerHand.push(game.deck.pop());
		if (this.calculateHand(game.playerHand).isBust) {
			game.status = "player_bust";
			game.payout = 0;
			game.finished = true;
			this.activeBlackjackGames.delete(gameId);
			await this.finishBet(game.userId, 0, game.guildId);
			return game;
		}
		return this.blackjackStand(gameId);
	}
	getActiveBlackjackGame(gameId) {
		return this.activeBlackjackGames.get(gameId);
	}
};
// src/modules/LeaderboardManager.ts
/**
* @m3rcena/eco
* Global & Guild Economy Leaderboards & Net Worth Rankings.
*
* @copyright 2026 M3rcena Development. All rights reserved.
* @license Apache-2.0
*/
var LeaderboardManager = class {
	storage;
	shop;
	business;
	constructor(storage, shop, business) {
		this.storage = storage;
		this.shop = shop;
		this.business = business;
	}
	/**
	* Computes a user's total Net Worth across liquid cash, bank savings, business assets, and inventory collectibles.
	*/
	calculateNetWorth(account) {
		let total = account.wallet + account.bank;
		if (account.businesses && account.businesses.length > 0) for (const b of account.businesses) {
			const config = this.business?.getBusinessConfig(b.businessId);
			if (config) {
				total += config.baseCost * b.level;
				total += b.employees * Math.floor(config.baseCost * .15);
			} else total += 5e3 * b.level;
		}
		if (account.inventory && account.inventory.length > 0) for (const item of account.inventory) {
			const shopItem = this.shop?.getItem(item.itemId);
			const unitVal = shopItem?.resaleValue ?? (shopItem ? Math.floor(shopItem.price * .6) : 100);
			total += unitVal * item.quantity;
		}
		return total;
	}
	/**
	* Generates a ranked leaderboard for the specified metric.
	*/
	async getLeaderboard(metric = "net_worth", limit = 10, guildId) {
		const enriched = (await this.storage.getAllAccounts(guildId)).map((acc) => {
			const netWorth = this.calculateNetWorth(acc);
			let sortValue = 0;
			switch (metric) {
				case "net_worth":
					sortValue = netWorth;
					break;
				case "wallet":
					sortValue = acc.wallet;
					break;
				case "bank":
					sortValue = acc.bank;
					break;
				case "level":
					sortValue = acc.level;
					break;
				case "streak": sortValue = acc.streak?.daily ?? 0;
			}
			return {
				userId: acc.userId,
				guildId: acc.guildId,
				value: sortValue,
				wallet: acc.wallet,
				bank: acc.bank,
				netWorth,
				level: acc.level,
				streak: acc.streak?.daily ?? 0
			};
		});
		enriched.sort((a, b) => b.value - a.value);
		return enriched.slice(0, limit).map((entry, index) => ({
			...entry,
			rank: index + 1
		}));
	}
	/**
	* Formats the leaderboard entries into a clean Discord markdown string.
	*/
	formatLeaderboard(entries, metric = "net_worth", currencySymbol = "🪙") {
		if (entries.length === 0) return "No economy records found yet.";
		let output = `🏆 **Top Economy Leaderboard (${{
			net_worth: "Net Worth",
			wallet: "Wallet Cash",
			bank: "Bank Savings",
			level: "Level & XP",
			streak: "Daily Streak"
		}[metric]})**\n\n`;
		for (const e of entries) {
			let medal = `\`#${e.rank}\``;
			if (e.rank === 1) medal = "🥇";
			else if (e.rank === 2) medal = "🥈";
			else if (e.rank === 3) medal = "🥉";
			let formattedValue = "";
			if (metric === "level") formattedValue = `Lvl ${e.value}`;
			else if (metric === "streak") formattedValue = `${e.value} days 🔥`;
			else formattedValue = `${currencySymbol} ${e.value.toLocaleString()}`;
			output += `${medal} <@${e.userId}> — **${formattedValue}**\n`;
			output += `   └ Net Worth: ${currencySymbol} ${e.netWorth.toLocaleString()} | Lvl ${e.level}\n`;
		}
		return output;
	}
};
// src/modules/StockMarketManager.ts
/**
* @m3rcena/eco
* Stock & Cryptocurrency Exchange Simulation Engine.
*
* @copyright 2026 M3rcena Development. All rights reserved.
* @license Apache-2.0
*/
const DEFAULT_STOCKS = [
	{
		symbol: "$AETH",
		name: "Aether AI Robotics",
		category: "TECH",
		basePrice: 145.5,
		currentPrice: 145.5,
		high24h: 152,
		low24h: 140.2,
		change24h: 3.75,
		history: [
			138,
			140,
			142,
			141,
			144,
			145.5
		],
		volatility: .04,
		dividendYield: .02,
		description: "Next-gen neural AI processors and autonomous robotics."
	},
	{
		symbol: "$NEXU",
		name: "Nexus Global Finance",
		category: "FINANCE",
		basePrice: 85,
		currentPrice: 85,
		high24h: 88.5,
		low24h: 83,
		change24h: 1.2,
		history: [
			82,
			83,
			84,
			84.5,
			85
		],
		volatility: .02,
		dividendYield: .04,
		description: "Interplanetary banking conglomerate and liquidity provider."
	},
	{
		symbol: "$CORE",
		name: "DeepCore Asteroid Mining",
		category: "MINING",
		basePrice: 320,
		currentPrice: 320,
		high24h: 345,
		low24h: 298,
		change24h: -4.5,
		history: [
			340,
			335,
			330,
			318,
			320
		],
		volatility: .07,
		dividendYield: .03,
		description: "High-yield rare earth metal extraction from off-world asteroids."
	},
	{
		symbol: "₿BIT",
		name: "BitCoin Core",
		category: "CRYPTO",
		basePrice: 64200,
		currentPrice: 64200,
		high24h: 68500,
		low24h: 62e3,
		change24h: 6.8,
		history: [
			61e3,
			62500,
			63800,
			63100,
			64200
		],
		volatility: .09,
		description: "Decentralized digital gold asset and store of cosmic value."
	},
	{
		symbol: "ΞETH",
		name: "Ether Compute",
		category: "CRYPTO",
		basePrice: 3450,
		currentPrice: 3450,
		high24h: 3620,
		low24h: 3310,
		change24h: 2.1,
		history: [
			3300,
			3380,
			3420,
			3400,
			3450
		],
		volatility: .08,
		description: "Global decentralized smart contract compute platform."
	}
];
var StockMarketManager = class {
	bank;
	stocks = /* @__PURE__ */ new Map();
	marketTrend = "BULL";
	lastTick = Date.now();
	constructor(bank, initialStocks = DEFAULT_STOCKS) {
		this.bank = bank;
		for (const stock of initialStocks) this.stocks.set(stock.symbol.toUpperCase(), { ...stock });
	}
	getStocks() {
		return Array.from(this.stocks.values());
	}
	getStock(symbol) {
		return this.stocks.get(symbol.toUpperCase());
	}
	getMarketTrend() {
		return this.marketTrend;
	}
	/**
	* Ticks the market forward, simulating realistic price fluctuations.
	*/
	tickMarket() {
		const trends = [
			"BULL",
			"BEAR",
			"STABLE",
			"VOLATILE"
		];
		if (Math.random() < .15) this.marketTrend = trends[Math.floor(Math.random() * trends.length)];
		for (const [sym, stock] of this.stocks) {
			const vol = stock.volatility;
			let bias = 0;
			if (this.marketTrend === "BULL") bias = .015;
			else if (this.marketTrend === "BEAR") bias = -.015;
			const deltaPct = (Math.random() * 2 - 1) * vol + bias;
			const oldPrice = stock.currentPrice;
			const newPrice = Math.max(1, parseFloat((oldPrice * (1 + deltaPct)).toFixed(2)));
			stock.currentPrice = newPrice;
			stock.high24h = Math.max(stock.high24h, newPrice);
			stock.low24h = Math.min(stock.low24h, newPrice);
			stock.change24h = parseFloat(((newPrice - stock.basePrice) / stock.basePrice * 100).toFixed(2));
			stock.history.push(newPrice);
			if (stock.history.length > 20) stock.history.shift();
		}
		this.lastTick = Date.now();
	}
	/**
	* Purchases shares of a stock or cryptocurrency.
	*/
	async buyStock(userId, symbol, shares, guildId) {
		const sym = symbol.toUpperCase();
		const stock = this.stocks.get(sym);
		if (!stock) return {
			success: false,
			action: "BUY",
			symbol: sym,
			shares: 0,
			pricePerShare: 0,
			totalAmount: 0,
			userWallet: 0,
			sharesRemaining: 0,
			error: `Stock symbol "${sym}" not found.`
		};
		if (shares <= 0 || isNaN(shares)) return {
			success: false,
			action: "BUY",
			symbol: sym,
			shares: 0,
			pricePerShare: stock.currentPrice,
			totalAmount: 0,
			userWallet: 0,
			sharesRemaining: 0,
			error: "Shares must be greater than zero."
		};
		const totalCost = parseFloat((stock.currentPrice * shares).toFixed(2));
		const account = await this.bank.getAccount(userId, guildId);
		if (account.wallet < totalCost) return {
			success: false,
			action: "BUY",
			symbol: sym,
			shares,
			pricePerShare: stock.currentPrice,
			totalAmount: totalCost,
			userWallet: account.wallet,
			sharesRemaining: 0,
			error: `Insufficient cash in wallet. Need $${totalCost.toLocaleString()}, you have $${account.wallet.toLocaleString()}.`
		};
		account.wallet -= totalCost;
		account.stats.totalSpent += totalCost;
		account.stats.stockTrades = (account.stats.stockTrades || 0) + 1;
		if (!account.stocks) account.stocks = [];
		let position = account.stocks.find((p) => p.symbol.toUpperCase() === sym);
		if (!position) {
			position = {
				symbol: sym,
				shares,
				totalInvested: totalCost,
				averageBuyPrice: stock.currentPrice,
				lastTradeTimestamp: Date.now()
			};
			account.stocks.push(position);
		} else {
			const prevTotal = position.shares * position.averageBuyPrice;
			position.shares += shares;
			position.totalInvested += totalCost;
			position.averageBuyPrice = parseFloat(((prevTotal + totalCost) / position.shares).toFixed(2));
			position.lastTradeTimestamp = Date.now();
		}
		await this.bank.saveAccount(account);
		return {
			success: true,
			action: "BUY",
			symbol: sym,
			shares,
			pricePerShare: stock.currentPrice,
			totalAmount: totalCost,
			userWallet: account.wallet,
			sharesRemaining: position.shares
		};
	}
	/**
	* Sells shares of an owned stock or cryptocurrency.
	*/
	async sellStock(userId, symbol, sharesToSell, guildId) {
		const sym = symbol.toUpperCase();
		const stock = this.stocks.get(sym);
		if (!stock) return {
			success: false,
			action: "SELL",
			symbol: sym,
			shares: 0,
			pricePerShare: 0,
			totalAmount: 0,
			userWallet: 0,
			sharesRemaining: 0,
			error: `Stock symbol "${sym}" not found.`
		};
		const account = await this.bank.getAccount(userId, guildId);
		if (!account.stocks) account.stocks = [];
		const position = account.stocks.find((p) => p.symbol.toUpperCase() === sym);
		if (!position || position.shares <= 0) return {
			success: false,
			action: "SELL",
			symbol: sym,
			shares: 0,
			pricePerShare: stock.currentPrice,
			totalAmount: 0,
			userWallet: account.wallet,
			sharesRemaining: 0,
			error: `You do not own any shares of ${sym}.`
		};
		const shares = sharesToSell === "all" ? position.shares : sharesToSell;
		if (shares <= 0 || isNaN(shares) || shares > position.shares) return {
			success: false,
			action: "SELL",
			symbol: sym,
			shares: 0,
			pricePerShare: stock.currentPrice,
			totalAmount: 0,
			userWallet: account.wallet,
			sharesRemaining: position.shares,
			error: `Invalid share count. You only own ${position.shares} shares.`
		};
		const grossPayout = parseFloat((stock.currentPrice * shares).toFixed(2));
		const costBasis = parseFloat((position.averageBuyPrice * shares).toFixed(2));
		const profitOrLoss = parseFloat((grossPayout - costBasis).toFixed(2));
		account.wallet += grossPayout;
		account.stats.totalEarned += grossPayout;
		account.stats.stockTrades = (account.stats.stockTrades || 0) + 1;
		position.shares -= shares;
		if (position.shares <= 0) account.stocks = account.stocks.filter((p) => p.symbol.toUpperCase() !== sym);
		await this.bank.saveAccount(account);
		return {
			success: true,
			action: "SELL",
			symbol: sym,
			shares,
			pricePerShare: stock.currentPrice,
			totalAmount: grossPayout,
			userWallet: account.wallet,
			sharesRemaining: position ? position.shares : 0,
			profitOrLoss
		};
	}
	/**
	* Retrieves user portfolio valuation and positions.
	*/
	async getUserPortfolio(userId, guildId) {
		const positions = ((await this.bank.getAccount(userId, guildId)).stocks || []).map((pos) => {
			const stock = this.stocks.get(pos.symbol.toUpperCase());
			const currentPrice = stock ? stock.currentPrice : pos.averageBuyPrice;
			const currentValue = parseFloat((pos.shares * currentPrice).toFixed(2));
			const costBasis = parseFloat((pos.shares * pos.averageBuyPrice).toFixed(2));
			const pnl = parseFloat((currentValue - costBasis).toFixed(2));
			const pnlPct = costBasis > 0 ? parseFloat((pnl / costBasis * 100).toFixed(2)) : 0;
			return {
				symbol: pos.symbol,
				name: stock ? stock.name : pos.symbol,
				shares: pos.shares,
				averageBuyPrice: pos.averageBuyPrice,
				currentPrice,
				currentValue,
				profitOrLoss: pnl,
				profitOrLossPercentage: pnlPct
			};
		});
		const totalPortfolioValue = positions.reduce((acc, p) => acc + p.currentValue, 0);
		return {
			userId,
			positions,
			totalPortfolioValue: parseFloat(totalPortfolioValue.toFixed(2))
		};
	}
};
// src/modules/HeistManager.ts
/**
* @m3rcena/eco
* Multiplayer Crew Bank Heist & Crime Syndicate Engine.
*
* @copyright 2026 M3rcena Development. All rights reserved.
* @license Apache-2.0
*/
const DEFAULT_HEIST_TARGETS = [
	{
		id: "corner_store",
		name: "Nightshift Mart Safe",
		difficulty: "EASY",
		minLevel: 1,
		minCrew: 1,
		maxCrew: 2,
		baseBountyMin: 12e3,
		baseBountyMax: 3e4,
		failureBail: 3500,
		successRate: .8,
		description: "Low-security register and floor safe. Fast cash with minimal police response."
	},
	{
		id: "city_trust_bank",
		name: "First Metro Bank Vault",
		difficulty: "MEDIUM",
		minLevel: 5,
		minCrew: 2,
		maxCrew: 3,
		baseBountyMin: 65e3,
		baseBountyMax: 18e4,
		failureBail: 15e3,
		successRate: .65,
		description: "Reinforced vault door with laser grid sensors. Needs a Hacker and a Muscle."
	},
	{
		id: "casino_vault",
		name: "Grand Bellagio Casino Vault",
		difficulty: "HARD",
		minLevel: 12,
		minCrew: 3,
		maxCrew: 4,
		baseBountyMin: 35e4,
		baseBountyMax: 9e5,
		failureBail: 65e3,
		successRate: .5,
		description: "High-roller cash depository protected by private armed security and motion alarms."
	},
	{
		id: "federal_reserve",
		name: "Federal Bullion Depository",
		difficulty: "IMPOSSIBLE",
		minLevel: 25,
		minCrew: 4,
		maxCrew: 4,
		baseBountyMin: 15e5,
		baseBountyMax: 45e5,
		failureBail: 25e4,
		successRate: .38,
		description: "The ultimate score: solid gold bullion pallets under biometric time locks."
	}
];
var HeistManager = class {
	bank;
	targets = /* @__PURE__ */ new Map();
	activeHeists = /* @__PURE__ */ new Map();
	constructor(bank, targets = DEFAULT_HEIST_TARGETS) {
		this.bank = bank;
		for (const t of targets) this.targets.set(t.id, t);
	}
	getTargets() {
		return Array.from(this.targets.values());
	}
	getTarget(id) {
		return this.targets.get(id);
	}
	getHeist(heistId) {
		return this.activeHeists.get(heistId);
	}
	/**
	* Creates a new Heist lobby.
	*/
	async createLobby(initiatorId, initiatorName, targetId, guildId) {
		const target = this.targets.get(targetId);
		if (!target) return {
			success: false,
			error: `Heist target "${targetId}" not found.`
		};
		const acc = await this.bank.getAccount(initiatorId, guildId);
		if (acc.level < target.minLevel) return {
			success: false,
			error: `You need to be Level ${target.minLevel} to initiate this heist. (Your level: ${acc.level})`
		};
		const heistId = "heist_" + Math.random().toString(36).substring(2, 8);
		const session = {
			id: heistId,
			guildId,
			initiatorId,
			target,
			crew: [{
				userId: initiatorId,
				username: initiatorName,
				role: "HACKER",
				ready: true
			}],
			phase: "LOBBY",
			createdAt: Date.now(),
			log: [`Planning initiated by ${initiatorName} targeting ${target.name}.`]
		};
		this.activeHeists.set(heistId, session);
		return {
			success: true,
			session
		};
	}
	/**
	* Joins an existing heist lobby with a specific role.
	*/
	joinLobby(heistId, userId, username, role) {
		const session = this.activeHeists.get(heistId);
		if (!session) return {
			success: false,
			error: "Heist lobby not found."
		};
		if (session.phase !== "LOBBY") return {
			success: false,
			error: "Heist has already launched."
		};
		if (session.crew.some((m) => m.userId === userId)) {
			const member = session.crew.find((m) => m.userId === userId);
			if (member) member.role = role;
			return {
				success: true,
				session
			};
		}
		if (session.crew.length >= session.target.maxCrew) return {
			success: false,
			error: "Heist crew is already full!"
		};
		session.crew.push({
			userId,
			username,
			role,
			ready: true
		});
		session.log.push(`${username} joined the crew as ${role}.`);
		return {
			success: true,
			session
		};
	}
	/**
	* Executes the heist.
	*/
	async executeHeist(heistId) {
		const session = this.activeHeists.get(heistId);
		if (!session) throw new Error(`Heist session "${heistId}" not found.`);
		if (session.crew.length < session.target.minCrew) throw new Error(`Not enough crew members. Need at least ${session.target.minCrew} players.`);
		session.phase = "EXECUTION";
		const target = session.target;
		let successChance = target.successRate;
		const hasHacker = session.crew.some((m) => m.role === "HACKER");
		const hasDriver = session.crew.some((m) => m.role === "DRIVER");
		const hasDemo = session.crew.some((m) => m.role === "DEMOLITIONIST");
		const hasMuscle = session.crew.some((m) => m.role === "MUSCLE");
		if (hasHacker) successChance += .06;
		if (hasDriver) successChance += .05;
		if (hasDemo) successChance += .05;
		if (hasMuscle) successChance += .04;
		const isSuccess = Math.random() < successChance;
		session.success = isSuccess;
		session.phase = "CONCLUDED";
		if (isSuccess) {
			const totalBounty = Math.floor(Math.random() * (target.baseBountyMax - target.baseBountyMin + 1)) + target.baseBountyMin;
			const share = Math.floor(totalBounty / session.crew.length);
			session.totalLoot = totalBounty;
			session.lootSplit = {};
			session.log.push(`💥 Vault breached successfully! Looted $${totalBounty.toLocaleString()}!`);
			session.log.push(`🚓 Clean getaway! Each crew member takes home $${share.toLocaleString()}!`);
			for (const member of session.crew) {
				session.lootSplit[member.userId] = share;
				const acc = await this.bank.getAccount(member.userId, session.guildId);
				acc.wallet += share;
				acc.stats.totalEarned += share;
				acc.stats.heistsCompleted = (acc.stats.heistsCompleted || 0) + 1;
				await this.bank.saveAccount(acc);
			}
			return {
				success: true,
				targetName: target.name,
				totalLoot: totalBounty,
				crewCount: session.crew.length,
				sharePerPlayer: share,
				log: session.log
			};
		} else {
			const bail = target.failureBail;
			session.log.push(`🚨 Silent alarm triggered! SWAT teams surrounded the perimeter!`);
			session.log.push(`🚔 Heist failed! Each member fined $${bail.toLocaleString()} in police bail!`);
			for (const member of session.crew) {
				const acc = await this.bank.getAccount(member.userId, session.guildId);
				acc.wallet = Math.max(0, acc.wallet - bail);
				acc.stats.totalSpent += bail;
				await this.bank.saveAccount(acc);
			}
			return {
				success: false,
				targetName: target.name,
				totalLoot: 0,
				crewCount: session.crew.length,
				sharePerPlayer: 0,
				finePerPlayer: bail,
				log: session.log
			};
		}
	}
};
// src/modules/PetManager.ts
/**
* @m3rcena/eco
* Pet & Companion Foraging System.
*
* @copyright 2026 M3rcena Development. All rights reserved.
* @license Apache-2.0
*/
const DEFAULT_PETS = [
	{
		id: "cyber_hound",
		name: "Cybernetic K9",
		species: "Canine",
		rarity: "common",
		buyCost: 25e3,
		description: "Loyal robotic guardian. Barks at pickpockets and detects incoming robbers.",
		emoji: "🐕",
		workMultiplierBonus: .1,
		crimeProtectionBonus: .15,
		luckBonus: .02
	},
	{
		id: "fortune_cat",
		name: "Maneki-Neko Lucky Cat",
		species: "Feline",
		rarity: "rare",
		buyCost: 85e3,
		description: "Golden waving talisman that attracts coin drops and daily streak multipliers.",
		emoji: "🐱",
		workMultiplierBonus: .2,
		crimeProtectionBonus: .05,
		luckBonus: .08
	},
	{
		id: "obsidian_drake",
		name: "Obsidian Drake",
		species: "Dragon",
		rarity: "epic",
		buyCost: 35e4,
		description: "Armored juvenile dragon with molten breath that scares off high-tier syndicate thugs.",
		emoji: "🐉",
		workMultiplierBonus: .35,
		crimeProtectionBonus: .3,
		luckBonus: .1
	},
	{
		id: "void_phoenix",
		name: "Celestial Void Phoenix",
		species: "Phoenix",
		rarity: "mythic",
		buyCost: 15e5,
		description: "Legendary cosmic firebird. Doubles expedition rewards and grants passive hourly coin drops.",
		emoji: "🦅",
		workMultiplierBonus: .65,
		crimeProtectionBonus: .5,
		luckBonus: .2
	}
];
var PetManager = class {
	bank;
	catalog = /* @__PURE__ */ new Map();
	constructor(bank, initialPets = DEFAULT_PETS) {
		this.bank = bank;
		for (const pet of initialPets) this.catalog.set(pet.id, pet);
	}
	getCatalog() {
		return Array.from(this.catalog.values());
	}
	getPetConfig(id) {
		return this.catalog.get(id);
	}
	/**
	* Adopts/purchases a companion pet.
	*/
	async adoptPet(userId, petId, customName, guildId) {
		const config = this.catalog.get(petId);
		if (!config) return {
			success: false,
			error: `Pet "${petId}" not found.`
		};
		const acc = await this.bank.getAccount(userId, guildId);
		if (acc.wallet < config.buyCost) return {
			success: false,
			error: `Insufficient cash. Need $${config.buyCost.toLocaleString()}, you have $${acc.wallet.toLocaleString()}.`
		};
		if (!acc.pets) acc.pets = [];
		if (acc.pets.some((p) => p.petId === petId)) return {
			success: false,
			error: `You already own a ${config.name}!`
		};
		acc.wallet -= config.buyCost;
		acc.stats.totalSpent += config.buyCost;
		const newPet = {
			id: "pet_" + Math.random().toString(36).substring(2, 8),
			petId: config.id,
			name: customName || config.name,
			species: config.species,
			level: 1,
			xp: 0,
			hunger: 100,
			happiness: 100,
			acquiredAt: Date.now(),
			isExpeditionActive: false
		};
		acc.pets.push(newPet);
		await this.bank.saveAccount(acc);
		return {
			success: true,
			pet: newPet
		};
	}
	/**
	* Feeds a pet to restore hunger and happiness.
	*/
	async feedPet(userId, petId, guildId) {
		const acc = await this.bank.getAccount(userId, guildId);
		const pet = (acc.pets || []).find((p) => p.petId === petId || p.id === petId);
		if (!pet) return {
			success: false,
			error: "Pet not found in your shelter."
		};
		const foodCost = 250;
		if (acc.wallet < foodCost) return {
			success: false,
			error: `Feeding costs $${foodCost}.`
		};
		acc.wallet -= foodCost;
		pet.hunger = Math.min(100, pet.hunger + 40);
		pet.happiness = Math.min(100, pet.happiness + 25);
		pet.xp += 15;
		const reqXp = pet.level * 100;
		if (pet.xp >= reqXp) {
			pet.level += 1;
			pet.xp -= reqXp;
		}
		await this.bank.saveAccount(acc);
		return {
			success: true,
			pet
		};
	}
	/**
	* Dispatches pet on a timed foraging expedition.
	*/
	async sendExpedition(userId, petId, durationHours = 2, guildId) {
		const acc = await this.bank.getAccount(userId, guildId);
		const pet = (acc.pets || []).find((p) => p.petId === petId || p.id === petId);
		if (!pet) return {
			success: false,
			error: "Pet not found."
		};
		if (pet.isExpeditionActive) return {
			success: false,
			error: "Pet is already out on an expedition!"
		};
		const returnsAt = Date.now() + durationHours * 3600 * 1e3;
		pet.isExpeditionActive = true;
		pet.expeditionReturnsAt = returnsAt;
		await this.bank.saveAccount(acc);
		return {
			success: true,
			returnsAt
		};
	}
	/**
	* Claims rewards when a pet returns from an expedition.
	*/
	async claimExpedition(userId, petId, guildId) {
		const acc = await this.bank.getAccount(userId, guildId);
		const pet = (acc.pets || []).find((p) => p.petId === petId || p.id === petId);
		if (!pet) return {
			success: false,
			error: "Pet not found."
		};
		if (!pet.isExpeditionActive || !pet.expeditionReturnsAt) return {
			success: false,
			error: "Pet is not currently on an expedition."
		};
		if (Date.now() < pet.expeditionReturnsAt) {
			const remainingSec = Math.ceil((pet.expeditionReturnsAt - Date.now()) / 1e3);
			return {
				success: false,
				error: `Expedition still in progress! Returning in ${Math.ceil(remainingSec / 60)} minutes.`
			};
		}
		const multiplier = 1 + (this.catalog.get(pet.petId)?.workMultiplierBonus || 0) + pet.level * .05;
		const coinsFound = Math.floor((Math.random() * 25e3 + 8e3) * multiplier);
		const xpGained = Math.floor(Math.random() * 60 + 40);
		acc.wallet += coinsFound;
		acc.stats.totalEarned += coinsFound;
		pet.xp += xpGained;
		pet.hunger = Math.max(10, pet.hunger - 35);
		pet.happiness = Math.max(10, pet.happiness - 20);
		pet.isExpeditionActive = false;
		pet.expeditionReturnsAt = void 0;
		await this.bank.saveAccount(acc);
		return {
			success: true,
			reward: {
				coins: coinsFound,
				xp: xpGained,
				petLevel: pet.level
			}
		};
	}
};
// src/modules/CrateManager.ts
/**
* @m3rcena/eco
* Mystery Loot Crate Unboxing System.
*
* @copyright 2026 M3rcena Development. All rights reserved.
* @license Apache-2.0
*/
const CRATE_PRICES = {
	common: 5e3,
	rare: 25e3,
	epic: 1e5,
	legendary: 5e5,
	mythic: 2e6
};
var CrateManager = class {
	bank;
	constructor(bank) {
		this.bank = bank;
	}
	getCratePrice(tier) {
		return CRATE_PRICES[tier] || 1e4;
	}
	/**
	* Opens a mystery crate of the given tier and awards randomized rewards.
	*/
	async openCrate(userId, tier, guildId) {
		const cost = this.getCratePrice(tier);
		const acc = await this.bank.getAccount(userId, guildId);
		if (acc.wallet < cost) throw new Error(`Insufficient funds to open ${tier.toUpperCase()} crate. Price: $${cost.toLocaleString()}, you have: $${acc.wallet.toLocaleString()}`);
		acc.wallet -= cost;
		acc.stats.totalSpent += cost;
		let minCoins = cost * .4;
		let maxCoins = cost * 2.2;
		let xp = 50;
		if (tier === "mythic") {
			minCoins = cost * .8;
			maxCoins = cost * 4.5;
			xp = 1e3;
		} else if (tier === "legendary") {
			minCoins = cost * .6;
			maxCoins = cost * 3;
			xp = 450;
		} else if (tier === "epic") xp = 200;
		const wonCoins = Math.floor(Math.random() * (maxCoins - minCoins + 1)) + minCoins;
		acc.wallet += wonCoins;
		acc.stats.totalEarned += wonCoins;
		acc.xp += xp;
		const reqXp = acc.level * 250;
		if (acc.xp >= reqXp) {
			acc.level += 1;
			acc.xp -= reqXp;
		}
		await this.bank.saveAccount(acc);
		return {
			tier,
			coins: wonCoins,
			xp,
			announcement: `Unboxed [${tier.toUpperCase()} CRATE] and discovered $${wonCoins.toLocaleString()} + ${xp} XP!`
		};
	}
};
// src/modules/VaultManager.ts
/**
* @m3rcena/eco
* Bank Vault Tiers, Capacity Upgrades & Daily Compound Interest Engine.
*
* @copyright 2026 M3rcena Development. All rights reserved.
* @license Apache-2.0
*/
const DEFAULT_VAULT_TIERS = [
	{
		tier: 1,
		name: "Piggy Bank & Floor Safe",
		capacity: 1e4,
		upgradeCost: 0,
		interestRate: 0,
		robberyDefense: 0,
		perks: ["Basic starter storage", "No interest yield"]
	},
	{
		tier: 2,
		name: "Community Commercial Safe",
		capacity: 5e4,
		upgradeCost: 15e3,
		interestRate: .005,
		robberyDefense: .15,
		perks: [
			"$50,000 capacity",
			"0.5% daily compound interest",
			"15% robbery defense"
		]
	},
	{
		tier: 3,
		name: "Reinforced Iron Vault",
		capacity: 2e5,
		upgradeCost: 75e3,
		interestRate: .01,
		robberyDefense: .35,
		perks: [
			"$200,000 capacity",
			"1.0% daily compound interest",
			"35% robbery defense"
		]
	},
	{
		tier: 4,
		name: "Titanium Security Depository",
		capacity: 1e6,
		upgradeCost: 35e4,
		interestRate: .018,
		robberyDefense: .6,
		perks: [
			"$1,000,000 capacity",
			"1.8% daily compound interest",
			"60% robbery defense"
		]
	},
	{
		tier: 5,
		name: "Swiss Offshore Bunker",
		capacity: 5e6,
		upgradeCost: 15e5,
		interestRate: .025,
		robberyDefense: .85,
		perks: [
			"$5,000,000 capacity",
			"2.5% daily compound interest",
			"85% robbery defense",
			"Tax evasion resistance"
		]
	},
	{
		tier: 6,
		name: "Quantum Orbital Reserve",
		capacity: 25e6,
		upgradeCost: 8e6,
		interestRate: .04,
		robberyDefense: 1,
		perks: [
			"$25,000,000 capacity",
			"4.0% daily compound interest",
			"100% robbery immunity (Satellite defense)"
		]
	}
];
var VaultManager = class {
	bank;
	tiers = DEFAULT_VAULT_TIERS;
	constructor(bank, customTiers) {
		this.bank = bank;
		if (customTiers && customTiers.length > 0) this.tiers = customTiers;
	}
	getVaultTiers() {
		return this.tiers;
	}
	getVaultTier(tierNumber) {
		return this.tiers.find((t) => t.tier === tierNumber) || this.tiers[0];
	}
	async getUserVault(userId, guildId) {
		const acc = await this.bank.getAccount(userId, guildId);
		const tierNum = acc.bankTier || 1;
		const currentTier = this.getVaultTier(tierNum);
		const nextTier = this.tiers.find((t) => t.tier === tierNum + 1);
		const dailyInterestAccrual = Math.floor(acc.bank * currentTier.interestRate);
		const lastClaim = acc.lastInterestClaimedAt || 0;
		const canClaimInterest = Date.now() - lastClaim >= 864e5 && acc.bank > 0 && currentTier.interestRate > 0;
		return {
			currentTier,
			nextTier,
			bank: acc.bank,
			capacity: acc.bankCapacity,
			dailyInterestAccrual,
			canClaimInterest
		};
	}
	/**
	* Upgrades the user's bank vault to the next tier.
	*/
	async upgradeVault(userId, guildId) {
		const acc = await this.bank.getAccount(userId, guildId);
		const currentTierNum = acc.bankTier || 1;
		const currentTier = this.getVaultTier(currentTierNum);
		const nextTier = this.tiers.find((t) => t.tier === currentTierNum + 1);
		if (!nextTier) return {
			success: false,
			previousTier: currentTier,
			newTier: currentTier,
			cost: 0,
			newCapacity: acc.bankCapacity,
			error: "Your bank vault is already at the maximum tier (Quantum Orbital Reserve)!"
		};
		if (acc.wallet < nextTier.upgradeCost) return {
			success: false,
			previousTier: currentTier,
			newTier: nextTier,
			cost: nextTier.upgradeCost,
			newCapacity: acc.bankCapacity,
			error: `Insufficient cash in wallet. Upgrade costs $${nextTier.upgradeCost.toLocaleString()}, you have $${acc.wallet.toLocaleString()}.`
		};
		acc.wallet -= nextTier.upgradeCost;
		acc.stats.totalSpent += nextTier.upgradeCost;
		acc.bankTier = nextTier.tier;
		acc.bankCapacity = nextTier.capacity;
		await this.bank.saveAccount(acc);
		return {
			success: true,
			previousTier: currentTier,
			newTier: nextTier,
			cost: nextTier.upgradeCost,
			newCapacity: nextTier.capacity
		};
	}
	/**
	* Claims accumulated 24h compound interest on savings.
	*/
	async claimDailyInterest(userId, guildId) {
		const acc = await this.bank.getAccount(userId, guildId);
		const tier = this.getVaultTier(acc.bankTier || 1);
		if (tier.interestRate <= 0) return {
			success: false,
			interestEarned: 0,
			newBankBalance: acc.bank,
			rate: 0,
			error: "Your current vault tier does not yield interest. Upgrade to Community Safe (Tier 2) or higher!"
		};
		const lastClaim = acc.lastInterestClaimedAt || 0;
		const oneDayMs = 864e5;
		const timeSince = Date.now() - lastClaim;
		if (timeSince < oneDayMs) return {
			success: false,
			interestEarned: 0,
			newBankBalance: acc.bank,
			rate: tier.interestRate,
			cooldownRemainingMs: oneDayMs - timeSince,
			error: `Interest is distributed every 24 hours. Next payout in ${Math.ceil((oneDayMs - timeSince) / 6e4)} minutes.`
		};
		if (acc.bank <= 0) return {
			success: false,
			interestEarned: 0,
			newBankBalance: 0,
			rate: tier.interestRate,
			error: "Your bank vault is empty. Deposit funds to earn compound interest!"
		};
		const interest = Math.floor(acc.bank * tier.interestRate);
		const availableSpace = Math.max(0, acc.bankCapacity - acc.bank);
		const actualInterest = Math.min(interest, availableSpace);
		acc.bank += actualInterest;
		acc.stats.totalEarned += actualInterest;
		acc.lastInterestClaimedAt = Date.now();
		await this.bank.saveAccount(acc);
		return {
			success: true,
			interestEarned: actualInterest,
			newBankBalance: acc.bank,
			rate: tier.interestRate
		};
	}
};
// src/modules/LoanManager.ts
/**
* @m3rcena/eco
* Credit Score, Bank Loans & Debt Collection Engine.
*
* @copyright 2026 M3rcena Development. All rights reserved.
* @license Apache-2.0
*/
const LOAN_CATALOG = [
	{
		tier: "starter",
		name: "Micro Personal Advance",
		principal: 1e4,
		interestRate: .05,
		totalDue: 10500,
		minCreditScore: 500,
		durationHours: 48,
		description: "Low-risk starter loan to fund early work tools or safety equipment."
	},
	{
		tier: "business",
		name: "Small Enterprise Commercial Credit",
		principal: 5e4,
		interestRate: .08,
		totalDue: 54e3,
		minCreditScore: 600,
		durationHours: 72,
		description: "Working capital to acquire commercial businesses or hire employees."
	},
	{
		tier: "commercial",
		name: "Metropolitan Venture Capital Loan",
		principal: 25e4,
		interestRate: .12,
		totalDue: 28e4,
		minCreditScore: 700,
		durationHours: 96,
		description: "Substantial institutional backing for high-stakes market operations."
	},
	{
		tier: "whale",
		name: "Syndicate High-Roller Credit Line",
		principal: 1e6,
		interestRate: .15,
		totalDue: 115e4,
		minCreditScore: 780,
		durationHours: 120,
		description: "Massive institutional liquidity reserved for elite tycoons and syndicates."
	}
];
var LoanManager = class {
	bank;
	offers = LOAN_CATALOG;
	constructor(bank, customOffers) {
		this.bank = bank;
		if (customOffers && customOffers.length > 0) this.offers = customOffers;
	}
	getOffers() {
		return this.offers;
	}
	getRatingForScore(score) {
		if (score >= 800) return "EXCELLENT";
		if (score >= 740) return "VERY_GOOD";
		if (score >= 670) return "GOOD";
		if (score >= 580) return "FAIR";
		return "POOR";
	}
	async getCreditScore(userId, guildId) {
		const acc = await this.bank.getAccount(userId, guildId);
		if (!acc.creditScore) {
			acc.creditScore = {
				score: 650,
				rating: "FAIR",
				loansRepaid: 0,
				defaultsCount: 0,
				taxesPaid: 0
			};
			await this.bank.saveAccount(acc);
		}
		acc.creditScore.rating = this.getRatingForScore(acc.creditScore.score);
		return acc.creditScore;
	}
	async getUserLoans(userId, guildId) {
		return (await this.bank.getAccount(userId, guildId)).loans || [];
	}
	/**
	* Applies for a new bank loan.
	*/
	async applyLoan(userId, tier, guildId) {
		const offer = this.offers.find((o) => o.tier === tier);
		if (!offer) return {
			success: false,
			creditScore: 0,
			error: `Loan tier "${tier}" does not exist.`
		};
		const acc = await this.bank.getAccount(userId, guildId);
		const credit = await this.getCreditScore(userId, guildId);
		if (credit.score < offer.minCreditScore) return {
			success: false,
			creditScore: credit.score,
			error: `Credit score too low for ${offer.name}. Required: ${offer.minCreditScore}, Your Score: ${credit.score} (${credit.rating}).`
		};
		if ((acc.loans || []).filter((l) => l.status === "active").length >= 2) return {
			success: false,
			creditScore: credit.score,
			error: "Maximum of 2 concurrent active loans permitted. Please repay outstanding debts first."
		};
		if ((acc.loans || []).some((l) => l.status === "defaulted")) return {
			success: false,
			creditScore: credit.score,
			error: "Your account is flagged for an outstanding defaulted debt! Settle past debts to unfreeze credit lines."
		};
		const now = Date.now();
		const newLoan = {
			id: "loan_" + Math.random().toString(36).substring(2, 8),
			tier: offer.tier,
			name: offer.name,
			principal: offer.principal,
			totalDue: offer.totalDue,
			remainingDue: offer.totalDue,
			takenAt: now,
			dueAt: now + offer.durationHours * 3600 * 1e3,
			status: "active"
		};
		if (!acc.loans) acc.loans = [];
		acc.loans.push(newLoan);
		acc.wallet += offer.principal;
		acc.stats.totalEarned += offer.principal;
		await this.bank.saveAccount(acc);
		return {
			success: true,
			loan: newLoan,
			creditScore: credit.score
		};
	}
	/**
	* Repays active debt.
	*/
	async repayLoan(userId, loanId, amount, guildId) {
		const acc = await this.bank.getAccount(userId, guildId);
		const loan = (acc.loans || []).find((l) => l.id === loanId);
		if (!loan) return {
			success: false,
			amountPaid: 0,
			remainingDue: 0,
			isFullyPaid: false,
			newCreditScore: 0,
			error: `Loan "${loanId}" not found.`
		};
		if (loan.status === "paid") return {
			success: false,
			amountPaid: 0,
			remainingDue: 0,
			isFullyPaid: true,
			newCreditScore: acc.creditScore?.score || 650,
			error: "This loan has already been fully repaid."
		};
		const paymentAmount = amount === "all" ? loan.remainingDue : Math.min(amount, loan.remainingDue);
		if (acc.wallet < paymentAmount) return {
			success: false,
			amountPaid: 0,
			remainingDue: loan.remainingDue,
			isFullyPaid: false,
			newCreditScore: acc.creditScore?.score || 650,
			error: `Insufficient funds in wallet. Need $${paymentAmount.toLocaleString()}, you have $${acc.wallet.toLocaleString()}.`
		};
		acc.wallet -= paymentAmount;
		acc.stats.totalSpent += paymentAmount;
		loan.remainingDue = Math.max(0, loan.remainingDue - paymentAmount);
		let isFullyPaid = false;
		let scoreBoost = 0;
		if (!acc.creditScore) acc.creditScore = {
			score: 650,
			rating: "FAIR",
			loansRepaid: 0,
			defaultsCount: 0,
			taxesPaid: 0
		};
		if (loan.remainingDue <= 0) {
			loan.status = "paid";
			isFullyPaid = true;
			acc.creditScore.loansRepaid += 1;
			scoreBoost = loan.tier === "whale" ? 45 : loan.tier === "commercial" ? 35 : loan.tier === "business" ? 25 : 15;
			acc.creditScore.score = Math.min(850, acc.creditScore.score + scoreBoost);
			acc.creditScore.rating = this.getRatingForScore(acc.creditScore.score);
		}
		await this.bank.saveAccount(acc);
		return {
			success: true,
			amountPaid: paymentAmount,
			remainingDue: loan.remainingDue,
			isFullyPaid,
			newCreditScore: acc.creditScore.score
		};
	}
	/**
	* Audits active debts and executes repo / collections on defaulted loans.
	*/
	async processCollections(userId, guildId) {
		const acc = await this.bank.getAccount(userId, guildId);
		const loans = acc.loans || [];
		const now = Date.now();
		const defaulted = [];
		let totalGarnished = 0;
		let totalPenalty = 0;
		if (!acc.creditScore) acc.creditScore = {
			score: 650,
			rating: "FAIR",
			loansRepaid: 0,
			defaultsCount: 0,
			taxesPaid: 0
		};
		for (const loan of loans) if (loan.status === "active" && now > loan.dueAt) {
			loan.status = "defaulted";
			defaulted.push(loan);
			acc.creditScore.defaultsCount += 1;
			const penalty = 75;
			acc.creditScore.score = Math.max(300, acc.creditScore.score - penalty);
			totalPenalty += penalty;
			const garnishment = Math.min(loan.remainingDue, Math.floor(acc.wallet * .6));
			if (garnishment > 0) {
				acc.wallet -= garnishment;
				loan.remainingDue -= garnishment;
				totalGarnished += garnishment;
			}
		}
		acc.creditScore.rating = this.getRatingForScore(acc.creditScore.score);
		if (defaulted.length > 0) await this.bank.saveAccount(acc);
		return {
			defaultedLoans: defaulted,
			garnishedCash: totalGarnished,
			scorePenalty: totalPenalty,
			newScore: acc.creditScore.score
		};
	}
};
// src/modules/TaxManager.ts
/**
* @m3rcena/eco
* Municipal Bills, Progressive Wealth Taxes & IRS Audit Engine.
*
* @copyright 2026 M3rcena Development. All rights reserved.
* @license Apache-2.0
*/
var TaxManager = class {
	bank;
	constructor(bank) {
		this.bank = bank;
	}
	async getPendingBills(userId, guildId) {
		return ((await this.bank.getAccount(userId, guildId)).bills || []).filter((b) => !b.isPaid);
	}
	async getAllBills(userId, guildId) {
		return (await this.bank.getAccount(userId, guildId)).bills || [];
	}
	/**
	* Generates municipal bills & progressive wealth taxes if due.
	*/
	async generateBillsIfDue(userId, guildId) {
		const acc = await this.bank.getAccount(userId, guildId);
		const now = Date.now();
		acc.streak.lastMonthly;
		if (!acc.bills) acc.bills = [];
		if (acc.bills.filter((b) => !b.isPaid).length >= 4) return {
			generated: false,
			newBills: [],
			totalBilled: 0
		};
		const netWorth = acc.wallet + acc.bank;
		const newBills = [];
		const utilityCost = 1500 + (acc.businesses || []).length * 800;
		newBills.push({
			id: "bill_util_" + Math.random().toString(36).substring(2, 8),
			type: "utility",
			title: "⚡ Quantum Grid & Data Bandwidth Utilities",
			amount: utilityCost,
			issuedAt: now,
			dueAt: now + 1728e5,
			isPaid: false
		});
		const vaultTier = acc.bankTier || 1;
		if (vaultTier > 1) {
			const maintenance = vaultTier * 1250;
			newBills.push({
				id: "bill_vault_" + Math.random().toString(36).substring(2, 8),
				type: "vault_maintenance",
				title: "🛡️ High-Security Vault Armored Maintenance",
				amount: maintenance,
				issuedAt: now,
				dueAt: now + 2592e5,
				isPaid: false
			});
		}
		if (netWorth >= 5e4) {
			let taxRate = .02;
			if (netWorth >= 1e6) taxRate = .08;
			else if (netWorth >= 25e4) taxRate = .05;
			const taxAmount = Math.floor(netWorth * taxRate);
			newBills.push({
				id: "bill_tax_" + Math.random().toString(36).substring(2, 8),
				type: "wealth_tax",
				title: `🏛️ Department of Revenue: ${(taxRate * 100).toFixed(0)}% Progressive Wealth Tax`,
				amount: taxAmount,
				issuedAt: now,
				dueAt: now + 3456e5,
				isPaid: false
			});
		}
		acc.bills.push(...newBills);
		await this.bank.saveAccount(acc);
		return {
			generated: true,
			newBills,
			totalBilled: newBills.reduce((sum, b) => sum + b.amount, 0)
		};
	}
	/**
	* Pays a specific municipal bill.
	*/
	async payBill(userId, billId, guildId) {
		const acc = await this.bank.getAccount(userId, guildId);
		const bill = (acc.bills || []).find((b) => b.id === billId);
		if (!bill) return {
			success: false,
			amountPaid: 0,
			newCreditScore: 0,
			error: `Bill "${billId}" not found.`
		};
		if (bill.isPaid) return {
			success: false,
			amountPaid: 0,
			newCreditScore: acc.creditScore?.score || 650,
			error: "This bill has already been settled."
		};
		if (acc.wallet < bill.amount) return {
			success: false,
			amountPaid: 0,
			newCreditScore: acc.creditScore?.score || 650,
			error: `Insufficient cash in wallet. Bill amount: $${bill.amount.toLocaleString()}, you have $${acc.wallet.toLocaleString()}.`
		};
		acc.wallet -= bill.amount;
		acc.stats.totalSpent += bill.amount;
		bill.isPaid = true;
		if (!acc.creditScore) acc.creditScore = {
			score: 650,
			rating: "FAIR",
			loansRepaid: 0,
			defaultsCount: 0,
			taxesPaid: 0
		};
		acc.creditScore.taxesPaid += 1;
		acc.creditScore.score = Math.min(850, acc.creditScore.score + 10);
		await this.bank.saveAccount(acc);
		return {
			success: true,
			bill,
			amountPaid: bill.amount,
			newCreditScore: acc.creditScore.score
		};
	}
	/**
	* Settles all pending municipal bills at once.
	*/
	async payAllBills(userId, guildId) {
		const acc = await this.bank.getAccount(userId, guildId);
		const pending = (acc.bills || []).filter((b) => !b.isPaid);
		if (pending.length === 0) return {
			success: true,
			paidCount: 0,
			totalAmountPaid: 0,
			newCreditScore: acc.creditScore?.score || 650
		};
		const totalCost = pending.reduce((sum, b) => sum + b.amount, 0);
		if (acc.wallet < totalCost) return {
			success: false,
			paidCount: 0,
			totalAmountPaid: 0,
			newCreditScore: acc.creditScore?.score || 650,
			error: `Insufficient cash to settle all bills. Total: $${totalCost.toLocaleString()}, you have $${acc.wallet.toLocaleString()}.`
		};
		acc.wallet -= totalCost;
		acc.stats.totalSpent += totalCost;
		for (const b of pending) b.isPaid = true;
		if (!acc.creditScore) acc.creditScore = {
			score: 650,
			rating: "FAIR",
			loansRepaid: 0,
			defaultsCount: 0,
			taxesPaid: 0
		};
		acc.creditScore.taxesPaid += pending.length;
		acc.creditScore.score = Math.min(850, acc.creditScore.score + 25);
		await this.bank.saveAccount(acc);
		return {
			success: true,
			paidCount: pending.length,
			totalAmountPaid: totalCost,
			newCreditScore: acc.creditScore.score
		};
	}
	/**
	* Attempts high-risk offshore tax evasion to wipe pending wealth taxes.
	*/
	async attemptTaxEvasion(userId, guildId) {
		const acc = await this.bank.getAccount(userId, guildId);
		const wealthTaxBills = (acc.bills || []).filter((b) => !b.isPaid && b.type === "wealth_tax");
		if (wealthTaxBills.length === 0) return {
			success: false,
			taxesEvaded: 0,
			penaltyFined: 0,
			creditScoreChange: 0,
			newCreditScore: acc.creditScore?.score || 650,
			auditDetails: "No active wealth tax bills to evade."
		};
		const totalTaxes = wealthTaxBills.reduce((sum, b) => sum + b.amount, 0);
		const isEvaded = Math.random() < ((acc.bankTier || 1) >= 5 ? .65 : .4);
		if (!acc.creditScore) acc.creditScore = {
			score: 650,
			rating: "FAIR",
			loansRepaid: 0,
			defaultsCount: 0,
			taxesPaid: 0
		};
		if (isEvaded) {
			for (const b of wealthTaxBills) b.isPaid = true;
			await this.bank.saveAccount(acc);
			return {
				success: true,
				taxesEvaded: totalTaxes,
				penaltyFined: 0,
				creditScoreChange: 0,
				newCreditScore: acc.creditScore.score,
				auditDetails: `💼 **OFFSHORE SUCCESS!** Routed $${totalTaxes.toLocaleString()} through anonymous Swiss shell trusts. Taxes eliminated!`
			};
		} else {
			const fine = Math.floor(totalTaxes * 2.2);
			acc.wallet = Math.max(0, acc.wallet - fine);
			acc.stats.totalSpent += fine;
			acc.creditScore.score = Math.max(300, acc.creditScore.score - 50);
			for (const b of wealthTaxBills) b.isPaid = true;
			await this.bank.saveAccount(acc);
			return {
				success: false,
				taxesEvaded: 0,
				penaltyFined: fine,
				creditScoreChange: -50,
				newCreditScore: acc.creditScore.score,
				auditDetails: `🚨 **IRS AUDIT TRIGGERED!** Regulators seized illicit ledgers. Fined 2.2x penalty of $${fine.toLocaleString()} and credit score penalized!`
			};
		}
	}
};
// src/canvas/RenderBankCard.ts
/**
* @m3rcena/eco
* Visual Canvas Bank Card & Passport Renderer.
* Generates personalized debit/credit card artwork using @napi-rs/canvas.
*
* @copyright 2026 M3rcena Development. All rights reserved.
* @license Apache-2.0
*/
var RenderBankCard = class {
	/**
	* Generates a high-tech personalized debit/credit card buffer.
	*/
	static async renderCard(options) {
		const width = 850;
		const height = 500;
		const canvas = createCanvas(width, height);
		const ctx = canvas.getContext("2d");
		const tier = options.cardTier || this.resolveTier(options.netWorth);
		const symbol = options.currencySymbol || "🪙";
		const radius = 28;
		ctx.save();
		ctx.beginPath();
		ctx.moveTo(radius, 0);
		ctx.lineTo(822, 0);
		ctx.quadraticCurveTo(width, 0, width, radius);
		ctx.lineTo(width, 472);
		ctx.quadraticCurveTo(width, height, 822, height);
		ctx.lineTo(radius, height);
		ctx.quadraticCurveTo(0, height, 0, 472);
		ctx.lineTo(0, radius);
		ctx.quadraticCurveTo(0, 0, radius, 0);
		ctx.closePath();
		ctx.clip();
		const bgGrad = ctx.createLinearGradient(0, 0, width, height);
		if (options.customGradient && options.customGradient.length === 3) {
			bgGrad.addColorStop(0, options.customGradient[0]);
			bgGrad.addColorStop(.5, options.customGradient[1]);
			bgGrad.addColorStop(1, options.customGradient[2]);
		} else if (tier === "MYTHIC") {
			bgGrad.addColorStop(0, "#0f051d");
			bgGrad.addColorStop(.5, "#2a0845");
			bgGrad.addColorStop(1, "#6441a5");
		} else if (tier === "OBSIDIAN") {
			bgGrad.addColorStop(0, "#0a0a0c");
			bgGrad.addColorStop(.5, "#18181b");
			bgGrad.addColorStop(1, "#27272a");
		} else if (tier === "PLATINUM") {
			bgGrad.addColorStop(0, "#1e293b");
			bgGrad.addColorStop(.5, "#334155");
			bgGrad.addColorStop(1, "#64748b");
		} else if (tier === "GOLD") {
			bgGrad.addColorStop(0, "#2c1c02");
			bgGrad.addColorStop(.5, "#78350f");
			bgGrad.addColorStop(1, "#d97706");
		} else if (tier === "SILVER") {
			bgGrad.addColorStop(0, "#1e1e24");
			bgGrad.addColorStop(.5, "#4b5563");
			bgGrad.addColorStop(1, "#9ca3af");
		} else {
			bgGrad.addColorStop(0, "#1c1008");
			bgGrad.addColorStop(.5, "#451a03");
			bgGrad.addColorStop(1, "#92400e");
		}
		ctx.fillStyle = bgGrad;
		ctx.fillRect(0, 0, width, height);
		ctx.save();
		ctx.lineWidth = 1.5;
		ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
		for (let i = 0; i < 6; i++) {
			ctx.beginPath();
			ctx.arc(770, -40, 220 + i * 50, 0, Math.PI * 2);
			ctx.stroke();
		}
		ctx.restore();
		const brandName = options.bankName || "M3RCENA RESERVE";
		ctx.fillStyle = "#ffffff";
		ctx.font = "800 28px sans-serif";
		ctx.fillText(brandName, 50, 65);
		const subtitle = options.vaultTierName ? `VAULT: ${options.vaultTierName.toUpperCase()}` : "PRIVATE WEALTH & VAULT";
		ctx.fillStyle = "rgba(255, 255, 255, 0.65)";
		ctx.font = "600 16px sans-serif";
		ctx.fillText(subtitle, 50, 92);
		this.drawContactless(ctx, 770, 65);
		this.drawChip(ctx, 50, 140);
		ctx.save();
		ctx.fillStyle = "rgba(255, 255, 255, 0.12)";
		ctx.font = "900 48px sans-serif";
		ctx.textAlign = "right";
		ctx.fillText(tier, 800, 180);
		ctx.restore();
		const cardNum = options.cardNumber || `4280 •••• •••• ${Math.floor(1e3 + Math.random() * 9e3)}`;
		ctx.fillStyle = "#f8fafc";
		ctx.font = "600 32px monospace";
		ctx.letterSpacing = "4px";
		ctx.shadowColor = "rgba(0, 0, 0, 0.75)";
		ctx.shadowBlur = 4;
		ctx.fillText(cardNum, 50, 265);
		ctx.shadowBlur = 0;
		ctx.fillStyle = "rgba(255, 255, 255, 0.6)";
		ctx.font = "700 13px sans-serif";
		ctx.fillText("TOTAL NET WORTH", 50, 325);
		ctx.fillText("WALLET / VAULT", 360, 325);
		ctx.fillStyle = "#38bdf8";
		ctx.font = "800 24px sans-serif";
		ctx.fillText(`${symbol} ${options.netWorth.toLocaleString()}`, 50, 355);
		ctx.fillStyle = "#10b981";
		ctx.font = "700 20px sans-serif";
		ctx.fillText(`${symbol} ${options.wallet.toLocaleString()}`, 360, 355);
		ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
		ctx.font = "600 16px sans-serif";
		ctx.fillText(`+ ${symbol} ${options.bank.toLocaleString()} in bank`, 360, 380);
		ctx.fillStyle = "rgba(255, 255, 255, 0.6)";
		ctx.font = "700 13px sans-serif";
		const creditStr = options.creditScore ? ` • FICO CREDIT: ${options.creditScore}` : "";
		ctx.fillText(`CARDHOLDER${creditStr}`, 50, 425);
		ctx.fillStyle = "#ffffff";
		ctx.font = "800 24px sans-serif";
		ctx.fillText(options.username.toUpperCase(), 50, 455);
		if (options.avatarUrl) try {
			const avatarImg = await loadImage(options.avatarUrl);
			const avX = 740;
			const avY = 390;
			const avSize = 65;
			ctx.save();
			ctx.beginPath();
			ctx.arc(772.5, 422.5, avSize / 2, 0, Math.PI * 2);
			ctx.closePath();
			ctx.clip();
			ctx.drawImage(avatarImg, avX, avY, avSize, avSize);
			ctx.restore();
			ctx.strokeStyle = "#38bdf8";
			ctx.lineWidth = 3;
			ctx.beginPath();
			ctx.arc(772.5, 422.5, avSize / 2, 0, Math.PI * 2);
			ctx.stroke();
		} catch {}
		this.drawHoloCircles(ctx, 670, 422);
		ctx.restore();
		return canvas.toBuffer("image/png");
	}
	static resolveTier(netWorth) {
		if (netWorth >= 5e6) return "MYTHIC";
		if (netWorth >= 1e6) return "OBSIDIAN";
		if (netWorth >= 25e4) return "PLATINUM";
		if (netWorth >= 5e4) return "GOLD";
		if (netWorth >= 1e4) return "SILVER";
		return "BRONZE";
	}
	static drawChip(ctx, x, y) {
		const chipW = 60;
		const chipH = 46;
		ctx.save();
		ctx.fillStyle = "#e2b860";
		ctx.strokeStyle = "#92681e";
		ctx.lineWidth = 1.5;
		ctx.beginPath();
		ctx.roundRect ? ctx.roundRect(x, y, chipW, chipH, 8) : ctx.rect(x, y, chipW, chipH);
		ctx.fill();
		ctx.stroke();
		ctx.beginPath();
		ctx.moveTo(x + chipW * .35, y);
		ctx.lineTo(x + chipW * .35, y + chipH);
		ctx.moveTo(x + chipW * .65, y);
		ctx.lineTo(x + chipW * .65, y + chipH);
		ctx.moveTo(x, y + chipH * .5);
		ctx.lineTo(x + chipW, y + chipH * .5);
		ctx.stroke();
		ctx.restore();
	}
	static drawContactless(ctx, x, y) {
		ctx.save();
		ctx.strokeStyle = "rgba(255, 255, 255, 0.75)";
		ctx.lineWidth = 2.5;
		ctx.lineCap = "round";
		for (let i = 0; i < 3; i++) {
			ctx.beginPath();
			ctx.arc(x, y, 12 + i * 8, -Math.PI * .3, Math.PI * .3);
			ctx.stroke();
		}
		ctx.restore();
	}
	static drawHoloCircles(ctx, x, y) {
		ctx.save();
		ctx.beginPath();
		ctx.arc(x - 14, y, 22, 0, Math.PI * 2);
		ctx.fillStyle = "rgba(239, 68, 68, 0.7)";
		ctx.fill();
		ctx.beginPath();
		ctx.arc(x + 14, y, 22, 0, Math.PI * 2);
		ctx.fillStyle = "rgba(245, 158, 11, 0.7)";
		ctx.fill();
		ctx.restore();
	}
};
// src/canvas/RenderMarketChart.ts
/**
* @m3rcena/eco
* Stock & Crypto Canvas Chart Renderer.
* Generates dynamic candlestick / sparkline price trend charts.
*
* @copyright 2026 M3rcena Development. All rights reserved.
* @license Apache-2.0
*/
var RenderMarketChart = class {
	/**
	* Generates a sleek dark mode price chart buffer.
	*/
	static renderChart(options) {
		const width = 800;
		const height = 400;
		const canvas = createCanvas(width, height);
		const ctx = canvas.getContext("2d");
		const isPositive = options.change24h >= 0;
		const accentColor = isPositive ? "#10b981" : "#ef4444";
		const history = options.history && options.history.length > 1 ? options.history : [options.currentPrice * .95, options.currentPrice];
		ctx.fillStyle = "#090d16";
		ctx.fillRect(0, 0, width, height);
		ctx.strokeStyle = "rgba(255, 255, 255, 0.05)";
		ctx.lineWidth = 1;
		for (let y = 80; y < 350; y += 50) {
			ctx.beginPath();
			ctx.moveTo(40, y);
			ctx.lineTo(760, y);
			ctx.stroke();
		}
		ctx.fillStyle = "#ffffff";
		ctx.font = "800 24px sans-serif";
		ctx.fillText(`${options.symbol}  •  ${options.name}`, 40, 48);
		const sym = options.currencySymbol || "$";
		ctx.font = "800 28px monospace";
		ctx.fillStyle = "#ffffff";
		ctx.fillText(`${sym}${options.currentPrice.toLocaleString(void 0, {
			minimumFractionDigits: 2,
			maximumFractionDigits: 2
		})}`, 40, 90);
		ctx.font = "700 18px monospace";
		ctx.fillStyle = accentColor;
		const sign = isPositive ? "+" : "";
		ctx.fillText(`${sign}${options.change24h.toFixed(2)}% (24h)`, 280, 90);
		const minVal = Math.min(...history) * .98;
		const maxVal = Math.max(...history) * 1.02;
		const range = maxVal - minVal || 1;
		const plotX = 40;
		const plotY = 130;
		const plotW = 720;
		const plotH = 230;
		const points = [];
		for (let i = 0; i < history.length; i++) {
			const x = plotX + i / (history.length - 1) * plotW;
			const y = 360 - (history[i] - minVal) / range * plotH;
			points.push({
				x,
				y
			});
		}
		const areaGrad = ctx.createLinearGradient(0, plotY, 0, 360);
		areaGrad.addColorStop(0, isPositive ? "rgba(16, 185, 129, 0.25)" : "rgba(239, 68, 68, 0.25)");
		areaGrad.addColorStop(1, "rgba(0, 0, 0, 0)");
		ctx.beginPath();
		ctx.moveTo(points[0].x, 360);
		for (const pt of points) ctx.lineTo(pt.x, pt.y);
		ctx.lineTo(points[points.length - 1].x, 360);
		ctx.closePath();
		ctx.fillStyle = areaGrad;
		ctx.fill();
		ctx.strokeStyle = accentColor;
		ctx.lineWidth = 3;
		ctx.lineCap = "round";
		ctx.lineJoin = "round";
		ctx.beginPath();
		ctx.moveTo(points[0].x, points[0].y);
		for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x, points[i].y);
		ctx.stroke();
		const lastPt = points[points.length - 1];
		ctx.fillStyle = accentColor;
		ctx.shadowColor = accentColor;
		ctx.shadowBlur = 10;
		ctx.beginPath();
		ctx.arc(lastPt.x, lastPt.y, 6, 0, Math.PI * 2);
		ctx.fill();
		ctx.shadowBlur = 0;
		ctx.font = "600 13px sans-serif";
		ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
		ctx.fillText(`24h Low: ${sym}${minVal.toFixed(2)}`, 40, 384);
		ctx.fillText(`24h High: ${sym}${maxVal.toFixed(2)}`, 600, 384);
		return canvas.toBuffer("image/png");
	}
};
// src/utils/Notifier.ts
/**
* @m3rcena/eco
* Terminal update notification box utility.
*
* @copyright 2026 M3rcena Development. All rights reserved.
* @license Apache-2.0
*/
const yellow = (s) => `\x1b[33m${s}\x1b[39m`;
const green = (s) => `\x1b[32m${s}\x1b[39m`;
const red = (s) => `\x1b[31m${s}\x1b[39m`;
const cyan = (s) => `\x1b[36m${s}\x1b[39m`;
const ECO_VERSION = "14.28.1";
/**
* Strips ANSI color escape codes to compute visible string length.
*/
function stripAnsi(str) {
	return str.replace(/\x1B\[[0-9;]*[a-zA-Z]/g, "");
}
/**
* Renders an array of text messages inside a styled terminal box.
*/
function boxConsole(messages) {
	const stripped = messages.map((m) => stripAnsi(m));
	const maxLen = Math.max(...stripped.map((s) => s.length)) + 8;
	const line = yellow("─".repeat(maxLen));
	console.log(yellow("┌") + line + yellow("┐"));
	console.log(yellow("│") + " ".repeat(maxLen) + yellow("│"));
	for (let i = 0; i < messages.length; i++) {
		const padTotal = maxLen - stripped[i].length;
		const padLeft = Math.floor(padTotal / 2);
		const padRight = padTotal - padLeft;
		console.log(yellow("│") + " ".repeat(padLeft) + messages[i] + " ".repeat(padRight) + yellow("│"));
	}
	console.log(yellow("│") + " ".repeat(maxLen) + yellow("│"));
	console.log(yellow("└") + line + yellow("┘"));
}
/**
* Compares two semantic version strings.
* Returns -1 if v1 < v2, 0 if equal, 1 if v1 > v2.
*/
function compareSemver(v1, v2) {
	const clean1 = v1.replace(/^v/, "").split("-")[0].split(".").map((n) => parseInt(n, 10) || 0);
	const clean2 = v2.replace(/^v/, "").split("-")[0].split(".").map((n) => parseInt(n, 10) || 0);
	for (let i = 0; i < Math.max(clean1.length, clean2.length); i++) {
		const num1 = clean1[i] || 0;
		const num2 = clean2[i] || 0;
		if (num1 > num2) return 1;
		if (num1 < num2) return -1;
	}
	return 0;
}
/**
* Fetches the latest published version of `@m3rcena/eco` from the npm registry.
*/
async function fetchLatestVersion() {
	try {
		const controller = new AbortController();
		const timer = setTimeout(() => controller.abort(), 3500);
		timer.unref?.();
		const res = await fetch("https://registry.npmjs.org/@m3rcena/eco/latest", {
			signal: controller.signal,
			headers: { "User-Agent": "@m3rcena/eco-update-notifier" }
		});
		clearTimeout(timer);
		if (res.ok) {
			const data = await res.json();
			return typeof data.version === "string" ? data.version : null;
		}
	} catch {
		try {
			const { exec } = await import("child_process");
			const { promisify } = await import("util");
			const { stdout } = await promisify(exec)("npm show @m3rcena/eco version", { timeout: 3500 });
			return stdout.trim() || null;
		} catch {
			return null;
		}
	}
	return null;
}
/**
* Checks if a newer version of `@m3rcena/eco` is available and logs the notification box.
*/
async function checkPackageUpdates(currentVersion = ECO_VERSION, disabled) {
	if (disabled) return;
	try {
		const latest = await fetchLatestVersion();
		if (!latest) return;
		if (compareSemver(currentVersion, latest) < 0) boxConsole([
			`New ${green("version")} of ${yellow("@m3rcena/eco")} is available!`,
			`${red(currentVersion)} -> ${green(latest)}`,
			`Registry: ${cyan("https://www.npmjs.com/package/@m3rcena/eco")}`,
			`Run ${green(`npm i @m3rcena/eco@${latest}`)} to update!`
		]);
	} catch {}
}
// src/bridge/EcoBridgeRouter.ts
/**
* @m3rcena/eco
* Economy Bridge Package Router & Decoupled State Gateway.
* Provides unified HTTP endpoints and WebSocket routing for real-time account dossiers,
* bank vault upgrades, credit score management, loan issuance, bill settlement,
* stock market trading, and custom visual Canvas card rendering.
*
* @copyright 2026 M3rcena Development. All rights reserved.
* @license Apache-2.0
*/
var EcoBridgeRouter = class {
	name = "economy";
	basePath = "/api/eco";
	description = "Universal economy engine, financial banking, loans, taxes, stock market, and debit card rendering.";
	version = ECO_VERSION;
	eco;
	constructor(eco) {
		this.eco = eco;
	}
	async handleRequest(req) {
		const path = req.subPath.replace(/\/+$/, "") || "/";
		const method = req.method.toUpperCase();
		if (path.startsWith("/account/") && method === "GET") {
			const userId = path.replace("/account/", "").split("/")[0];
			const guildId = req.query.guildId || void 0;
			try {
				const acc = await this.eco.getAccount(userId, guildId);
				const credit = await this.eco.getCreditScore(userId, guildId);
				const vault = await this.eco.getUserVault(userId, guildId);
				const loans = await this.eco.getUserLoans(userId, guildId);
				const bills = await this.eco.getPendingBills(userId, guildId);
				const portfolio = await this.eco.getStockPortfolio(userId, guildId);
				return {
					status: 200,
					body: {
						userId: acc.userId,
						wallet: acc.wallet,
						bank: acc.bank,
						bankCapacity: acc.bankCapacity,
						netWorth: acc.wallet + acc.bank,
						level: acc.level,
						xp: acc.xp,
						streak: acc.streak?.daily || 0,
						vault,
						creditScore: credit,
						loans,
						bills,
						portfolio,
						businesses: acc.businesses || [],
						inventory: acc.inventory || [],
						pets: acc.pets || []
					}
				};
			} catch (err) {
				return {
					status: 500,
					body: { error: err.message }
				};
			}
		}
		if (path === "/vault/upgrade" && method === "POST") {
			const { userId, guildId } = req.body || {};
			if (!userId) return {
				status: 400,
				body: { error: "Missing userId" }
			};
			const res = await this.eco.upgradeVault(userId, guildId);
			return {
				status: res.success ? 200 : 400,
				body: res
			};
		}
		if (path === "/vault/interest" && method === "POST") {
			const { userId, guildId } = req.body || {};
			if (!userId) return {
				status: 400,
				body: { error: "Missing userId" }
			};
			const res = await this.eco.claimDailyInterest(userId, guildId);
			return {
				status: res.success ? 200 : 400,
				body: res
			};
		}
		if (path === "/loans/offers" && method === "GET") return {
			status: 200,
			body: { offers: this.eco.loans ? this.eco.loans.getOffers() : [] }
		};
		if (path === "/loans/apply" && method === "POST") {
			const { userId, tier, guildId } = req.body || {};
			if (!userId || !tier) return {
				status: 400,
				body: { error: "Missing userId or tier" }
			};
			const res = await this.eco.applyLoan(userId, tier, guildId);
			return {
				status: res.success ? 200 : 400,
				body: res
			};
		}
		if (path === "/loans/repay" && method === "POST") {
			const { userId, loanId, amount, guildId } = req.body || {};
			if (!userId) return {
				status: 400,
				body: { error: "Missing userId" }
			};
			let targetLoanId = loanId;
			if (!targetLoanId) {
				const active = (await this.eco.getUserLoans(userId, guildId)).find((l) => l.status === "active");
				if (active) targetLoanId = active.id;
			}
			if (!targetLoanId) return {
				status: 400,
				body: { error: "No active loan found to repay" }
			};
			const res = await this.eco.repayLoan(userId, targetLoanId, amount || "all", guildId);
			return {
				status: res.success ? 200 : 400,
				body: res
			};
		}
		if (path.startsWith("/bills/") && method === "GET") {
			const userId = path.replace("/bills/", "").split("/")[0];
			const guildId = req.query.guildId || void 0;
			return {
				status: 200,
				body: { bills: await this.eco.getPendingBills(userId, guildId) }
			};
		}
		if (path === "/bills/pay" && method === "POST") {
			const { userId, billId, payAll, guildId } = req.body || {};
			if (!userId) return {
				status: 400,
				body: { error: "Missing userId" }
			};
			if (payAll) {
				const res = await this.eco.payAllBills(userId, guildId);
				return {
					status: res.success ? 200 : 400,
					body: res
				};
			}
			if (billId) {
				const res = await this.eco.payBill(userId, billId, guildId);
				return {
					status: res.success ? 200 : 400,
					body: res
				};
			}
			return {
				status: 400,
				body: { error: "Provide either billId or payAll: true" }
			};
		}
		if (path === "/stocks" && method === "GET") {
			const stocks = this.eco.getStocks();
			return {
				status: 200,
				body: {
					trend: this.eco.stocks ? this.eco.stocks.getMarketTrend() : "STABLE",
					stocks
				}
			};
		}
		if (path === "/stocks/trade" && method === "POST") {
			const { userId, symbol, action, shares, guildId } = req.body || {};
			if (!userId || !symbol || !action || !shares) return {
				status: 400,
				body: { error: "Missing userId, symbol, action (BUY/SELL), or shares" }
			};
			if (action.toUpperCase() === "BUY") {
				const res = await this.eco.buyStock(userId, symbol, parseInt(shares, 10), guildId);
				return {
					status: res.success ? 200 : 400,
					body: res
				};
			} else {
				const res = await this.eco.sellStock(userId, symbol, parseInt(shares, 10), guildId);
				return {
					status: res.success ? 200 : 400,
					body: res
				};
			}
		}
		if (path.startsWith("/cards/debit/") && method === "GET") {
			const userId = path.replace("/cards/debit/", "").split("/")[0];
			const guildId = req.query.guildId || void 0;
			try {
				const acc = await this.eco.getAccount(userId, guildId);
				const credit = await this.eco.getCreditScore(userId, guildId);
				const vault = await this.eco.getUserVault(userId, guildId);
				let customGradient = void 0;
				if (req.query.gradient) {
					const stops = req.query.gradient.split(",");
					if (stops.length === 3) customGradient = [
						stops[0].trim(),
						stops[1].trim(),
						stops[2].trim()
					];
				}
				return {
					status: 200,
					body: await RenderBankCard.renderCard({
						username: req.query.username || acc.userId,
						avatarUrl: req.query.avatarUrl || void 0,
						wallet: acc.wallet,
						bank: acc.bank,
						netWorth: acc.wallet + acc.bank,
						currencySymbol: this.eco.currencySymbol,
						cardTier: req.query.tier || void 0,
						creditScore: credit.score,
						vaultTierName: vault.currentTier.name,
						customGradient,
						bankName: req.query.bankName || void 0
					}),
					isBuffer: true,
					contentType: "image/png"
				};
			} catch (err) {
				return {
					status: 500,
					body: { error: `Failed to render debit card: ${err.message}` }
				};
			}
		}
		if (path.startsWith("/cards/chart/") && method === "GET") {
			const rawSymbol = decodeURIComponent(path.replace("/cards/chart/", "").split("/")[0]).toUpperCase();
			const stock = this.eco.getStock(rawSymbol) || this.eco.getStock(`$${rawSymbol.replace(/^\$/, "")}`);
			if (!stock) return {
				status: 404,
				body: { error: `Stock symbol "${rawSymbol}" not found.` }
			};
			try {
				return {
					status: 200,
					body: await RenderMarketChart.renderChart({
						symbol: stock.symbol,
						name: stock.name,
						currentPrice: stock.currentPrice,
						change24h: stock.change24h,
						history: stock.history
					}),
					isBuffer: true,
					contentType: "image/png"
				};
			} catch (err) {
				return {
					status: 500,
					body: { error: `Failed to render market chart: ${err.message}` }
				};
			}
		}
		if (path === "/leaderboard" && method === "GET") {
			const metric = req.query.metric || "net_worth";
			const limit = parseInt(req.query.limit || "10", 10);
			return {
				status: 200,
				body: {
					metric,
					entries: await this.eco.getLeaderboard(metric, limit)
				}
			};
		}
		return null;
	}
	async handleAction(action) {
		if (action.action === "wallet:add") return this.eco.addWallet(action.playerId, action.payload?.amount || 0);
		if (action.action === "stock:buy") return this.eco.buyStock(action.playerId, action.payload?.symbol, action.payload?.shares || 1);
		if (action.action === "vault:upgrade") return this.eco.upgradeVault(action.playerId);
		return { success: true };
	}
};
// src/connector/EcoWekyConnector.ts
/**
* @m3rcena/eco
* Eco <-> Weky Cross-Package Connector
*
* Connects the Eco economy engine with @m3rcena/weky minigames:
* - Automatically rewards players in cash/coins for winning minigames
* - Deducts optional penalties or wagers upon losing
* - Distributes solo minigame score bonuses (e.g. 2048, Snake, FastType)
* - Rewards consecutive win streaks with multiplier bonuses
* - Manages PvP bet pots / wagers with atomic escrow & refund handling
* - Awards championship prize pools for tournament winners
*
* @copyright 2026 M3rcena Development. All rights reserved.
* @license Apache-2.0
*/
var EcoWekyConnector = class extends EventEmitter {
	eco;
	weky;
	options;
	activeWagers = /* @__PURE__ */ new Map();
	userToWagerMap = /* @__PURE__ */ new Map();
	constructor(eco, weky, options = {}) {
		super();
		if (!eco) throw new TypeError("[EcoWekyConnector] A valid EcoManager instance is required.");
		if (!weky) throw new TypeError("[EcoWekyConnector] A valid WekyManager instance is required.");
		this.eco = eco;
		this.weky = weky;
		this.options = {
			defaultWinReward: 50,
			defaultLossPenalty: 0,
			defaultDrawReward: 10,
			defaultScoreMultiplier: .05,
			maxScoreReward: 500,
			streakBonus: 5,
			tournamentChampionPrize: 500,
			tournamentRunnerUpPrize: 200,
			wagerHouseFee: 0,
			autoReward: true,
			...options
		};
		this.initListeners();
	}
	on(event, listener) {
		return super.on(event, listener);
	}
	once(event, listener) {
		return super.once(event, listener);
	}
	emit(event, ...args) {
		return super.emit(event, ...args);
	}
	off(event, listener) {
		return super.off(event, listener);
	}
	addListener(event, listener) {
		return super.addListener(event, listener);
	}
	removeListener(event, listener) {
		return super.removeListener(event, listener);
	}
	prependListener(event, listener) {
		return super.prependListener(event, listener);
	}
	prependOnceListener(event, listener) {
		return super.prependOnceListener(event, listener);
	}
	initListeners() {
		if (typeof this.weky.on === "function") {
			this.weky.on("gameOver", async (event) => {
				if (!this.options.autoReward) return;
				try {
					await this.handleGameOver(event);
				} catch (err) {
					this.emit("error", err);
				}
			});
			this.weky.on("tournamentEnd", async (event) => {
				if (!this.options.autoReward) return;
				try {
					await this.handleTournamentEnd(event);
				} catch (err) {
					this.emit("error", err);
				}
			});
		}
	}
	/**
	* Creates and escrows a PvP wager match between two players.
	* Both players must have sufficient wallet balances.
	*/
	async createWager(params) {
		const { wagerId, player1Id, player2Id, amount, guildId, game } = params;
		if (amount <= 0) return {
			success: false,
			reason: "Wager amount must be greater than zero."
		};
		if (player1Id === player2Id) return {
			success: false,
			reason: "A player cannot wager against themselves."
		};
		if (await this.getUserWallet(player1Id, guildId) < amount) return {
			success: false,
			reason: "Player 1 has insufficient funds.",
			failedUserId: player1Id
		};
		if (await this.getUserWallet(player2Id, guildId) < amount) return {
			success: false,
			reason: "Player 2 has insufficient funds.",
			failedUserId: player2Id
		};
		await this.deductWallet(player1Id, amount, `Wager escrow for ${game || "match"} vs <@${player2Id}>`, guildId);
		await this.deductWallet(player2Id, amount, `Wager escrow for ${game || "match"} vs <@${player1Id}>`, guildId);
		const record = {
			id: wagerId,
			player1Id,
			player2Id,
			amount,
			totalPot: amount * 2,
			guildId,
			game,
			createdAt: Date.now(),
			status: "active"
		};
		this.activeWagers.set(wagerId, record);
		this.userToWagerMap.set(player1Id, wagerId);
		this.userToWagerMap.set(player2Id, wagerId);
		this.emit("wagerCreated", record);
		return {
			success: true,
			wager: record
		};
	}
	/**
	* Resolves an active wager, awarding the escrowed pot (minus optional house fee) to the winner.
	*/
	async resolveWager(wagerId, winnerId) {
		const wager = this.activeWagers.get(wagerId);
		if (!wager || wager.status !== "active") return null;
		if (winnerId !== wager.player1Id && winnerId !== wager.player2Id) throw new Error(`Winner ${winnerId} is not a participant in wager ${wagerId}`);
		const loserId = winnerId === wager.player1Id ? wager.player2Id : wager.player1Id;
		const feePct = Math.max(0, Math.min(100, this.options.wagerHouseFee ?? 0));
		const houseFee = Math.floor(wager.totalPot * feePct / 100);
		const winAmount = wager.totalPot - houseFee;
		const newBalance = await this.creditWallet(winnerId, winAmount, `Won wager pot in ${wager.game || "PvP"} (+${winAmount} coins)`, wager.guildId);
		wager.status = "resolved";
		wager.winnerId = winnerId;
		this.userToWagerMap.delete(wager.player1Id);
		this.userToWagerMap.delete(wager.player2Id);
		const result = {
			userId: winnerId,
			game: wager.game || "pvp",
			outcome: "WIN",
			amount: winAmount,
			newBalance,
			reason: `Wager Victory vs <@${loserId}>`,
			wagerWon: winAmount
		};
		this.emit("wagerResolved", {
			wager,
			winnerId,
			loserId,
			payout: winAmount,
			houseFee
		});
		return result;
	}
	/**
	* Cancels and refunds an active wager back to both participants.
	*/
	async refundWager(wagerId, reason = "Match cancelled or tied") {
		const wager = this.activeWagers.get(wagerId);
		if (!wager || wager.status !== "active") return false;
		await this.creditWallet(wager.player1Id, wager.amount, `Refund wager: ${reason}`, wager.guildId);
		await this.creditWallet(wager.player2Id, wager.amount, `Refund wager: ${reason}`, wager.guildId);
		wager.status = "refunded";
		this.userToWagerMap.delete(wager.player1Id);
		this.userToWagerMap.delete(wager.player2Id);
		this.emit("wagerRefunded", {
			wager,
			reason
		});
		return true;
	}
	/**
	* Internal handler for Weky gameOver events.
	*/
	async handleGameOver(event) {
		const userId = typeof event.user === "string" ? event.user : event.user?.id;
		if (!userId) return;
		const game = event.game || "unknown";
		const rule = this.options.games?.[game] || {};
		const outcomeRaw = (event.outcome || "").toUpperCase();
		const isWin = outcomeRaw.includes("WIN") || outcomeRaw === "WON" || outcomeRaw === "VICTORY";
		const isLoss = outcomeRaw.includes("LOSE") || outcomeRaw.includes("LOST") || outcomeRaw === "DEFEAT";
		const isTie = outcomeRaw.includes("TIE") || outcomeRaw.includes("DRAW");
		const wagerId = this.userToWagerMap.get(userId) || (event.channelId ? this.userToWagerMap.get(event.channelId) : void 0);
		if (wagerId && this.activeWagers.has(wagerId)) {
			if (isWin) {
				await this.resolveWager(wagerId, userId);
				return;
			} else if (isTie) {
				await this.refundWager(wagerId, "Game ended in a draw");
				return;
			} else if (isLoss) {
				const wager = this.activeWagers.get(wagerId);
				const opponentId = userId === wager.player1Id ? wager.player2Id : wager.player1Id;
				await this.resolveWager(wagerId, opponentId);
				return;
			}
		}
		const winReward = rule.winReward ?? this.options.defaultWinReward ?? 50;
		const lossPenalty = rule.lossPenalty ?? this.options.defaultLossPenalty ?? 0;
		const drawReward = rule.drawReward ?? this.options.defaultDrawReward ?? 10;
		const scoreMultiplier = rule.scoreMultiplier ?? this.options.defaultScoreMultiplier ?? .05;
		const maxScore = rule.maxScoreReward ?? this.options.maxScoreReward ?? 500;
		const streakBonusPerWin = rule.streakBonus ?? this.options.streakBonus ?? 5;
		if (isWin) {
			let streakBonus = 0;
			try {
				const player = await this.weky.leaderboard?.getPlayer(userId);
				if (player && player.winStreak > 0) streakBonus = player.winStreak * streakBonusPerWin;
			} catch {}
			let scoreBonus = 0;
			if (typeof event.score === "number" && event.score > 0) scoreBonus = Math.min(maxScore, Math.floor(event.score * scoreMultiplier));
			const totalWin = winReward + streakBonus + scoreBonus;
			if (totalWin > 0) {
				const result = {
					userId,
					game,
					outcome: "WIN",
					amount: totalWin,
					newBalance: await this.creditWallet(userId, totalWin, `Minigame Victory: ${game} (+${totalWin} coins)`),
					reason: `Won ${game}`,
					streakBonus,
					scoreBonus
				};
				this.emit("reward", result);
			}
		} else if (isLoss) {
			if (lossPenalty > 0) {
				const newBal = await this.deductWallet(userId, lossPenalty, `Minigame Defeat: ${game} (-${lossPenalty} coins)`);
				const result = {
					userId,
					game,
					outcome: "LOSE",
					amount: -lossPenalty,
					newBalance: newBal,
					reason: `Lost ${game}`
				};
				this.emit("penalty", result);
			}
		} else if (isTie) {
			if (drawReward > 0) {
				const result = {
					userId,
					game,
					outcome: "DRAW",
					amount: drawReward,
					newBalance: await this.creditWallet(userId, drawReward, `Minigame Draw: ${game} (+${drawReward} coins)`),
					reason: `Draw in ${game}`
				};
				this.emit("reward", result);
			}
		} else if (typeof event.score === "number" && event.score > 0) {
			const scoreBonus = Math.min(maxScore, Math.floor(event.score * scoreMultiplier));
			if (scoreBonus > 0) {
				const result = {
					userId,
					game,
					outcome: "SCORE",
					amount: scoreBonus,
					newBalance: await this.creditWallet(userId, scoreBonus, `Minigame Solo Score: ${game} (${event.score} pts -> +${scoreBonus} coins)`),
					reason: `Scored ${event.score} in ${game}`,
					scoreBonus
				};
				this.emit("reward", result);
			}
		}
	}
	/**
	* Internal handler for Weky tournamentEnd events.
	*/
	async handleTournamentEnd(event) {
		if (!event.champion || !event.champion.id) return;
		const championPrize = this.options.tournamentChampionPrize ?? 500;
		if (championPrize > 0) {
			const newBal = await this.creditWallet(event.champion.id, championPrize, `Tournament Champion: Crowned in Tournament ${event.tournamentId} (+${championPrize} coins)`);
			const result = {
				userId: event.champion.id,
				game: "tournament",
				outcome: "TOURNAMENT",
				amount: championPrize,
				newBalance: newBal,
				reason: `Crowned champion in tournament ${event.tournamentId}`
			};
			this.emit("tournamentReward", result);
		}
	}
	async getUserWallet(userId, guildId) {
		return (await this.eco.getBalance(userId, guildId)).wallet;
	}
	async creditWallet(userId, amount, reason, guildId) {
		return this.eco.addWallet(userId, amount, guildId);
	}
	async deductWallet(userId, amount, reason, guildId) {
		return this.eco.removeWallet(userId, amount, guildId);
	}
	getActiveWagers() {
		return Array.from(this.activeWagers.values()).filter((w) => w.status === "active");
	}
	getWager(wagerId) {
		return this.activeWagers.get(wagerId);
	}
};
// src/EcoManager.ts
/**
* @m3rcena/eco
* Central Economy Orchestrator & Dashboard Bridge Integration.
*
* @copyright 2026 M3rcena Development. All rights reserved.
* @license Apache-2.0
*/
var EcoManager = class extends EventEmitter {
	storage;
	bank;
	rewards;
	careers;
	shop;
	businesses;
	casino;
	leaderboards;
	stocks;
	heist;
	pets;
	crates;
	vault;
	loans;
	taxes;
	router;
	currencySymbol;
	currencyName;
	embedColor;
	customMessages;
	emojis;
	notifyUpdates;
	bridge;
	constructor(options = {}) {
		super();
		this.currencySymbol = options.currencySymbol ?? "🪙";
		this.currencyName = options.currencyName ?? "Coins";
		this.embedColor = options.embedColor ?? 5793266;
		this.customMessages = options.customMessages;
		this.emojis = options.emojis;
		this.notifyUpdates = options.notifyUpdates ?? true;
		if (this.notifyUpdates) checkPackageUpdates(ECO_VERSION, false).catch(() => {});
		this.storage = resolveEcoStorage(options);
		this.bank = new BankManager(this.storage, {
			defaultWallet: options.defaultWalletBalance ?? 500,
			defaultBankCap: options.defaultBankCapacity ?? 1e4,
			transactionFee: options.transactionFeePercentage ?? 0
		});
		this.rewards = new RewardManager(this.bank, options.cooldowns);
		this.careers = new CareerManager(this.bank);
		this.shop = new ShopManager(this.bank);
		this.businesses = new BusinessManager(this.bank);
		this.casino = new CasinoManager(this.bank, this.shop);
		this.leaderboards = new LeaderboardManager(this.storage, this.shop, this.businesses);
		this.stocks = new StockMarketManager(this.bank, options.initialStocks);
		this.heist = new HeistManager(this.bank, options.initialHeistTargets);
		this.pets = new PetManager(this.bank, options.initialPets);
		this.crates = new CrateManager(this.bank);
		this.vault = new VaultManager(this.bank);
		this.loans = new LoanManager(this.bank);
		this.taxes = new TaxManager(this.bank);
		this.router = new EcoBridgeRouter(this);
		if (options.bridge) this.setBridge(options.bridge);
	}
	/**
	* Universal router getter for @m3rcena/bridge mounting.
	*/
	toBridgeRouter() {
		return this.router;
	}
	/**
	* Connects this economy instance with an M3rcenaBridge controller.
	* Enables: eco.connectBridge(bridge) or bridge.use(eco).
	*/
	connectBridge(bridge) {
		return this.setBridge(bridge);
	}
	/**
	* Connects this economy instance with @m3rcena/weky minigames engine.
	* Enables automated coin payouts, streak bonuses, solo score multipliers, PvP wager bets, and tournament prize pools.
	*/
	connectWeky(weky, options) {
		return new EcoWekyConnector(this, weky, options);
	}
	/**
	* Connects this economy instance with @m3rcena/bridge for live web dashboard streaming.
	*/
	setBridge(bridge) {
		this.bridge = bridge;
		if (this.bridge && typeof this.bridge.registerModule === "function") this.bridge.registerModule("economy", async (action) => {
			if (this.router && typeof this.router.handleAction === "function") return this.router.handleAction(action);
			return { success: true };
		});
		if (this.bridge && typeof this.bridge.mountPackage === "function" && this.router) this.bridge.mountPackage(this.router);
		return this;
	}
	emit(event, ...args) {
		return super.emit(event, ...args);
	}
	on(event, listener) {
		return super.on(event, listener);
	}
	once(event, listener) {
		return super.once(event, listener);
	}
	off(event, listener) {
		return super.off(event, listener);
	}
	addListener(event, listener) {
		return super.addListener(event, listener);
	}
	removeListener(event, listener) {
		return super.removeListener(event, listener);
	}
	prependListener(event, listener) {
		return super.prependListener(event, listener);
	}
	prependOnceListener(event, listener) {
		return super.prependOnceListener(event, listener);
	}
	/**
	* Dispatches an event to the bridge if connected.
	*/
	dispatchBridgeAction(actionName, payload, userId, audioCue) {
		this.emit("bridgeAction", {
			module: "economy",
			action: actionName,
			playerId: userId ?? "system",
			payload
		});
		if (!this.bridge) return;
		if (typeof this.bridge.dispatchAction === "function") this.bridge.dispatchAction({
			module: "economy",
			action: actionName,
			playerId: userId ?? "system",
			payload,
			sourcePlatform: "discord"
		}).catch?.(() => {});
		if (audioCue) {
			if (typeof this.bridge.dispatchAudioCue === "function") this.bridge.dispatchAudioCue({
				sound: audioCue.sound,
				volume: audioCue.volume ?? .8,
				userId,
				module: "economy"
			});
			else if (typeof this.bridge.triggerAudioCue === "function") this.bridge.triggerAudioCue({
				sound: audioCue.sound,
				volume: audioCue.volume ?? .8,
				userId,
				module: "economy"
			});
		}
	}
	async getAccount(userId, guildId) {
		return this.bank.getAccount(userId, guildId);
	}
	async getBalance(userId, guildId) {
		const acc = await this.bank.getAccount(userId, guildId);
		const netWorth = this.leaderboards.calculateNetWorth(acc);
		return {
			wallet: acc.wallet,
			bank: acc.bank,
			bankCapacity: acc.bankCapacity,
			netWorth
		};
	}
	async addWallet(userId, amount, guildId) {
		const newBal = await this.bank.addWallet(userId, amount, guildId);
		this.dispatchBridgeAction("wallet:add", {
			userId,
			amount,
			newWallet: newBal
		}, userId, { sound: "coin_drop" });
		this.emit("walletAdd", {
			userId,
			amount,
			newWallet: newBal,
			guildId
		});
		return newBal;
	}
	async removeWallet(userId, amount, guildId) {
		const newBal = await this.bank.removeWallet(userId, amount, guildId);
		this.dispatchBridgeAction("wallet:remove", {
			userId,
			amount,
			newWallet: newBal
		}, userId);
		this.emit("walletRemove", {
			userId,
			amount,
			newWallet: newBal,
			guildId
		});
		return newBal;
	}
	async deposit(userId, amount, guildId) {
		const result = await this.bank.deposit(userId, amount, guildId);
		if (result.success) {
			this.dispatchBridgeAction("bank:deposit", {
				userId,
				deposited: result.deposited,
				wallet: result.wallet,
				bank: result.bank
			}, userId);
			this.emit("deposit", {
				userId,
				deposited: result.deposited,
				wallet: result.wallet,
				bank: result.bank,
				guildId
			});
		}
		return result;
	}
	async withdraw(userId, amount, guildId) {
		const result = await this.bank.withdraw(userId, amount, guildId);
		if (result.success) {
			this.dispatchBridgeAction("bank:withdraw", {
				userId,
				withdrawn: result.withdrawn,
				wallet: result.wallet,
				bank: result.bank
			}, userId);
			this.emit("withdraw", {
				userId,
				withdrawn: result.withdrawn,
				wallet: result.wallet,
				bank: result.bank,
				guildId
			});
		}
		return result;
	}
	async transfer(fromUserId, toUserId, amount, guildId) {
		const result = await this.bank.transfer(fromUserId, toUserId, amount, guildId);
		if (result.success) {
			this.dispatchBridgeAction("bank:transfer", result, fromUserId, { sound: "coin_drop" });
			this.emit("transfer", {
				...result,
				guildId
			});
		}
		return result;
	}
	async daily(userId, guildId) {
		const res = await this.rewards.claimDaily(userId, guildId);
		if (res.success) {
			this.dispatchBridgeAction("reward:daily", res, userId, { sound: "coin_drop" });
			this.emit("dailyClaim", {
				userId,
				amount: res.amount,
				streak: res.streak,
				isMilestone: res.isMilestone,
				guildId
			});
		}
		return res;
	}
	async weekly(userId, guildId) {
		const res = await this.rewards.claimWeekly(userId, guildId);
		if (res.success) this.dispatchBridgeAction("reward:weekly", res, userId, { sound: "win" });
		return res;
	}
	async monthly(userId, guildId) {
		const res = await this.rewards.claimMonthly(userId, guildId);
		if (res.success) this.dispatchBridgeAction("reward:monthly", res, userId, { sound: "win" });
		return res;
	}
	async hourly(userId, guildId) {
		const res = await this.rewards.claimHourly(userId, guildId);
		if (res.success) this.dispatchBridgeAction("reward:hourly", res, userId, { sound: "coin_drop" });
		return res;
	}
	async work(userId, guildId) {
		const career = await this.careers.getCareer(userId, guildId);
		const careerSalary = this.careers.calculateSalary(career ?? void 0);
		const res = await this.rewards.work(userId, guildId, careerSalary);
		if (res.success) {
			const shiftRes = await this.careers.recordShift(userId, guildId);
			this.dispatchBridgeAction("reward:work", {
				...res,
				careerShift: shiftRes
			}, userId, { sound: "coin_drop" });
			this.emit("work", {
				userId,
				earned: res.earned,
				xp: res.xp,
				job: career ?? void 0,
				promoted: shiftRes.promoted,
				guildId
			});
			return {
				...res,
				careerShift: shiftRes
			};
		}
		return res;
	}
	async beg(userId, guildId) {
		const res = await this.rewards.beg(userId, guildId);
		if (res.success && res.earned > 0) this.dispatchBridgeAction("reward:beg", res, userId, { sound: "coin_drop" });
		return res;
	}
	async crime(userId, guildId) {
		const res = await this.rewards.crime(userId, guildId);
		this.dispatchBridgeAction("reward:crime", res, userId, res.success ? { sound: "coin_drop" } : { sound: "rob_siren" });
		this.emit("crime", {
			userId,
			success: res.success,
			earned: res.earned,
			fine: res.fine,
			crimeType: res.crime,
			guildId
		});
		return res;
	}
	async rob(robberId, victimId, guildId) {
		const res = await this.rewards.rob(robberId, victimId, guildId);
		this.dispatchBridgeAction("reward:rob", res, robberId, res.success ? { sound: "win" } : { sound: "rob_siren" });
		this.emit("robbery", {
			...res,
			guildId
		});
		return res;
	}
	async buyItem(userId, itemId, quantity = 1, guildId) {
		const res = await this.shop.buy(userId, itemId, quantity, guildId);
		if (res.success) this.dispatchBridgeAction("shop:buy", res, userId, { sound: "purchase" });
		return res;
	}
	async sellItem(userId, itemId, quantity = 1, guildId) {
		const res = await this.shop.sell(userId, itemId, quantity, guildId);
		if (res.success) this.dispatchBridgeAction("shop:sell", res, userId, { sound: "coin_drop" });
		return res;
	}
	async useItem(userId, itemId, guildId) {
		const res = await this.shop.use(userId, itemId, guildId);
		if (res.success) this.dispatchBridgeAction("shop:use", res, userId);
		return res;
	}
	async getInventory(userId, guildId) {
		return this.shop.getInventory(userId, guildId);
	}
	async buyBusiness(userId, businessId, guildId) {
		const res = await this.businesses.buyBusiness(userId, businessId, guildId);
		if (res.success) this.dispatchBridgeAction("business:buy", res, userId, { sound: "purchase" });
		return res;
	}
	async upgradeBusiness(userId, businessId, guildId) {
		const res = await this.businesses.upgradeBusiness(userId, businessId, guildId);
		if (res.success) this.dispatchBridgeAction("business:upgrade", res, userId, { sound: "purchase" });
		return res;
	}
	async hireEmployees(userId, businessId, count = 1, guildId) {
		const res = await this.businesses.hireEmployees(userId, businessId, count, guildId);
		if (res.success) this.dispatchBridgeAction("business:hire", res, userId);
		return res;
	}
	async collectBusinessRevenue(userId, businessId, guildId) {
		const res = await this.businesses.collectRevenue(userId, businessId, guildId);
		if (res.success) this.dispatchBridgeAction("business:collect", res, userId, { sound: "coin_drop" });
		return res;
	}
	async coinflip(userId, betAmount, choice, guildId) {
		const res = await this.casino.coinflip(userId, betAmount, choice, guildId);
		this.dispatchBridgeAction("casino:coinflip", res, userId, res.outcome === "win" ? { sound: "win" } : void 0);
		this.emit("gamble", {
			...res,
			userId,
			game: "coinflip",
			betAmount,
			guildId
		});
		return res;
	}
	async dice(userId, betAmount, prediction, guildId) {
		const res = await this.casino.dice(userId, betAmount, prediction, guildId);
		this.dispatchBridgeAction("casino:dice", res, userId, res.outcome === "win" ? { sound: "win" } : void 0);
		this.emit("gamble", {
			...res,
			userId,
			game: "dice",
			betAmount,
			guildId
		});
		return res;
	}
	async slots(userId, betAmount, guildId) {
		const res = await this.casino.slots(userId, betAmount, guildId);
		this.dispatchBridgeAction("casino:slots", res, userId, res.outcome === "win" ? { sound: "win" } : void 0);
		this.emit("gamble", {
			...res,
			userId,
			game: "slots",
			betAmount,
			guildId
		});
		return res;
	}
	async roulette(userId, betAmount, betType, guildId) {
		const res = await this.casino.roulette(userId, betAmount, betType, guildId);
		this.dispatchBridgeAction("casino:roulette", res, userId, res.outcome === "win" ? { sound: "win" } : void 0);
		this.emit("gamble", {
			...res,
			userId,
			game: "roulette",
			betAmount,
			guildId
		});
		return res;
	}
	async crash(userId, betAmount, targetMultiplier, guildId) {
		const res = await this.casino.crash(userId, betAmount, targetMultiplier, guildId);
		this.dispatchBridgeAction("casino:crash", res, userId, res.outcome === "win" ? { sound: "win" } : void 0);
		this.emit("gamble", {
			...res,
			userId,
			game: "crash",
			betAmount,
			guildId
		});
		return res;
	}
	async startBlackjack(userId, betAmount, guildId) {
		return this.casino.startBlackjackGame(userId, betAmount, guildId);
	}
	async blackjackHit(gameId) {
		return this.casino.blackjackHit(gameId);
	}
	async blackjackStand(gameId) {
		const state = await this.casino.blackjackStand(gameId);
		if (state.payout > 0) this.dispatchBridgeAction("casino:blackjack_win", state, state.userId, { sound: "win" });
		return state;
	}
	async blackjackDouble(gameId) {
		const state = await this.casino.blackjackDouble(gameId);
		if (state.payout > 0) this.dispatchBridgeAction("casino:blackjack_win", state, state.userId, { sound: "win" });
		return state;
	}
	async getLeaderboard(metric = "net_worth", limit = 10, guildId) {
		return this.leaderboards.getLeaderboard(metric, limit, guildId);
	}
	async formatLeaderboard(metric = "net_worth", limit = 10, guildId) {
		const entries = await this.getLeaderboard(metric, limit, guildId);
		return this.leaderboards.formatLeaderboard(entries, metric, this.currencySymbol);
	}
	getStocks() {
		return this.stocks.getStocks();
	}
	getStock(symbol) {
		return this.stocks.getStock(symbol);
	}
	tickStockMarket() {
		this.stocks.tickMarket();
		this.dispatchBridgeAction("stocks:tick", {
			trend: this.stocks.getMarketTrend(),
			stocks: this.stocks.getStocks().map((s) => ({
				symbol: s.symbol,
				price: s.currentPrice,
				change: s.change24h
			}))
		});
	}
	async buyStock(userId, symbol, shares, guildId) {
		const result = await this.stocks.buyStock(userId, symbol, shares, guildId);
		this.dispatchBridgeAction("stocks:buy", result, userId, { sound: "purchase" });
		return result;
	}
	async sellStock(userId, symbol, shares, guildId) {
		const result = await this.stocks.sellStock(userId, symbol, shares, guildId);
		this.dispatchBridgeAction("stocks:sell", result, userId, { sound: "coin_drop" });
		return result;
	}
	async getStockPortfolio(userId, guildId) {
		return this.stocks.getUserPortfolio(userId, guildId);
	}
	getHeistTargets() {
		return this.heist.getTargets();
	}
	async createHeist(leaderId, targetId, guildId) {
		const res = await this.heist.createLobby(leaderId, leaderId, targetId, guildId);
		if (!res.success || !res.session) throw new Error(res.error || "Failed to create heist lobby.");
		this.dispatchBridgeAction("heist:created", {
			heistId: res.session.id,
			leaderId,
			targetId
		});
		return res.session;
	}
	async joinHeist(heistId, userId, role, username) {
		const res = await this.heist.joinLobby(heistId, userId, username || userId, role);
		if (!res.success || !res.session) throw new Error(res.error || "Failed to join heist lobby.");
		this.dispatchBridgeAction("heist:joined", {
			heistId,
			userId,
			role,
			username
		});
		return {
			success: true,
			session: res.session
		};
	}
	async executeHeist(heistId) {
		const result = await this.heist.executeHeist(heistId);
		this.dispatchBridgeAction("heist:executed", result, void 0, result.success ? { sound: "win" } : { sound: "rob_siren" });
		this.emit("heist", result);
		return result;
	}
	getAvailablePets() {
		return this.pets.getCatalog();
	}
	async getUserPets(userId, guildId) {
		return (await this.bank.getAccount(userId, guildId)).pets || [];
	}
	async adoptPet(userId, petId, customName, guildId) {
		const res = await this.pets.adoptPet(userId, petId, customName, guildId);
		if (!res.success || !res.pet) throw new Error(res.error || "Failed to adopt pet.");
		this.dispatchBridgeAction("pet:adopted", {
			userId,
			pet: res.pet
		}, userId, { sound: "purchase" });
		return res.pet;
	}
	async feedPet(userId, petId, guildId) {
		const res = await this.pets.feedPet(userId, petId, guildId);
		if (!res.success || !res.pet) throw new Error(res.error || "Failed to feed pet.");
		this.dispatchBridgeAction("pet:fed", {
			userId,
			petId,
			cost: 250
		});
		return {
			success: true,
			pet: res.pet,
			cost: 250
		};
	}
	async sendPetExpedition(userId, petId, guildId) {
		const res = await this.pets.sendExpedition(userId, petId, 2, guildId);
		if (!res.success || !res.returnsAt) throw new Error(res.error || "Failed to start expedition.");
		this.dispatchBridgeAction("pet:expedition_started", {
			userId,
			petId,
			finishesAt: res.returnsAt
		});
		return {
			success: true,
			finishesAt: res.returnsAt
		};
	}
	async claimPetExpedition(userId, petId, guildId) {
		const res = await this.pets.claimExpedition(userId, petId, guildId);
		if (!res.success || !res.reward) throw new Error(res.error || "Failed to claim expedition.");
		this.dispatchBridgeAction("pet:expedition_claimed", {
			userId,
			petId,
			result: res.reward
		}, userId, { sound: "win" });
		return res.reward;
	}
	getCratePrice(tier) {
		return this.crates.getCratePrice(tier);
	}
	async openCrate(userId, tier, guildId) {
		const reward = await this.crates.openCrate(userId, tier, guildId);
		this.dispatchBridgeAction("crate:opened", {
			userId,
			tier,
			reward
		}, userId, { sound: "win" });
		this.emit("crateOpened", {
			userId,
			tier,
			rewards: [reward],
			guildId
		});
		return reward;
	}
	async getUserVault(userId, guildId) {
		return this.vault.getUserVault(userId, guildId);
	}
	async upgradeVault(userId, guildId) {
		const res = await this.vault.upgradeVault(userId, guildId);
		if (res.success && res.newTier) {
			this.dispatchBridgeAction("vault:upgraded", res, userId, { sound: "purchase" });
			this.emit("vaultUpgraded", {
				userId,
				newTier: res.newTier,
				cost: res.cost,
				guildId
			});
		}
		return res;
	}
	async claimDailyInterest(userId, guildId) {
		const res = await this.vault.claimDailyInterest(userId, guildId);
		if (res.success) this.dispatchBridgeAction("vault:interest_claimed", res, userId, { sound: "coin_drop" });
		return res;
	}
	async getCreditScore(userId, guildId) {
		return this.loans.getCreditScore(userId, guildId);
	}
	async getUserLoans(userId, guildId) {
		return this.loans.getUserLoans(userId, guildId);
	}
	async applyLoan(userId, tier, guildId) {
		const res = await this.loans.applyLoan(userId, tier, guildId);
		if (res.success && res.loan) {
			this.dispatchBridgeAction("loan:approved", res, userId, { sound: "coin_drop" });
			this.emit("loanDisbursed", {
				userId,
				loan: res.loan,
				guildId
			});
		}
		return res;
	}
	async repayLoan(userId, loanId, amount, guildId) {
		const res = await this.loans.repayLoan(userId, loanId, amount, guildId);
		if (res.success) {
			this.dispatchBridgeAction("loan:repaid", res, userId, res.isFullyPaid ? { sound: "win" } : void 0);
			this.emit("loanRepaid", {
				userId,
				amountPaid: res.amountPaid,
				remainingDue: res.remainingDue,
				settled: res.isFullyPaid,
				newCreditScore: res.newCreditScore,
				guildId
			});
		}
		return res;
	}
	async processLoanCollections(userId, guildId) {
		const res = await this.loans.processCollections(userId, guildId);
		if (res.defaultedLoans.length > 0) this.dispatchBridgeAction("loan:defaulted", res, userId, { sound: "rob_siren" });
		return res;
	}
	async getPendingBills(userId, guildId) {
		return this.taxes.getPendingBills(userId, guildId);
	}
	async getAllBills(userId, guildId) {
		return this.taxes.getAllBills(userId, guildId);
	}
	async generateBillsIfDue(userId, guildId) {
		return this.taxes.generateBillsIfDue(userId, guildId);
	}
	async payBill(userId, billId, guildId) {
		const res = await this.taxes.payBill(userId, billId, guildId);
		if (res.success) this.dispatchBridgeAction("bill:paid", res, userId, { sound: "coin_drop" });
		return res;
	}
	async payAllBills(userId, guildId) {
		const res = await this.taxes.payAllBills(userId, guildId);
		if (res.success) {
			this.dispatchBridgeAction("bills:all_paid", res, userId, { sound: "win" });
			this.emit("billsPaid", {
				userId,
				totalAmountPaid: res.totalAmountPaid,
				paidCount: res.paidCount,
				newCreditScore: res.newCreditScore,
				guildId
			});
		}
		return res;
	}
	async attemptTaxEvasion(userId, guildId) {
		const res = await this.taxes.attemptTaxEvasion(userId, guildId);
		this.dispatchBridgeAction("tax:evasion_attempt", res, userId, res.success ? { sound: "win" } : { sound: "rob_siren" });
		return res;
	}
};
// src/host.ts
/**
* @m3rcena/eco - Standalone Local Submodule Host Service
*
* Runs the Discord Economy Engine locally when cloned via Git submodules.
* Starts a standalone HTTP REST service with SQLite / Prisma persistence
* and Canvas Debit Card generation. Automatically connects to @m3rcena/bridge if detected.
*
* @copyright 2026 M3rcena Development. All rights reserved.
* @license Apache-2.0
*/
async function hostEco(options = {}) {
	const port = options.port ?? parseInt(process.env.PORT || process.env.ECO_PORT || "4002", 10);
	const dbPath = options.dbPath ?? (process.env.ECO_DB_PATH || "./eco.sqlite");
	printResolutionSummary();
	const eco = new EcoManager({
		storage: new SqliteEcoStorage({ path: dbPath }),
		currencySymbol: "🪙",
		currencyName: "Coins"
	});
	const router = new EcoBridgeRouter(eco);
	const resolutions = getAllPackageResolutions();
	if (resolutions["@m3rcena/bridge"].status !== "missing") try {
		if ((await import(resolutions["@m3rcena/bridge"].path)).M3rcenaBridge) console.log(`[m3rcena-eco] 🌉 Found @m3rcena/bridge (${resolutions["@m3rcena/bridge"].status}). Ready for bridge mount.`);
	} catch {}
	const server = http.createServer(async (req, res) => {
		const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);
		const pathname = url.pathname;
		res.setHeader("Access-Control-Allow-Origin", "*");
		res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
		res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
		if (req.method === "OPTIONS") {
			res.writeHead(204);
			res.end();
			return;
		}
		if (pathname === "/health" || pathname === "/") {
			res.writeHead(200, { "Content-Type": "application/json" });
			res.end(JSON.stringify({
				status: "healthy",
				package: "@m3rcena/eco",
				mode: "local-submodule-host",
				version: ECO_VERSION,
				database: "SQLite",
				dbPath,
				uptime: process.uptime()
			}, null, 2));
			return;
		}
		if (pathname.startsWith("/account/")) {
			const userId = pathname.replace("/account/", "").trim();
			const account = await eco.getAccount(userId);
			res.writeHead(200, { "Content-Type": "application/json" });
			res.end(JSON.stringify(account, null, 2));
			return;
		}
		if (pathname.startsWith("/cards/debit/")) {
			const userId = pathname.replace("/cards/debit/", "").trim();
			const account = await eco.getAccount(userId);
			try {
				const cardBuffer = await RenderBankCard.renderCard({
					username: `User_${userId.slice(0, 4)}`,
					wallet: account.wallet,
					bank: account.bank,
					netWorth: account.wallet + account.bank
				});
				res.writeHead(200, { "Content-Type": "image/png" });
				res.end(cardBuffer);
				return;
			} catch (err) {
				res.writeHead(500, { "Content-Type": "application/json" });
				res.end(JSON.stringify({ error: err.message }));
				return;
			}
		}
		if (pathname === "/stocks") {
			const stocks = eco.getStocks();
			res.writeHead(200, { "Content-Type": "application/json" });
			res.end(JSON.stringify({ stocks }, null, 2));
			return;
		}
		if (pathname === "/leaderboard") {
			const lb = await eco.getLeaderboard("net_worth", 10);
			res.writeHead(200, { "Content-Type": "application/json" });
			res.end(JSON.stringify({ leaderboard: lb }, null, 2));
			return;
		}
		if (pathname.startsWith("/eco/") || pathname.startsWith("/api/eco")) {
			const bridgeReq = {
				method: req.method || "GET",
				url: req.url || "/",
				path: pathname,
				subPath: pathname.replace(/^\/(?:api\/)?eco/, ""),
				params: {},
				query: Object.fromEntries(url.searchParams.entries()),
				headers: req.headers
			};
			const handled = await router.handleRequest(bridgeReq);
			if (handled) {
				res.writeHead(handled.status, {
					"Content-Type": handled.contentType || "application/json",
					...handled.headers || {}
				});
				if (Buffer.isBuffer(handled.body)) res.end(handled.body);
				else if (typeof handled.body === "string") res.end(handled.body);
				else res.end(JSON.stringify(handled.body));
				return;
			}
		}
		res.writeHead(404, { "Content-Type": "application/json" });
		res.end(JSON.stringify({
			error: "Route not found",
			path: pathname
		}));
	});
	await new Promise((resolve) => {
		server.listen(port, () => resolve());
	});
	console.log(`
┌────────────────────────────────────────────────────────────────────────┐
│  💰 M3RCENA ECO LOCAL HOST SERVICE                                     │
│  Economy Engine running on http://localhost:${port.toString().padEnd(25)}│
│  - Database:       SQLite (${dbPath.padEnd(41)})│
│  - Health API:     http://localhost:${port}/health                        │
│  - User Account:   http://localhost:${port}/account/:userId               │
│  - Debit Card:     http://localhost:${port}/cards/debit/:userId           │
│  - Stock Market:   http://localhost:${port}/stocks                        │
│  - Leaderboard:    http://localhost:${port}/leaderboard                   │
│  Ready to host economy locally via Submodule!                          │
└────────────────────────────────────────────────────────────────────────┘
`);
	return {
		eco,
		router,
		server,
		port
	};
}
if (process.argv[1]?.endsWith("host.ts") || process.argv[1]?.endsWith("host.js")) hostEco().catch((err) => {
	console.error("[m3rcena-eco host] Fatal error:", err);
	process.exit(1);
});
export { DEFAULT_SHOP_ITEMS as A, applyPrismaEcoModel as B, HeistManager as C, CasinoManager as D, LeaderboardManager as E, BankManager as F, JsonEcoStorage as H, EcoDatabaseHandler as I, resolveEcoStorage as L, CareerManager as M, DEFAULT_JOBS as N, BusinessManager as O, RewardManager as P, PRISMA_ECO_MODEL as R, DEFAULT_HEIST_TARGETS as S, StockMarketManager as T, MemoryEcoStorage as U, SqliteEcoStorage as V, createDefaultAccount as W, VaultManager as _, ECO_VERSION as a, DEFAULT_PETS as b, compareSemver as c, RenderMarketChart as d, RenderBankCard as f, DEFAULT_VAULT_TIERS as g, LoanManager as h, EcoBridgeRouter as i, ShopManager as j, DEFAULT_BUSINESS_CATALOG as k, fetchLatestVersion as l, LOAN_CATALOG as m, EcoManager as n, boxConsole as o, TaxManager as p, EcoWekyConnector as r, checkPackageUpdates as s, hostEco as t, stripAnsi as u, CRATE_PRICES as v, DEFAULT_STOCKS as w, PetManager as x, CrateManager as y, PrismaEcoStorage as z };

//# sourceMappingURL=host-qJNVzdDa.mjs.map