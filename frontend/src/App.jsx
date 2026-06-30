import { useState } from 'react';
import { SignedIn, SignedOut, SignInButton, useAuth } from "@clerk/clerk-react";
import { Sparkles, Loader2, Terminal, X } from "lucide-react";

// Hooks & Services
import { useTheme } from './hooks/useTheme';
import { useHistory } from './hooks/useHistory';
import { generateBlog } from './services/api';

// Components
import Sidebar from './components/layout/Sidebar';
import Navbar from './components/layout/Navbar';
import BlogOutput from './components/workspace/BlogOutput';

export default function App() {
  const [darkMode, setDarkMode] = useTheme();
  const { history, addToHistory } = useHistory();
  
  // Initialize the authentication hook from Clerk
  const { getToken } = useAuth();
  
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [topic, setTopic] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [blogResult, setBlogResult] = useState(null);
  const [error, setError] = useState(null);

  const handleGenerate = async (e) => {
    e.preventDefault();
    if (!topic.trim()) return;

    setIsLoading(true);
    setError(null);
    setBlogResult(null);

    try {
      // Retrieve the active session JWT from Clerk
      const token = await getToken();
      
      if (!token) {
        throw new Error("Authentication error. Please sign in again.");
      }

      // Pass the token to the backend API service
      const data = await generateBlog(topic, token);
      
      setBlogResult(data);
      addToHistory(topic, data);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const loadHistoryItem = (item) => {
    setBlogResult(item);
    setTopic(item.topic);
    if (window.innerWidth < 768) setSidebarOpen(false);
  };

  const startNewGeneration = () => {
    setBlogResult(null);
    setTopic("");
    if (window.innerWidth < 768) setSidebarOpen(false);
  };

  return (
    <div className="flex h-screen overflow-hidden bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/50 dark:from-slate-950 dark:via-slate-900/80 dark:to-slate-950 selection:bg-blue-500 selection:text-white transition-colors duration-300">
      
      <Sidebar 
        isOpen={sidebarOpen} 
        setIsOpen={setSidebarOpen} 
        history={history} 
        onLoadItem={loadHistoryItem} 
        onNew={startNewGeneration} 
      />

      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        <Navbar 
          darkMode={darkMode} 
          setDarkMode={setDarkMode} 
          setSidebarOpen={setSidebarOpen} 
          hasResult={!!blogResult} 
        />

        <main className="flex-1 overflow-y-auto p-4 sm:p-8">
          <div className="max-w-4xl mx-auto w-full pb-24">
            
            {!blogResult && !isLoading && (
              <div className="text-center max-w-2xl mx-auto mb-10 mt-10">
                <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-2xl flex items-center justify-center mx-auto mb-6 transform rotate-3">
                  <Sparkles size={32} />
                </div>
                <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-4 text-slate-900 dark:text-white">
                  What are we writing today?
                </h2>
              </div>
            )}

            <SignedOut>
              {!blogResult && (
                <div className="w-full bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl p-8 rounded-2xl border border-slate-200/50 dark:border-slate-800/50 text-center shadow-sm">
                  <h3 className="text-lg font-bold mb-2 text-slate-900 dark:text-white">Authentication Required</h3>
                  <div className="w-fit mx-auto mt-4 bg-blue-600 text-white px-6 py-2.5 rounded-xl font-medium hover:bg-blue-700 transition-colors cursor-pointer shadow-md shadow-blue-500/10">
                    <SignInButton mode="modal" />
                  </div>
                </div>
              )}
            </SignedOut>

            <SignedIn>
              <div className="w-full bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-2xl border border-slate-200/60 dark:border-slate-800/60 shadow-xl shadow-slate-200/20 dark:shadow-none p-2 mb-8 sticky top-0 z-10">
                <form onSubmit={handleGenerate} className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    placeholder="e.g., Guide to vector databases in 2024"
                    className="flex-1 bg-transparent px-4 py-3 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none text-base border-none ring-0"
                    disabled={isLoading}
                  />
                  <button
                    type="submit"
                    disabled={isLoading || !topic.trim()}
                    className="bg-blue-600 text-white px-6 py-3 rounded-xl font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-md shadow-blue-500/20 whitespace-nowrap"
                  >
                    {isLoading ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
                    <span className="hidden sm:inline">{isLoading ? "Generating..." : "Generate"}</span>
                  </button>
                </form>
              </div>

              {isLoading && (
                <div className="w-full bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm rounded-2xl border border-slate-200/50 dark:border-slate-800/50 p-12 text-center animate-pulse">
                  <Terminal className="w-10 h-10 mx-auto text-blue-500 mb-4 animate-bounce" />
                  <p className="text-base font-semibold text-slate-700 dark:text-slate-300">Agents are orchestrating...</p>
                </div>
              )}

              {error && (
                <div className="w-full bg-red-50/80 dark:bg-red-950/30 backdrop-blur-md text-red-600 dark:text-red-400 p-4 rounded-xl border border-red-200 dark:border-red-900/50 text-sm flex items-start gap-3">
                  <X size={18} className="mt-0.5 shrink-0" />
                  <div><span className="font-semibold block mb-1">Execution Error</span>{error}</div>
                </div>
              )}

              <BlogOutput result={blogResult} />
            </SignedIn>
          </div>
        </main>
      </div>
    </div>
  );
}