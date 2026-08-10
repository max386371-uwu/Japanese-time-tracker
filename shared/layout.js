export const SIDEBAR_POSITIONS = [
  { value: "left", label: "Left" },
  { value: "right", label: "Right" },
];
export const DENSITY_OPTIONS = [
  { value: "comfortable", label: "Comfortable" },
  { value: "compact", label: "Compact" },
];
export const FONT_SIZE_OPTIONS = [
  { value: "small", label: "Small" },
  { value: "medium", label: "Medium" },
  { value: "large", label: "Large" },
];
export const CORNER_OPTIONS = [
  { value: "rounded", label: "Rounded" },
  { value: "sharp", label: "Sharp" },
];
export const MODE_OPTIONS = [
  { value: "standard", label: "Standard" },
  { value: "simple", label: "Simple" },
];

export function applyLayout(layout) {
  const body = document.body;
  if (!body) return;
  const l = layout || {};
  body.classList.toggle("jt-sidebar-right", l.sidebarPosition === "right");
  body.classList.toggle("jt-density-compact", l.density === "compact");
  body.classList.remove("jt-font-small", "jt-font-large");
  if (l.fontSize === "small") body.classList.add("jt-font-small");
  if (l.fontSize === "large") body.classList.add("jt-font-large");
  body.classList.toggle("jt-corners-sharp", l.corners === "sharp");
  body.classList.toggle("jt-simple-mode", l.mode === "simple");
}
