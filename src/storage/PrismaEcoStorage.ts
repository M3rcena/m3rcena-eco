/**
 * @m3rcena/eco
 * Enterprise Prisma Storage Adapter.
 * Integrates directly with existing PrismaClient instances with automated table migration
 * and native fallback to raw SQL queries if models haven't been compiled yet.
 *
 * @copyright 2026 M3rcena Development. All rights reserved.
 * @license Apache-2.0
 */

import fs from "node:fs";
import path from "node:path";
import { EcoStorageAdapter } from "./EcoStorage.js";
import { UserAccount } from "../types.js";

/**
 * Prisma Schema snippet that developers can paste into their schema.prisma.
 */
export const PRISMA_ECO_MODEL = `
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
export function applyPrismaEcoModel(schemaPath: string = "prisma/schema.prisma"): boolean {
  try {
    const resolved = path.resolve(process.cwd(), schemaPath);
    if (!fs.existsSync(resolved)) {
      return false;
    }
    const content = fs.readFileSync(resolved, "utf-8");
    if (content.includes("model EcoAccount")) {
      return false; // Already present
    }
    const updated = `${content.trim()}\n\n${PRISMA_ECO_MODEL}\n`;
    fs.writeFileSync(resolved, updated, "utf-8");
    return true;
  } catch (err) {
    console.error("[applyPrismaEcoModel] Failed to append model to schema:", err);
    return false;
  }
}

export interface PrismaEcoStorageOptions {
  /** The PrismaClient instance provided by the bot */
  client: any;
  /** Property name of the model on the PrismaClient (default: "ecoAccount") */
  model?: string;
  /** Underlying SQL table name (default: "EcoAccount") */
  tableName?: string;
  /** Automatically run table migration on connection if missing (default: true) */
  autoMigrate?: boolean;
}

export class PrismaEcoStorage implements EcoStorageAdapter {
  private client: any;
  private modelName: string;
  private tableName: string;
  private autoMigrate: boolean;
  private migrated = false;

  constructor(options: any | PrismaEcoStorageOptions) {
    if (options && options.client) {
      this.client = options.client;
      this.modelName = options.model || "ecoAccount";
      this.tableName = options.tableName || "EcoAccount";
      this.autoMigrate = options.autoMigrate ?? true;
    } else {
      // Raw client passed directly
      this.client = options;
      this.modelName = "ecoAccount";
      this.tableName = "EcoAccount";
      this.autoMigrate = true;
    }
  }

  private async ensureMigrated(): Promise<void> {
    if (this.migrated || !this.autoMigrate || !this.client) return;
    this.migrated = true;

    // If client delegate already exists, migration was likely handled by prisma migrate
    if (this.client[this.modelName]) {
      return;
    }

    // Attempt auto-creation via raw queries
    if (typeof this.client.$executeRawUnsafe === "function") {
      try {
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
        } catch {
          // Table exists or database permissions prohibit DDL
        }
      }
    }
  }

  public async getAccount(userId: string, guildId?: string): Promise<UserAccount | null> {
    await this.ensureMigrated();
    const gid = guildId || "";

    const delegate = this.client[this.modelName];
    if (delegate && typeof delegate.findUnique === "function") {
      try {
        const record = await delegate.findUnique({
          where: {
            userId_guildId: { userId, guildId: gid },
          },
        });
        if (!record || !record.data) return null;
        return typeof record.data === "string" ? JSON.parse(record.data) : (record.data as UserAccount);
      } catch {
        // Fallback to findFirst in case composite primary key differs
        try {
          const record = await delegate.findFirst({
            where: { userId, guildId: gid },
          });
          if (!record || !record.data) return null;
          return typeof record.data === "string" ? JSON.parse(record.data) : (record.data as UserAccount);
        } catch {
          return null;
        }
      }
    }

    // Fallback using raw queries if model delegate is not yet compiled in prisma client
    if (typeof this.client.$queryRawUnsafe === "function") {
      try {
        const rows: any[] = await this.client.$queryRawUnsafe(
          `SELECT "data" FROM "${this.tableName}" WHERE "userId" = $1 AND "guildId" = $2 LIMIT 1`,
          userId,
          gid
        );
        if (rows && rows.length > 0 && rows[0].data) {
          return JSON.parse(rows[0].data);
        }
      } catch {
        try {
          const rows: any[] = await this.client.$queryRawUnsafe(
            `SELECT data FROM ${this.tableName} WHERE userId = ? AND guildId = ? LIMIT 1`,
            userId,
            gid
          );
          if (rows && rows.length > 0 && rows[0].data) {
            return JSON.parse(rows[0].data);
          }
        } catch {
          return null;
        }
      }
    }

    return null;
  }

  public async saveAccount(account: UserAccount): Promise<void> {
    await this.ensureMigrated();
    account.updatedAt = Date.now();
    const gid = account.guildId || "";
    const serialized = JSON.stringify(account);

    const delegate = this.client[this.modelName];
    if (delegate && typeof delegate.upsert === "function") {
      try {
        await delegate.upsert({
          where: {
            userId_guildId: { userId: account.userId, guildId: gid },
          },
          update: {
            wallet: account.wallet,
            bank: account.bank,
            level: account.level,
            data: serialized,
            updatedAt: new Date(account.updatedAt),
          },
          create: {
            userId: account.userId,
            guildId: gid,
            wallet: account.wallet,
            bank: account.bank,
            level: account.level,
            data: serialized,
            updatedAt: new Date(account.updatedAt),
          },
        });
        return;
      } catch {
        // Fall through to raw query fallback
      }
    }

    // Raw query execution fallback
    if (typeof this.client.$executeRawUnsafe === "function") {
      try {
        await this.client.$executeRawUnsafe(
          `
          INSERT INTO "${this.tableName}" ("userId", "guildId", "wallet", "bank", "level", "data", "updatedAt")
          VALUES ($1, $2, $3, $4, $5, $6, NOW())
          ON CONFLICT ("userId", "guildId") DO UPDATE SET
            "wallet" = EXCLUDED."wallet",
            "bank" = EXCLUDED."bank",
            "level" = EXCLUDED."level",
            "data" = EXCLUDED."data",
            "updatedAt" = NOW()
          `,
          account.userId,
          gid,
          account.wallet,
          account.bank,
          account.level,
          serialized
        );
      } catch {
        // SQLite dialect fallback
        await this.client.$executeRawUnsafe(
          `
          INSERT INTO ${this.tableName} (userId, guildId, wallet, bank, level, data, updatedAt)
          VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
          ON CONFLICT(userId, guildId) DO UPDATE SET
            wallet = excluded.wallet,
            bank = excluded.bank,
            level = excluded.level,
            data = excluded.data,
            updatedAt = CURRENT_TIMESTAMP
          `,
          account.userId,
          gid,
          account.wallet,
          account.bank,
          account.level,
          serialized
        );
      }
    }
  }

  public async getTopAccounts(
    sortBy: "netWorth" | "wallet" | "bank" | "level" = "netWorth",
    limit: number = 10,
    guildId?: string
  ): Promise<UserAccount[]> {
    await this.ensureMigrated();
    const gid = guildId || undefined;
    const delegate = this.client[this.modelName];

    if (delegate && typeof delegate.findMany === "function") {
      try {
        let orderBy: any = {};
        if (sortBy === "wallet") orderBy = { wallet: "desc" };
        else if (sortBy === "bank") orderBy = { bank: "desc" };
        else if (sortBy === "level") orderBy = { level: "desc" };

        const records = await delegate.findMany({
          where: gid ? { guildId: gid } : undefined,
          orderBy: Object.keys(orderBy).length > 0 ? orderBy : undefined,
          take: sortBy === "netWorth" ? undefined : limit,
        });

        const list = records
          .map((r: any) => (typeof r.data === "string" ? JSON.parse(r.data) : r.data))
          .filter(Boolean) as UserAccount[];

        if (sortBy === "netWorth") {
          list.sort((a, b) => b.wallet + b.bank - (a.wallet + a.bank));
          return list.slice(0, limit);
        }
        return list;
      } catch {
        // Fall through to getAll fallback
      }
    }

    const all = await this.getAllAccounts(guildId);
    return all
      .sort((a, b) => {
        if (sortBy === "wallet") return b.wallet - a.wallet;
        if (sortBy === "bank") return b.bank - a.bank;
        if (sortBy === "level") return b.level - a.level;
        return b.wallet + b.bank - (a.wallet + a.bank);
      })
      .slice(0, limit);
  }

  public async getAllAccounts(guildId?: string): Promise<UserAccount[]> {
    await this.ensureMigrated();
    const gid = guildId || undefined;
    const delegate = this.client[this.modelName];

    if (delegate && typeof delegate.findMany === "function") {
      try {
        const records = await delegate.findMany({
          where: gid ? { guildId: gid } : undefined,
        });
        return records
          .map((r: any) => (typeof r.data === "string" ? JSON.parse(r.data) : r.data))
          .filter(Boolean) as UserAccount[];
      } catch {
        // Fall through
      }
    }

    if (typeof this.client.$queryRawUnsafe === "function") {
      try {
        const rows: any[] = gid
          ? await this.client.$queryRawUnsafe(`SELECT data FROM ${this.tableName} WHERE guildId = ?`, gid)
          : await this.client.$queryRawUnsafe(`SELECT data FROM ${this.tableName}`);
        return rows.map((r) => JSON.parse(r.data)).filter(Boolean);
      } catch {
        return [];
      }
    }

    return [];
  }
}
