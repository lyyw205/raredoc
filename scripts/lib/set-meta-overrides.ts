import type { PackType } from "../../src/lib/cards/set-meta";

/**
 * setId → packType/title 수동 override. 자동 분류기(set-meta.ts `derivePackType`)가
 * 못 잡거나 틀리는 소수 케이스의 단일출처. backfill-set-meta.ts 와 verify-set-meta.ts 가 공유.
 * 근거: docs/dex-pack-typing.md §3.2.
 */
export const PACK_TYPE_OVERRIDE: Record<string, { packType?: PackType; title?: string }> = {
  // EN SM 본탄(sm1~sm12, sm35) — 해당 EN Set 이 setGroup 미연결(era=null)이라 자동분류가 null.
  // 정식 해결 = 이 Set 들의 setGroup 백필(그러면 era 채워져 자동 expansion). 임시 = expansion 고정.
  sm1: { packType: "expansion" },
  sm2: { packType: "expansion" },
  sm3: { packType: "expansion" },
  sm35: { packType: "expansion" },
  sm4: { packType: "expansion" },
  sm6: { packType: "expansion" },
  sm7: { packType: "expansion" },
  sm8: { packType: "expansion" },
  sm9: { packType: "expansion" },
  sm10: { packType: "expansion" },
  sm11: { packType: "expansion" },
  sm12: { packType: "expansion" },
};
