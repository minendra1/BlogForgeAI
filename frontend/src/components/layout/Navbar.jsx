import { SignedIn, SignedOut, SignInButton, UserButton } from "@clerk/clerk-react";
import { Sun, Moon, Menu, Sparkles } from "lucide-react";

export default function Navbar({ darkMode, setDarkMode, sidebarOpen, setSidebarOpen, hasResult }) {
  return (
    <nav className="h-16 shrink-0 border-b border-slate-200/50 dark:border-slate-800/50 bg-white/50 dark:bg-slate-950/50 backdrop-blur-md flex items-center justify-between px-4 sm:px-6 z-10 sticky top-0">
      
      <div className="flex items-center gap-3">
        
        {/* Only show Navbar hamburger when Sidebar is CLOSED */}
        {!sidebarOpen && (
          <button 
            className="p-2 -ml-2 rounded-xl text-slate-600 hover:bg-slate-200/50 dark:text-slate-300 dark:hover:bg-slate-800/50 transition-colors"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu size={20} />
          </button>
        )}
        
        {/* Only show Navbar Logo when Sidebar is CLOSED */}
        {!sidebarOpen && (
          <div className="hidden md:flex items-center gap-2 mr-2 animate-in fade-in slide-in-from-left-4 duration-300">
            <div className="bg-gradient-to-tr from-blue-600 to-indigo-600 p-1 rounded-md text-white shadow-sm shadow-blue-500/20">
              <Sparkles size={14} />
            </div>
            <span className="font-bold tracking-tight text-slate-900 dark:text-white">
              BlogForgeAI
            </span>
            <div className="w-px h-4 bg-slate-300 dark:bg-slate-700 ml-2"></div>
          </div>
        )}

        <span className="font-medium text-slate-700 dark:text-slate-200 hidden sm:block">
          {hasResult ? "Viewing Document" : "Agent Workspace"}
        </span>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={() => setDarkMode(!darkMode)}
          className="p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-200/50 dark:hover:bg-slate-800/50 transition-colors border border-transparent hover:border-slate-300 dark:hover:border-slate-700"
        >
          {darkMode ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        <SignedOut>
          <div className="bg-blue-600 text-white px-4 py-1.5 rounded-lg font-medium text-sm hover:bg-blue-700 transition-colors cursor-pointer shadow-sm">
            <SignInButton mode="modal" />
          </div>
        </SignedOut>
        
        <SignedIn>
          <UserButton appearance={{ elements: { avatarBox: "w-8 h-8 rounded-lg border border-slate-200 dark:border-slate-700" } }} />
        </SignedIn>
      </div>
    </nav>
  );
}