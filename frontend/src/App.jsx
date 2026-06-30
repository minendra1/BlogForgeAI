import { useState, useEffect } from 'react';
import { SignedIn, SignedOut, SignInButton, UserButton } from "@clerk/clerk-react";
import { Sun, Moon, Sparkles, Loader2, BookOpen, Terminal, CheckCircle } from "lucide-react";
import ReactMarkdown from 'react-markdown';

export default function App() {
  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem('theme') === 'dark' || 
      (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches);
  });
  const [topic, setTopic] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [blogResult, setBlogResult] = useState(null);
  const [error, setError] = useState(null);

  // Sync dark mode class with state
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [darkMode]);

  // Submit handler targeted exactly at your FastAPI backend payload
  const handleGenerate = async (e) => {
    e.preventDefault();
    if (!topic.trim()) return;

    setIsLoading(true);
    setError(null);
    setBlogResult(null);

    try {
      const response = await fetch("http://localhost:8000/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic }),
      });

      if (!response.ok) {
        throw new Error("Failed to reach the LangGraph orchestrator. Ensure your FastAPI server is running.");
      }

      const data = await response.json();
      
      if (data.status === "success") {
        setBlogResult(data);
      } else {
        throw new Error("Orchestrator returned an unsuccessful status.");
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col selection:bg-blue-500 selection:text-white">
      {/* Header / Navbar */}
      <nav className="sticky top-0 z-50 backdrop-blur-md bg-white/80 dark:bg-slate-950/80 border-b border-slate-200 dark:border-slate-800 transition-colors">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="bg-gradient-to-tr from-blue-600 to-indigo-600 p-2 rounded-xl text-white shadow-md shadow-blue-500/20">
              <BookOpen size={20} />
            </div>
            <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-slate-900 to-slate-700 dark:from-white dark:to-slate-300 bg-clip-text text-transparent">
              BlogForge<span className="text-blue-600 dark:text-blue-400">AI</span>
            </span>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              aria-label="Toggle Theme"
            >
              {darkMode ? <Sun size={20} /> : <Moon size={20} />}
            </button>

            <SignedOut>
              <div className="bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 px-4 py-2 rounded-xl font-medium text-sm hover:opacity-90 transition-all cursor-pointer shadow-sm">
                <SignInButton mode="modal" />
              </div>
            </SignedOut>
            <SignedIn>
              <UserButton 
                appearance={{
                  elements: {
                    avatarBox: "w-9 h-9 border border-slate-200 dark:border-slate-700"
                  }
                }} 
              />
            </SignedIn>
          </div>
        </div>
      </nav>

      {/* Hero & Workspace */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-6 py-12 flex flex-col items-center">
        
        {/* Title Group */}
        <div className="text-center max-w-2xl mb-12">
          <h2 className="text-4xl sm:text-5xl font-extrabold tracking-tight mb-4 text-slate-900 dark:text-white leading-tight">
            Multi-Agent Technical <br />
            <span className="bg-gradient-to-r from-blue-600 to-indigo-500 bg-clip-text text-transparent">Blog Generation</span>
          </h2>
          <p className="text-base sm:text-lg text-slate-500 dark:text-slate-400">
            Provide a topic. Our autonomous research, planning, and writing agents will construct comprehensive, markdown-formatted guides instantly.
          </p>
        </div>

        {/* Authentication Wall Guard */}
        <SignedOut>
          <div className="w-full max-w-md bg-white dark:bg-slate-900 p-8 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl shadow-slate-200/50 dark:shadow-none text-center">
            <div className="w-12 h-12 rounded-full bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto mb-4">
              <Sparkles size={24} />
            </div>
            <h3 className="text-xl font-bold mb-2 text-slate-900 dark:text-white">Unlock Agent Orchestration</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
              Sign in securely via Clerk to get access to custom workflows, local LLM control, and publication exports.
            </p>
            <div className="w-full bg-blue-600 text-white py-2.5 rounded-xl font-medium hover:bg-blue-700 transition-colors cursor-pointer shadow-md shadow-blue-500/10">
              <SignInButton mode="modal" />
            </div>
          </div>
        </SignedOut>

        <SignedIn>
          {/* Generation Form Control */}
          <div className="w-full bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-3 mb-10 transition-colors">
            <form onSubmit={handleGenerate} className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g., Deep dive into LangGraph state management patterns"
                className="flex-1 bg-transparent px-4 py-3 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none text-base border border-transparent focus:border-transparent focus:ring-0"
                disabled={isLoading}
              />
              <button
                type="submit"
                disabled={isLoading || !topic.trim()}
                className="bg-blue-600 text-white px-6 py-3 rounded-xl font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-md shadow-blue-500/10 whitespace-nowrap"
              >
                {isLoading ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Running Agents...
                  </>
                ) : (
                  <>
                    <Sparkles size={18} />
                    Generate Guide
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Loading Placeholder Component */}
          {isLoading && (
            <div className="w-full bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-8 text-center animate-pulse">
              <Terminal className="w-8 h-8 mx-auto text-blue-500 mb-3 animate-bounce" />
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Executing LangGraph Architecture...</p>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Routing model inputs, fetching queries, and synthesizing markdown sections.</p>
            </div>
          )}

          {/* Error Notice */}
          {error && (
            <div className="w-full bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 p-4 rounded-xl mb-8 border border-red-100 dark:border-red-900/30 text-sm">
              <span className="font-semibold">Execution Error:</span> {error}
            </div>
          )}

          {/* Render Output Content */}
          {blogResult && (
            <div className="w-full bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 sm:p-10 transition-colors animate-in fade-in slide-in-from-bottom-3 duration-300">
              
              {/* Context Metadata bar */}
              <div className="flex flex-wrap items-center justify-between gap-4 mb-6 pb-6 border-b border-slate-100 dark:border-slate-800 text-xs font-mono text-slate-400 dark:text-slate-500">
                <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 px-2 py-1 rounded-md">
                  <CheckCircle size={14} />
                  <span>Agent Cycle Complete</span>
                </div>
                <div>Specs: {blogResult.image_specs?.length || 0} Images Rendered</div>
              </div>

              {/* Title Header */}
              <h3 className="text-2xl sm:text-3xl font-bold mb-6 text-slate-900 dark:text-white">
                {blogResult.title}
              </h3>

              {/* Parsed Markdown Section */}
              <div className="prose prose-slate dark:prose-invert max-w-none text-slate-700 dark:text-slate-300 space-y-4
                prose-headings:font-bold prose-headings:text-slate-900 dark:prose-headings:text-white
                prose-h1:text-2xl prose-h2:text-xl prose-h3:text-lg
                prose-code:bg-slate-100 dark:prose-code:bg-slate-800 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm prose-code:font-mono
                prose-pre:bg-slate-900 dark:prose-pre:bg-black prose-pre:p-4 prose-pre:rounded-xl prose-pre:overflow-x-auto
                prose-a:text-blue-600 dark:prose-a:text-blue-400 prose-a:underline
                prose-ul:list-disc prose-ul:pl-6 prose-ol:list-decimal prose-ol:pl-6">
                <ReactMarkdown>
                  {blogResult.markdown}
                </ReactMarkdown>
              </div>
            </div>
          )}
        </SignedIn>
      </main>
    </div>
  );
}