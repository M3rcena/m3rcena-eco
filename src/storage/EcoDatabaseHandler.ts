/**
 * @m3rcena/eco
 * Unified Database Handler and Factory for SQLite, Prisma, JSON, and Memory storage.
 *
 * @copyright 2026 M3rcena Development. All rights reserved.
 * @license Apache-2.0
 */

import { EcoStorageAdapter, MemoryEcoStorage, JsonEcoStorage } from "./EcoStorage.js";
import { SqliteEcoStorage, SqliteEcoStorageOptions } from "./SqliteEcoStorage.js";
import { PrismaEcoStorage, PrismaEcoStorageOptions, PRISMA_ECO_MODEL, applyPrismaEcoModel } from "./PrismaEcoStorage.js";
import { EcoDatabaseConfig } from "../types.js";

export class EcoDatabaseHandler {
  /**
   * Instantiates the requested database storage adapter based on developer configuration.
   */
  public static create(config?: EcoDatabaseConfig): EcoStorageAdapter {
    if (!config || config === "memory") {
      return new MemoryEcoStorage();
    }

    if (config === "sqlite") {
      return new SqliteEcoStorage("./eco.sqlite");
    }

    if (config === "json") {
      return new JsonEcoStorage("./eco-data.json");
    }

    if (typeof config === "object") {
      if (config.type === "sqlite") {
        return new SqliteEcoStorage(config.path || "./eco.sqlite");
      }

      if (config.type === "prisma") {
        return new PrismaEcoStorage({
          client: config.client,
          model: config.model || "ecoAccount",
          autoMigrate: config.autoMigrate ?? true,
        });
      }

      if (config.type === "json") {
        return new JsonEcoStorage(config.path || "./eco-data.json");
      }

      if (config.type === "memory") {
        return new MemoryEcoStorage();
      }
    }

    // Default fallback
    return new MemoryEcoStorage();
  }

  /**
   * Helper utility to automatically append the EcoAccount model to schema.prisma.
   */
  public static applyPrismaSchema(schemaPath: string = "prisma/schema.prisma"): boolean {
    return applyPrismaEcoModel(schemaPath);
  }
}

/**
 * Convenience helper to resolve an EcoStorageAdapter from either an existing storage instance or database config.
 */
export function resolveEcoStorage(options: { storage?: any; database?: EcoDatabaseConfig }): EcoStorageAdapter {
  if (options.storage) {
    return options.storage;
  }
  if (options.database) {
    return EcoDatabaseHandler.create(options.database);
  }
  return new MemoryEcoStorage();
}

