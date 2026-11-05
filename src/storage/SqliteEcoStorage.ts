/**
 * @m3rcena/eco
 * Native SQLite Storage Adapter using node:sqlite (Node.js >= 22.0.0).
 * Provides fast, zero-dependency, transactional local database storage.
 *
 * @copyright 2026 M3rcena Development. All rights reserved.
 * @license Apache-2.0
 */

import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { EcoStorageAdapter } from "./EcoStorage.js";
import { UserAccount } from "../types.js";

export interface SqliteEcoStorageOptions {
  /** Database file path on disk (default: "./eco.sqlite") */
  path?: string;
  /** Whether to enable WAL mode for high concurrency (default: true) */
  walMode?: boolean;
}

export class SqliteEcoStorage implements EcoStorageAdapter {
  private db: DatabaseSync;
  public readonly dbPath: string;

  constructor(options: string | SqliteEcoStorageOptions = "./eco.sqlite") {
    const rawPath = typeof options === "string" ? options : options.path || "./eco.sqlite";
    if (rawPath === ":memory:") {
      this.dbPath = ":memory:";
    } else {
      this.dbPath = path.resolve(process.cwd(), rawPath);
      const dir = path.dirname(this.dbPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    }

    this.db = new DatabaseSync(this.dbPath);

    const wal = typeof options === "object" ? options.walMode ?? true : true;
    if (wal) {
      try {
        this.db.exec("PRAGMA journal_mode = WAL;");
      } catch {
        // Suppress pragma errors on in-memory or read-only configs
      }
    }

    this.initTables();
  }

  private initTables(): void {
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

  public async getAccount(userId: string, guildId?: string): Promise<UserAccount | null> {
    const gid = guildId || "";
    const stmt = this.db.prepare("SELECT data FROM eco_accounts WHERE user_id = ? AND guild_id = ? LIMIT 1");
    const row = stmt.get(userId, gid) as { data: string } | undefined;
    if (!row || !row.data) return null;

    try {
      return JSON.parse(row.data) as UserAccount;
    } catch {
      return null;
    }
  }

  public async saveAccount(account: UserAccount): Promise<void> {
    account.updatedAt = Date.now();
    const gid = account.guildId || "";
    const payload = JSON.stringify(account);

    const stmt = this.db.prepare(`
      INSERT INTO eco_accounts (user_id, guild_id, wallet, bank, level, data, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(user_id, guild_id) DO UPDATE SET
        wallet = excluded.wallet,
        bank = excluded.bank,
        level = excluded.level,
        data = excluded.data,
        updated_at = excluded.updated_at
    `);

    stmt.run(
      account.userId,
      gid,
      account.wallet,
      account.bank,
      account.level,
      payload,
      account.updatedAt
    );
  }

  public async getTopAccounts(
    sortBy: "netWorth" | "wallet" | "bank" | "level" = "netWorth",
    limit: number = 10,
    guildId?: string
  ): Promise<UserAccount[]> {
    const gid = guildId || null;
    let query: string;

    if (sortBy === "wallet") {
      query = gid
        ? "SELECT data FROM eco_accounts WHERE guild_id = ? ORDER BY wallet DESC LIMIT ?"
        : "SELECT data FROM eco_accounts ORDER BY wallet DESC LIMIT ?";
    } else if (sortBy === "bank") {
      query = gid
        ? "SELECT data FROM eco_accounts WHERE guild_id = ? ORDER BY bank DESC LIMIT ?"
        : "SELECT data FROM eco_accounts ORDER BY bank DESC LIMIT ?";
    } else if (sortBy === "level") {
      query = gid
        ? "SELECT data FROM eco_accounts WHERE guild_id = ? ORDER BY level DESC LIMIT ?"
        : "SELECT data FROM eco_accounts ORDER BY level DESC LIMIT ?";
    } else {
      // Net worth: wallet + bank
      query = gid
        ? "SELECT data FROM eco_accounts WHERE guild_id = ? ORDER BY (wallet + bank) DESC LIMIT ?"
        : "SELECT data FROM eco_accounts ORDER BY (wallet + bank) DESC LIMIT ?";
    }

    const stmt = this.db.prepare(query);
    const rows = gid ? (stmt.all(gid, limit) as { data: string }[]) : (stmt.all(limit) as { data: string }[]);

    const result: UserAccount[] = [];
    for (const r of rows) {
      try {
        if (r && r.data) {
          result.push(JSON.parse(r.data));
        }
      } catch {
        // Skip corrupted rows
      }
    }
    return result;
  }

  public async getAllAccounts(guildId?: string): Promise<UserAccount[]> {
    const gid = guildId || null;
    const query = gid
      ? "SELECT data FROM eco_accounts WHERE guild_id = ?"
      : "SELECT data FROM eco_accounts";

    const stmt = this.db.prepare(query);
    const rows = gid ? (stmt.all(gid) as { data: string }[]) : (stmt.all() as { data: string }[]);

    const result: UserAccount[] = [];
    for (const r of rows) {
      try {
        if (r && r.data) {
          result.push(JSON.parse(r.data));
        }
      } catch {
        // Skip corrupted rows
      }
    }
    return result;
  }

  /**
   * Closes the SQLite database connection.
   */
  public close(): void {
    try {
      this.db.close();
    } catch {
      // Safe ignore
    }
  }
}

