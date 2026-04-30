const taskMarkerPattern = /^(\s*)([-*]|\d+\.|\[[ xX]\]|todo:|task:)\s+/i;
const deadlinePattern =
  /\b(today|tomorrow|tonight|next\s+\w+|on\s+\w+|by\s+[^,.;]+|at\s+\d{1,2}(:\d{2})?\s*(am|pm)?)\b/i;

export const extractTasksLocally = (request) => {
  const lines = request.text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  return lines
    .filter((line) => taskMarkerPattern.test(line) || looksActionable(line))
    .map((line) => {
      const title = line.replace(taskMarkerPattern, "").trim();
      const dueText = title.match(deadlinePattern)?.[0];

      return {
        title,
        priority: inferPriority(title),
        dueText,
        sourceBlockId: request.sourceBlockId,
        pageId: request.pageId
      };
    });
};

const looksActionable = (line) => {
  if (line.length < 4 || line.length > 180) {
    return false;
  }

  return /^(finish|complete|submit|send|email|call|review|read|write|prepare|buy|schedule|pay|fix|update|create|draft)\b/i.test(
    line
  );
};

const inferPriority = (text) => {
  if (/\b(urgent|asap|important|high priority|critical)\b/i.test(text)) {
    return "high";
  }

  if (/\b(low priority|someday|later|whenever)\b/i.test(text)) {
    return "low";
  }

  return "medium";
};
