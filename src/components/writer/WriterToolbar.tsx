import React, { useState } from "react";
import {
  Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight,
  Heading1, Heading2, List, Type, ChevronDown, Undo, Redo, Layers,
  FolderOpen, Save, Download, Check, FileText,
} from "lucide-react";

interface FontOption {
  name: string;
  value: string;
  category: "sans" | "serif" | "mono";
}

const FONT_OPTIONS: FontOption[] = [
  { name: "Inter", value: "Inter, sans-serif", category: "sans" },
  { name: "DM Sans", value: "DM Sans, sans-serif", category: "sans" },
  { name: "Open Sans", value: "Open Sans, sans-serif", category: "sans" },
  { name: "Baskerville", value: "Libre Baskerville, Baskerville, serif", category: "serif" },
  { name: "Garamond", value: "EB Garamond, Garamond, serif", category: "serif" },
  { name: "Palatino", value: "Palatino Linotype, Book Antiqua, Palatino, serif", category: "serif" },
  { name: "Times New Roman", value: "Times New Roman, Times, serif", category: "serif" },
  { name: "Courier", value: "Courier New, Courier, monospace", category: "mono" },
];

interface WriterToolbarProps {
  docTitle: string;
  statusMessage: string;
  isMultiSelectMode: boolean;
  onTitleChange: (title: string) => void;
  onFormat: (command: string, value?: string) => void;
  onFontChange: (font: string) => void;
  onToggleMultiSelect: () => void;
  onOpenDocList: () => void;
  onSave: () => void;
  onExport: () => void;
  onContentChange: () => void;
}

export const WriterToolbar: React.FC<WriterToolbarProps> = ({
  docTitle, statusMessage, isMultiSelectMode,
  onTitleChange, onFormat, onFontChange, onToggleMultiSelect,
  onOpenDocList, onSave, onExport, onContentChange,
}) => {
  const [isFontMenuOpen, setIsFontMenuOpen] = useState(false);

  return (
    <div className="border-b border-slate-200 bg-white/80 backdrop-blur-sm px-4 py-2 flex items-center gap-2 flex-wrap">
      {/* Folder icon */}
      <button
        onClick={onOpenDocList}
        className="p-2 hover:bg-slate-200 rounded-lg transition-colors text-slate-500 hover:text-slate-900"
      >
        <FolderOpen size={20} />
      </button>

      {/* Title input */}
      <input
        value={docTitle}
        onChange={(e) => { onTitleChange(e.target.value); onContentChange(); }}
        className="text-lg font-bold bg-transparent border-none outline-none text-slate-900 w-64 focus:ring-0 p-0"
      />

      {/* Status */}
      <span className="text-xs text-slate-400 flex items-center gap-1">
        {statusMessage === "Saved" && <Check size={10} />} {statusMessage}
      </span>

      <div className="h-5 w-px bg-slate-200 mx-1" />

      {/* Undo/Redo */}
      <button
        onMouseDown={(e) => { e.preventDefault(); onFormat("undo"); }}
        className="p-2 hover:bg-slate-100 rounded-full text-slate-600 hover:text-black transition"
        title="Undo (Cmd+Z)"
      >
        <Undo size={14} />
      </button>
      <button
        onMouseDown={(e) => { e.preventDefault(); onFormat("redo"); }}
        className="p-2 hover:bg-slate-100 rounded-full text-slate-600 hover:text-black transition"
        title="Redo (Cmd+Y)"
      >
        <Redo size={14} />
      </button>

      <div className="h-5 w-px bg-slate-200 mx-1" />

      {/* Font selector */}
      <div className="relative">
        <button
          onMouseDown={(e) => { e.preventDefault(); setIsFontMenuOpen(!isFontMenuOpen); }}
          className="p-2 hover:bg-slate-100 rounded-full text-slate-600 hover:text-black transition flex items-center gap-1"
          title="Select Font"
        >
          <Type size={16} />
          <ChevronDown size={12} className="opacity-50" />
        </button>
        {isFontMenuOpen && (
          <div className="absolute top-full left-0 mt-1 w-56 bg-white border border-slate-200 shadow-lg rounded-xl overflow-hidden py-1 z-50">
            {FONT_OPTIONS.map((font) => (
              <button
                key={font.name}
                onMouseDown={(e) => { e.preventDefault(); onFontChange(font.value); setIsFontMenuOpen(false); }}
                className="w-full text-left px-4 py-2 text-sm hover:bg-slate-50 text-slate-700 flex justify-between items-center"
                style={{ fontFamily: font.value }}
              >
                {font.name}
                <span className="text-xs text-slate-400">{font.category}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="h-5 w-px bg-slate-200 mx-1" />

      {/* Formatting */}
      <button
        onMouseDown={(e) => { e.preventDefault(); onFormat("bold"); }}
        className="p-2 hover:bg-slate-100 rounded-full text-slate-600 hover:text-black transition"
        title="Bold (Cmd+B)"
      >
        <Bold size={16} />
      </button>
      <button
        onMouseDown={(e) => { e.preventDefault(); onFormat("italic"); }}
        className="p-2 hover:bg-slate-100 rounded-full text-slate-600 hover:text-black transition"
        title="Italic (Cmd+I)"
      >
        <Italic size={16} />
      </button>
      <button
        onMouseDown={(e) => { e.preventDefault(); onFormat("underline"); }}
        className="p-2 hover:bg-slate-100 rounded-full text-slate-600 hover:text-black transition"
        title="Underline (Cmd+U)"
      >
        <Underline size={16} />
      </button>

      <div className="h-5 w-px bg-slate-200 mx-1" />

      {/* Alignment */}
      <button
        onMouseDown={(e) => { e.preventDefault(); onFormat("justifyLeft"); }}
        className="p-2 hover:bg-slate-100 rounded-full text-slate-600 hover:text-black transition"
        title="Align Left"
      >
        <AlignLeft size={16} />
      </button>
      <button
        onMouseDown={(e) => { e.preventDefault(); onFormat("justifyCenter"); }}
        className="p-2 hover:bg-slate-100 rounded-full text-slate-600 hover:text-black transition"
        title="Align Center"
      >
        <AlignCenter size={16} />
      </button>
      <button
        onMouseDown={(e) => { e.preventDefault(); onFormat("justifyRight"); }}
        className="p-2 hover:bg-slate-100 rounded-full text-slate-600 hover:text-black transition"
        title="Align Right"
      >
        <AlignRight size={16} />
      </button>

      <div className="h-5 w-px bg-slate-200 mx-1" />

      {/* Headings & List */}
      <button
        onMouseDown={(e) => { e.preventDefault(); onFormat("formatBlock", "H1"); }}
        className="p-2 hover:bg-slate-100 rounded-full text-slate-600 hover:text-black transition"
        title="Heading 1"
      >
        <Heading1 size={16} />
      </button>
      <button
        onMouseDown={(e) => { e.preventDefault(); onFormat("formatBlock", "H2"); }}
        className="p-2 hover:bg-slate-100 rounded-full text-slate-600 hover:text-black transition"
        title="Heading 2"
      >
        <Heading2 size={16} />
      </button>
      <button
        onMouseDown={(e) => { e.preventDefault(); onFormat("insertUnorderedList"); }}
        className="p-2 hover:bg-slate-100 rounded-full text-slate-600 hover:text-black transition"
        title="Bullet List"
      >
        <List size={16} />
      </button>

      <div className="h-5 w-px bg-slate-200 mx-1" />

      {/* Multi-select */}
      <button
        onMouseDown={(e) => { e.preventDefault(); onToggleMultiSelect(); }}
        className={`p-2 rounded-full transition flex gap-1 items-center ${
          isMultiSelectMode ? "bg-blue-100 text-blue-600" : "hover:bg-slate-100 text-slate-600 hover:text-black"
        }`}
        title="Multi-Select Mode (Combine selections)"
      >
        <Layers size={16} />
        {isMultiSelectMode && <span className="text-xs">ON</span>}
      </button>

      {/* Right actions */}
      <div className="ml-auto flex items-center gap-1">
        <button
          onMouseDown={(e) => { e.preventDefault(); onSave(); }}
          className="p-2 hover:bg-slate-100 rounded-full text-slate-600 hover:text-black transition"
          title="Save"
        >
          <Save size={16} />
        </button>
        <button
          onMouseDown={(e) => { e.preventDefault(); onExport(); }}
          className="p-2 hover:bg-slate-100 rounded-full text-slate-600 hover:text-black transition"
          title="Export Markdown"
        >
          <Download size={16} />
        </button>
      </div>
    </div>
  );
};