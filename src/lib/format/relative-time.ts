/**
 * 한국어 상대시간 라벨 공용 단일출처(클라/서버 공용, 순수 함수).
 *
 * 정본은 messaging 의 완전판 사다리(방금/분/시간/어제/일/주/개월/년 + null→"").
 * 호출부마다 표기를 그대로 보존하기 위한 옵션:
 *  - maxUnit: 'day'  → 일(日) 위 단위(주/개월/년)를 쓰지 않고 "N일 전"으로만 표기(커뮤니티 톤).
 *  - floorAsOneMinute → min<1 일 때 "방금 전" 대신 "1분 전"으로 표기.
 *
 * 입력은 Date | ISO 문자열 | epoch(ms) | null. null/무효 입력은 "".
 */
export function formatRelativeKo(
  input: Date | string | number | null,
  opts?: { maxUnit?: "day"; floorAsOneMinute?: boolean }
): string {
  if (input == null) return "";
  const date = input instanceof Date ? input : new Date(input);
  const ms = date.getTime();
  if (Number.isNaN(ms)) return "";

  const diff = Date.now() - ms;
  const min = Math.floor(diff / 60_000);
  if (min < 1) return opts?.floorAsOneMinute ? "1분 전" : "방금 전";
  if (min < 60) return `${min}분 전`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}시간 전`;
  const day = Math.floor(hr / 24);
  if (day === 1) return "어제";
  if (opts?.maxUnit === "day") return `${day}일 전`;
  if (day < 7) return `${day}일 전`;
  const week = Math.floor(day / 7);
  if (week < 5) return `${week}주 전`;
  const month = Math.floor(day / 30);
  if (month < 12) return `${month}개월 전`;
  return `${Math.floor(day / 365)}년 전`;
}
