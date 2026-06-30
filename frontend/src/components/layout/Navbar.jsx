import { SignedIn, SignedOut, SignInButton, UserButton } from "@clerk/clerk-react";
import { Sun, Moon, Menu } from "lucide-react";

export default function Navbar({ darkMode, setDarkMode, setSidebarOpen, hasResult }) {
  return (
    <nav className="h-16 border-b border-slate-200/50 dark:border-slate-800/50 backdrop-blur-md flex items-center justify-between px-4 sm:px-6 shrink-0 z-10 sticky top-0">
      <div className="flex items-center gap-3">
        <button 
          className="md:hidden p-2 -ml-2 rounded-xl text-slate-600 hover:bg-slate-200/50 dark:text-slate-300 dark:hover:bg-slate-800/50"
          onClick={() => setSidebarOpen(true)}
        >
          <Menu size={20} />
        </button>
        <span className="font-medium text-slate-700 dark:text-slate-200 hidden sm:block">
          {hasResult ? "Viewing Document" : "Agent Workspace"}
        </span>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={() => setDarkMode(!darkMode)}
          className="p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:bg-white/50 dark:hover:bg-slate-800/50 transition-colors border border-transparent hover:border-slate-200 dark:hover:border-slate-700"
        >
          {darkMode ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        <SignedOut>
          <div className="bg-slate-900 text-white dark:bg-white dark:text-slate-900 px-4 py-1.5 rounded-lg font-medium text-sm hover:opacity-90 transition-opacity cursor-pointer">
            <SignInButton mode="modal" />
          </div>
        </SignedOut>
        <SignedIn>
          <UserButton appearance={{ elements: { avatarBox: "w-8 h-8 rounded-lg" } }} />
        </SignedIn>
      </div>
    </nav>
  );
}