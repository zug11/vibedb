import React from "react";
import { Plus, Trash2 } from "lucide-react";
import type { DocMetadata } from "@/hooks/use-writer-documents";

interface DocumentListProps {
  docList: DocMetadata[];
  activeDocId: string;
  onLoad: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}

export const DocumentList: React.FC<DocumentListProps> = ({
  docList, activeDocId, onLoad, onNew, onDelete, onClose,
}) => {
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-background/60 backdrop-blur-sm" />
      <div
        className="relative bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md max-h-[70vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-lg font-bold text-foreground">Documents</h2>
          <button
            onClick={onNew}
            className="flex items-center gap-1 text-sm text-primary hover:text-primary/80 transition"
          >
            <Plus size={16} /> New
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
          {docList.map((doc) => (
            <div
              key={doc.id}
              onClick={() => onLoad(doc.id)}
              className={`p-3 rounded-xl border cursor-pointer transition-all hover:shadow-md group relative ${
                activeDocId === doc.id
                  ? "bg-primary/5 border-primary/20 ring-1 ring-primary/10"
                  : "bg-card border-border hover:border-primary/10"
              }`}
            >
              <div className="font-semibold text-sm text-foreground">{doc.title}</div>
              <div className="text-xs text-muted-foreground mt-1">{doc.snippet}</div>
              <div className="text-xs text-muted-foreground/60 mt-1">
                {new Date(doc.updatedAt).toLocaleDateString()}
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); onDelete(doc.id); }}
                className="absolute top-2 right-2 p-1.5 text-muted-foreground/30 hover:text-destructive hover:bg-destructive/10 rounded-md opacity-0 group-hover:opacity-100 transition-all"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
