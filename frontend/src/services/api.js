const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

/**
 * Non-streaming blog generation (kept for backward compatibility).
 */
export const generateBlog = async (topic, token) => {
  const response = await fetch(`${API_BASE}/api/generate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`
    },
    body: JSON.stringify({ topic }),
  });

  if (!response.ok) {
    throw new Error("Failed to reach the backend.");
  }
  
  const data = await response.json();
  if (data.status !== "success") {
    throw new Error("Generation failed.");
  }

  return data;
};

/**
 * Streaming blog generation via Server-Sent Events.
 * Calls onProgress({ step, total, message }) for each pipeline step.
 * Returns the final blog data on completion.
 */
export const generateBlogStream = async (topic, token, onProgress) => {
  const response = await fetch(`${API_BASE}/api/generate/stream`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`
    },
    body: JSON.stringify({ topic }),
  });

  if (!response.ok) {
    throw new Error("Failed to reach the backend.");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const parts = buffer.split("\n\n");
    buffer = parts.pop(); // Keep any incomplete chunk for next iteration

    for (const part of parts) {
      const line = part.trim();
      if (!line.startsWith("data: ")) continue;

      const data = JSON.parse(line.slice(6));

      if (data.type === "progress") {
        onProgress({ step: data.step, total: data.total, message: data.message });
      } else if (data.type === "complete") {
        return data.data;
      } else if (data.type === "error") {
        throw new Error(data.message || "Generation failed.");
      }
    }
  }

  throw new Error("Stream ended unexpectedly.");
};