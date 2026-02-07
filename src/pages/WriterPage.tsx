import React, { useState, useRef, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { WriterToolbar } from "@/components/writer/WriterToolbar";
import { WriterHUD, type CarouselThread, type Tool } from "@/components/writer/WriterHUD";
import { DocumentList } from "@/components/writer/DocumentList";
import { useWriterDocuments } from "@/hooks/use-writer-documents";
import { useWriterAI } from "@/hooks/use-writer-ai";

const WriterPage: React.FC = () => {
  const editorRef = useRef<HTMLDivElement>(null);
  const selectionRangeRef = useRef<Range | null>(null);

  const docs = useWriterDocuments();
  const ai = useWriterAI();

  const [isDocListOpen, setIsDocListOpen] = useState(false);
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);
  const [isEditorFocused, setIsEditorFocused] = useState(false);
  const [hasSelection, setHasSelection] = useState(false);
  const [fullSelectionContext, setFullSelectionContext] = useState("");
  const [threads, setThreads] = useState<CarouselThread[]>([]);
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

  // Selection helpers
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
      } catch (e) {
        console.warn("Error clearing highlights", e);
      }
    }
  }, []);

  const applyHighlight = useCallback(() => {
    const selection = window.getSelection();
    if (selection && !selection.isCollapsed) {
      document.execCommand("styleWithCSS", false, "true");
      document.execCommand("hiliteColor", false, "#c7d2fe");
      // Update selection state
      const text = selection.toString();
      setHasSelection(true);
      setFullSelectionContext(text);
    }
  }, []);

  const handleEditorMouseUp = useCallback(() => {
    const selection = window.getSelection();
    if (!selection) return;
    updateCursorRef();
    if (!selection.isCollapsed) {
      applyHighlight();
    } else if (!isMultiSelectMode && hasSelection) {
      const range = selection.rangeCount > 0 ? selection.getRangeAt(0).cloneRange() : null;
      clearAllHighlights();
      if (range) {
        selection.removeAllRanges();
        selection.addRange(range);
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
  const execFormat = useCallback((command: string, value?: string) => {
    document.execCommand(command, false, value);
    if (editorRef.current) {
      editorRef.current.focus();
      docs.handleContentChange(editorRef);
    }
  }, [docs]);

  const applyFont = useCallback((fontValue: string) => {
    document.execCommand("fontName", false, fontValue);
    if (editorRef.current) {
      editorRef.current.focus();
      docs.handleContentChange(editorRef);
    }
  }, [docs]);

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
      const mainContext = hasSelection && fullSelectionContext
        ? fullSelectionContext
        : editorRef.current?.innerText.slice(-3000) || "";
      const contextLabel = hasSelection ? "HIGHLIGHTED SELECTION" : "CURRENT DRAFT CONTEXT";
      const threadContext = getThreadContext();

      if (tool) {
        if (tool.label === "Write Note") {
          const newThread: CarouselThread = {
            id: Date.now(),
            type: "NOTE",
            color: "bg-secondary text-muted-foreground",
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
          color: "bg-secondary text-foreground",
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
        // General chat
        const newThreadId = Date.now();
        const newThread: CarouselThread = {
          id: newThreadId,
          type: "GENERAL",
          color: "bg-secondary text-foreground",
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
        prev.map((t) => (t.id === threadId ? { ...t, messages: [...t.messages, { role: "user" as const, text: replyText }] } : t))
      );

      const thread = threads.find((t) => t.id === threadId);
      const history = thread ? thread.messages.map((m) => `${m.role}: ${m.text}`).join("\n") : "";
      const mainContext = hasSelection && fullSelectionContext ? fullSelectionContext : editorRef.current?.innerText.slice(-2000) || "";
      const contextLabel = hasSelection ? "HIGHLIGHTED SELECTION" : "DRAFT CONTEXT";
      const threadCtx = getThreadContext();

      const systemPrompt = `Assistant Helper.
${contextLabel}: "${mainContext}".
Other Notes: ${threadCtx}.
History: ${history}.
Formatting rules (strict): Do not use Markdown syntax. Output plain text or HTML blocks only.`;

      const aiResponse = await ai.chat(replyText, systemPrompt);
      setThreads((prev) =>
        prev.map((t) => (t.id === threadId ? { ...t, messages: [...t.messages, { role: "ai" as const, text: aiResponse }] } : t))
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
    <div className="min-h-screen bg-background flex flex-col">
      {/* Back nav */}
      <div className="px-4 py-2 border-b border-border bg-card/50">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition">
          <ArrowLeft size={16} /> Back to Portfolio
        </Link>
      </div>

      {/* Toolbar */}
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

      {/* Editor */}
      <div className="flex-1 flex justify-center overflow-hidden" id="print-area">
        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          onInput={() => {
            docs.handleContentChange(editorRef);
            updateCursorRef();
          }}
          onMouseUp={handleEditorMouseUp}
          onKeyUp={updateCursorRef}
          onFocus={handleEditorFocus}
          onBlur={() => setIsEditorFocused(false)}
          className="w-full max-w-3xl px-8 md:px-16 py-12 pb-48 outline-none text-foreground leading-relaxed text-lg editor-content overflow-y-auto
            [&>h1]:text-4xl [&>h1]:font-bold [&>h1]:mb-6 [&>h1]:tracking-tight
            [&>h2]:text-2xl [&>h2]:font-bold [&>h2]:mt-8 [&>h2]:mb-4
            [&_p]:mb-4 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5
            [&>blockquote]:border-l-4 [&>blockquote]:border-border [&>blockquote]:pl-4 [&>blockquote]:italic [&>blockquote]:text-muted-foreground"
          data-placeholder="Start writing..."
        />
      </div>

      {/* HUD */}
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
