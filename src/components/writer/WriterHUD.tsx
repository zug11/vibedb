import React, { useState, useRef, useEffect } from "react";
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
  { label: "Critique", icon: <Search size={14} />, color: "text-destructive", promptPrefix: "Critique this: " },
  { label: "Idea Gen", icon: <Lightbulb size={14} />, color: "text-amber-500", promptPrefix: "Ideas for: " },
  { label: "Explain", icon: <BookOpen size={14} />, color: "text-accent", promptPrefix: "Explain: " },
  { label: "Write Like", icon: <Feather size={14} />, color: "text-purple-500", promptPrefix: "Style: " },
  { label: "Write Note", icon: <StickyNote size={14} />, color: "text-muted-foreground", promptPrefix: "Note: " },
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

  const handleDragStart = (index: number) => { dragItem.current = index; };
  const handleDragEnter = (index: number) => { dragOverItem.current = index; };
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
    const base = `bg-card backdrop-blur-xl border border-border shadow-xl rounded-2xl flex flex-col transition-all duration-500 ${
      isEditorFocused ? "opacity-40 hover:opacity-100" : "opacity-100"
    }`;
    if (expandedCardId !== null) {
      if (expandedCardId === threadId)
        return `${base} fixed bottom-32 left-1/2 -translate-x-1/2 w-[90vw] max-w-2xl h-[60vh] z-[100] shadow-2xl scale-100 opacity-100`;
      return `${base} hidden opacity-0 pointer-events-none`;
    }
    return `${base} snap-center shrink-0 w-[85%] sm:w-[320px] relative ${
      activeCardIndex === index ? "ring-2 ring-primary/20 scale-[1.02]" : "scale-95"
    }`;
  };

  return (
    <div className={`fixed bottom-0 left-0 right-0 z-50 pointer-events-none transition-opacity duration-500 ${
      isEditorFocused ? "opacity-40 hover:opacity-100" : "opacity-100"
    }`}>
      {/* Carousel */}
      {isCarouselOpen && threads.length > 0 && (
        <div className="pointer-events-auto px-4 pb-2">
          {/* Pagination dots */}
          {expandedCardId === null && (
            <div className="flex justify-center gap-1.5 mb-2">
              {threads.map((_, i) => (
                <button
                  key={i}
                  onClick={() => {
                    setActiveCardIndex(i);
                    carouselRef.current?.children[i]?.scrollIntoView({ behavior: "smooth", inline: "center" });
                  }}
                  className={`h-1.5 rounded-full transition-all ${
                    activeCardIndex === i ? "w-6 bg-primary" : "w-1.5 bg-muted-foreground/30"
                  }`}
                />
              ))}
            </div>
          )}

          <div
            ref={carouselRef}
            className="flex gap-4 overflow-x-auto snap-x snap-mandatory pb-2 scrollbar-hide mask-fade-edges"
            style={{ scrollbarWidth: "none" }}
          >
            {threads.map((thread, index) => {
              const isExpanded = expandedCardId === thread.id;
              const isNote = thread.type === "NOTE";
              return (
                <div
                  key={thread.id}
                  draggable
                  onDragStart={() => handleDragStart(index)}
                  onDragEnter={() => handleDragEnter(index)}
                  onDragEnd={handleDragEnd}
                  onDragOver={(e) => e.preventDefault()}
                  onClick={() => !isExpanded && setActiveCardIndex(index)}
                  className={`${getCardClasses(thread.id, index)} cursor-grab active:cursor-grabbing`}
                  style={{ height: isExpanded ? "60vh" : isNote ? "300px" : "auto", maxHeight: isExpanded ? "60vh" : "300px" }}
                >
                  {/* Card header */}
                  <div className="flex items-center justify-between px-4 py-2 border-b border-border">
                    <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                      <GripHorizontal size={10} className="opacity-50" />
                      {thread.icon}
                      <span>{thread.type}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={(e) => { e.stopPropagation(); setExpandedCardId(isExpanded ? null : thread.id); }}
                        className="text-muted-foreground hover:text-foreground transition p-1 hover:bg-secondary rounded-md"
                      >
                        {isExpanded ? <Minimize2 size={14} /> : <Maximize2 size={12} />}
                      </button>
                      {!isExpanded && (
                        <button
                          onClick={(e) => handleDeleteThread(thread.id, e)}
                          className="text-muted-foreground hover:text-destructive p-1 hover:bg-destructive/10 rounded-md transition"
                        >
                          <Trash2 size={12} />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Card body */}
                  {isNote ? (
                    <div className="flex-1 p-4" onMouseDown={(e) => e.stopPropagation()}>
                      <textarea
                        defaultValue={thread.messages[0]?.text || ""}
                        onChange={(e) => handleNoteEdit(thread.id, e.target.value)}
                        className="w-full h-full bg-transparent resize-none outline-none text-sm text-foreground leading-relaxed placeholder:text-muted-foreground custom-scrollbar"
                        placeholder="Type your note here..."
                      />
                    </div>
                  ) : (
                    <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar cursor-text" onMouseDown={(e) => e.stopPropagation()}>
                      {thread.messages.map((msg, i) => (
                        <div key={i} className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"}`}>
                          <div className={`max-w-[90%] rounded-xl px-3 py-2 text-sm leading-relaxed ${
                            msg.role === "user"
                              ? "bg-primary/10 text-foreground"
                              : "bg-secondary text-foreground"
                          }`}>
                            {msg.text}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Reply input */}
                  {!isNote && (
                    <div className="px-4 py-2 border-t border-border flex items-center gap-2" onMouseDown={(e) => e.stopPropagation()}>
                      <CornerDownRight size={14} className="text-muted-foreground" />
                      <input
                        className="flex-1 bg-transparent border-none outline-none text-sm text-foreground placeholder:text-muted-foreground"
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
      )}

      {/* Bottom bar */}
      <div className="pointer-events-auto bg-card/90 backdrop-blur-xl border-t border-border px-4 py-3">
        <div className="max-w-4xl mx-auto flex items-center gap-2">
          {/* Generate button */}
          <div className="flex rounded-xl overflow-hidden border border-border">
            <button
              onClick={onGenerate}
              disabled={isGenerating}
              className="flex items-center gap-2 px-4 py-2 text-xs font-bold tracking-wider text-foreground hover:bg-secondary transition disabled:opacity-50"
            >
              {isGenerating ? <Loader2 size={16} className="animate-spin" /> : <FastForward size={16} />}
              {isGenerating ? "WRITING..." : "CONTINUE"}
            </button>
            <button
              onClick={() => setIsGenerateMenuOpen(!isGenerateMenuOpen)}
              className="bg-secondary/50 border-l border-border w-10 flex items-center justify-center hover:bg-secondary transition"
            >
              {isGenerateMenuOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            </button>
          </div>

          {/* Generation settings */}
          {isGenerateMenuOpen && (
            <div className="absolute bottom-full left-4 mb-2 w-80 bg-card border border-border shadow-xl rounded-2xl p-4 space-y-3">
              <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                <Sliders size={12} /> Generation Settings
              </div>
              <div>
                <div className="flex justify-between text-xs text-muted-foreground mb-1">
                  <span>Short</span><span>{generateLength}%</span><span>Long</span>
                </div>
                <input
                  type="range"
                  min={10}
                  max={100}
                  value={generateLength}
                  onChange={(e) => onSetGenerateLength(parseInt(e.target.value))}
                  className="w-full h-1.5 bg-secondary rounded-lg appearance-none cursor-pointer accent-primary"
                />
              </div>
              <div>
                <div className="text-xs text-muted-foreground mb-1">Custom Instructions</div>
                <textarea
                  value={customInstructions}
                  onChange={(e) => onSetCustomInstructions(e.target.value)}
                  className="w-full text-xs bg-secondary border border-border rounded-xl p-3 resize-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30 outline-none transition placeholder:text-muted-foreground text-foreground"
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
              className="p-2 rounded-full transition text-muted-foreground hover:text-foreground hover:bg-secondary"
            >
              <Wrench size={18} />
            </button>
            {isToolsMenuOpen && (
              <div className="absolute bottom-full left-0 mb-2 w-48 bg-card border border-border shadow-xl rounded-2xl overflow-hidden py-1">
                {TOOLS_MENU.map((option, idx) => (
                  <button
                    key={idx}
                    onClick={() => { setActiveTool(option); setIsToolsMenuOpen(false); chatInputRef.current?.focus(); }}
                    className="w-full text-left px-4 py-2.5 text-sm hover:bg-secondary flex items-center gap-3 transition text-foreground"
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
            <div className="flex items-center gap-1 text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">
              {activeTool.icon}
              <span>{activeTool.label}</span>
              <button onClick={() => setActiveTool(null)} className="ml-1 hover:text-foreground">
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
            placeholder={isChatLoading ? "AI is thinking..." : activeTool ? `${activeTool.promptPrefix}...` : "Chat with AI about your writing..."}
            disabled={isChatLoading}
            className="flex-1 bg-transparent border-none outline-none text-foreground placeholder:text-muted-foreground text-sm py-2 min-w-0"
          />

          <button
            onClick={handleSubmit}
            disabled={isChatLoading || !inputValue.trim()}
            className="p-2 rounded-full text-muted-foreground hover:text-primary transition disabled:opacity-50"
          >
            {isChatLoading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          </button>

          {/* Carousel toggle */}
          <button
            onClick={() => setIsCarouselOpen(!isCarouselOpen)}
            className={`p-2.5 rounded-full shadow-lg border transition active:scale-95 ${
              isCarouselOpen
                ? "bg-foreground text-background border-foreground"
                : "bg-card text-muted-foreground border-border hover:text-primary"
            }`}
          >
            {isCarouselOpen ? <X size={16} /> : <MessageSquare size={16} />}
          </button>
        </div>
      </div>
    </div>
  );
};
