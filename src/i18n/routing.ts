import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["ko", "en"],
  defaultLocale: "ko",
});

/** 지원 로케일 타입 — 로케일 정의 단일출처(routing)에서 파생. */
export type Locale = (typeof routing.locales)[number]; // "ko" | "en"

/** 임의 문자열이 지원 로케일인지 검사(통과 시 Locale 로 narrowing). */
export const isLocale = (value: string): value is Locale =>
  (routing.locales as readonly string[]).includes(value);
