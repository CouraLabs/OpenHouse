import { z } from "zod"
import {
  splitModes,
  type SplitEntry,
  type SplitInput,
  type SplitMode,
  type SplitResolution,
  type SplitShare,
} from "@workspace/domain"

export {
  splitModes,
  type SplitEntry,
  type SplitInput,
  type SplitMode,
  type SplitResolution,
  type SplitShare,
}

const splitValueSchema = z
  .string()
  .regex(/^\d{1,14}(\.\d{1,2})?$/, "Enter a number like 12.34.")

export const splitEntrySchema = z.object({
  userId: z.number().int().positive(),
  value: splitValueSchema.optional(),
})

export const splitInputSchema = z
  .object({
    mode: z.enum(splitModes, {
      error: "Equal, percentage, or exact.",
    }),
    entries: z
      .array(splitEntrySchema)
      .min(1, "Pick who shares the expense.")
      .max(50),
  })
  .superRefine((split, ctx) => {
    const seen = new Set<number>()

    for (const [index, entry] of split.entries.entries()) {
      if (seen.has(entry.userId)) {
        ctx.addIssue({
          code: "custom",
          path: ["entries", index, "userId"],
          message: "Each member appears once.",
        })
      }

      seen.add(entry.userId)

      if (split.mode !== "equal" && entry.value === undefined) {
        ctx.addIssue({
          code: "custom",
          path: ["entries", index, "value"],
          message:
            split.mode === "percentage"
              ? "Enter a percentage."
              : "Enter an amount.",
        })
      }
    }
  })

export const splitModeSchema = z.enum(splitModes, {
  error: "Equal, percentage, or exact.",
})
