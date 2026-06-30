import { useState } from "react";
import { BookOpen, Clock, Plus, ChevronRight, Menu, Trash2, Search } from "lucide-react"; // Added Trash2, Search

export default function Sidebar({ isOpen, setIsOpen, history, onLoadItem, onNew, onClearHistory }) {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredHistory = history.filter(item => 
    item.title?.toLowerCase().includes(searchQuery.toLowerCase()) || 
    item.topic?.toLowerCase().includes(searchQuery.toLowerCase())
  );
  return (
    <>
      <aside className={`
        fixed md:relative inset-y-0 left-0 z-40 bg-white/60 dark:bg-slate-950/50 backdrop-blur-xl border-r border-slate-200 dark:border-slate-800/60 transition-[width,transform] duration-300 ease-in-out flex flex-col overflow-hidden shrink-0
        ${isOpen ? "translate-x-0 w-72" : "-translate-x-full w-72 md:translate-x-0 md:w-0 md:border-r-0"}
      `}>
        <div className="w-72 flex flex-col h-full shrink-0">
          <div className="h-16 shrink-0 p-4 border-b border-slate-200 dark:border-slate-800/60 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="bg-gradient-to-tr from-blue-600 to-indigo-600 p-1.5 rounded-lg text-white shadow-md shadow-blue-500/20">
                <BookOpen size={18} />
              </div>
              <span className="text-lg font-bold tracking-tight bg-gradient-to-r from-slate-900 to-slate-700 dark:from-white dark:to-slate-300 bg-clip-text text-transparent">
                BlogForgeAI
              </span>
            </div>
            
            {/* The Hamburger Menu now lives INSIDE the sidebar to close it! */}
            <button 
              className="p-1.5 -mr-1 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500 transition-colors" 
              onClick={() => setIsOpen(false)}
            >
              <Menu size={20} />
            </button>
          </div>

          <div className="p-4">
            <button onClick={onNew} className="w-full flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-all shadow-md shadow-blue-500/10 active:scale-[0.98]">
              <Plus size={18} />
              <span>New Generation</span>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 pt-0 space-y-1">
            <div className="flex items-center justify-between px-2 mb-3">
              <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                <Clock size={12} /> Recent Generations
              </h4>
              {history.length > 0 && (
                <button 
                  onClick={() => {
                    if (window.confirm("Are you sure you want to clear your history?")) {
                      onClearHistory();
                    }
                  }}
                  className="text-xs text-slate-400 hover:text-red-500 flex items-center gap-1 transition-colors"
                  title="Clear History"
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>
            
            <div className="px-2 mb-4">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input 
                  type="text" 
                  placeholder="Search history..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-sm text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                />
              </div>
            </div>
            
            {filteredHistory.length === 0 ? (
              <p className="text-sm text-slate-400 dark:text-slate-500 px-2 italic">
                {searchQuery ? "No matches found." : "No history yet."}
              </p>
            ) : (
              filteredHistory.map((item) => (
                <button key={item.id} onClick={() => onLoadItem(item)} className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-white dark:hover:bg-slate-900/80 border border-transparent hover:border-slate-200 dark:hover:border-slate-800/60 transition-all group flex flex-col gap-1">
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate group-hover:text-blue-600 dark:group-hover:text-blue-400">{item.title}</span>
                  <span className="text-xs text-slate-400 truncate flex items-center gap-1"><ChevronRight size={12} /> {item.topic}</span>
                </button>
              ))
            )}
          </div>
        </div>
      </aside>

      {isOpen && <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-30 md:hidden" onClick={() => setIsOpen(false)} />}
    </>
  );
}