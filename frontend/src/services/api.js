export const generateBlog = async (topic, token) => {
  const response = await fetch("http://localhost:8000/api/generate", {
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