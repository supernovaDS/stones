const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, "") ??
  "http://localhost:4000";

export const extractTasksFromText = async (text, sourceBlockId, pageId) => {
  const response = await fetch(`${API_BASE_URL}/api/ai/extract-tasks`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ text, sourceBlockId, pageId })
  });

  if (!response.ok) {
    throw new Error(`AI extraction failed with ${response.status}`);
  }

  return response.json();
};
