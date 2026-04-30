import { z } from "zod";

export const extractTasksRequestSchema = z.object({
  text: z.string().trim().min(1).max(12000),
  sourceBlockId: z.string().trim().min(1).optional(),
  pageId: z.string().trim().min(1).optional()
});

export const taskPrioritySchema = z.enum(["low", "medium", "high"]);

export const extractedTaskSchema = z.object({
  title: z.string().trim().min(1),
  priority: taskPrioritySchema.default("medium"),
  dueText: z.string().trim().optional(),
  notes: z.string().trim().optional(),
  sourceBlockId: z.string().trim().optional(),
  pageId: z.string().trim().optional()
});

export const extractedTasksResponseSchema = z.object({
  provider: z.enum(["local", "gemini"]),
  tasks: z.array(extractedTaskSchema)
});
