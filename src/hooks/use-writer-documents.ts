import { useState, useCallback, useRef } from "react";

export interface DocMetadata {
  id: string;
  title: string;
  updatedAt: number;
  snippet: string;
}

export interface WriterDocument {
  id: string;
  title: string;
  content: string;
  updatedAt: number;
}

const DEFAULT_DOC_ID = "default-doc";
const INITIAL_HTML = `<h1>Chapter 4: The Void</h1>
<p>Joey stood at the edge of the precipice, looking down into the swirling static. It wasn't dark, exactly. It was more like the absence of light, a glitch in the rendering of the universe.</p>
<p>"You know," the drone buzzed by his ear, its voice a perfect mimicry of a 1950s radio host. "If you jump, you technically don't die. You just... decompile."</p>
<p>Joey sighed, adjusting the strap of his backpack. It was heavier than it should be, filled with nothing but corrupted save files and a half-eaten sandwich.</p>`;

export function useWriterDocuments() {
  const [docList, setDocList] = useState<DocMetadata[]>([]);
  const [activeDocId, setActiveDocId] = useState(DEFAULT_DOC_ID);
  const [docTitle, setDocTitle] = useState("Chapter 4: The Void");
  const [docContent, setDocContent] = useState(INITIAL_HTML);
  const [lastSaved, setLastSaved] = useState<number | null>(null);
  const [statusMessage, setStatusMessage] = useState("Ready");
  const saveTimeoutRef = useRef<any>(null);

  const initDocuments = useCallback(() => {
    const savedDocs = localStorage.getItem("void_os_docs_index");
    if (savedDocs) {
      setDocList(JSON.parse(savedDocs));
      // Load the first doc
      const list = JSON.parse(savedDocs) as DocMetadata[];
      if (list.length > 0) {
        const saved = localStorage.getItem(`void_os_doc_${list[0].id}`);
        if (saved) {
          const doc = JSON.parse(saved) as WriterDocument;
          setActiveDocId(doc.id);
          setDocTitle(doc.title);
          setDocContent(doc.content);
          return doc.content;
        }
      }
    } else {
      const defaultMeta: DocMetadata = {
        id: DEFAULT_DOC_ID,
        title: "Chapter 4: The Void",
        updatedAt: Date.now(),
        snippet: "Joey stood at the edge...",
      };
      setDocList([defaultMeta]);
      localStorage.setItem("void_os_docs_index", JSON.stringify([defaultMeta]));
      const fullDoc: WriterDocument = {
        id: DEFAULT_DOC_ID,
        title: "Chapter 4: The Void",
        content: INITIAL_HTML,
        updatedAt: Date.now(),
      };
      localStorage.setItem(`void_os_doc_${DEFAULT_DOC_ID}`, JSON.stringify(fullDoc));
    }
    return null;
  }, []);

  const saveDocument = useCallback(
    (editorRef: React.RefObject<HTMLDivElement | null>, currentContent?: string) => {
      const content = currentContent ?? docContent;
      const meta: DocMetadata = {
        id: activeDocId,
        title: docTitle,
        updatedAt: Date.now(),
        snippet: (editorRef.current?.innerText.slice(0, 50) || "Empty doc") + "...",
      };
      const fullDoc: WriterDocument = {
        id: activeDocId,
        title: docTitle,
        content,
        updatedAt: Date.now(),
      };
      localStorage.setItem(`void_os_doc_${activeDocId}`, JSON.stringify(fullDoc));
      setDocList((prev) => {
        const newList = prev.filter((d) => d.id !== activeDocId);
        const updatedList = [meta, ...newList];
        localStorage.setItem("void_os_docs_index", JSON.stringify(updatedList));
        return updatedList;
      });
      setLastSaved(Date.now());
      setStatusMessage("Saved");
      setTimeout(() => setStatusMessage("Ready"), 2000);
    },
    [activeDocId, docTitle, docContent]
  );

  const loadDocument = useCallback((id: string) => {
    const saved = localStorage.getItem(`void_os_doc_${id}`);
    if (saved) {
      const doc = JSON.parse(saved) as WriterDocument;
      setActiveDocId(doc.id);
      setDocTitle(doc.title);
      setDocContent(doc.content);
      return doc;
    }
    return null;
  }, []);

  const createNewDocument = useCallback(() => {
    const newId = Date.now().toString();
    const newDoc: WriterDocument = {
      id: newId,
      title: "Untitled Draft",
      content: "<p>Start writing...</p>",
      updatedAt: Date.now(),
    };
    const meta: DocMetadata = {
      id: newId,
      title: "Untitled Draft",
      updatedAt: Date.now(),
      snippet: "Start writing...",
    };
    localStorage.setItem(`void_os_doc_${newId}`, JSON.stringify(newDoc));
    setDocList((prev) => {
      const updated = [meta, ...prev];
      localStorage.setItem("void_os_docs_index", JSON.stringify(updated));
      return updated;
    });
    setActiveDocId(newId);
    setDocTitle(newDoc.title);
    setDocContent(newDoc.content);
    return newDoc;
  }, []);

  const deleteDocument = useCallback(
    (id: string) => {
      if (docList.length <= 1) return false;
      const newList = docList.filter((d) => d.id !== id);
      setDocList(newList);
      localStorage.setItem("void_os_docs_index", JSON.stringify(newList));
      localStorage.removeItem(`void_os_doc_${id}`);
      if (activeDocId === id && newList.length > 0) {
        return newList[0].id; // return id to load
      }
      return true;
    },
    [docList, activeDocId]
  );

  const handleContentChange = useCallback(
    (editorRef: React.RefObject<HTMLDivElement | null>) => {
      if (editorRef.current) {
        const html = editorRef.current.innerHTML;
        setDocContent(html);
        setStatusMessage("Typing...");
        if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = setTimeout(() => {
          saveDocument(editorRef, html);
        }, 1000);
      }
    },
    [saveDocument]
  );

  const exportMarkdown = useCallback(
    (editorRef: React.RefObject<HTMLDivElement | null>) => {
      const text = editorRef.current?.innerText || "";
      const blob = new Blob([text], { type: "text/markdown" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${docTitle.replace(/\s+/g, "_")}.md`;
      a.click();
      URL.revokeObjectURL(url);
    },
    [docTitle]
  );

  return {
    docList,
    activeDocId,
    docTitle,
    setDocTitle,
    docContent,
    statusMessage,
    setStatusMessage,
    lastSaved,
    initDocuments,
    saveDocument,
    loadDocument,
    createNewDocument,
    deleteDocument,
    handleContentChange,
    exportMarkdown,
  };
}
