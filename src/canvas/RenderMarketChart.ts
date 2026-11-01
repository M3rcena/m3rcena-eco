/**
 * @m3rcena/eco
 * Stock & Crypto Canvas Chart Renderer.
 * Generates dynamic candlestick / sparkline price trend charts.
 *
 * @copyright 2026 M3rcena Development. All rights reserved.
 * @license Apache-2.0
 */

import { createCanvas } from "@napi-rs/canvas";

export interface StockChartOptions {
  symbol: string;
  name: string;
  history: number[];
  currentPrice: number;
  change24h: number;
  currencySymbol?: string;
}

export class RenderMarketChart {
  /**
   * Generates a sleek dark mode price chart buffer.
   */
  public static renderChart(options: StockChartOptions): Buffer {
    const width = 800;
    const height = 400;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext("2d");

    const isPositive = options.change24h >= 0;
    const accentColor = isPositive ? "#10b981" : "#ef4444";
    const history = options.history && options.history.length > 1 ? options.history : [options.currentPrice * 0.95, options.currentPrice];

    // Background
    ctx.fillStyle = "#090d16";
    ctx.fillRect(0, 0, width, height);

    // Grid lines
    ctx.strokeStyle = "rgba(255, 255, 255, 0.05)";
    ctx.lineWidth = 1;
    for (let y = 80; y < height - 50; y += 50) {
      ctx.beginPath();
      ctx.moveTo(40, y);
      ctx.lineTo(width - 40, y);
      ctx.stroke();
    }

    // Header info
    ctx.fillStyle = "#ffffff";
    ctx.font = "800 24px sans-serif";
    ctx.fillText(`${options.symbol}  •  ${options.name}`, 40, 48);

    const sym = options.currencySymbol || "$";
    ctx.font = "800 28px monospace";
    ctx.fillStyle = "#ffffff";
    ctx.fillText(`${sym}${options.currentPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 40, 90);

    ctx.font = "700 18px monospace";
    ctx.fillStyle = accentColor;
    const sign = isPositive ? "+" : "";
    ctx.fillText(`${sign}${options.change24h.toFixed(2)}% (24h)`, 280, 90);

    // Plot chart points
    const minVal = Math.min(...history) * 0.98;
    const maxVal = Math.max(...history) * 1.02;
    const range = maxVal - minVal || 1;

    const plotX = 40;
    const plotY = 130;
    const plotW = width - 80;
    const plotH = height - 170;

    const points: { x: number; y: number }[] = [];
    for (let i = 0; i < history.length; i++) {
      const x = plotX + (i / (history.length - 1)) * plotW;
      const y = plotY + plotH - ((history[i] - minVal) / range) * plotH;
      points.push({ x, y });
    }

    // Gradient Area Fill under the line
    const areaGrad = ctx.createLinearGradient(0, plotY, 0, plotY + plotH);
    areaGrad.addColorStop(0, isPositive ? "rgba(16, 185, 129, 0.25)" : "rgba(239, 68, 68, 0.25)");
    areaGrad.addColorStop(1, "rgba(0, 0, 0, 0)");

    ctx.beginPath();
    ctx.moveTo(points[0].x, plotY + plotH);
    for (const pt of points) {
      ctx.lineTo(pt.x, pt.y);
    }
    ctx.lineTo(points[points.length - 1].x, plotY + plotH);
    ctx.closePath();
    ctx.fillStyle = areaGrad;
    ctx.fill();

    // Chart Line
    ctx.strokeStyle = accentColor;
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x, points[i].y);
    }
    ctx.stroke();

    // End point indicator glowing dot
    const lastPt = points[points.length - 1];
    ctx.fillStyle = accentColor;
    ctx.shadowColor = accentColor;
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.arc(lastPt.x, lastPt.y, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // High / Low watermark
    ctx.font = "600 13px sans-serif";
    ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
    ctx.fillText(`24h Low: ${sym}${minVal.toFixed(2)}`, 40, height - 16);
    ctx.fillText(`24h High: ${sym}${maxVal.toFixed(2)}`, width - 200, height - 16);

    return canvas.toBuffer("image/png");
  }
}

