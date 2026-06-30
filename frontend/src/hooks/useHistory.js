import { useState, useEffect, useCallback } from 'react';

// --- Simple Promise-based IndexedDB Wrapper ---
const DB_NAME = 'BlogForgeDB';
const STORE_NAME = 'blogs';
const DB_VERSION = 1;

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function getBlogData(id) {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(id);
      request.onsuccess = () => resolve(request.result?.data || null);
      request.onerror = () => reject(request.error);
    });
  } catch (e) {
    console.error("IndexedDB error:", e);
    return null;
  }
}

async function saveBlogData(id, data) {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put({ id, data });
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (e) {
    console.error("IndexedDB save error:", e);
  }
}

async function deleteBlogData(id) {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (e) {
    console.error("IndexedDB delete error:", e);
  }
}

async function clearAllBlogData() {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.clear();
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (e) {
    console.error("IndexedDB clear error:", e);
  }
}
// ----------------------------------------------

export function useHistory(userId) {
  const [history, setHistory] = useState([]);

  // Load history metadata whenever the userId changes
  useEffect(() => {
    if (!userId) {
      setHistory([]);
      return;
    }

    const storageKey = `blog_history_${userId}`;
    const saved = localStorage.getItem(storageKey);
    
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setHistory(parsed);
      } catch (e) {
        setHistory([]);
      }
    } else {
      setHistory([]);
    }
  }, [userId]);

  const addToHistory = useCallback((topic, data) => {
    if (!userId) return;
    
    setHistory(prev => {
      const newItemId = Date.now().toString(); // Use string ID for consistency
      
      const newItemMeta = { 
        id: newItemId, 
        topic: topic, 
        title: data.title || topic,
        date: new Date().toISOString()
      };
      
      // Prepend and limit to 50 items
      let updatedHistory = [newItemMeta, ...prev];
      let removedItems = [];
      
      if (updatedHistory.length > 50) {
        removedItems = updatedHistory.slice(50);
        updatedHistory = updatedHistory.slice(0, 50);
      }
      
      // Save metadata to localStorage
      localStorage.setItem(`blog_history_${userId}`, JSON.stringify(updatedHistory));
      
      // Save full content to IndexedDB async
      saveBlogData(newItemId, data).then(() => {
        // Cleanup old items from IndexedDB
        removedItems.forEach(item => deleteBlogData(item.id));
      });
      
      return updatedHistory;
    });
  }, [userId]);

  const clearHistory = useCallback(() => {
    if (!userId) return;
    
    setHistory([]);
    localStorage.removeItem(`blog_history_${userId}`);
    clearAllBlogData();
  }, [userId]);

  return { history, addToHistory, clearHistory, getBlogData };
}