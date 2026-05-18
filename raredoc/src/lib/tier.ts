export interface TierEntry {
  cardId: string;
  name: string;
  nameKo?: string;
  imageSmall: string;
  tier: "S" | "A" | "B" | "C" | "D";
  reason?: string;
  reasonEn?: string;
}

export interface TierList {
  setCode: string;
  label: string;
  updatedAt: string;
  entries: TierEntry[];
}

export async function loadTierList(setCode: string): Promise<TierList | null> {
  try {
    const data = await import(`../../data/tier-lists/${setCode}.json`);
    return data.default as TierList;
  } catch {
    return null;
  }
}

export async function loadAllTierLists(): Promise<TierList[]> {
  const sets = ["sv3pt5", "sv4pt5", "sv"];
  const results = await Promise.all(sets.map(loadTierList));
  return results.filter(Boolean) as TierList[];
}
