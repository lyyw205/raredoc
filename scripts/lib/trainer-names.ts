/**
 * 트레이너/스타디움 JP→EN 이름 사전 배럴 (전 시대 통합).
 *
 * TR_ALL: 전 시대 병합 맵. 병합 순서는 p3-gamecard.ts:19 의 spread 와 정확히 동일
 *   { ...TR_EX, ...TR_HGSS, ...TR_DPT, ...TR_BW, ...TR_XY, ...TR_SM, ...TR_SWSH, ...TR_SV }
 *   (later overrides earlier 보존)
 *
 * ★ merge-en-identity / merge-kr-en-tails / build-group 의 시대별 picker 교체는 동결 —
 *   prefix 선택 로직 변경 위험으로 보류.
 */
export { TR_JP2EN as TR_EX } from "./trainer-names-ex";
export { TR_JP2EN as TR_HGSS } from "./trainer-names-hgss";
export { TR_JP2EN as TR_DPT } from "./trainer-names-dpt";
export { TR_JP2EN as TR_BW } from "./trainer-names-bw";
export { TR_JP2EN as TR_XY } from "./trainer-names-xy";
export { TR_JP2EN as TR_SM } from "./trainer-names-sm";
export { TR_JP2EN as TR_SWSH } from "./trainer-names-swsh";
export { TR_JP2EN as TR_SV } from "./trainer-names-sv";
export { TR_JA2KO } from "./trainer-names-jako";

import { TR_JP2EN as TR_EX } from "./trainer-names-ex";
import { TR_JP2EN as TR_HGSS } from "./trainer-names-hgss";
import { TR_JP2EN as TR_DPT } from "./trainer-names-dpt";
import { TR_JP2EN as TR_BW } from "./trainer-names-bw";
import { TR_JP2EN as TR_XY } from "./trainer-names-xy";
import { TR_JP2EN as TR_SM } from "./trainer-names-sm";
import { TR_JP2EN as TR_SWSH } from "./trainer-names-swsh";
import { TR_JP2EN as TR_SV } from "./trainer-names-sv";

/** 전 시대 JP→EN 병합 사전. 병합 순서: EX→HGSS→DPT→BW→XY→SM→SWSH→SV (later wins). */
export const TR_ALL: Record<string, string> = {
  ...TR_EX,
  ...TR_HGSS,
  ...TR_DPT,
  ...TR_BW,
  ...TR_XY,
  ...TR_SM,
  ...TR_SWSH,
  ...TR_SV,
};
