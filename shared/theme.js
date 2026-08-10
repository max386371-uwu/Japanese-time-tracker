export const THEME_PRESETS = {
  navy: {
    label: "Navy (default)",
    bg: "#0D1B30",
    surface: "#142944",
    surfaceAlt: "#1B3355",
    text: "#F5F7FA",
    textMuted: "#8FA3BF",
    accent: "#6EC1E4",
    accent2: "#8FD6BD",
  },
  sumi: {
    label: "Sumi ink",
    bg: "#14161A",
    surface: "#1E2126",
    surfaceAlt: "#282C33",
    text: "#F2F1ED",
    textMuted: "#8D9199",
    accent: "#E4B94E",
    accent2: "#C97B63",
  },
  sakura: {
    label: "Sakura",
    bg: "#241621",
    surface: "#31202D",
    surfaceAlt: "#3F2939",
    text: "#FBF1F5",
    textMuted: "#B996A9",
    accent: "#F2A6C5",
    accent2: "#F2D06E",
  },
  paper: {
    label: "Washi paper (light)",
    bg: "#F3EFE6",
    surface: "#FFFFFF",
    surfaceAlt: "#EAE3D3",
    text: "#231F1A",
    textMuted: "#756E60",
    accent: "#2E6E8E",
    accent2: "#B5502F",
  },
  matcha: {
    label: "Matcha",
    bg: "#14211A",
    surface: "#1D2F24",
    surfaceAlt: "#26402F",
    text: "#F3F6EE",
    textMuted: "#93AC8C",
    accent: "#B7DE6B",
    accent2: "#E3B94E",
  },
  indigo: {
    label: "Indigo",
    bg: "#191830",
    surface: "#232144",
    surfaceAlt: "#2E2B58",
    text: "#F1EFFA",
    textMuted: "#A9A3C9",
    accent: "#E8B84B",
    accent2: "#6FC9C4",
  },
};

export function applyTheme(theme) {
  const root = document.documentElement.style;
  root.setProperty("--jt-bg", theme.bg);
  root.setProperty("--jt-surface", theme.surface);
  root.setProperty("--jt-surface-alt", theme.surfaceAlt);
  root.setProperty("--jt-text", theme.text);
  root.setProperty("--jt-text-muted", theme.textMuted);
  root.setProperty("--jt-accent", theme.accent);
  root.setProperty("--jt-accent2", theme.accent2);
}
