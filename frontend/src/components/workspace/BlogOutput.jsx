import { useState, useRef, useEffect } from "react";
import { Download, Printer, Copy, Check, Eye, Pencil, RotateCcw } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import vscDarkPlus from 'react-syntax-highlighter/dist/cjs/styles/prism/vsc-dark-plus';

export default function BlogOutput({ result, onUpdateMarkdown }) {
    const [copied, setCopied] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editedMarkdown, setEditedMarkdown] = useState("");
    const [hasEdits, setHasEdits] = useState(false);
    const textareaRef = useRef(null);

    // Sync editedMarkdown when result changes (new blog loaded)
    useEffect(() => {
        if (result?.markdown) {
            setEditedMarkdown(result.markdown);
            setHasEdits(false);
            setIsEditing(false);
        }
    }, [result?.markdown]);

    if (!result) return null;

    // The "live" markdown — either edited or original
    const liveMarkdown = hasEdits ? editedMarkdown : result.markdown;

    // --- Handlers ---
    const handleDownloadMarkdown = () => {
        const blob = new Blob([liveMarkdown], { type: 'text/markdown' });
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

    const handlePrint = () => {
        window.print();
    };

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(liveMarkdown);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error("Failed to copy text: ", err);
        }
    };

    const handleToggleEdit = () => {
        if (!isEditing) {
            // Entering edit mode
            setEditedMarkdown(liveMarkdown);
            setIsEditing(true);
            // Focus textarea after render
            setTimeout(() => textareaRef.current?.focus(), 50);
        } else {
            // Leaving edit mode — save changes
            if (editedMarkdown !== result.markdown) {
                setHasEdits(true);
                // Notify parent so it can persist
                if (onUpdateMarkdown) {
                    onUpdateMarkdown(editedMarkdown);
                }
            }
            setIsEditing(false);
        }
    };

    const handleResetEdits = () => {
        setEditedMarkdown(result.markdown);
        setHasEdits(false);
        setIsEditing(false);
    };

    const handleEditorChange = (e) => {
        setEditedMarkdown(e.target.value);
    };

    // Word count
    const wordCount = liveMarkdown.split(/\s+/).filter(Boolean).length;

    return (
        <div className="w-full bg-white dark:bg-slate-900/40 rounded-2xl border border-slate-200 dark:border-slate-800/50 p-6 sm:p-10 shadow-sm relative overflow-hidden print:shadow-none print:border-none print:p-0 print:bg-transparent">
            
            {/* Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-4 mb-6 print:hidden">
                <div className="flex flex-wrap items-center gap-3">
                    <span className="px-3 py-1 bg-emerald-100/80 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded-full text-xs font-semibold border border-emerald-200 dark:border-emerald-800/50 flex items-center gap-1.5">
                       <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Execution Complete
                    </span>
                    <span className="px-3 py-1 bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 rounded-full text-xs font-medium border border-slate-200 dark:border-slate-700/50">
                       {result.image_specs?.length || 0} Images Embedded
                    </span>
                    <span className="px-3 py-1 bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 rounded-full text-xs font-medium border border-slate-200 dark:border-slate-700/50">
                       ~{wordCount} words · {Math.max(1, Math.round(wordCount / 200))} min read
                    </span>
                    {hasEdits && (
                        <span className="px-3 py-1 bg-amber-100/80 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded-full text-xs font-semibold border border-amber-200 dark:border-amber-800/50 flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span> Edited
                        </span>
                    )}
                </div>

                <div className="flex items-center gap-2">
                    {/* Edit / Preview Toggle */}
                    <button
                        onClick={handleToggleEdit}
                        className={`p-2 rounded-lg transition-colors flex items-center gap-2 text-sm font-medium border ${
                            isEditing
                                ? "text-emerald-600 hover:text-emerald-700 bg-emerald-50 hover:bg-emerald-100 dark:text-emerald-400 dark:hover:text-emerald-300 dark:bg-emerald-900/30 dark:hover:bg-emerald-900/50 border-emerald-200 dark:border-emerald-800/50"
                                : "text-violet-600 hover:text-violet-700 bg-violet-50 hover:bg-violet-100 dark:text-violet-400 dark:hover:text-violet-300 dark:bg-violet-900/30 dark:hover:bg-violet-900/50 border-violet-200 dark:border-violet-800/50"
                        }`}
                        title={isEditing ? "Save & Preview" : "Edit Markdown"}
                    >
                        {isEditing ? <Eye size={16} /> : <Pencil size={16} />}
                        <span className="hidden sm:inline">{isEditing ? "Preview" : "Edit"}</span>
                    </button>

                    {/* Reset button (only visible when edits exist) */}
                    {hasEdits && (
                        <button
                            onClick={handleResetEdits}
                            className="p-2 text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:text-amber-400 dark:hover:text-amber-300 dark:hover:bg-amber-900/30 rounded-lg transition-colors flex items-center gap-2 text-sm font-medium border border-amber-200 dark:border-amber-800/50"
                            title="Reset to original"
                        >
                            <RotateCcw size={16} />
                            <span className="hidden sm:inline">Reset</span>
                        </button>
                    )}

                    {/* Copy */}
                    <button
                        onClick={handleCopy}
                        className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800 rounded-lg transition-colors flex items-center gap-2 text-sm font-medium border border-slate-200 dark:border-slate-700"
                        title="Copy Markdown"
                    >
                        {copied ? <Check size={16} className="text-emerald-500" /> : <Copy size={16} />}
                        <span className="hidden sm:inline">{copied ? "Copied!" : "Copy"}</span>
                    </button>

                    {/* Print */}
                    <button
                        onClick={handlePrint}
                        className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800 rounded-lg transition-colors flex items-center gap-2 text-sm font-medium border border-slate-200 dark:border-slate-700"
                        title="Save as PDF"
                    >
                        <Printer size={16} />
                        <span className="hidden sm:inline">Save PDF</span>
                    </button>
                    
                    {/* Download */}
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
            
            {/* Editor / Preview Area */}
            {isEditing ? (
                <div className="relative print:hidden">
                    {/* Editor Header */}
                    <div className="flex items-center justify-between px-4 py-2 bg-slate-100 dark:bg-slate-800/80 rounded-t-xl border border-b-0 border-slate-200 dark:border-slate-700/60">
                        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 font-mono">
                            <Pencil size={12} />
                            <span>Markdown Editor</span>
                        </div>
                        <span className="text-xs text-slate-400 dark:text-slate-500">
                            {editedMarkdown.split(/\s+/).filter(Boolean).length} words
                        </span>
                    </div>
                    {/* Textarea */}
                    <textarea
                        ref={textareaRef}
                        value={editedMarkdown}
                        onChange={handleEditorChange}
                        className="w-full min-h-[500px] max-h-[80vh] p-6 font-mono text-sm leading-relaxed bg-white dark:bg-slate-950/60 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700/60 rounded-b-xl focus:outline-none focus:ring-2 focus:ring-violet-500/40 focus:border-violet-400 dark:focus:border-violet-500 resize-y transition-colors"
                        spellCheck={false}
                    />
                </div>
            ) : (
                /* Rendered Markdown Preview */
                <div className="prose dark:prose-invert prose-slate max-w-none text-slate-700 dark:text-slate-300">
                    <ReactMarkdown
                        components={{
                            a({ href, children, ...props }) {
                                return (
                                    <a 
                                        href={href} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="text-blue-600 dark:text-blue-400 underline decoration-blue-400/50 dark:decoration-blue-500/50 underline-offset-2 hover:text-blue-700 dark:hover:text-blue-300 hover:decoration-blue-500 transition-colors font-medium"
                                        {...props}
                                    >
                                        {children} ↗
                                    </a>
                                );
                            },
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
                        {liveMarkdown}
                    </ReactMarkdown>
                </div>
            )}
        </div>
    )
}