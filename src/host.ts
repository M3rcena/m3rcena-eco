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

import http from "node:http";
import { EcoManager } from "./EcoManager.js";
import { EcoBridgeRouter } from "./bridge/EcoBridgeRouter.js";
import { SqliteEcoStorage } from "./storage/SqliteEcoStorage.js";
import { RenderBankCard } from "./canvas/RenderBankCard.js";
import { getAllPackageResolutions, printResolutionSummary } from "./resolver.js";
import { ECO_VERSION } from "./utils/Notifier.js";
import type { BridgeRequest, BridgeResponse } from "@m3rcena/bridge";

export interface HostEcoOptions {
  port?: number;
  dbPath?: string;
  bridgeUrl?: string;
}

export async function hostEco(options: HostEcoOptions = {}): Promise<{
  eco: EcoManager;
  router: EcoBridgeRouter;
  server: http.Server;
  port: number;
}> {
  const port = options.port ?? parseInt(process.env.PORT || process.env.ECO_PORT || "4002", 10);
  const dbPath = options.dbPath ?? (process.env.ECO_DB_PATH || "./eco.sqlite");

  printResolutionSummary();

  const storage = new SqliteEcoStorage({ path: dbPath });
  const eco = new EcoManager({
    storage,
    currencySymbol: "🪙",
    currencyName: "Coins",
  });

  const router = new EcoBridgeRouter(eco);

  // Try auto-connecting to Bridge if bridge submodule/npm exists
  const resolutions = getAllPackageResolutions();
  if (resolutions["@m3rcena/bridge"].status !== "missing") {
    try {
      const bridgeModule = await import(resolutions["@m3rcena/bridge"].path);
      if (bridgeModule.M3rcenaBridge) {
        console.log(`[m3rcena-eco] 🌉 Found @m3rcena/bridge (${resolutions["@m3rcena/bridge"].status}). Ready for bridge mount.`);
      }
    } catch {
      // Ignore
    }
  }

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
      res.end(
        JSON.stringify({
          status: "healthy",
          package: "@m3rcena/eco",
          mode: "local-submodule-host",
          version: ECO_VERSION,
          database: "SQLite",
          dbPath,
          uptime: process.uptime(),
        }, null, 2)
      );
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
          netWorth: account.wallet + account.bank,
        });
        res.writeHead(200, { "Content-Type": "image/png" });
        res.end(cardBuffer);
        return;
      } catch (err: any) {
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

    // Forward to EcoBridgeRouter if matched
    if (pathname.startsWith("/eco/") || pathname.startsWith("/api/eco")) {
      const bridgeReq: BridgeRequest = {
        method: (req.method as any) || "GET",
        url: req.url || "/",
        path: pathname,
        subPath: pathname.replace(/^\/(?:api\/)?eco/, ""),
        params: {},
        query: Object.fromEntries(url.searchParams.entries()),
        headers: req.headers as Record<string, string>,
      };
      const handled = await router.handleRequest(bridgeReq);
      if (handled) {
        res.writeHead(handled.status, {
          "Content-Type": handled.contentType || "application/json",
          ...(handled.headers || {}),
        });
        if (Buffer.isBuffer(handled.body)) {
          res.end(handled.body);
        } else if (typeof handled.body === "string") {
          res.end(handled.body);
        } else {
          res.end(JSON.stringify(handled.body));
        }
        return;
      }
    }

    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Route not found", path: pathname }));
  });

  await new Promise<void>((resolve) => {
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

  return { eco, router, server, port };
}

if (process.argv[1]?.endsWith("host.ts") || process.argv[1]?.endsWith("host.js")) {
  hostEco().catch((err) => {
    console.error("[m3rcena-eco host] Fatal error:", err);
    process.exit(1);
  });
}
