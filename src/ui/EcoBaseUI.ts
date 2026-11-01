/**
 * @m3rcena/eco
 * Base Class for Interactive Discord Economy UI Modules.
 *
 * @copyright 2026 M3rcena Development. All rights reserved.
 * @license Apache-2.0
 */

import { ContainerBuilder, ColorResolvable, resolveColor } from "discord.js";
import { ContextAdapter, GameContextInput } from "./ContextAdapter.js";

export interface EcoBaseUIOptions {
  context: GameContextInput;
  embedColor?: ColorResolvable | number | string;
  time?: number; // Inactivity timeout in ms (default: 120_000)
}

export abstract class EcoBaseUI<TOptions extends EcoBaseUIOptions = EcoBaseUIOptions> {
  public manager: any;
  public options: TOptions;
  public ctx: ContextAdapter;
  public id: string;
  public defaultColor: number = 0x5865f2;
  public isActive: boolean = false;
  protected timeoutTimer: NodeJS.Timeout | null = null;
  protected defaultTimeout: number = 120_000;

  constructor(manager: any, options: TOptions, prefix: string = "eco_") {
    this.manager = manager;
    this.options = options;
    this.ctx = ContextAdapter.from(options.context);
    this.id = `${prefix}${Math.random().toString(36).substring(2, 8)}`;
    this.defaultTimeout = options.time || 120_000;
    this.defaultColor = this.resolveColor(options.embedColor || manager?.embedColor);
  }

  public resolveColor(color?: ColorResolvable | string | number | null, fallback: number = 0x5865f2): number {
    if (!color) return fallback;
    if (typeof color === "number") return color;
    if (typeof color === "string") {
      if (color.startsWith("#")) {
        const parsed = parseInt(color.replace("#", ""), 16);
        if (!isNaN(parsed)) return parsed;
      }
    }
    try {
      return resolveColor(color as any);
    } catch {
      return fallback;
    }
  }

  public createContainer(color?: number): ContainerBuilder {
    const container = new ContainerBuilder();
    container.setAccentColor(color !== undefined ? color : this.defaultColor);
    return container;
  }

  protected resetTimeout(callback?: () => void, customMs?: number): void {
    this.clearTimer();
    const duration = customMs || this.defaultTimeout;
    this.timeoutTimer = setTimeout(() => {
      if (this.isActive) {
        if (callback) {
          callback();
        } else {
          this.destroy();
        }
      }
    }, duration);
    if (typeof (this.timeoutTimer as any).unref === "function") {
      (this.timeoutTimer as any).unref();
    }
  }

  protected clearTimer(): void {
    if (this.timeoutTimer) {
      clearTimeout(this.timeoutTimer);
      this.timeoutTimer = null;
    }
  }

  public destroy(): void {
    this.isActive = false;
    this.clearTimer();
  }

  public format(template: string, vars: Record<string, any>): string {
    let result = template;
    for (const [key, value] of Object.entries(vars)) {
      result = result.replaceAll(`{{${key}}}`, String(value));
    }
    return result;
  }

  public abstract start(): Promise<void>;
}

