import React, { useState } from "react";
import {
  Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight,
  Heading1, Heading2, List, Type, ChevronDown, Undo, Redo, Layers,
  FolderOpen, Save, Download, Check,
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

  const ToolbarButton: React.FC<{
    onClick: (e: React.MouseEvent) => void;
    title: string;
    active?: boolean;
    children: React.ReactNode;
  }> = ({ onClick, title, active, children }) => (
    <button
      onMouseDown={(e) => { e.preventDefault(); onClick(e); }}
      className={`p-2 rounded-full transition ${
        active
          ? "bg-primary/10 text-primary"
          : "hover:bg-secondary text-muted-foreground hover:text-foreground"
      }`}
      title={title}
    >
      {children}
    </button>
  );

  return (
    <div className="border-b border-border bg-card/80 backdrop-blur-sm px-4 py-2 flex items-center gap-2 flex-wrap">
      {/* Left section */}
      <button onClick={onOpenDocList} className="p-2 hover:bg-secondary rounded-lg transition text-muted-foreground hover:text-foreground">
        <FolderOpen size={20} />
      </button>

      <input
        value={docTitle}
        onChange={(e) => { onTitleChange(e.target.value); onContentChange(); }}
        className="text-lg font-bold bg-transparent border-none outline-none text-foreground w-48 md:w-64 focus:ring-0 p-0"
      />

      <span className="text-xs text-muted-foreground flex items-center gap-1">
        {statusMessage === "Saved" && <Check size={10} />} {statusMessage}
      </span>

      <div className="h-5 w-px bg-border mx-1" />

      {/* Undo/Redo */}
      <ToolbarButton onClick={() => onFormat("undo")} title="Undo (Ctrl+Z)"><Undo size={14} /></ToolbarButton>
      <ToolbarButton onClick={() => onFormat("redo")} title="Redo (Ctrl+Y)"><Redo size={14} /></ToolbarButton>

      <div className="h-5 w-px bg-border mx-1" />

      {/* Font selector */}
      <div className="relative">
        <ToolbarButton onClick={() => setIsFontMenuOpen(!isFontMenuOpen)} title="Select Font">
          <span className="flex items-center gap-1"><Type size={16} /><ChevronDown size={12} className="opacity-50" /></span>
        </ToolbarButton>
        {isFontMenuOpen && (
          <div className="absolute top-full left-0 mt-1 w-56 bg-card border border-border shadow-lg rounded-xl overflow-hidden py-1 z-50">
            {FONT_OPTIONS.map((font) => (
              <button
                key={font.name}
                onMouseDown={(e) => { e.preventDefault(); onFontChange(font.value); setIsFontMenuOpen(false); }}
                className="w-full text-left px-4 py-2 text-sm hover:bg-secondary text-foreground flex justify-between items-center"
                style={{ fontFamily: font.value }}
              >
                {font.name}
                <span className="text-xs text-muted-foreground">{font.category}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="h-5 w-px bg-border mx-1" />

      {/* Formatting */}
      <ToolbarButton onClick={() => onFormat("bold")} title="Bold (Ctrl+B)"><Bold size={16} /></ToolbarButton>
      <ToolbarButton onClick={() => onFormat("italic")} title="Italic (Ctrl+I)"><Italic size={16} /></ToolbarButton>
      <ToolbarButton onClick={() => onFormat("underline")} title="Underline (Ctrl+U)"><Underline size={16} /></ToolbarButton>

      <div className="h-5 w-px bg-border mx-1" />

      {/* Alignment */}
      <ToolbarButton onClick={() => onFormat("justifyLeft")} title="Align Left"><AlignLeft size={16} /></ToolbarButton>
      <ToolbarButton onClick={() => onFormat("justifyCenter")} title="Align Center"><AlignCenter size={16} /></ToolbarButton>
      <ToolbarButton onClick={() => onFormat("justifyRight")} title="Align Right"><AlignRight size={16} /></ToolbarButton>

      <div className="h-5 w-px bg-border mx-1" />

      {/* Headings & List */}
      <ToolbarButton onClick={() => onFormat("formatBlock", "H1")} title="Heading 1"><Heading1 size={16} /></ToolbarButton>
      <ToolbarButton onClick={() => onFormat("formatBlock", "H2")} title="Heading 2"><Heading2 size={16} /></ToolbarButton>
      <ToolbarButton onClick={() => onFormat("insertUnorderedList")} title="Bullet List"><List size={16} /></ToolbarButton>

      <div className="h-5 w-px bg-border mx-1" />

      {/* Multi-select */}
      <ToolbarButton onClick={onToggleMultiSelect} title="Multi-Select Mode" active={isMultiSelectMode}>
        <span className="flex items-center gap-1">
          <Layers size={16} />
          {isMultiSelectMode && <span className="text-xs">ON</span>}
        </span>
      </ToolbarButton>

      {/* Right actions */}
      <div className="ml-auto flex items-center gap-1">
        <ToolbarButton onClick={onSave} title="Save"><Save size={16} /></ToolbarButton>
        <ToolbarButton onClick={onExport} title="Export Markdown"><Download size={16} /></ToolbarButton>
      </div>
    </div>
  );
};
