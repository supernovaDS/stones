import { Router } from "express";
import { env } from "../../config/env.js";
import { validateBody } from "../../middleware/validate.js";
import {
  extractedTasksResponseSchema,
  extractTasksRequestSchema
} from "./aiSchemas.js";
import { extractTasksWithGemini } from "./geminiTaskExtractor.js";
import { extractTasksLocally } from "./localTaskExtractor.js";

export const aiRouter = Router();

aiRouter.post(
  "/extract-tasks",
  validateBody(extractTasksRequestSchema),
  async (req, res, next) => {
    try {
      const body = req.body;

      const provider = env.GEMINI_API_KEY ? "gemini" : "local";
      const tasks =
        provider === "gemini"
          ? await extractTasksWithGemini(body)
          : extractTasksLocally(body);

      res.json(
        extractedTasksResponseSchema.parse({
          provider,
          tasks
        })
      );
    } catch (error) {
      next(error);
    }
  }
);
