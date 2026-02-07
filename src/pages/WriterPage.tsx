import React, { useState, useRef, useEffect, useCallback } from "react";
import { WriterToolbar } from "@/components/writer/WriterToolbar";
import { WriterHUD, type CarouselThread, type Tool } from "@/components/writer/WriterHUD";
import { DocumentList } from "@/components/writer/DocumentList";
import { useWriterDocuments } from "@/hooks/use-writer-documents";
import { useWriterAI } from "@/hooks/use-writer-ai";
import { Search, Lightbulb } from "lucide-react";

const INITIAL_THREADS: CarouselThread[] = [
  {
    id: 1,
    type: "CRITIQUE",
    color: "bg-rose-100 text-rose-700",
    icon: <Search size={12} />,
    messages: [
      { role: "user", text: "How is the pacing in the second paragraph?" },
      { role: "ai", text: "It drags a bit. You spend too long describing the drone's voice. Consider cutting the '1950s radio host' metaphor or moving it to dialogue tags." },
    ],
  },
  {
    id: 2,
    type: "IDEA GEN",
    color: "bg-amber-100 text-amber-700",
    icon: <Lightbulb size={12} />,
    messages: [
      { role: "user", text: "Something obscure for the backpack" },
      { role: "ai", text: "A corrupted save file that whispers when you hold it to your ear, or a half-eaten sandwich that regenerates one bite every hour." },
    ],
  },
];

const WriterPage: React.FC = () => {
  const editorRef = useRef<HTMLDivElement>(null);
  const selectionRangeRef = useRef<Range | null>(null);
  const hudRef = useRef<HTMLDivElement>(null);
  const topBarRef = useRef<HTMLDivElement>(null);

  const docs = useWriterDocuments();
  const ai = useWriterAI();

  const [isDocListOpen, setIsDocListOpen] = useState(false);
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);
  const [isEditorFocused, setIsEditorFocused] = useState(false);
  const [hasSelection, setHasSelection] = useState(false);
  const [fullSelectionContext, setFullSelectionContext] = useState("");
  const [selectedSnippet, setSelectedSnippet] = useState("");
  const [threads, setThreads] = useState<CarouselThread[]>(INITIAL_THREADS);
  const [generateLength, setGenerateLength] = useState(50);
  const [customInstructions, setCustomInstructions] = useState("");

  // Init
  useEffect(() => {
    const content = docs.initDocuments();
    if (editorRef.current) {
      editorRef.current.innerHTML = content || docs.docContent;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Global click handler to clear highlights when clicking outside
  useEffect(() => {
    const handleGlobalClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        editorRef.current?.contains(target) ||
        hudRef.current?.contains(target) ||
        topBarRef.current?.contains(target)
      ) {
        return;
      }
      if (hasSelection) {
        clearAllHighlights();
      }
    };
    document.addEventListener("mousedown", handleGlobalClick);
    return () => document.removeEventListener("mousedown", handleGlobalClick);
  }, [hasSelection]);

  // Selection helpers
  const updateSelectionState = useCallback(() => {
    if (!editorRef.current) return;
    const highlights = editorRef.current.querySelectorAll('span[style*="background-color"]');
    let combinedText = "";
    let found = false;

    highlights.forEach((span) => {
      const bg = (span as HTMLElement).style.backgroundColor;
      if (bg.includes("224") || bg.includes("231") || bg.includes("e0e7ff") || bg.includes("199")) {
        combinedText += span.textContent + " ";
        found = true;
      }
    });

    const selection = window.getSelection();
    if (selection && !selection.isCollapsed) {
      found = true;
      if (!combinedText) combinedText = selection.toString();
    }

    if (found) {
      setHasSelection(true);
      setFullSelectionContext(combinedText.trim());
      setSelectedSnippet(combinedText.length > 60 ? combinedText.slice(0, 60) + "..." : combinedText);
    } else {
      setHasSelection(false);
      setFullSelectionContext("");
      setSelectedSnippet("");
    }
  }, []);

  const updateCursorRef = useCallback(() => {
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      if (editorRef.current && editorRef.current.contains(range.commonAncestorContainer)) {
        selectionRangeRef.current = range.cloneRange();
      }
    }
  }, []);

  const clearAllHighlights = useCallback(() => {
    if (editorRef.current) {
      try {
        const selection = window.getSelection();
        selection?.removeAllRanges();
        const range = document.createRange();
        range.selectNodeContents(editorRef.current);
        selection?.addRange(range);
        document.execCommand("styleWithCSS", false, "true");
        document.execCommand("hiliteColor", false, "transparent");
        selection?.removeAllRanges();
        setHasSelection(false);
        setFullSelectionContext("");
        setSelectedSnippet("");
      } catch (e) {
        console.warn("Error clearing highlights", e);
      }
    }
  }, []);

  const applyHighlight = useCallback(() => {
    const selection = window.getSelection();
    if (selection && !selection.isCollapsed) {
      document.execCommand("styleWithCSS", false, "true");
      document.execCommand("hiliteColor", false, "#e0e7ff");
      updateSelectionState();
    }
  }, [updateSelectionState]);

  const handleEditorMouseUp = useCallback(() => {
    const selection = window.getSelection();
    if (!selection) return;
    updateCursorRef();
    if (!selection.isCollapsed) {
      applyHighlight();
    } else {
      if (!isMultiSelectMode && hasSelection) {
        const range = selection.rangeCount > 0 ? selection.getRangeAt(0).cloneRange() : null;
        clearAllHighlights();
        if (range) {
          selection.removeAllRanges();
          selection.addRange(range);
        }
      }
    }
  }, [updateCursorRef, applyHighlight, isMultiSelectMode, hasSelection, clearAllHighlights]);

  const handleEditorFocus = useCallback(() => {
    if (editorRef.current && editorRef.current.innerText.trim() === "Start writing...") {
      editorRef.current.innerText = "";
    }
    updateCursorRef();
    setIsEditorFocused(true);
  }, [updateCursorRef]);

  // Format commands
  const execFormat = useCallback(
    (command: string, value?: string) => {
      document.execCommand(command, false, value);
      if (editorRef.current) {
        editorRef.current.focus();
        docs.handleContentChange(editorRef);
      }
    },
    [docs]
  );

  const applyFont = useCallback(
    (fontValue: string) => {
      document.execCommand("fontName", false, fontValue);
      if (editorRef.current) {
        editorRef.current.focus();
        docs.handleContentChange(editorRef);
      }
    },
    [docs]
  );

  // Thread context builder
  const getThreadContext = useCallback(() => {
    if (threads.length === 0) return "No active notes or previous context.";
    return threads
      .map((t) => {
        if (t.type === "NOTE") return `[USER NOTE]: "${t.messages[0].text}"`;
        const lastMsg = t.messages[t.messages.length - 1];
        const content = lastMsg.role === "ai" ? lastMsg.text : `(User input: ${lastMsg.text})`;
        return `[ACTIVE THREAD - ${t.type}]: ${content}`;
      })
      .join("\n");
  }, [threads]);

  // Generate handler
  const handleGenerate = useCallback(async () => {
    let contextText = "";
    if (hasSelection && fullSelectionContext) {
      contextText = fullSelectionContext;
    } else if (selectionRangeRef.current && editorRef.current) {
      try {
        const preRange = document.createRange();
        preRange.selectNodeContents(editorRef.current);
        preRange.setEnd(selectionRangeRef.current.startContainer, selectionRangeRef.current.startOffset);
        contextText = preRange.toString().slice(-3000);
      } catch {
        contextText = editorRef.current.innerText.slice(-3000);
      }
    } else {
      contextText = editorRef.current?.innerText.slice(-3000) || "";
    }

    const threadCtx = getThreadContext();
    const newText = await ai.generate(contextText, threadCtx, generateLength, customInstructions);

    if (newText && !newText.startsWith("Error:") && editorRef.current) {
      let processedHtml = newText;
      if (!newText.trim().startsWith("<")) {
        processedHtml = newText
          .split("\n")
          .filter((line) => line.trim())
          .map((line) => `<p>${line}</p>`)
          .join("");
      }

      if (selectionRangeRef.current && !hasSelection) {
        const selection = window.getSelection();
        selection?.removeAllRanges();
        selection?.addRange(selectionRangeRef.current);
        document.execCommand("insertHTML", false, processedHtml);
      } else {
        const tempDiv = document.createElement("div");
        tempDiv.innerHTML = processedHtml;
        const fragment = document.createDocumentFragment();
        while (tempDiv.firstChild) fragment.appendChild(tempDiv.firstChild);
        editorRef.current.appendChild(fragment);
        editorRef.current.scrollTo({ top: editorRef.current.scrollHeight, behavior: "smooth" });
      }
      docs.handleContentChange(editorRef);
      const wordCount = editorRef.current.innerText.trim().split(/\s+/).length;
      docs.setStatusMessage(`Generated +${wordCount} words`);
    }
  }, [hasSelection, fullSelectionContext, getThreadContext, ai, generateLength, customInstructions, docs]);

  // Chat submit
  const handleChatSubmit = useCallback(
    async (message: string, tool: Tool | null) => {
      const mainContext =
        hasSelection && fullSelectionContext ? fullSelectionContext : editorRef.current?.innerText.slice(-3000) || "";
      const contextLabel = hasSelection ? "HIGHLIGHTED SELECTION" : "CURRENT DRAFT CONTEXT";
      const threadContext = getThreadContext();

      if (tool) {
        if (tool.label === "Write Note") {
          const newThread: CarouselThread = {
            id: Date.now(),
            type: "NOTE",
            color: "bg-stone-100 text-stone-700 border-stone-300",
            icon: tool.icon,
            messages: [{ role: "user", text: message }],
          };
          setThreads((prev) => [...prev, newThread]);
          return;
        }

        const newThreadId = Date.now();
        let toolSystemPrompt = "";
        if (tool.label === "Write Like") {
          toolSystemPrompt = `You are a creative writing style analyst. Set style for FUTURE generation: "${message}". DO NOT GENERATE STORY TEXT. Confirm style parameters only.
Formatting rules (strict): Do not use Markdown syntax. Do not use **bold**, __bold__, or inline emphasis. Output plain text or HTML blocks only.`;
        } else {
          toolSystemPrompt = `You are a creative writing assistant specializing in ${tool.label}.
User asks: "${message}".
${contextLabel}: "${mainContext}".
Other notes: ${threadContext}.
Be direct.
Formatting rules (strict): Do not use Markdown syntax. Do not use **bold**, __bold__, or inline emphasis. Output plain text or HTML blocks only.`;
        }

        const newThread: CarouselThread = {
          id: newThreadId,
          type: tool.label.toUpperCase(),
          color: tool.color.replace("text-", "bg-").replace("600", "100") + " " + tool.color.replace("600", "700"),
          icon: tool.icon,
          messages: [
            { role: "user", text: message },
            { role: "ai", text: "Thinking..." },
          ],
        };
        setThreads((prev) => [...prev, newThread]);

        const result = await ai.chat(message, toolSystemPrompt);
        setThreads((prev) =>
          prev.map((t) => {
            if (t.id === newThreadId) {
              const msgs = [...t.messages];
              msgs[1] = { role: "ai", text: result };
              return { ...t, messages: msgs };
            }
            return t;
          })
        );
      } else {
        const newThreadId = Date.now();
        const newThread: CarouselThread = {
          id: newThreadId,
          type: "GENERAL",
          color: "bg-slate-100 text-slate-600",
          icon: null,
          messages: [{ role: "user", text: message }],
        };
        setThreads((prev) => [...prev, newThread]);

        const systemPrompt = `You are a helpful writing assistant.
${contextLabel}: "${mainContext}".
Other Context: ${threadContext}.
Answer specifically.
Formatting rules (strict): Do not use Markdown syntax. Do not use **bold**, __bold__, or inline emphasis. Output plain text or HTML blocks only.`;

        const aiResponse = await ai.chat(message, systemPrompt);
        setThreads((prev) =>
          prev.map((t) => {
            if (t.id === newThreadId) return { ...t, messages: [...t.messages, { role: "ai", text: aiResponse }] };
            return t;
          })
        );
      }
    },
    [hasSelection, fullSelectionContext, getThreadContext, ai]
  );

  // Thread reply
  const handleThreadReply = useCallback(
    async (threadId: number, replyText: string) => {
      if (!replyText.trim()) return;
      setThreads((prev) =>
        prev.map((t) =>
          t.id === threadId ? { ...t, messages: [...t.messages, { role: "user" as const, text: replyText }] } : t
        )
      );

      const thread = threads.find((t) => t.id === threadId);
      const history = thread ? thread.messages.map((m) => `${m.role}: ${m.text}`).join("\n") : "";
      const mainContext =
        hasSelection && fullSelectionContext ? fullSelectionContext : editorRef.current?.innerText.slice(-2000) || "";
      const contextLabel = hasSelection ? "HIGHLIGHTED SELECTION" : "DRAFT CONTEXT";
      const threadCtx = getThreadContext();

      const systemPrompt = `Assistant Helper.
${contextLabel}: "${mainContext}".
Other Notes: ${threadCtx}.
History: ${history}.
Formatting rules (strict): Do not use Markdown syntax. Output plain text or HTML blocks only.`;

      const aiResponse = await ai.chat(replyText, systemPrompt);
      setThreads((prev) =>
        prev.map((t) =>
          t.id === threadId ? { ...t, messages: [...t.messages, { role: "ai" as const, text: aiResponse }] } : t
        )
      );
    },
    [threads, hasSelection, fullSelectionContext, getThreadContext, ai]
  );

  // Doc management
  const handleLoadDoc = useCallback(
    (id: string) => {
      const doc = docs.loadDocument(id);
      if (doc && editorRef.current) {
        editorRef.current.innerHTML = doc.content;
        setIsDocListOpen(false);
        clearAllHighlights();
      }
    },
    [docs, clearAllHighlights]
  );

  const handleNewDoc = useCallback(() => {
    const doc = docs.createNewDocument();
    if (editorRef.current) {
      editorRef.current.innerHTML = doc.content;
    }
    setIsDocListOpen(false);
    clearAllHighlights();
  }, [docs, clearAllHighlights]);

  const handleDeleteDoc = useCallback(
    (id: string) => {
      const result = docs.deleteDocument(id);
      if (typeof result === "string") {
        handleLoadDoc(result);
      }
    },
    [docs, handleLoadDoc]
  );

  return (
    <div className="relative h-screen bg-white flex flex-col overflow-hidden">
      {/* Top toolbar - sticky */}
      <div ref={topBarRef} className="sticky top-0 z-40 shrink-0">
        <WriterToolbar
          docTitle={docs.docTitle}
          statusMessage={docs.statusMessage}
          isMultiSelectMode={isMultiSelectMode}
          onTitleChange={docs.setDocTitle}
          onFormat={execFormat}
          onFontChange={applyFont}
          onToggleMultiSelect={() => setIsMultiSelectMode(!isMultiSelectMode)}
          onOpenDocList={() => setIsDocListOpen(true)}
          onSave={() => docs.saveDocument(editorRef)}
          onExport={() => docs.exportMarkdown(editorRef)}
          onContentChange={() => docs.handleContentChange(editorRef)}
        />
      </div>

      {/* Editor area - scrollable */}
      <div id="print-area" className="flex-1 overflow-y-auto px-12 pb-80 scroll-smooth">
        <div className="w-full max-w-4xl mx-auto pt-12">
           <div
            ref={editorRef}
            contentEditable
            suppressContentEditableWarning
            spellCheck={false}
            onInput={() => {
              docs.handleContentChange(editorRef);
              updateCursorRef();
            }}
            onMouseUp={handleEditorMouseUp}
            onKeyUp={() => {
              updateCursorRef();
            }}
            onFocus={handleEditorFocus}
            onBlur={() => setIsEditorFocused(false)}
            className="editor-content min-h-[80vh] outline-none text-lg leading-loose text-slate-700 font-[Inter] max-w-2xl mx-auto
              selection:bg-blue-100 selection:text-slate-900
              empty:before:content-[attr(data-placeholder)] empty:before:text-slate-300
              [&>h1]:text-4xl [&>h1]:font-sans [&>h1]:font-bold [&>h1]:text-slate-900 [&>h1]:mb-6 [&>h1]:tracking-tight
              [&>h2]:text-2xl [&>h2]:font-sans [&>h2]:font-bold [&>h2]:text-slate-800 [&>h2]:mt-8 [&>h2]:mb-4
              [&_p]:mb-4 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5
              [&>blockquote]:border-l-4 [&>blockquote]:border-slate-200 [&>blockquote]:pl-4 [&>blockquote]:italic [&>blockquote]:text-slate-500"
            data-placeholder="Start writing..."
          />
        </div>
      </div>

      {/* HUD Layer - fixed to bottom */}
      <div
        ref={hudRef}
        onMouseDown={() => setIsEditorFocused(false)}
        className={`fixed bottom-6 w-full max-w-3xl flex flex-col items-center z-50 transition-all duration-500 left-1/2 -translate-x-1/2 ${
          isEditorFocused ? "opacity-40 hover:opacity-100" : "opacity-100"
        }`}
      >
        <WriterHUD
          threads={threads}
          isEditorFocused={isEditorFocused}
          isGenerating={ai.isGenerating}
          isChatLoading={ai.isChatLoading}
          generateLength={generateLength}
          customInstructions={customInstructions}
          onSetThreads={setThreads}
          onGenerate={handleGenerate}
          onChatSubmit={handleChatSubmit}
          onThreadReply={handleThreadReply}
          onSetGenerateLength={setGenerateLength}
          onSetCustomInstructions={setCustomInstructions}
        />
      </div>

      {/* Document list overlay */}
      {isDocListOpen && (
        <DocumentList
          docList={docs.docList}
          activeDocId={docs.activeDocId}
          onLoad={handleLoadDoc}
          onNew={handleNewDoc}
          onDelete={handleDeleteDoc}
          onClose={() => setIsDocListOpen(false)}
        />
      )}
    </div>
  );
};

export default WriterPage;