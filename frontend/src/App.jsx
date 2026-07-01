import { useState } from 'react';
import { SignedIn, SignedOut, SignInButton, useAuth } from "@clerk/clerk-react";
import { Sparkles, Loader2, Terminal, X, Globe, PenTool, Zap } from "lucide-react";

// Modular Hooks & Services
import { useTheme } from './hooks/useTheme';
import { useHistory } from './hooks/useHistory';
import { generateBlogStream, resumeBlogStream } from './services/api';

// Modular Components
import Sidebar from './components/layout/Sidebar';
import Navbar from './components/layout/Navbar';
import BlogOutput from './components/workspace/BlogOutput';
import PlanReviewer from './components/workspace/PlanReviewer';

export default function App() {
  const [darkMode, setDarkMode] = useTheme();
  
  // Grab BOTH getToken and userId from Clerk
  const { getToken, userId } = useAuth();
  
  // Pass the userId into your hook so history is private to the logged-in user
  const { history, addToHistory, clearHistory, getBlogData } = useHistory(userId);
  
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [topic, setTopic] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [blogResult, setBlogResult] = useState(null);
  const [error, setError] = useState(null);
  
  // HITL States
  const [draftPlan, setDraftPlan] = useState(null);
  const [threadId, setThreadId] = useState(null);
  
  // Dynamic Loading State (driven by real-time SSE events from the backend)
  const [loadingProgress, setLoadingProgress] = useState(null);

  const handleGenerate = async (e) => {
    e.preventDefault();
    if (!topic.trim()) return;

    const currentTopic = topic;
    setTopic(""); 
    
    setIsLoading(true);
    setError(null);
    setBlogResult(null);
    setDraftPlan(null);
    setThreadId(null);
    setLoadingProgress({ step: 0, total: 7, message: "Initializing agent workflow..." });

    try {
      const token = await getToken();
      if (!token) throw new Error("Authentication error. Please sign in again.");

      const result = await generateBlogStream(currentTopic, token, (progress) => {
        setLoadingProgress(progress);
      });
      
      if (result.type === "interrupt") {
        setThreadId(result.thread_id);
        setDraftPlan(result.plan);
        setIsLoading(false); // Pause loading screen to show PlanReviewer
      } else {
        setBlogResult(result.data);
        addToHistory(currentTopic, result.data);
        setIsLoading(false);
      }
    } catch (err) {
      setError(err.message);
      setTopic(currentTopic); 
      setIsLoading(false);
    } finally {
      setLoadingProgress(null);
    }
  };

  const handleResumeGeneration = async (approvedPlan) => {
    setIsLoading(true);
    setError(null);
    setDraftPlan(null); // Hide the reviewer
    setLoadingProgress({ step: 4, total: 7, message: "Resuming workflow..." });

    try {
      const token = await getToken();
      const result = await resumeBlogStream(threadId, approvedPlan, token, (progress) => {
        setLoadingProgress(progress);
      });
      
      if (result.type === "complete") {
        setBlogResult(result.data);
        addToHistory(result.data.title, result.data); // Title might have changed
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
      setLoadingProgress(null);
    }
  };

  const loadHistoryItem = async (item) => {
    if (isLoading || draftPlan) return;
    
    // If the data is missing (legacy behavior or just metadata), fetch from IndexedDB
    let fullData = item.data;
    if (!fullData) {
      fullData = await getBlogData(item.id);
    }
    
    if (fullData) {
      setBlogResult(fullData);
      setTopic(item.topic);
    } else {
      setError("Failed to load blog content from local storage.");
    }
    if (window.innerWidth < 768) setSidebarOpen(false);
  };

  const startNewGeneration = () => {
    if (isLoading || draftPlan) return;
    
    setBlogResult(null);
    setTopic("");
    if (window.innerWidth < 768) setSidebarOpen(false);
  };

  return (
    <>
      <style>{`
        .prose h1, .prose h2, .prose h3 { font-weight: 800; margin-top: 2.5em; margin-bottom: 1em; line-height: 1.3; letter-spacing: -0.02em; }
        .prose h1 { font-size: 2.25em; margin-top: 0; }
        .prose h2 { font-size: 1.85em; }
        .prose h3 { font-size: 1.45em; }
        .prose p { margin-bottom: 1.5em; line-height: 1.8; font-size: 1.05rem; }
        main img { width: 65%; max-width: 700px; height: auto; margin: 3.5rem auto 0.75rem auto; border-radius: 1rem; box-shadow: 0 10px 30px -5px rgb(0 0 0 / 0.15); display: block; }
        @media (max-width: 768px) { main img { width: 85%; border-radius: 0.5rem; } }
        main img + em, main img ~ em, .prose em { display: block; text-align: center; font-size: 0.85rem; opacity: 0.55; margin-top: 0.5rem; margin-bottom: 3.5rem; font-weight: 400; font-style: italic; }
      `}</style>

      {/* FULL SCREEN LANDING PAGE (Signed Out) */}
      <SignedOut>
        <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/50 dark:from-slate-950 dark:via-slate-900/80 dark:to-slate-950 text-center px-4 selection:bg-blue-500 selection:text-white transition-colors duration-300">
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-1000 max-w-4xl mx-auto flex flex-col items-center">
            <div className="w-20 h-20 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-3xl flex items-center justify-center mb-8 transform rotate-3 shadow-xl shadow-blue-500/20 border border-blue-200 dark:border-blue-800/50">
              <Sparkles size={40} />
            </div>
            <h2 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight mb-6 text-slate-900 dark:text-white max-w-3xl leading-tight">
              Turn Your Ideas into <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-500 dark:from-blue-400 dark:to-indigo-400">Exceptional Blogs</span>
            </h2>
            <p className="text-lg sm:text-xl text-slate-600 dark:text-slate-400 max-w-2xl mb-12 leading-relaxed">
              BlogForgeAI plans, researches, writes, and refines high-quality, citation-backed blogs using an intelligent multi-agent workflow.
            </p>
            <div className="w-fit mx-auto bg-blue-600 text-white px-8 py-4 rounded-2xl font-bold text-lg hover:bg-blue-700 hover:scale-105 transition-all cursor-pointer shadow-lg shadow-blue-500/30 flex items-center gap-3">
              <SignInButton mode="modal" fallbackRedirectUrl="/" signUpFallbackRedirectUrl="/">
                <button>Start Forging Now</button>
              </SignInButton>
            </div>
            <div className="mt-20 grid grid-cols-1 sm:grid-cols-3 gap-8 sm:gap-12 w-full max-w-3xl opacity-80 border-t border-slate-200 dark:border-slate-800/60 pt-12">
              <div className="flex flex-col items-center gap-3">
                <div className="p-3 bg-slate-100 dark:bg-slate-900 rounded-xl"><Globe className="w-6 h-6 text-slate-600 dark:text-slate-400" /></div>
                <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Live Web Research</span>
              </div>
              <div className="flex flex-col items-center gap-3">
                <div className="p-3 bg-slate-100 dark:bg-slate-900 rounded-xl"><PenTool className="w-6 h-6 text-slate-600 dark:text-slate-400" /></div>
                <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Multi-Agent Writing</span>
              </div>
              <div className="flex flex-col items-center gap-3">
                <div className="p-3 bg-slate-100 dark:bg-slate-900 rounded-xl"><Zap className="w-6 h-6 text-slate-600 dark:text-slate-400" /></div>
                <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Auto-Generated Visuals</span>
              </div>
            </div>
          </div>
        </div>
      </SignedOut>

      {/* DASHBOARD WORKSPACE (Signed In) */}
      <SignedIn>
        <div className="flex h-screen overflow-hidden bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/50 dark:from-slate-950 dark:via-slate-900/80 dark:to-slate-950 selection:bg-blue-500 selection:text-white transition-colors duration-300">
          
          <div className="print:hidden flex shrink-0">
            <Sidebar 
              isOpen={sidebarOpen} 
              setIsOpen={setSidebarOpen} 
              history={history} 
              onLoadItem={loadHistoryItem} 
              onNew={startNewGeneration} 
              onClearHistory={clearHistory}
              isGenerating={isLoading || !!draftPlan}
            />
          </div>

          <div className="flex-1 flex flex-col h-screen overflow-hidden relative">
            <div className="print:hidden">
              <Navbar 
                darkMode={darkMode} 
                setDarkMode={setDarkMode} 
                sidebarOpen={sidebarOpen}
                setSidebarOpen={setSidebarOpen} 
                hasResult={!!blogResult} 
              />
            </div>

            <main className="flex-1 overflow-y-auto px-4 pb-4 sm:px-8 sm:pb-8 pt-0 print:overflow-visible print:px-0">
              <div className="max-w-4xl mx-auto w-full pb-32 mt-4 sm:mt-8 relative print:pb-0 print:mt-0">
                
                {!blogResult && !isLoading && !draftPlan && (
                  <div className="text-center max-w-2xl mx-auto mb-10 mt-10 animate-in fade-in duration-700 print:hidden">
                    <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-2xl flex items-center justify-center mx-auto mb-6 transform rotate-3">
                      <Sparkles size={32} />
                    </div>
                    <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-6 text-slate-900 dark:text-white">
                      What are we writing today?
                    </h2>
                    
                    <div className="flex flex-wrap justify-center gap-2 max-w-xl mx-auto">
                      {[
                        "How Agentic AI differs from standard LLMs", 
                        "Beginner's guide to Vite vs Webpack", 
                        "The future of React Server Components",
                        "Building robust microservices in Python"
                      ].map((suggestion) => (
                        <button
                          key={suggestion}
                          onClick={() => setTopic(suggestion)}
                          className="text-xs sm:text-sm px-4 py-2 rounded-full border border-slate-200 dark:border-slate-700/60 bg-white/50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-300 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 dark:hover:bg-blue-900/30 dark:hover:text-blue-400 dark:hover:border-blue-800/50 transition-colors"
                        >
                          {suggestion}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* DYNAMIC LOADING SCREEN */}
                {isLoading && (
                  <div className="w-full bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm rounded-2xl border border-slate-200/50 dark:border-slate-800/50 p-12 flex flex-col items-center justify-center mt-8 print:hidden">
                    <div className="relative mb-6">
                      <div className="absolute inset-0 bg-blue-500 blur-xl opacity-20 rounded-full animate-pulse"></div>
                      <Terminal className="w-10 h-10 text-blue-500 relative z-10 animate-bounce" />
                    </div>
                    
                    <div className="h-8 overflow-hidden relative w-full max-w-sm flex justify-center">
                      <p 
                        key={loadingProgress?.step} 
                        className="text-base font-semibold text-slate-700 dark:text-slate-300 animate-in slide-in-from-bottom-4 fade-in duration-500"
                      >
                        {loadingProgress?.message || "Initializing agent workflow..."}
                      </p>
                    </div>
                    
                    {/* Animated progress dots — driven by real SSE events */}
                    <div className="flex gap-1.5 mt-4">
                      {Array.from({ length: loadingProgress?.total || 7 }, (_, idx) => (
                        <div 
                          key={idx} 
                          className={`h-1.5 rounded-full transition-all duration-500 ${
                            idx + 1 <= Math.floor(loadingProgress?.step || 0)
                              ? idx + 1 === Math.floor(loadingProgress?.step || 0)
                                ? "w-6 bg-blue-500"
                                : "w-1.5 bg-blue-500/40"
                              : "w-1.5 bg-slate-200 dark:bg-slate-700"
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                )}
                
                {/* HITL Plan Reviewer */}
                {draftPlan && !isLoading && (
                    <PlanReviewer 
                        plan={draftPlan}
                        onApprove={handleResumeGeneration}
                        onCancel={() => {
                            setDraftPlan(null);
                            setThreadId(null);
                            setLoadingProgress(null);
                        }}
                    />
                )}

                {error && (
                  <div className="w-full bg-red-50/80 dark:bg-red-950/30 backdrop-blur-md text-red-600 dark:text-red-400 p-4 rounded-xl border border-red-200 dark:border-red-900/50 text-sm flex items-start gap-3 mt-8 print:hidden">
                    <X size={18} className="mt-0.5 shrink-0" />
                    <div><span className="font-semibold block mb-1">Execution Error</span>{error}</div>
                  </div>
                )}

                <BlogOutput result={blogResult} />
              </div>
            </main>

            {/* Input Bar */}
            <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 w-[calc(100%-2rem)] max-w-3xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-2xl border border-slate-200/60 dark:border-slate-800/60 shadow-2xl p-2 z-50 print:hidden">
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

          </div>
        </div>
      </SignedIn>
    </>
  );
}