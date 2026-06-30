import { Download, Printer } from "lucide-react";

export default function BlogOutput({ result }) {
    if (!result) return null;

    // 1. Markdown Download Handler
    const handleDownloadMarkdown = () => {
        // Create a raw text file in the browser memory
        const blob = new Blob([result.markdown], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        
        // Create a hidden link, click it, and destroy it
        const a = document.createElement('a');
        a.href = url;
        // Generate a clean filename based on the topic (or default to 'blog-generation')
        const fileName = result.topic 
            ? result.topic.replace(/[^a-z0-9]/gi, '-').toLowerCase() 
            : 'blog-generation';
        a.download = `${fileName}.md`;
        
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    // 2. PDF Download Handler (Using native print-to-pdf)
    const handlePrint = () => {
        window.print();
    };

    return (
        // Added 'print:shadow-none print:border-none print:p-0' so it looks clean on the PDF page
        <div className="w-full bg-white dark:bg-slate-900/40 rounded-2xl border border-slate-200 dark:border-slate-800/50 p-6 sm:p-10 shadow-sm relative overflow-hidden print:shadow-none print:border-none print:p-0 print:bg-transparent">
            
            {/* Header section containing badges and our new export buttons */}
            <div className="flex flex-wrap items-center justify-between gap-4 mb-8 print:hidden">
                
                {/* Status Badges */}
                <div className="flex flex-wrap items-center gap-3">
                    <span className="px-3 py-1 bg-emerald-100/80 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded-full text-xs font-semibold border border-emerald-200 dark:border-emerald-800/50 flex items-center gap-1.5">
                       <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Execution Complete
                    </span>
                    <span className="px-3 py-1 bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 rounded-full text-xs font-medium border border-slate-200 dark:border-slate-700/50">
                       {result.image_specs?.length || 0} Images Embedded
                    </span>
                </div>

                {/* Export Buttons */}
                <div className="flex items-center gap-2">
                    <button
                        onClick={handlePrint}
                        className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800 rounded-lg transition-colors flex items-center gap-2 text-sm font-medium border border-slate-200 dark:border-slate-700"
                        title="Save as PDF"
                    >
                        <Printer size={16} />
                        <span className="hidden sm:inline">Save PDF</span>
                    </button>
                    
                    <button
                        onClick={handleDownloadMarkdown}
                        className="p-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:text-blue-400 dark:hover:text-blue-300 dark:hover:bg-blue-900/30 rounded-lg transition-colors flex items-center gap-2 text-sm font-medium border border-blue-200 dark:border-blue-900/50"
                        title="Download Markdown file"
                    >
                        <Download size={16} />
                        <span className="hidden sm:inline">Download .md</span>
                    </button>
                </div>
            </div>
            
            {/* The actual blog content */}
            <div className="prose dark:prose-invert prose-slate max-w-none whitespace-pre-wrap text-slate-700 dark:text-slate-300">
                {result.markdown}
            </div>
        </div>
    )
}