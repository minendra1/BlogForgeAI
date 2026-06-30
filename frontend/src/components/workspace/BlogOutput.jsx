import { Download, Printer } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import vscDarkPlus from 'react-syntax-highlighter/dist/cjs/styles/prism/vsc-dark-plus';

export default function BlogOutput({ result }) {
    if (!result) return null;

    // 1. Markdown Download Handler
    const handleDownloadMarkdown = () => {
        const blob = new Blob([result.markdown], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const fileName = result.topic 
            ? result.topic.replace(/[^a-z0-9]/gi, '-').toLowerCase() 
            : 'blog-generation';
        a.download = `${fileName}.md`;
        
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    // 2. PDF Download Handler
    const handlePrint = () => {
        window.print();
    };

    return (
        <div className="w-full bg-white dark:bg-slate-900/40 rounded-2xl border border-slate-200 dark:border-slate-800/50 p-6 sm:p-10 shadow-sm relative overflow-hidden print:shadow-none print:border-none print:p-0 print:bg-transparent">
            
            <div className="flex flex-wrap items-center justify-between gap-4 mb-8 print:hidden">
                <div className="flex flex-wrap items-center gap-3">
                    <span className="px-3 py-1 bg-emerald-100/80 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded-full text-xs font-semibold border border-emerald-200 dark:border-emerald-800/50 flex items-center gap-1.5">
                       <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Execution Complete
                    </span>
                    <span className="px-3 py-1 bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 rounded-full text-xs font-medium border border-slate-200 dark:border-slate-700/50">
                       {result.image_specs?.length || 0} Images Embedded
                    </span>
                </div>

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
            
            {/* 2. Wrap the text in <ReactMarkdown> with a custom code renderer for syntax highlighting */}
            <div className="prose dark:prose-invert prose-slate max-w-none text-slate-700 dark:text-slate-300">
                <ReactMarkdown
                    components={{
                        code({ node, inline, className, children, ...props }) {
                            const match = /language-(\w+)/.exec(className || '');
                            return !inline && match ? (
                                <div className="rounded-xl overflow-hidden my-4 border border-slate-700/50 shadow-xl">
                                    <div className="bg-[#1e1e1e] text-slate-400 text-xs px-4 py-1.5 font-mono border-b border-slate-700/50 flex items-center justify-between">
                                        <span>{match[1]}</span>
                                    </div>
                                    <SyntaxHighlighter
                                        {...props}
                                        style={vscDarkPlus}
                                        language={match[1]}
                                        PreTag="div"
                                        customStyle={{ margin: 0, padding: '1.25rem', background: '#1e1e1e', fontSize: '0.9rem' }}
                                    >
                                        {String(children).replace(/\n$/, '')}
                                    </SyntaxHighlighter>
                                </div>
                            ) : (
                                <code {...props} className={`${className || ''} bg-slate-100 dark:bg-slate-800 text-pink-600 dark:text-pink-400 px-1.5 py-0.5 rounded-md text-sm font-mono`}>
                                    {children}
                                </code>
                            );
                        }
                    }}
                >
                    {result.markdown}
                </ReactMarkdown>
            </div>
        </div>
    )
}