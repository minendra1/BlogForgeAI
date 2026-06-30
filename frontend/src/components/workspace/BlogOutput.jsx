import { CheckCircle } from "lucide-react";
import ReactMarkdown from 'react-markdown';

export default function BlogOutput({ result }) {
  if (!result) return null;

  return (
    <div className="w-full bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/60 dark:border-slate-800/60 shadow-xl shadow-slate-200/30 dark:shadow-none p-6 sm:p-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8 pb-6 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2 text-xs font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 px-3 py-1.5 rounded-full border border-emerald-100 dark:border-emerald-900/50">
          <CheckCircle size={14} />
          Execution Complete
        </div>
        {result.image_specs?.length > 0 && (
          <span className="text-xs font-mono text-slate-500 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-full">
            {result.image_specs.length} Images Embedded
          </span>
        )}
      </div>

      <div className="prose prose-slate dark:prose-invert prose-blue max-w-none 
        prose-headings:font-bold prose-headings:tracking-tight
        prose-h1:text-3xl sm:prose-h1:text-4xl prose-h2:text-2xl
        prose-p:leading-relaxed prose-p:text-slate-600 dark:prose-p:text-slate-300
        prose-code:bg-slate-100 dark:prose-code:bg-slate-800 prose-code:text-blue-600 dark:prose-code:text-blue-400 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded-md prose-code:before:content-none prose-code:after:content-none
        prose-pre:bg-slate-950 prose-pre:border prose-pre:border-slate-800 prose-pre:shadow-xl
        prose-img:rounded-2xl prose-img:shadow-lg prose-img:border prose-img:border-slate-200 dark:prose-img:border-slate-800">
        <ReactMarkdown>{result.markdown}</ReactMarkdown>
      </div>
    </div>
  );
}