// Events shared between the tools page script (search/filtering) and the
// ToolsToolbar island (category dropdown + view tabs), so filters stay in one
// place while the controls are React. The page script is the source of truth:
// it answers SYNC with the current CATEGORY, COUNTS and VIEW snapshots.
export const TOOLS_EVENT = {
  /** page -> island: current category after every filter pass (incl. resets). */
  CATEGORY: "tools:category",
  /** island -> page: the user picked a category in the dropdown. */
  CATEGORY_SET: "tools:category-set",
  /** page -> island: per-category match counts for the current search. */
  COUNTS: "tools:counts",
  /** island -> page: the island mounted; re-run filters to sync it. */
  SYNC: "tools:request-sync",
  /** page -> island: current view (grid/list), restored from storage. */
  VIEW: "tools:view",
  /** island -> page: the user switched the list/grid tabs. */
  VIEW_SET: "tools:view-set",
} as const;
