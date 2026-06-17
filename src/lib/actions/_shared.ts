// 서버 액션 공통 — 결과 코어 타입 + 표준 에러 문구 단일출처.

/** 액션 결과 공통 코어. 각 액션은 도메인 페이로드를 제네릭으로 끼운다. */
export type ActionResult<T = Record<never, never>> = { ok: boolean; error?: string } & T;

/** 액션 표준 에러 문구(문구 통일 + 향후 i18n 지점). */
export const ACTION_ERR = {
  auth: "로그인이 필요합니다.",
  badRequest: "잘못된 요청입니다.",
} as const;
