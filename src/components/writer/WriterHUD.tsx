import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  Sparkles, ChevronDown, ChevronUp, MessageSquare, Wrench, Send, X,
  CornerDownRight, Maximize2, Minimize2, Sliders, Loader2, Trash2,
  FastForward, GripHorizontal, Search, Lightbulb, BookOpen, Feather,
  StickyNote, Pin,
} from "lucide-react";

export interface Tool {
  label: string;
  icon: React.ReactNode;
  color: string;
  promptPrefix: string;
}

export interface ThreadMessage {
  role: "user" | "ai";
  text: string;
}

export interface CarouselThread {
  id: number;
  type: string;
  color: string;
  icon: React.ReactNode;
  messages: ThreadMessage[];
}

const TOOLS_MENU: Tool[] = [
  { label: "Critique", icon: <Search size={14} />, color: "text-rose-600", promptPrefix: "Critique this: " },
  { label: "Idea Gen", icon: <Lightbulb size={14} />, color: "text-amber-600", promptPrefix: "Ideas for: " },
  { label: "Explain", icon: <BookOpen size={14} />, color: "text-emerald-600", promptPrefix: "Explain: " },
  { label: "Write Like", icon: <Feather size={14} />, color: "text-purple-600", promptPrefix: "Style: " },
  { label: "Write Note", icon: <StickyNote size={14} />, color: "text-stone-600", promptPrefix: "Note: " },
];

interface WriterHUDProps {
  threads: CarouselThread[];
  isEditorFocused: boolean;
  isGenerating: boolean;
  isChatLoading: boolean;
  generateLength: number;
  customInstructions: string;
  onSetThreads: (fn: (prev: CarouselThread[]) => CarouselThread[]) => void;
  onGenerate: () => void;
  onChatSubmit: (message: string, tool: Tool | null) => void;
  onThreadReply: (threadId: number, text: string) => void;
  onSetGenerateLength: (v: number) => void;
  onSetCustomInstructions: (v: string) => void;
}

export const WriterHUD: React.FC<WriterHUDProps> = ({
  threads, isEditorFocused, isGenerating, isChatLoading,
  generateLength, customInstructions,
  onSetThreads, onGenerate, onChatSubmit, onThreadReply,
  onSetGenerateLength, onSetCustomInstructions,
}) => {
  const [isCarouselOpen, setIsCarouselOpen] = useState(true);
  const [inputValue, setInputValue] = useState("");
  const [activeCardIndex, setActiveCardIndex] = useState(0);
  const [isToolsMenuOpen, setIsToolsMenuOpen] = useState(false);
  const [isGenerateMenuOpen, setIsGenerateMenuOpen] = useState(false);
  const [expandedCardId, setExpandedCardId] = useState<number | null>(null);
  const [activeTool, setActiveTool] = useState<Tool | null>(null);
  const carouselRef = useRef<HTMLDivElement>(null);
  const chatInputRef = useRef<HTMLInputElement>(null);

  // Drag refs
  const dragItem = useRef<number | null>(null);
  const dragOverItem = useRef<number | null>(null);

  useEffect(() => {
    if (carouselRef.current && isCarouselOpen) {
      carouselRef.current.scrollTo({ left: carouselRef.current.scrollWidth, behavior: "smooth" });
      setActiveCardIndex(Math.max(0, threads.length - 1));
    }
  }, [threads, isCarouselOpen]);

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, index: number) => {
    dragItem.current = index;
    e.dataTransfer.effectAllowed = "move";
  };
  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>, index: number) => {
    dragOverItem.current = index;
  };
  const handleDragEnd = () => {
    if (dragItem.current !== null && dragOverItem.current !== null) {
      const items = [...threads];
      const dragged = items.splice(dragItem.current, 1)[0];
      items.splice(dragOverItem.current, 0, dragged);
      onSetThreads(() => items);
    }
    dragItem.current = null;
    dragOverItem.current = null;
  };

  const handleSubmit = () => {
    if (!inputValue.trim()) return;
    onChatSubmit(inputValue, activeTool);
    setInputValue("");
    setActiveTool(null);
    if (!isCarouselOpen) setIsCarouselOpen(true);
  };

  const handleDeleteThread = (threadId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    onSetThreads((prev) => prev.filter((t) => t.id !== threadId));
    if (expandedCardId === threadId) setExpandedCardId(null);
  };

  const handleNoteEdit = (threadId: number, newText: string) => {
    onSetThreads((prev) =>
      prev.map((t) => (t.id === threadId ? { ...t, messages: [{ role: "user" as const, text: newText }] } : t))
    );
  };

  const getCardClasses = (threadId: number, index: number) => {
    const base = `bg-white backdrop-blur-xl border border-white/40 shadow-xl rounded-2xl flex flex-col transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] ${
      isEditorFocused ? "opacity-40 hover:opacity-100 bg-white/60" : "opacity-100"
    }`;
    if (expandedCardId !== null) {
      if (expandedCardId === threadId)
        return `${base} fixed bottom-32 left-1/2 -translate-x-1/2 w-[90vw] max-w-2xl h-[60vh] z-[100] shadow-[0_30px_80px_-20px_rgba(0,0,0,0.4)] scale-100 opacity-100 !bg-white`;
      return `${base} hidden opacity-0 pointer-events-none`;
    }
    return `${base} snap-center shrink-0 w-[85%] sm:w-[320px] relative ${
      activeCardIndex === index ? "ring-2 ring-blue-500/20 scale-[1.02]" : "scale-95"
    }`;
  };

  const getPlaceholder = () => {
    if (isChatLoading) return "AI is thinking...";
    if (activeTool) return `${activeTool.promptPrefix}...`;
    return "Chat with AI about your writing...";
  };

  return (
    <div className="w-full flex flex-col items-center">
      {/* Pagination dots */}
      {isCarouselOpen && expandedCardId === null && threads.length > 0 && (
        <div className="pointer-events-auto flex justify-center gap-1.5 mb-2">
          {threads.map((_, idx) => (
            <div
              key={idx}
              onClick={() => {
                setActiveCardIndex(idx);
                carouselRef.current?.children[idx]?.scrollIntoView({ behavior: "smooth", inline: "center" });
              }}
              className={`w-1.5 h-1.5 rounded-full transition-colors cursor-pointer ${
                idx === activeCardIndex ? "bg-slate-800" : "bg-slate-300"
              }`}
            />
          ))}
        </div>
      )}

      {/* Expanded card portal - rendered outside transform chain */}
      {expandedCardId !== null && (() => {
        const thread = threads.find(t => t.id === expandedCardId);
        if (!thread) return null;
        const isNote = thread.type === "NOTE";
        return createPortal(
          <div className="fixed inset-0 z-[9999]" onClick={() => setExpandedCardId(null)}>
            <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" />
            <div
              onClick={(e) => e.stopPropagation()}
              className="absolute bottom-32 left-1/2 -translate-x-1/2 w-[90vw] max-w-2xl h-[60vh] bg-white border border-white/40 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.4)] rounded-2xl flex flex-col"
            >
              {/* Card header */}
              <div className="flex items-center justify-between px-4 py-2 border-b border-slate-100">
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                  {thread.icon}
                  <span>{thread.type}</span>
                </div>
                <button
                  onClick={() => setExpandedCardId(null)}
                  className="text-slate-400 hover:text-slate-700 transition p-1 hover:bg-slate-100 rounded-md"
                >
                  <Minimize2 size={14} />
                </button>
              </div>
              {/* Card body */}
              {isNote ? (
                <div className="flex-1 p-4">
                  <textarea
                    defaultValue={thread.messages[0]?.text || ""}
                    onChange={(e) => handleNoteEdit(thread.id, e.target.value)}
                    className="w-full h-full bg-transparent resize-none outline-none text-sm text-slate-700 leading-relaxed placeholder:text-slate-400"
                    placeholder="Type your note here..."
                  />
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {thread.messages.map((msg, i) => (
                    <div key={i} className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"}`}>
                      <div className={`max-w-[90%] rounded-xl px-3 py-2 text-sm leading-relaxed ${
                        msg.role === "user" ? "bg-blue-50 text-slate-700" : "bg-slate-50 text-slate-600"
                      }`}>
                        {msg.text}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {/* Reply input */}
              {!isNote && (
                <div className="px-4 py-2 border-t border-slate-100 flex items-center gap-2">
                  <CornerDownRight size={14} className="text-slate-400" />
                  <input
                    className="flex-1 bg-transparent border-none outline-none text-sm text-slate-700 placeholder:text-slate-400"
                    placeholder="Reply..."
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        onThreadReply(thread.id, e.currentTarget.value);
                        e.currentTarget.value = "";
                      }
                    }}
                  />
                </div>
              )}
            </div>
          </div>,
          document.body
        );
      })()}

      {/* Carousel */}
      <div
        className={`pointer-events-auto w-full px-2 transition-all duration-400 ease-[cubic-bezier(0.23,1,0.32,1)] origin-bottom mb-4 ${
          isCarouselOpen ? "opacity-100 translate-y-0 h-auto" : "opacity-0 -translate-y-2 h-0 overflow-hidden"
        }`}
      >
        <div
          ref={carouselRef}
          className="flex gap-4 overflow-x-auto snap-x snap-mandatory pb-2 scrollbar-hide mask-fade-edges"
          style={{ scrollbarWidth: "none" }}
        >
          {threads.map((thread, index) => {
            if (expandedCardId === thread.id) return null;
            const isNote = thread.type === "NOTE";
            return (
              <div
                key={thread.id}
                draggable
                onDragStart={(e) => handleDragStart(e, index)}
                onDragEnter={(e) => handleDragEnter(e, index)}
                onDragEnd={handleDragEnd}
                onDragOver={(e) => e.preventDefault()}
                onClick={() => setActiveCardIndex(index)}
                className={`bg-white backdrop-blur-xl border border-white/40 shadow-xl rounded-2xl flex flex-col transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] ${
                  isEditorFocused ? "opacity-40 hover:opacity-100 bg-white/60" : "opacity-100"
                } snap-center shrink-0 w-[85%] sm:w-[320px] relative ${
                  activeCardIndex === index ? "ring-2 ring-blue-500/20 scale-[1.02]" : "scale-95"
                } cursor-grab active:cursor-grabbing`}
                style={{ height: isNote ? "300px" : "auto", maxHeight: "300px" }}
              >
                {/* Card header */}
                <div className="flex items-center justify-between px-4 py-2 border-b border-slate-100">
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                    <GripHorizontal size={10} className="opacity-50" />
                    {thread.icon}
                    <span>{thread.type}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={(e) => { e.stopPropagation(); setExpandedCardId(thread.id); }}
                      className="text-slate-400 hover:text-slate-700 transition p-1 hover:bg-slate-100 rounded-md"
                    >
                      <Maximize2 size={12} />
                    </button>
                    <button
                      onClick={(e) => handleDeleteThread(thread.id, e)}
                      className="text-slate-400 hover:text-red-500 p-1 hover:bg-red-50 rounded-md transition"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>

                {/* Card body */}
                {isNote ? (
                  <div className="flex-1 p-4" onMouseDown={(e) => e.stopPropagation()}>
                    <textarea
                      defaultValue={thread.messages[0]?.text || ""}
                      onChange={(e) => handleNoteEdit(thread.id, e.target.value)}
                      className="w-full h-full bg-transparent resize-none outline-none text-sm text-slate-700 leading-relaxed custom-scrollbar placeholder:text-slate-400"
                      placeholder="Type your note here..."
                    />
                  </div>
                ) : (
                  <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar cursor-text" onMouseDown={(e) => e.stopPropagation()}>
                    {thread.messages.map((msg, i) => (
                      <div key={i} className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"}`}>
                        <div className={`max-w-[90%] rounded-xl px-3 py-2 text-sm leading-relaxed ${
                          msg.role === "user" ? "bg-blue-50 text-slate-700" : "bg-slate-50 text-slate-600"
                        }`}>
                          {msg.text}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Reply input */}
                {!isNote && (
                  <div className="px-4 py-2 border-t border-slate-100 flex items-center gap-2" onMouseDown={(e) => e.stopPropagation()}>
                    <CornerDownRight size={14} className="text-slate-400" />
                    <input
                      className="flex-1 bg-transparent border-none outline-none text-sm text-slate-700 placeholder:text-slate-400"
                      placeholder="Reply..."
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          onThreadReply(thread.id, e.currentTarget.value);
                          e.currentTarget.value = "";
                        }
                      }}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Bottom bar */}
      <div className="pointer-events-auto bg-white/90 backdrop-blur-xl border border-slate-200 rounded-2xl px-4 py-3 shadow-lg w-full">
        <div className="flex items-center gap-2">
          {/* Generate button */}
          <div className="flex rounded-xl overflow-hidden border border-slate-200">
            <button
              onClick={onGenerate}
              disabled={isGenerating}
              className="flex items-center gap-2 px-4 py-2 text-xs font-bold tracking-wider text-slate-600 hover:bg-slate-50 transition disabled:opacity-50"
            >
              {isGenerating ? <Loader2 size={16} className="animate-spin text-slate-600" /> : <FastForward size={16} className="text-slate-600" />}
              {isGenerating ? "WRITING..." : "CONTINUE"}
            </button>
            <button
              onClick={() => setIsGenerateMenuOpen(!isGenerateMenuOpen)}
              className={`bg-slate-50 text-slate-400 border-l border-slate-200 w-12 flex items-center justify-center hover:bg-slate-100 hover:text-slate-600 transition active:bg-slate-200 ${
                isGenerateMenuOpen ? "bg-slate-100 text-slate-600" : ""
              }`}
            >
              {isGenerateMenuOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            </button>
          </div>

          {/* Generation settings */}
          {isGenerateMenuOpen && (
            <div className="absolute bottom-full left-4 mb-2 w-80 bg-white border border-slate-200 shadow-xl rounded-2xl p-4 space-y-3">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                <Sliders size={12} /> Generation Settings
              </div>
              <div>
                <div className="flex justify-between text-xs text-slate-500 mb-1">
                  <span>Short</span>
                  <span>{generateLength}%</span>
                  <span>Long</span>
                </div>
                <input
                  type="range"
                  min={10}
                  max={100}
                  value={generateLength}
                  onChange={(e) => onSetGenerateLength(parseInt(e.target.value))}
                  className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
              </div>
              <div>
                <div className="text-xs text-slate-500 mb-1">Custom Instructions</div>
                <textarea
                  value={customInstructions}
                  onChange={(e) => onSetCustomInstructions(e.target.value)}
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-3 resize-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300 outline-none transition-all placeholder:text-slate-400"
                  rows={3}
                  placeholder="e.g. Use short sentences, focus on sensory details..."
                />
              </div>
            </div>
          )}

          {/* Tools button */}
          <div className="relative">
            <button
              onClick={() => setIsToolsMenuOpen(!isToolsMenuOpen)}
              className={`p-2 rounded-full transition-all group ${
                isToolsMenuOpen && activeTool ? "bg-slate-100 text-slate-900" : "text-slate-400 hover:text-slate-900 hover:bg-slate-100"
              }`}
            >
              <Wrench size={18} className={`transition-transform ${isToolsMenuOpen ? "rotate-45" : "group-hover:rotate-12"}`} />
            </button>
            {isToolsMenuOpen && (
              <div className="absolute bottom-full left-0 mb-2 w-48 bg-white border border-slate-200 shadow-xl rounded-2xl overflow-hidden py-1">
                {TOOLS_MENU.map((option, idx) => (
                  <button
                    key={idx}
                    onClick={() => { setActiveTool(option); setIsToolsMenuOpen(false); chatInputRef.current?.focus(); }}
                    className="w-full text-left px-4 py-2.5 text-sm hover:bg-slate-50 flex items-center gap-3 transition-colors group"
                  >
                    <span className={option.color}>{option.icon}</span>
                    {option.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Active tool badge */}
          {activeTool && (
            <div className="flex items-center gap-1 text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded-full">
              {activeTool.icon}
              <span>{activeTool.label}</span>
              <button onClick={() => setActiveTool(null)} className="ml-1 hover:text-black">
                <X size={10} />
              </button>
            </div>
          )}

          {/* Chat input */}
          <input
            ref={chatInputRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            placeholder={getPlaceholder()}
            disabled={isChatLoading}
            className="flex-1 bg-transparent border-none outline-none text-slate-700 placeholder:text-slate-400 text-sm py-3 min-w-0"
          />

          <button
            onClick={handleSubmit}
            disabled={isChatLoading || !inputValue.trim()}
            className="p-2 rounded-full text-slate-400 hover:text-blue-600 transition disabled:opacity-50"
          >
            {isChatLoading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          </button>

          {/* Carousel toggle */}
          <button
            onClick={() => setIsCarouselOpen(!isCarouselOpen)}
            className="pointer-events-auto p-2.5 rounded-full shadow-lg border transition-all active:scale-95 bg-white text-slate-500 border-slate-100 hover:text-blue-600"
          >
            {isCarouselOpen ? <X size={16} /> : <MessageSquare size={16} />}
          </button>
        </div>
      </div>
    </div>
  );
};