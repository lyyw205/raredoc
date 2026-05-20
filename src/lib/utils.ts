import { clsx, type ClassValue } from "clsx"
import { extendTailwindMerge } from "tailwind-merge"

/**
 * Toss text-size tokens (`text-toss-label`, `text-toss-body`, ...) live in
 * Tailwind v4's `@theme` and surface as `text-*` utilities. By default
 * tailwind-merge treats every `text-*` class as a color and dedupes them
 * against `text-white`/`text-toss-text-primary`, dropping the color. Tag
 * the size variants explicitly as `font-size` so color + size can coexist.
 */
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-size": [
        {
          text: [
            "toss-display",
            "toss-title-1",
            "toss-title-2",
            "toss-subtitle",
            "toss-body",
            "toss-label",
            "toss-caption",
            "toss-micro",
            "toss-tiny",
          ],
        },
      ],
    },
  },
})

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
