import { formatRelativeKo } from "@/lib/format/relative-time";

/** Date → 한국어 상대 시간 라벨 (대화 목록/메시지 시각 표시용). 완전판 사다리 단일출처. */
export function formatRelative(date: Date | null): string {
  return formatRelativeKo(date);
}

/** Date → 메시지 버블 시각 (HH:MM, 어제 이전이면 날짜 포함). */
export function formatMessageTime(date: Date): string {
  const now = new Date();
  const sameDay =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();
  const hh = String(date.getHours()).padStart(2, "0");
  const mm = String(date.getMinutes()).padStart(2, "0");
  if (sameDay) return `${hh}:${mm}`;
  return `${date.getMonth() + 1}/${date.getDate()} ${hh}:${mm}`;
}
