import { Plus, ChevronRight, X, Sparkles, History } from "lucide-react";

export default function Sidebar({ isOpen, setIsOpen, history, onLoadItem, onNew }) {
  return (
    <>
      <aside className={`
        fixed md:relative inset-y-0 left-0 z-40 bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 transition-all duration-300 ease-in-out overflow-hidden
        ${isOpen ? "translate-x-0 w-64 border-r" : "-translate-x-full w-64 md:translate-x-0 md:w-0 border-r-0 md:border-r-0"}
      `}>
        {/* We wrap the content in a fixed w-64 div so the text doesn't squish while the parent div is shrinking */}
        <div className="w-64 flex flex-col h-full">
            <div className="h-16 shrink-0 p-4 border-b border-slate-200 dark:border-slate-800/50 flex items-center justify-between">
                <span className="font-bold text-xl flex items-center gap-2 text-slate-900 dark:text-white">
                  <div className="bg-blue-600 p-1.5 rounded-lg"><Sparkles size={18} className="text-white" /></div>
                  BlogForgeAI
                </span>
                <button className="md:hidden text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-800 p-1 rounded-md" onClick={() => setIsOpen(false)}>
                  <X size={20} />
                </button>
            </div>

            <div className="p-4">
                <button onClick={onNew} className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-xl py-2.5 flex items-center justify-center gap-2 font-medium transition-colors shadow-md shadow-blue-500/20 active:scale-[0.98]">
                  <Plus size={18} /> New Generation
                </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-1">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <History size={14} /> Recent Generations
                </h3>
                {history.length === 0 ? (
                  <p className="text-sm text-slate-400 dark:text-slate-500 px-2 italic">No history yet.</p>
                ) : (
                  history.map(item => (
                      <div key={item.id} onClick={() => onLoadItem(item)} className="p-3 bg-slate-100 dark:bg-slate-900/50 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl cursor-pointer transition-colors border border-transparent hover:border-slate-300 dark:hover:border-slate-700">
                          <p className="text-sm font-medium truncate text-slate-700 dark:text-slate-300">{item.topic}</p>
                      </div>
                  ))
                )}
            </div>
        </div>
      </aside>

      {/* Mobile background overlay blur */}
      {isOpen && <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-30 md:hidden" onClick={() => setIsOpen(false)} />}
    </>
  );
}