import { createCanvas } from "@napi-rs/canvas";
import { writeFileSync, mkdirSync } from "fs";
import { join } from "path";

const sizes = [192, 512];
const bgColor = "#8B2500";
const textColor = "#FDF6EE";

const iconsDir = join(process.cwd(), "public", "icons");
mkdirSync(iconsDir, { recursive: true });

for (const size of sizes) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext("2d");

  // Background - rounded rectangle
  const radius = size * 0.15;
  ctx.beginPath();
  ctx.moveTo(radius, 0);
  ctx.lineTo(size - radius, 0);
  ctx.quadraticCurveTo(size, 0, size, radius);
  ctx.lineTo(size, size - radius);
  ctx.quadraticCurveTo(size, size, size - radius, size);
  ctx.lineTo(radius, size);
  ctx.quadraticCurveTo(0, size, 0, size - radius);
  ctx.lineTo(0, radius);
  ctx.quadraticCurveTo(0, 0, radius, 0);
  ctx.closePath();
  ctx.fillStyle = bgColor;
  ctx.fill();

  // Text "GM"
  const fontSize = size * 0.45;
  ctx.fillStyle = textColor;
  ctx.font = `bold ${fontSize}px sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("GM", size / 2, size / 2);

  const buffer = canvas.toBuffer("image/png");
  const filename = join(iconsDir, `icon-${size}x${size}.png`);
  writeFileSync(filename, buffer);
  console.log(`Created: ${filename} (${buffer.length} bytes)`);
}

console.log("Done!");
