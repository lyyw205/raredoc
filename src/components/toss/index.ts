/**
 * Toss-flavored component library for raredoc.
 *
 * Built from tossinvest.com design tokens (extracted via Playwright).
 * See `docs/design-system/README.md` for the spec and `src/styles/toss.css` for tokens.
 *
 * Categories:
 *   - primitives   Button / IconButton / Chip / Tag / Badge
 *   - surfaces     Card / Modal / Tooltip / Popover / Sheet
 *   - inputs       TextField / SearchField / SegmentedControl / ToggleGroup / Tab / Switch / Checkbox / Radio
 *   - data         PriceText / DeltaBadge / DataRow / StockListItem / RankingTable / Skeleton / Avatar / Spinner / EmptyState
 *   - layout       Container / Divider / Header / SideRail / Sidebar / PanelHeader / PageLayout / TickerBar
 */

export * from "./primitives";
export * from "./surfaces";
export * from "./inputs";
export * from "./data";
export * from "./layout";

// Utility helpers
export {
  directionFromDelta,
  formatKRW,
  formatPercent,
  formatSignedNumber,
  type Direction,
} from "./_utils";

// Namespaced re-exports (for `import { Toss } from "@/components/toss"` style)
export * as Primitives from "./primitives";
export * as Surfaces from "./surfaces";
export * as Inputs from "./inputs";
export * as Data from "./data";
export * as Layout from "./layout";
