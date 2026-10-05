export const TOOL_CATEGORIES = [
  "Components",
  "Blocks & Templates",
  "Themes",
  "Registries",
  "Tooling",
  "AI",
  "Apps",
] as const;

export type ToolCategory = (typeof TOOL_CATEGORIES)[number];
