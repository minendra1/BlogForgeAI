import { BookOpen, Clock, Plus, ChevronRight, X } from "lucide-react";

export default function Sidebar({ isOpen, setIsOpen, history, onLoadItem, onNew }) {
  return (
    <>
      <aside className={`
        fixed inset-y-0 left-0 z-40 w-72 bg-white/60 dark:bg-slate-950/50 backdrop-blur-xl border-r border-slate-200 dark:border-slate-800/60 transform transition-transform duration-300 ease-in-out flex flex-col
        ${isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"} md:relative md:flex
      `}>
        <div className="p-4 border-b border-slate-200 dark:border-slate-800/60 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-gradient-to-tr from-blue-600 to-indigo-600 p-1.5 rounded-lg text-white shadow-md shadow-blue-500/20">
              <BookOpen size={18} />
            </div>
            <span className="text-lg font-bold tracking-tight bg-gradient-to-r from-slate-900 to-slate-700 dark:from-white dark:to-slate-300 bg-clip-text text-transparent">
              BlogForge
            </span>
          </div>
          <button className="md:hidden p-1 rounded-md hover:bg-slate-200 dark:hover:bg-slate-800" onClick={() => setIsOpen(false)}>
            <X size={20} />
          </button>
        </div>

        <div className="p-4">
          <button onClick={onNew} className="w-full flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-all shadow-md shadow-blue-500/10 active:scale-[0.98]">
            <Plus size={18} />
            <span>New Generation</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 pt-0 space-y-1">
          <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 px-2 flex items-center gap-2">
            <Clock size={12} /> Recent Generations
          </h4>
          
          {history.length === 0 ? (
            <p className="text-sm text-slate-400 dark:text-slate-500 px-2 italic">No history yet.</p>
          ) : (
            history.map((item) => (
              <button key={item.id} onClick={() => onLoadItem(item)} className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-white dark:hover:bg-slate-900/80 border border-transparent hover:border-slate-200 dark:hover:border-slate-800/60 transition-all group flex flex-col gap-1">
                <span className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate group-hover:text-blue-600 dark:group-hover:text-blue-400">{item.title}</span>
                <span className="text-xs text-slate-400 truncate flex items-center gap-1"><ChevronRight size={12} /> {item.topic}</span>
              </button>
            ))
          )}
        </div>
      </aside>

      {isOpen && <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-30 md:hidden" onClick={() => setIsOpen(false)} />}
    </>
  );
}