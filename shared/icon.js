// Computes how the 時 mark (popup header, app sidebar, empty-states) and
// the toolbar icon should look, based on settings.icon:
//   { mode: "theme" | "color" | "image", color, imageDataUrl }
// "theme" (default) keeps the existing theme-driven gradient look.

function hexToRgb(hex) {
  const h = String(hex || "#6EC1E4").replace("#", "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const num = parseInt(full, 16) || 0;
  return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
}

// Picks readable white/near-black text for a given background color.
export function pickContrastColor(hex) {
  const { r, g, b } = hexToRgb(hex);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.6 ? "#14161A" : "#F5F7FA";
}

export function computeIconStyle(settings, theme) {
  const icon = (settings && settings.icon) || { mode: "theme" };
  if (icon.mode === "image" && icon.imageDataUrl) {
    return { type: "image", imageDataUrl: icon.imageDataUrl };
  }
  if (icon.mode === "color" && icon.color) {
    return { type: "color", color: icon.color, glyph: pickContrastColor(icon.color) };
  }
  return { type: "theme", bgFrom: theme.accent, bgTo: theme.accent2, glyph: theme.text };
}

// Applies the computed style directly to every .jt-mark element currently
// in the document (popup header, app sidebar, notebook empty-state, etc).
export function applyIconStyleToDOM(settings) {
  const theme = settings && settings.theme;
  if (!theme) return;
  const style = computeIconStyle(settings, theme);
  document.querySelectorAll(".jt-mark").forEach((el) => {
    if (style.type === "image") {
      el.style.backgroundImage = `url(${style.imageDataUrl})`;
      el.style.backgroundSize = "cover";
      el.style.backgroundPosition = "center";
      el.style.background = "";
      el.style.color = "transparent";
    } else if (style.type === "color") {
      el.style.backgroundImage = "";
      el.style.background = style.color;
      el.style.color = style.glyph;
    } else {
      el.style.backgroundImage = "";
      el.style.background = "";
      el.style.color = "";
    }
  });
}

// Resizes/compresses an uploaded image File into a small square PNG data
// URL, so it stays well within chrome.storage.local's quota.
export function fileToIconDataUrl(file, size = 128) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Couldn't read that file."));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("That doesn't look like an image."));
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d");
        // cover-fit crop to a square
        const scale = Math.max(size / img.width, size / img.height);
        const w = img.width * scale;
        const h = img.height * scale;
        ctx.drawImage(img, (size - w) / 2, (size - h) / 2, w, h);
        resolve(canvas.toDataURL("image/png"));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}
