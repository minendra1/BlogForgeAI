import { useState } from "react";
import { Check, Edit2, Plus, Trash2, ChevronRight, ChevronDown } from "lucide-react";

export default function PlanReviewer({ plan, onApprove, onCancel }) {
    // Clone the plan to local state for editing
    const [localPlan, setLocalPlan] = useState(plan);
    const [expandedTasks, setExpandedTasks] = useState(
        plan.tasks.reduce((acc, _, idx) => ({ ...acc, [idx]: true }), {})
    );

    const handleTitleChange = (e) => {
        setLocalPlan({ ...localPlan, blog_title: e.target.value });
    };

    const handleTaskChange = (index, field, value) => {
        const newTasks = [...localPlan.tasks];
        newTasks[index] = { ...newTasks[index], [field]: value };
        setLocalPlan({ ...localPlan, tasks: newTasks });
    };

    const handleBulletChange = (taskIndex, bulletIndex, value) => {
        const newTasks = [...localPlan.tasks];
        const newBullets = [...newTasks[taskIndex].bullets];
        newBullets[bulletIndex] = value;
        newTasks[taskIndex] = { ...newTasks[taskIndex], bullets: newBullets };
        setLocalPlan({ ...localPlan, tasks: newTasks });
    };

    const addBullet = (taskIndex) => {
        const newTasks = [...localPlan.tasks];
        newTasks[taskIndex].bullets.push("New point to cover...");
        setLocalPlan({ ...localPlan, tasks: newTasks });
    };

    const removeBullet = (taskIndex, bulletIndex) => {
        const newTasks = [...localPlan.tasks];
        newTasks[taskIndex].bullets.splice(bulletIndex, 1);
        setLocalPlan({ ...localPlan, tasks: newTasks });
    };

    const toggleTask = (index) => {
        setExpandedTasks(prev => ({ ...prev, [index]: !prev[index] }));
    };

    return (
        <div className="w-full max-w-4xl mx-auto bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm rounded-2xl border border-slate-200/50 dark:border-slate-800/50 p-6 sm:p-8 mt-8 shadow-xl animate-in slide-in-from-bottom-4 fade-in duration-500">
            <div className="mb-8 text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-xl mb-4">
                    <Edit2 size={24} />
                </div>
                <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white mb-2">
                    Review Blog Outline
                </h2>
                <p className="text-slate-500 dark:text-slate-400">
                    The AI has proposed the following structure. Make any edits before we start writing.
                </p>
            </div>

            <div className="space-y-6">
                {/* Blog Title */}
                <div>
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">
                        Blog Title
                    </label>
                    <input
                        type="text"
                        value={localPlan.blog_title}
                        onChange={handleTitleChange}
                        className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-blue-500 outline-none transition-shadow"
                    />
                </div>

                <div className="space-y-4">
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                        Sections ({localPlan.tasks.length})
                    </label>
                    
                    {localPlan.tasks.map((task, tIdx) => (
                        <div key={tIdx} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden transition-all shadow-sm">
                            <div 
                                className="flex items-center gap-3 p-4 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                                onClick={() => toggleTask(tIdx)}
                            >
                                <div className="text-slate-400">
                                    {expandedTasks[tIdx] ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                                </div>
                                <div className="flex-1 font-semibold text-slate-800 dark:text-slate-200 truncate">
                                    {task.title}
                                </div>
                                <div className="text-xs font-medium px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-full">
                                    ~{task.target_words} words
                                </div>
                            </div>

                            {expandedTasks[tIdx] && (
                                <div className="p-4 pt-0 border-t border-slate-100 dark:border-slate-800 space-y-4 mt-2">
                                    <div>
                                        <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Section Title</label>
                                        <input
                                            type="text"
                                            value={task.title}
                                            onChange={(e) => handleTaskChange(tIdx, 'title', e.target.value)}
                                            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:ring-1 focus:ring-blue-500 outline-none"
                                        />
                                    </div>
                                    
                                    <div>
                                        <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Primary Goal</label>
                                        <textarea
                                            value={task.goal}
                                            onChange={(e) => handleTaskChange(tIdx, 'goal', e.target.value)}
                                            rows={2}
                                            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:ring-1 focus:ring-blue-500 outline-none resize-none"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">Talking Points (Bullets)</label>
                                        <div className="space-y-2">
                                            {task.bullets.map((bullet, bIdx) => (
                                                <div key={bIdx} className="flex gap-2">
                                                    <div className="mt-2 w-1.5 h-1.5 rounded-full bg-slate-400 shrink-0" />
                                                    <input
                                                        type="text"
                                                        value={bullet}
                                                        onChange={(e) => handleBulletChange(tIdx, bIdx, e.target.value)}
                                                        className="flex-1 bg-transparent border-b border-transparent hover:border-slate-200 dark:hover:border-slate-700 focus:border-blue-500 text-sm text-slate-700 dark:text-slate-300 py-1 outline-none transition-colors"
                                                    />
                                                    <button
                                                        onClick={() => removeBullet(tIdx, bIdx)}
                                                        className="text-slate-400 hover:text-red-500 p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                                        style={{ opacity: task.bullets.length > 1 ? undefined : 0 }}
                                                        disabled={task.bullets.length <= 1}
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                            ))}
                                            <button 
                                                onClick={() => addBullet(tIdx)}
                                                className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 mt-2 font-medium"
                                            >
                                                <Plus size={12} /> Add Point
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            <div className="mt-10 flex flex-col sm:flex-row gap-3 justify-end pt-6 border-t border-slate-200 dark:border-slate-800/60">
                <button 
                    onClick={onCancel}
                    className="px-6 py-2.5 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl font-medium transition-colors"
                >
                    Cancel Generation
                </button>
                <button 
                    onClick={() => onApprove(localPlan)}
                    className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-colors flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20"
                >
                    <Check size={18} />
                    <span>Approve & Write Blog</span>
                </button>
            </div>
        </div>
    );
}
