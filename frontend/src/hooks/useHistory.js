import { useState, useEffect } from 'react';

export function useHistory() {
  const [history, setHistory] = useState(() => {
    const saved = localStorage.getItem('blogHistory');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem('blogHistory', JSON.stringify(history));
  }, [history]);

  const addToHistory = (topic, data) => {
    const newItem = {
      id: Date.now().toString(),
      topic,
      title: data.title,
      markdown: data.markdown,
      image_specs: data.image_specs,
      date: new Date().toLocaleDateString()
    };
    setHistory(prev => [newItem, ...prev].slice(0, 20)); // Keep last 20
  };

  return { history, addToHistory };
}