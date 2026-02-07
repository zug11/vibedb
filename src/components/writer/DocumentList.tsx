import React from "react";
import { Plus, Trash2, FileText } from "lucide-react";
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
      <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" />
      <div
        className="relative bg-white border border-slate-200 rounded-2xl shadow-2xl w-full max-w-md max-h-[70vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="text-lg font-bold text-slate-900">Documents</h2>
          <button
            onClick={onNew}
            className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-500 transition"
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
                  ? "bg-slate-50 border-blue-200 ring-1 ring-blue-100"
                  : "bg-white border-slate-100 hover:border-slate-200"
              }`}
            >
              <div className="font-semibold text-sm text-slate-900">{doc.title}</div>
              <div className="text-xs text-slate-400 mt-1 truncate">{doc.snippet}</div>
              <div className="text-[10px] text-slate-300 mt-2">{new Date(doc.updatedAt).toLocaleDateString()}</div>
              <button
                onClick={(e) => { e.stopPropagation(); onDelete(doc.id); }}
                className="absolute top-2 right-2 p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-md opacity-0 group-hover:opacity-100 transition-all"
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