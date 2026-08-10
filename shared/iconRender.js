// Renders the toolbar icon as ImageData so it can be re-themed at
// runtime (via chrome.action.setIcon) to match Settings → Theme/Icon.
// Uses OffscreenCanvas so it also works inside the MV3 service worker
// (background.js), which has no DOM.
import { computeIconStyle } from "./icon.js";

function drawRoundedSquarePath(ctx, size, radius) {
  ctx.beginPath();
  if (typeof ctx.roundRect === "function") {
    ctx.roundRect(0, 0, size, size, radius);
    return;
  }
  ctx.moveTo(radius, 0);
  ctx.lineTo(size - radius, 0);
  ctx.arcTo(size, 0, size, radius, radius);
  ctx.lineTo(size, size - radius);
  ctx.arcTo(size, size, size - radius, size, radius);
  ctx.lineTo(radius, size);
  ctx.arcTo(0, size, 0, size - radius, radius);
  ctx.lineTo(0, radius);
  ctx.arcTo(0, 0, radius, 0, radius);
  ctx.closePath();
}

async function drawImageIcon(ctx, size, dataUrl) {
  const res = await fetch(dataUrl);
  const blob = await res.blob();
  const bitmap = await createImageBitmap(blob);
  drawRoundedSquarePath(ctx, size, size * 0.24);
  ctx.save();
  ctx.clip();
  const scale = Math.max(size / bitmap.width, size / bitmap.height);
  const w = bitmap.width * scale;
  const h = bitmap.height * scale;
  ctx.drawImage(bitmap, (size - w) / 2, (size - h) / 2, w, h);
  ctx.restore();
}

export async function renderIconImageData(settings, theme, size, { tracking = true } = {}) {
  const canvas = new OffscreenCanvas(size, size);
  const ctx = canvas.getContext("2d");
  const style = computeIconStyle(settings, theme);

  // Idle = grayscale, so the toolbar icon shows at a glance whether a
  // timer is running, without needing to open the popup.
  if (!tracking) {
    ctx.filter = "grayscale(1) saturate(0) brightness(0.95)";
  }

  if (style.type === "image") {
    try {
      await drawImageIcon(ctx, size, style.imageDataUrl);
      return ctx.getImageData(0, 0, size, size);
    } catch (err) {
      // fall through to the theme look if the stored image is bad
    }
  }

  drawRoundedSquarePath(ctx, size, size * 0.24);
  if (style.type === "color") {
    ctx.fillStyle = style.color;
  } else {
    const grad = ctx.createLinearGradient(0, 0, size, size);
    grad.addColorStop(0, style.bgFrom);
    grad.addColorStop(1, style.bgTo);
    ctx.fillStyle = grad;
  }
  ctx.fill();

  ctx.fillStyle = style.glyph;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `700 ${Math.round(size * 0.62)}px "Noto Sans JP", "Hiragino Sans", sans-serif`;
  ctx.fillText("\u6642", size / 2, size / 2 + size * 0.04);

  return ctx.getImageData(0, 0, size, size);
}

export async function renderIconImageDataSet(settings, theme, sizes = [16, 32, 48, 128], opts = {}) {
  const out = {};
  for (const s of sizes) out[s] = await renderIconImageData(settings, theme, s, opts);
  return out;
}
