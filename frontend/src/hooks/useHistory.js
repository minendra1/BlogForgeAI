import { useState, useEffect } from 'react';

export function useHistory(userId) {
  const [history, setHistory] = useState([]);

  // Load history whenever the userId changes
  useEffect(() => {
    // If no one is logged in, clear the history state immediately
    if (!userId) {
      setHistory([]);
      return;
    }

    // Fetch this specific user's private history
    const storageKey = `blog_history_${userId}`;
    const saved = localStorage.getItem(storageKey);
    
    if (saved) {
      try {
        setHistory(JSON.parse(saved));
      } catch (e) {
        setHistory([]);
      }
    } else {
      setHistory([]);
    }
  }, [userId]);

  const addToHistory = (topic, data) => {
    if (!userId) return; // Don't save if not logged in
    
    setHistory(prev => {
      // Create the new item (adjust if your data structure is slightly different)
      const newItem = { 
        id: Date.now(), 
        topic: topic, 
        title: data.title || topic,
        data: data 
      };
      
      const updatedHistory = [newItem, ...prev];
      
      // Save it uniquely for this user
      localStorage.setItem(`blog_history_${userId}`, JSON.stringify(updatedHistory));
      return updatedHistory;
    });
  };

  return { history, addToHistory };
}