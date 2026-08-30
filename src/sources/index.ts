import type { Source } from "../core/source.js";
import { cincinnatiArtsSource } from "./cincinnati-arts/index.js";

export const sources: Source[] = [cincinnatiArtsSource];

export function getSource(id: string): Source | undefined {
  return sources.find((s) => s.id === id);
}
