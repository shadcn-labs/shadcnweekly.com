export const TOOL_CATEGORIES = [
  "Components",
  "Frameworks",
  "Themes",
  "Registries",
  "Tooling",
  "AI",
  "Apps",
] as const;

export type ToolCategory = (typeof TOOL_CATEGORIES)[number];
