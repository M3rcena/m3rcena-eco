/**
 * @m3rcena/eco
 * Visual Canvas Bank Card & Passport Renderer.
 * Generates personalized debit/credit card artwork using @napi-rs/canvas.
 *
 * @copyright 2026 M3rcena Development. All rights reserved.
 * @license Apache-2.0
 */

import { createCanvas, loadImage, GlobalFonts } from "@napi-rs/canvas";

export interface BankCardRenderOptions {
  username: string;
  avatarUrl?: string;
  wallet: number;
  bank: number;
  netWorth: number;
  currencySymbol?: string;
  cardNumber?: string;
  cardTier?: "BRONZE" | "SILVER" | "GOLD" | "PLATINUM" | "OBSIDIAN" | "MYTHIC";
  joinDate?: string;
  creditScore?: number;
  vaultTierName?: string;
  customGradient?: [string, string, string];
  bankName?: string;
}

export class RenderBankCard {
  /**
   * Generates a high-tech personalized debit/credit card buffer.
   */
  public static async renderCard(options: BankCardRenderOptions): Promise<Buffer> {
    const width = 850;
    const height = 500;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext("2d");

    const tier = options.cardTier || this.resolveTier(options.netWorth);
    const symbol = options.currencySymbol || "🪙";

    // 1. Draw rounded card outline clip
    const radius = 28;
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(radius, 0);
    ctx.lineTo(width - radius, 0);
    ctx.quadraticCurveTo(width, 0, width, radius);
    ctx.lineTo(width, height - radius);
    ctx.quadraticCurveTo(width, height, width - radius, height);
    ctx.lineTo(radius, height);
    ctx.quadraticCurveTo(0, height, 0, height - radius);
    ctx.lineTo(0, radius);
    ctx.quadraticCurveTo(0, 0, radius, 0);
    ctx.closePath();
    ctx.clip();

    // 2. Base gradient based on Tier or Custom Gradient
    const bgGrad = ctx.createLinearGradient(0, 0, width, height);
    if (options.customGradient && options.customGradient.length === 3) {
      bgGrad.addColorStop(0, options.customGradient[0]);
      bgGrad.addColorStop(0.5, options.customGradient[1]);
      bgGrad.addColorStop(1, options.customGradient[2]);
    } else if (tier === "MYTHIC") {
      bgGrad.addColorStop(0, "#0f051d");
      bgGrad.addColorStop(0.5, "#2a0845");
      bgGrad.addColorStop(1, "#6441a5");
    } else if (tier === "OBSIDIAN") {
      bgGrad.addColorStop(0, "#0a0a0c");
      bgGrad.addColorStop(0.5, "#18181b");
      bgGrad.addColorStop(1, "#27272a");
    } else if (tier === "PLATINUM") {
      bgGrad.addColorStop(0, "#1e293b");
      bgGrad.addColorStop(0.5, "#334155");
      bgGrad.addColorStop(1, "#64748b");
    } else if (tier === "GOLD") {
      bgGrad.addColorStop(0, "#2c1c02");
      bgGrad.addColorStop(0.5, "#78350f");
      bgGrad.addColorStop(1, "#d97706");
    } else if (tier === "SILVER") {
      bgGrad.addColorStop(0, "#1e1e24");
      bgGrad.addColorStop(0.5, "#4b5563");
      bgGrad.addColorStop(1, "#9ca3af");
    } else {
      // BRONZE
      bgGrad.addColorStop(0, "#1c1008");
      bgGrad.addColorStop(0.5, "#451a03");
      bgGrad.addColorStop(1, "#92400e");
    }

    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    // Decorative holographic arcs
    ctx.save();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
    for (let i = 0; i < 6; i++) {
      ctx.beginPath();
      ctx.arc(width - 80, -40, 220 + i * 50, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();

    // 3. Bank Logo / Brand header
    const brandName = options.bankName || "M3RCENA RESERVE";
    ctx.fillStyle = "#ffffff";
    ctx.font = "800 28px sans-serif";
    ctx.fillText(brandName, 50, 65);

    const subtitle = options.vaultTierName ? `VAULT: ${options.vaultTierName.toUpperCase()}` : "PRIVATE WEALTH & VAULT";
    ctx.fillStyle = "rgba(255, 255, 255, 0.65)";
    ctx.font = "600 16px sans-serif";
    ctx.fillText(subtitle, 50, 92);

    // Contactless pay symbol
    this.drawContactless(ctx, width - 80, 65);

    // 4. Smart Chip & NFC circuits
    this.drawChip(ctx, 50, 140);

    // Tier Watermark badge
    ctx.save();
    ctx.fillStyle = "rgba(255, 255, 255, 0.12)";
    ctx.font = "900 48px sans-serif";
    ctx.textAlign = "right";
    ctx.fillText(tier, width - 50, 180);
    ctx.restore();

    // 5. Card Number (Embossed look)
    const cardNum = options.cardNumber || `4280 •••• •••• ${Math.floor(1000 + Math.random() * 9000)}`;
    ctx.fillStyle = "#f8fafc";
    ctx.font = "600 32px monospace";
    ctx.letterSpacing = "4px";
    ctx.shadowColor = "rgba(0, 0, 0, 0.75)";
    ctx.shadowBlur = 4;
    ctx.fillText(cardNum, 50, 265);
    ctx.shadowBlur = 0; // reset

    // 6. Balances & Net Worth
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

    // 7. Cardholder Name, Credit Score & Avatar
    ctx.fillStyle = "rgba(255, 255, 255, 0.6)";
    ctx.font = "700 13px sans-serif";
    const creditStr = options.creditScore ? ` • FICO CREDIT: ${options.creditScore}` : "";
    ctx.fillText(`CARDHOLDER${creditStr}`, 50, 425);

    ctx.fillStyle = "#ffffff";
    ctx.font = "800 24px sans-serif";
    ctx.fillText(options.username.toUpperCase(), 50, 455);

    // Draw Avatar if provided
    if (options.avatarUrl) {
      try {
        const avatarImg = await loadImage(options.avatarUrl);
        const avX = width - 110;
        const avY = height - 110;
        const avSize = 65;

        ctx.save();
        ctx.beginPath();
        ctx.arc(avX + avSize / 2, avY + avSize / 2, avSize / 2, 0, Math.PI * 2);
        ctx.closePath();
        ctx.clip();
        ctx.drawImage(avatarImg, avX, avY, avSize, avSize);
        ctx.restore();

        // Avatar ring
        ctx.strokeStyle = "#38bdf8";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(avX + avSize / 2, avY + avSize / 2, avSize / 2, 0, Math.PI * 2);
        ctx.stroke();
      } catch {}
    }

    // Holographic Mastercard / Visa style circles
    this.drawHoloCircles(ctx, width - 180, height - 78);

    ctx.restore(); // restore clip
    return canvas.toBuffer("image/png");
  }

  private static resolveTier(netWorth: number): "BRONZE" | "SILVER" | "GOLD" | "PLATINUM" | "OBSIDIAN" | "MYTHIC" {
    if (netWorth >= 5_000_000) return "MYTHIC";
    if (netWorth >= 1_000_000) return "OBSIDIAN";
    if (netWorth >= 250_000) return "PLATINUM";
    if (netWorth >= 50_000) return "GOLD";
    if (netWorth >= 10_000) return "SILVER";
    return "BRONZE";
  }

  private static drawChip(ctx: any, x: number, y: number): void {
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

    // Internal circuit lines
    ctx.beginPath();
    ctx.moveTo(x + chipW * 0.35, y);
    ctx.lineTo(x + chipW * 0.35, y + chipH);
    ctx.moveTo(x + chipW * 0.65, y);
    ctx.lineTo(x + chipW * 0.65, y + chipH);
    ctx.moveTo(x, y + chipH * 0.5);
    ctx.lineTo(x + chipW, y + chipH * 0.5);
    ctx.stroke();

    ctx.restore();
  }

  private static drawContactless(ctx: any, x: number, y: number): void {
    ctx.save();
    ctx.strokeStyle = "rgba(255, 255, 255, 0.75)";
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";

    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.arc(x, y, 12 + i * 8, -Math.PI * 0.3, Math.PI * 0.3);
      ctx.stroke();
    }
    ctx.restore();
  }

  private static drawHoloCircles(ctx: any, x: number, y: number): void {
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
}

