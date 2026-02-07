import React, { useState, useCallback, useRef, useEffect, useMemo } from "react";
import {
  Database, Plus, Search, Sparkles, Trash2, X, Loader2, Copy, Check,
  Zap, Download, Lightbulb, RefreshCw, Undo2, Redo2, Eye,
  Wand2, Terminal, ArrowLeft, LayoutTemplate, ArrowUpDown,
  Table as TableIcon, Code, Upload, ShieldCheck, Edit3, ChevronDown,
  Settings, GitCompare, Key, Hash, LinkIcon, GripVertical, DatabaseZap,
  Box, Columns, Webhook, FileText
} from "lucide-react";
import { Link } from "react-router-dom";
import { v4 as uuidv4 } from "uuid";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import VibeDBSidebar from "@/components/vibedb/VibeDBSidebar";
import {
  generateSQL, generatePrismaSchema, generateDrizzleSchema,
  generateGraphQLTypes, generateCSV,
} from "@/components/vibedb/ExportGenerators";

// ─── Types ──────────────────────────────────────────────
interface Column {
  id: string;
  name: string;
  type: string;
  isForeignKey?: boolean;
  linkedTable?: string;
  linkedTableId?: string;
  linkedColumn?: string;
  fkStatus?: string;
  constraints?: { type: string; value?: string }[];
  description?: string;
}

interface TableNode {
  id: string;
  name: string;
  columns: Column[];
  x: number;
  y: number;
  indexes?: { name: string; columns: string[]; type: string; unique: boolean }[];
  description?: string;
  isReordering?: boolean;
}

interface Toast {
  id: number; message: string; type: "info" | "success" | "error" | "warning";
}

interface AuditReport {
  score?: number;
  issues?: { severity: string; message: string }[];
  suggestions?: { type: string; target_table?: string; payload?: any; reason: string; description?: string }[];
  lintIssues?: { type: string; severity: string; message: string }[];
  fkIssues?: { type: string; severity: string; message: string }[];
  strengths?: string[];
  missing_elements?: string[];
  risks?: string[];
  confidence_score?: number;
}

// ─── Constants ──────────────────────────────────────────
const COLUMN_TYPES = ["uuid", "varchar", "int", "timestamp", "boolean", "numeric", "text", "jsonb", "decimal", "float"];
const TABLE_WIDTH = 260;
const HEADER_HEIGHT = 40;
const ROW_HEIGHT = 32;

// ─── Naming Convention Linter ───────────────────────────
const NAMING_PATTERNS: Record<string, RegExp> = {
  snake_case: /^[a-z][a-z0-9_]*$/,
  camelCase: /^[a-z][a-zA-Z0-9]*$/,
  PascalCase: /^[A-Z][a-zA-Z0-9]*$/,
};

function lintSchema(tables: TableNode[], convention = "snake_case") {
  const issues: { type: string; severity: string; message: string }[] = [];
  const regex = NAMING_PATTERNS[convention];
  if (!regex) return issues;
  tables.forEach(table => {
    if (!regex.test(table.name))
      issues.push({ type: "naming", severity: "warning", message: `Table "${table.name}" should be ${convention}` });
    table.columns.forEach(col => {
      if (!regex.test(col.name))
        issues.push({ type: "naming", severity: "warning", message: `Column "${col.name}" in ${table.name} should be ${convention}` });
    });
  });
  return issues;
}

// ─── SQL DDL Parser ─────────────────────────────────────
function parseSQLDDL(sql: string): { tables: Omit<TableNode, "x" | "y">[] } {
  const tables: Omit<TableNode, "x" | "y">[] = [];
  const statements = sql.split(/(?=CREATE\s+TABLE)/i).filter(s => s.trim().length > 0);
  statements.forEach(statement => {
    const nameMatch = statement.match(/CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:["'`]?\w+["'`]?\.)?["'`]?(\w+)["'`]?/i);
    if (!nameMatch) return;
    const tableName = nameMatch[1];
    const firstParen = statement.indexOf("(");
    const lastParen = statement.lastIndexOf(")");
    if (firstParen === -1 || lastParen === -1) return;
    const body = statement.substring(firstParen + 1, lastParen);
    const cleanBody = body.replace(/\(([^)]+)\)/g, (match) => match.replace(/,/g, "|"));
    const colLines = cleanBody.split(",").map(s => s.trim()).filter(Boolean);
    const columns: Column[] = [];
    colLines.forEach(line => {
      const def = line.replace(/\|/g, ",");
      if (def.match(/^(CONSTRAINT|PRIMARY|FOREIGN|UNIQUE|INDEX|CHECK)/i)) return;
      const colMatch = def.match(/^\s*["'`]?(\w+)["'`]?\s+(["'`]?\w+["'`]?(?:\([\d\s,]+\))?)/i);
      if (!colMatch) return;
      const colName = colMatch[1];
      const rawType = colMatch[2].replace(/[[\]]/g, "").toLowerCase();
      const isPK = /PRIMARY\s+KEY/i.test(def);
      const isFK = /REFERENCES/i.test(def);
      const isNotNull = /NOT\s+NULL/i.test(def);
      const defaultMatch = def.match(/DEFAULT\s+([^,\s]+)/i);
      let normalizedType = "varchar";
      if (rawType.includes("int")) normalizedType = "int";
      else if (rawType.includes("uuid")) normalizedType = "uuid";
      else if (rawType.includes("time") || rawType.includes("date")) normalizedType = "timestamp";
      else if (rawType.includes("bool")) normalizedType = "boolean";
      else if (rawType.includes("decimal") || rawType.includes("numeric")) normalizedType = "numeric";
      else if (rawType.includes("float") || rawType.includes("real")) normalizedType = "float";
      else if (rawType.includes("json")) normalizedType = "jsonb";
      else if (rawType.includes("text")) normalizedType = "text";
      const constraints: { type: string; value?: string }[] = [];
      if (isPK) constraints.push({ type: "primary" });
      if (isNotNull && !isPK) constraints.push({ type: "notNull" });
      if (defaultMatch) constraints.push({ type: "default", value: defaultMatch[1] });
      let linkedTable: string | undefined;
      let linkedColumn: string | undefined;
      if (isFK) {
        const fkMatch = def.match(/REFERENCES\s+["'`]?(\w+)["'`]?(?:\s*\(["'`]?(\w+)["'`]?\))?/i);
        if (fkMatch) { linkedTable = fkMatch[1]; linkedColumn = fkMatch[2] || "id"; }
      }
      columns.push({ id: uuidv4(), name: colName, type: normalizedType, isForeignKey: isFK, linkedTable, linkedColumn, constraints, fkStatus: isFK ? "unresolved" : "resolved" });
    });
    if (columns.length > 0) tables.push({ id: uuidv4(), name: tableName, columns });
  });
  return { tables };
}

// ─── AI Helper ──────────────────────────────────────────
async function callAI(type: string, prompt: string, context?: string) {
  const { data, error } = await supabase.functions.invoke("vibedb-ai", {
    body: { type, prompt, context },
  });
  if (error) throw new Error(error.message || "AI request failed");
  if (data?.error) throw new Error(data.error);
  let result = data?.result || "";
  result = result.replace(/```json\n?/g, "").replace(/```sql\n?/g, "").replace(/```\n?/g, "").trim();
  return result;
}

// ─── Force Layout ───────────────────────────────────────
function runForceLayout(nodes: TableNode[]): TableNode[] {
  const newNodes: TableNode[] = JSON.parse(JSON.stringify(nodes));
  const iterations = 150;
  const repulsion = 2500;
  const springLength = 140;
  for (let i = 0; i < iterations; i++) {
    newNodes.forEach(nodeA => {
      let fx = 0, fy = 0;
      newNodes.forEach(nodeB => {
        if (nodeA.id === nodeB.id) return;
        const dx = nodeA.x - nodeB.x;
        const dy = nodeA.y - nodeB.y;
        const distSq = dx * dx + dy * dy || 1;
        const force = repulsion / Math.sqrt(distSq);
        fx += (dx / Math.sqrt(distSq)) * force;
        fy += (dy / Math.sqrt(distSq)) * force;
      });
      nodeA.columns.forEach(col => {
        if (col.isForeignKey && col.linkedTableId) {
          const target = newNodes.find(n => n.id === col.linkedTableId);
          if (target) {
            const dx = target.x - nodeA.x;
            const dy = target.y - nodeA.y;
            const dist = Math.sqrt(dx * dx + dy * dy) || 1;
            const force = (dist - springLength) * 0.05;
            fx += (dx / dist) * force;
            fy += (dy / dist) * force;
          }
        }
      });
      fx += (0 - nodeA.x) * 0.02;
      fy += (0 - nodeA.y) * 0.02;
      nodeA.x += Math.max(Math.min(fx, 20), -20);
      nodeA.y += Math.max(Math.min(fy, 20), -20);
    });
  }
  return newNodes;
}

// ─── Hook: History ──────────────────────────────────────
function useHistory<T>(initial: T): [T, (action: T | ((prev: T) => T)) => void, () => void, () => void, boolean, boolean] {
  const [history, setHistory] = useState([initial]);
  const [idx, setIdx] = useState(0);
  const state = history[idx];
  const setState = useCallback((action: T | ((prev: T) => T)) => {
    setHistory(prev => {
      const slice = prev.slice(0, idx + 1);
      const current = slice[slice.length - 1];
      const next = typeof action === "function" ? (action as (prev: T) => T)(current) : action;
      const cloned = JSON.parse(JSON.stringify(next));
      const newH = [...slice, cloned];
      setIdx(newH.length - 1);
      return newH;
    });
  }, [idx]);
  const undo = useCallback(() => setIdx(p => Math.max(0, p - 1)), []);
  const redo = useCallback(() => setIdx(p => Math.min(history.length - 1, p + 1)), [history.length]);
  return [state, setState, undo, redo, idx > 0, idx < history.length - 1];
}

// ─── Main Component ─────────────────────────────────────
const VibeDBPage = () => {
  const [prompt, setPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [sidebarItems, setSidebarItems] = useState<Omit<TableNode, "x" | "y">[]>([]);
  const [canvasItems, setCanvasItems, undo, redo, canUndo, canRedo] = useHistory<TableNode[]>([]);
  const [hoveredTableId, setHoveredTableId] = useState<string | null>(null);
  const [view, setView] = useState({ x: 0, y: 0, zoom: 1 });
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [draggingTable, setDraggingTable] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  // Feature states
  const [expertMode, setExpertMode] = useState(false);
  const [editingTable, setEditingTable] = useState<string | null>(null);
  const [editingColumn, setEditingColumn] = useState<{ tableId: string; columnId: string } | null>(null);
  const [generatingTableId, setGeneratingTableId] = useState<string | null>(null);

  // Modals
  const [showSqlModal, setShowSqlModal] = useState(false);
  const [generatedSql, setGeneratedSql] = useState("");
  const [copied, setCopied] = useState(false);
  const [showPlayground, setShowPlayground] = useState(false);
  const [queryPrompt, setQueryPrompt] = useState("");
  const [generatedQuery, setGeneratedQuery] = useState("");
  const [isQuerying, setIsQuerying] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importText, setImportText] = useState("");
  const [showAuditModal, setShowAuditModal] = useState(false);
  const [isAuditing, setIsAuditing] = useState(false);
  const [auditReport, setAuditReport] = useState<AuditReport | null>(null);
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [batchPrompt, setBatchPrompt] = useState("");
  const [isBatchProcessing, setIsBatchProcessing] = useState(false);
  const [batchError, setBatchError] = useState<string | null>(null);
  const [showAddTableMenu, setShowAddTableMenu] = useState(false);
  const [aiTablePrompt, setAiTablePrompt] = useState("");
  const [isAddingAiTable, setIsAddingAiTable] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showMockDataModal, setShowMockDataModal] = useState(false);
  const [mockDataSql, setMockDataSql] = useState("");
  const [isGeneratingMockData, setIsGeneratingMockData] = useState(false);
  const [isGeneratingSidebar, setIsGeneratingSidebar] = useState(false);

  // Schema Diff
  const [diffBase, setDiffBase] = useState<TableNode[] | null>(null);
  const [showDiff, setShowDiff] = useState(false);

  // Connection mode
  const [connectionMode, setConnectionMode] = useState<{ sourceTableId: string; sourceColumnId: string } | null>(null);

  const canvasRef = useRef<HTMLDivElement>(null);

  const addToast = useCallback((message: string, type: Toast["type"] = "info") => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  }, []);

  useEffect(() => setGeneratedSql(""), [canvasItems]);

  // Keyboard shortcuts
  useEffect(() => {
    const handle = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setShowSqlModal(false); setShowPlayground(false); setEditingTable(null);
        setShowImportModal(false); setShowAuditModal(false); setShowBatchModal(false);
        setShowAddTableMenu(false); setShowExportMenu(false); setShowMockDataModal(false);
        setConnectionMode(null); setEditingColumn(null); setShowDiff(false);
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "z") { e.preventDefault(); undo(); }
      if ((e.metaKey || e.ctrlKey) && e.key === "y") { e.preventDefault(); redo(); }
    };
    window.addEventListener("keydown", handle);
    return () => window.removeEventListener("keydown", handle);
  }, [undo, redo]);

  // ─── AI Generate Schema ───────────────────────────────
  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setIsGenerating(true);
    setSidebarItems([]);
    setAuditReport(null);
    try {
      const resultStr = await callAI("generate-schema", prompt);
      const result = JSON.parse(resultStr);
      if (result?.tables) {
        const tables = result.tables.map((t: any) => ({
          ...t,
          id: t.id || uuidv4(),
          columns: (t.columns || []).map((c: any) => ({
            ...c, id: c.id || uuidv4(), fkStatus: c.isForeignKey ? "resolved" : "resolved", constraints: c.constraints || [],
          })),
        }));
        setSidebarItems(tables);
        addToast(`Generated ${tables.length} tables — drag to canvas`, "success");
      }
    } catch (err: any) {
      addToast(err.message || "Failed to generate schema", "error");
    } finally {
      setIsGenerating(false);
    }
  };

  // ─── Sidebar: Generate More Tables ────────────────────
  const handleGenerateSidebarTables = async (sidebarPrompt: string) => {
    setIsGeneratingSidebar(true);
    try {
      const existingTables = [...canvasItems, ...sidebarItems.map(t => ({ ...t, x: 0, y: 0 }))].map(t => t.name).join(", ");
      const resultStr = await callAI(
        "generate-schema",
        `Existing tables: [${existingTables}]. Generate 1-3 new tables for: "${sidebarPrompt}". Return JSON with "tables" key.`
      );
      const result = JSON.parse(resultStr);
      if (result?.tables) {
        const tables = result.tables.map((t: any) => ({
          ...t,
          id: t.id || uuidv4(),
          columns: (t.columns || []).map((c: any) => ({
            ...c, id: c.id || uuidv4(), fkStatus: "resolved", constraints: c.constraints || [],
          })),
        }));
        setSidebarItems(prev => [...prev, ...tables]);
        addToast(`Generated ${tables.length} new tables`, "success");
      }
    } catch {
      addToast("Failed to generate tables", "error");
    } finally {
      setIsGeneratingSidebar(false);
    }
  };

  // ─── Add item from sidebar to canvas ──────────────────
  const addItemToCanvas = useCallback((tableId: string, clientX?: number, clientY?: number) => {
    const itemIndex = sidebarItems.findIndex(i => i.id === tableId);
    if (itemIndex === -1) return;
    const item = sidebarItems[itemIndex];
    setCanvasItems(currentItems => {
      let startX: number, startY: number;
      if (clientX !== undefined && clientY !== undefined && canvasRef.current) {
        const rect = canvasRef.current.getBoundingClientRect();
        startX = (clientX - rect.left - view.x) / view.zoom - TABLE_WIDTH / 2;
        startY = (clientY - rect.top - view.y) / view.zoom - HEADER_HEIGHT / 2;
      } else {
        const offset = currentItems.length * 40;
        startX = (-view.x / view.zoom) + 100 + (offset % 400);
        startY = (-view.y / view.zoom) + 100 + (offset % 300);
      }
      return [...currentItems, { ...item, x: startX, y: startY } as TableNode];
    });
    setSidebarItems(prev => prev.filter((_, i) => i !== itemIndex));
  }, [sidebarItems, setCanvasItems, view]);

  // ─── Smart Add Column ─────────────────────────────────
  const handleSmartAddColumn = async (tableId: string) => {
    const table = canvasItems.find(t => t.id === tableId);
    if (!table) return;
    setGeneratingTableId(tableId);
    try {
      const existingCols = table.columns.map(c => c.name).join(", ");
      const resultStr = await callAI("smart-add-column", `Table "${table.name}" with columns: [${existingCols}]. Suggest ONE missing column.`);
      const result = JSON.parse(resultStr);
      if (result?.name) {
        setCanvasItems(items => items.map(t =>
          t.id === tableId
            ? { ...t, columns: [...t.columns, { id: uuidv4(), name: result.name, type: result.type || "varchar", fkStatus: "resolved", constraints: [], description: result.description }] }
            : t
        ));
        addToast(`✨ Added: ${result.name}`, "success");
      }
    } catch { addToast("Failed to suggest column", "error"); }
    finally { setGeneratingTableId(null); }
  };

  // ─── Compile SQL ──────────────────────────────────────
  const handleCompileSQL = () => {
    if (canvasItems.length === 0) { addToast("Add tables first", "error"); return; }
    setGeneratedSql(generateSQL(canvasItems));
    setShowSqlModal(true);
  };

  // ─── Export ───────────────────────────────────────────
  const handleExport = (format: string) => {
    try {
      let content = "";
      let filename = "";
      switch (format) {
        case "prisma": content = generatePrismaSchema(canvasItems); filename = "schema.prisma"; break;
        case "drizzle": content = generateDrizzleSchema(canvasItems); filename = "schema.ts"; break;
        case "graphql": content = generateGraphQLTypes(canvasItems); filename = "schema.graphql"; break;
        case "csv": content = generateCSV(canvasItems); filename = "schema.csv"; break;
        case "sql": default: content = generateSQL(canvasItems); filename = "schema.sql"; break;
      }
      const blob = new Blob([content], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = filename; a.click();
      URL.revokeObjectURL(url);
      setShowExportMenu(false);
      addToast(`Exported ${format}`, "success");
    } catch (e: any) {
      addToast("Export failed: " + e.message, "error");
    }
  };

  // ─── Auto Layout ──────────────────────────────────────
  const handleAutoLayout = () => {
    if (canvasItems.length === 0) return;
    addToast("Optimizing layout...", "info");
    setTimeout(() => setCanvasItems(runForceLayout(canvasItems)), 50);
  };

  // ─── Smart Inference ──────────────────────────────────
  const handleSmartInference = () => {
    let count = 0;
    const tableMap = new Map<string, string>();
    canvasItems.forEach(t => { tableMap.set(t.name.toLowerCase(), t.id); tableMap.set(t.name.toLowerCase() + "s", t.id); });
    const updated = canvasItems.map(t => ({
      ...t,
      columns: t.columns.map(col => {
        if (!col.isForeignKey && col.name.endsWith("_id")) {
          const target = col.name.replace("_id", "").toLowerCase();
          if (tableMap.has(target)) {
            const targetId = tableMap.get(target)!;
            if (targetId !== t.id) {
              count++;
              return { ...col, isForeignKey: true, linkedTableId: targetId, linkedTable: canvasItems.find(ct => ct.id === targetId)?.name, linkedColumn: "id", fkStatus: "resolved" };
            }
          }
        }
        return col;
      }),
    }));
    setCanvasItems(updated);
    addToast(`Inferred ${count} relationships`, "success");
  };

  // ─── SQL Import ───────────────────────────────────────
  const handleImport = () => {
    try {
      const result = parseSQLDDL(importText);
      if (result.tables.length === 0) { addToast("No tables found in SQL", "error"); return; }
      const processed = result.tables.map((t, i) => ({
        ...t, x: (-view.x / view.zoom) + 100 + (i % 3) * 300, y: (-view.y / view.zoom) + 100 + Math.floor(i / 3) * 300,
      })) as TableNode[];
      const allTables = [...canvasItems, ...processed];
      const tableMap = new Map<string, string>();
      allTables.forEach(t => tableMap.set(t.name.toLowerCase(), t.id));
      const resolved = processed.map(t => ({
        ...t,
        columns: t.columns.map(col => {
          if (col.isForeignKey && col.linkedTable) {
            const targetId = tableMap.get(col.linkedTable.toLowerCase());
            return { ...col, linkedTableId: targetId, fkStatus: targetId ? "resolved" : "unresolved" };
          }
          return col;
        }),
      }));
      setCanvasItems(prev => [...prev, ...resolved]);
      setShowImportModal(false); setImportText("");
      addToast(`Imported ${result.tables.length} tables`, "success");
    } catch (err: any) { addToast("Import failed: " + err.message, "error"); }
  };

  // ─── Schema Audit ─────────────────────────────────────
  const handleAudit = async () => {
    if (canvasItems.length === 0) { addToast("Add tables first", "error"); return; }
    setShowAuditModal(true); setIsAuditing(true); setAuditReport(null);
    try {
      const lintIssues = lintSchema(canvasItems);
      const fkIssues: { type: string; severity: string; message: string }[] = [];
      canvasItems.forEach(table => {
        table.columns.forEach(col => {
          if (col.isForeignKey && col.fkStatus !== "resolved")
            fkIssues.push({ type: "fk", severity: "error", message: `Unresolved FK: ${table.name}.${col.name} → ${col.linkedTable}` });
        });
      });
      const schema = {
        user_goal: prompt,
        active_tables: canvasItems.map(t => ({ name: t.name, columns: t.columns.map(c => ({ name: c.name, type: c.type, isForeignKey: c.isForeignKey, linkedTable: c.linkedTable, constraints: c.constraints })) })),
        lint_issues: lintIssues, fk_issues: fkIssues,
      };
      const resultStr = await callAI("inspect-schema", JSON.stringify(schema), JSON.stringify(schema));
      const result = JSON.parse(resultStr);
      setAuditReport({ ...result, lintIssues, fkIssues });
    } catch { addToast("Audit failed", "error"); setAuditReport({ lintIssues: [], fkIssues: [], issues: [{ severity: "error", message: "Failed to run AI audit" }] }); }
    finally { setIsAuditing(false); }
  };

  const handleApplySuggestion = (suggestion: any) => {
    try {
      if (suggestion.type === "add_column" && suggestion.target_table && suggestion.payload) {
        setCanvasItems(prev => prev.map(t => {
          if (t.name.toLowerCase() === suggestion.target_table?.toLowerCase()) {
            return { ...t, columns: [...t.columns, { id: uuidv4(), name: String(suggestion.payload.name || "new_column"), type: String(suggestion.payload.type || "varchar"), fkStatus: "resolved", constraints: [], description: String(suggestion.payload.description || suggestion.reason || "") }] };
          }
          return t;
        }));
        addToast("Suggestion applied!", "success");
      } else if (suggestion.type === "add_table" && suggestion.payload) {
        const newTable: TableNode = {
          id: uuidv4(), name: suggestion.payload.name || "new_table",
          x: (-view.x / view.zoom) + 200, y: (-view.y / view.zoom) + 200,
          columns: (suggestion.payload.columns || []).map((c: any) => ({ ...c, id: uuidv4(), fkStatus: "resolved", constraints: c.constraints || [] })),
        };
        setCanvasItems(prev => [...prev, newTable]);
        addToast("Table added!", "success");
      } else if (suggestion.type === "add_index") {
        addToast("Index suggestion noted", "info");
      }
      setAuditReport(prev => prev ? { ...prev, suggestions: prev.suggestions?.filter(s => s !== suggestion) } : prev);
    } catch { addToast("Failed to apply suggestion", "error"); }
  };

  // ─── Batch Edit ───────────────────────────────────────
  const handleBatchCommand = async () => {
    if (!batchPrompt) return;
    setIsBatchProcessing(true); setBatchError(null);
    try {
      const schemaStr = JSON.stringify(canvasItems.map(t => ({
        id: t.id, name: t.name,
        columns: t.columns.map(c => ({ name: c.name, type: c.type, id: c.id, isForeignKey: c.isForeignKey, linkedTable: c.linkedTable, linkedColumn: c.linkedColumn })),
      })));
      const resultStr = await callAI("batch-command", batchPrompt, schemaStr);
      const result = JSON.parse(resultStr);
      if (result?.tables) {
        setCanvasItems(prev => {
          return result.tables.map((newT: any) => {
            const existing = prev.find(p => p.id === newT.id) || prev.find(p => p.name === newT.name);
            const x = existing ? existing.x : 50 + Math.random() * 200;
            const y = existing ? existing.y : 50 + Math.random() * 200;
            const columns = (newT.columns || []).map((c: any) => {
              const existingC = existing?.columns.find((ec: Column) => ec.id === c.id || ec.name === c.name);
              return { ...c, id: existingC?.id || c.id || uuidv4(), fkStatus: c.isForeignKey ? "resolved" : "resolved", constraints: c.constraints || [] };
            });
            return { ...newT, id: existing?.id || newT.id || uuidv4(), x, y, columns };
          });
        });
        addToast("Batch command executed", "success");
        setShowBatchModal(false); setBatchPrompt("");
      }
    } catch (e: any) {
      let msg = "Batch processing failed";
      if (e.message?.includes("JSON")) msg = "AI returned invalid data. Try a simpler command.";
      else if (e.message?.includes("API")) msg = "AI service unavailable. Try again.";
      else msg = e.message || msg;
      setBatchError(msg);
    } finally { setIsBatchProcessing(false); }
  };

  // ─── AI Add Table ─────────────────────────────────────
  const handleAiAddTable = async () => {
    if (!aiTablePrompt.trim()) return;
    setIsAddingAiTable(true);
    try {
      const existingTables = canvasItems.map(t => t.name).join(", ");
      const resultStr = await callAI("generate-schema", `Existing tables: [${existingTables}]. Generate 1 new table for: "${aiTablePrompt}". Return JSON with "tables" key containing exactly 1 table.`);
      const result = JSON.parse(resultStr);
      if (result?.tables?.[0]) {
        const t = result.tables[0];
        const newTable: TableNode = {
          ...t, id: uuidv4(), x: (-view.x / view.zoom) + 200, y: (-view.y / view.zoom) + 200,
          columns: (t.columns || []).map((c: any) => ({ ...c, id: uuidv4(), fkStatus: "resolved", constraints: c.constraints || [] })),
        };
        setCanvasItems(prev => [...prev, newTable]);
        addToast(`Generated table: ${newTable.name}`, "success");
        setAiTablePrompt(""); setShowAddTableMenu(false);
      }
    } catch { addToast("Failed to generate table", "error"); }
    finally { setIsAddingAiTable(false); }
  };

  // ─── Mock Data ────────────────────────────────────────
  const handleGenerateMockData = async () => {
    if (canvasItems.length === 0) { addToast("Add tables to canvas first", "error"); return; }
    setIsGeneratingMockData(true); setShowMockDataModal(true); setMockDataSql("");
    try {
      const schemaSummary = canvasItems.map(t => `${t.name} (${t.columns.map(c => c.name).join(",")})`).join("\n");
      const result = await callAI("generate-mock-data", "", schemaSummary);
      setMockDataSql(result);
    } catch { addToast("Failed to generate mock data", "error"); setMockDataSql("-- Error generating data --"); }
    finally { setIsGeneratingMockData(false); }
  };

  // ─── Schema Diff ──────────────────────────────────────
  const saveSnapshot = () => { setDiffBase(JSON.parse(JSON.stringify(canvasItems))); addToast("Snapshot saved for comparison", "success"); };
  const computeDiff = () => {
    if (!diffBase) return null;
    const changes: { type: string; target: string; details: string; breaking?: boolean }[] = [];
    canvasItems.forEach(table => {
      const old = diffBase.find(t => t.id === table.id);
      if (!old) { changes.push({ type: "added", target: table.name, details: "New table" }); }
      else {
        table.columns.forEach(col => {
          const oldCol = old.columns.find(c => c.id === col.id);
          if (!oldCol) changes.push({ type: "added", target: `${table.name}.${col.name}`, details: "New column" });
          else if (JSON.stringify(oldCol) !== JSON.stringify(col)) changes.push({ type: "modified", target: `${table.name}.${col.name}`, details: "Column modified" });
        });
        old.columns.forEach(col => {
          if (!table.columns.find(c => c.id === col.id)) changes.push({ type: "removed", target: `${table.name}.${col.name}`, details: "Column removed", breaking: true });
        });
      }
    });
    diffBase.forEach(old => { if (!canvasItems.find(t => t.id === old.id)) changes.push({ type: "removed", target: old.name, details: "Table removed", breaking: true }); });
    return changes;
  };

  // ─── Query Playground ─────────────────────────────────
  const handleGenerateQuery = async () => {
    if (!queryPrompt) return;
    setIsQuerying(true);
    const ctx = canvasItems.map(t => `${t.name}(${t.columns.map(c => `${c.name}:${c.type}`).join(", ")})`).join("\n");
    try { const result = await callAI("generate-query", queryPrompt, ctx); setGeneratedQuery(result); }
    catch { addToast("Failed to generate query", "error"); }
    finally { setIsQuerying(false); }
  };

  // ─── Connection mode ──────────────────────────────────
  const startConnection = (tableId: string, columnId: string) => {
    setConnectionMode({ sourceTableId: tableId, sourceColumnId: columnId });
    addToast("Select target column to link", "info");
  };

  const completeConnection = (targetTableId: string, targetColumnId: string) => {
    if (!connectionMode) return;
    if (connectionMode.sourceTableId === targetTableId) { addToast("Cannot link to same table", "error"); setConnectionMode(null); return; }
    const targetTable = canvasItems.find(t => t.id === targetTableId);
    const targetCol = targetTable?.columns.find(c => c.id === targetColumnId);
    setCanvasItems(items => items.map(t => {
      if (t.id !== connectionMode.sourceTableId) return t;
      return {
        ...t,
        columns: t.columns.map(c => {
          if (c.id !== connectionMode.sourceColumnId) return c;
          return { ...c, isForeignKey: true, linkedTableId: targetTableId, linkedTable: targetTable?.name, linkedColumn: targetCol?.name || "id", fkStatus: "resolved" };
        }),
      };
    }));
    setConnectionMode(null);
    addToast("Foreign key created", "success");
  };

  // ─── Table Operations ─────────────────────────────────
  const addManualTable = () => {
    const newTable: TableNode = {
      id: uuidv4(), name: `table_${canvasItems.length + 1}`,
      x: -view.x / view.zoom + 200, y: -view.y / view.zoom + 200,
      columns: [
        { id: uuidv4(), name: "id", type: "uuid", constraints: [{ type: "primary" }], fkStatus: "resolved" },
        { id: uuidv4(), name: "created_at", type: "timestamp", constraints: [{ type: "notNull" }], fkStatus: "resolved" },
      ],
    };
    setCanvasItems(prev => [...prev, newTable]);
    setShowAddTableMenu(false);
  };

  const deleteTable = (id: string) => {
    const item = canvasItems.find(t => t.id === id);
    if (item) {
      setCanvasItems(prev => prev.filter(t => t.id !== id));
      setSidebarItems(prev => [...prev, item]);
    }
  };
  const updateTableName = (id: string, name: string) => {
    setCanvasItems(prev => prev.map(t => t.id === id ? { ...t, name } : t));
    // Update FK references
    setCanvasItems(prev => prev.map(t => ({
      ...t,
      columns: t.columns.map(c => c.linkedTableId === id ? { ...c, linkedTable: name } : c),
    })));
  };
  const addColumn = (tableId: string) => setCanvasItems(prev => prev.map(t =>
    t.id === tableId ? { ...t, columns: [...t.columns, { id: uuidv4(), name: "new_col", type: "varchar", fkStatus: "resolved", constraints: [] }] } : t
  ));
  const updateColumn = (tableId: string, columnId: string, updates: Partial<Column>) => setCanvasItems(prev => prev.map(t =>
    t.id === tableId ? { ...t, columns: t.columns.map(c => c.id === columnId ? { ...c, ...updates } : c) } : t
  ));
  const deleteColumn = (tableId: string, colId: string) => setCanvasItems(prev => prev.map(t =>
    t.id === tableId ? { ...t, columns: t.columns.filter(c => c.id !== colId) } : t
  ));

  const handleCopy = async (text: string) => {
    try { await navigator.clipboard.writeText(text); setCopied(true); addToast("Copied!", "success"); setTimeout(() => setCopied(false), 2000); }
    catch { addToast("Failed to copy", "error"); }
  };

  // ─── Canvas interaction ───────────────────────────────
  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest("[data-table]")) return;
    const startX = e.clientX;
    const startY = e.clientY;
    const startView = { ...view };
    const handleMove = (ev: MouseEvent) => {
      setView({ x: startView.x + (ev.clientX - startX), y: startView.y + (ev.clientY - startY), zoom: startView.zoom });
    };
    const handleUp = () => { window.removeEventListener("mousemove", handleMove); window.removeEventListener("mouseup", handleUp); };
    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", handleUp);
  };

  const handleTableMouseDown = (e: React.MouseEvent, tableId: string) => {
    e.stopPropagation();
    const table = canvasItems.find(t => t.id === tableId);
    if (!table) return;
    const canvasRect = canvasRef.current?.getBoundingClientRect();
    if (!canvasRect) return;
    const tableScreenX = table.x * view.zoom + view.x;
    const tableScreenY = table.y * view.zoom + view.y;
    setDraggingTable(tableId);
    setDragOffset({ x: e.clientX - canvasRect.left - tableScreenX, y: e.clientY - canvasRect.top - tableScreenY });
  };

  useEffect(() => {
    if (!draggingTable) return;
    const handleMove = (e: MouseEvent) => {
      const canvasRect = canvasRef.current?.getBoundingClientRect();
      if (!canvasRect) return;
      const newX = (e.clientX - canvasRect.left - dragOffset.x - view.x) / view.zoom;
      const newY = (e.clientY - canvasRect.top - dragOffset.y - view.y) / view.zoom;
      setCanvasItems(prev => prev.map(t => t.id === draggingTable ? { ...t, x: newX, y: newY } : t));
    };
    const handleUp = () => setDraggingTable(null);
    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", handleUp);
    return () => { window.removeEventListener("mousemove", handleMove); window.removeEventListener("mouseup", handleUp); };
  }, [draggingTable, dragOffset, view]);

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setView(v => ({ ...v, zoom: Math.max(0.3, Math.min(3, v.zoom * delta)) }));
  };

  const handleCanvasDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const tableId = e.dataTransfer.getData("tableId");
    if (tableId) addItemToCanvas(tableId, e.clientX, e.clientY);
  };

  // ─── Render FK lines ──────────────────────────────────
  const connectionPaths = useMemo(() => {
    return canvasItems.flatMap((sourceTable) =>
      sourceTable.columns.map((col, idx) => {
        if (!col.isForeignKey || !col.linkedTableId) return null;
        const targetTable = canvasItems.find(t => t.id === col.linkedTableId || t.name === col.linkedTable);
        if (!targetTable) return null;

        const isRelated = hoveredTableId && (sourceTable.id === hoveredTableId || targetTable.id === hoveredTableId);
        const isSelected = connectionMode?.sourceTableId === sourceTable.id && connectionMode?.sourceColumnId === col.id;
        let stroke = col.fkStatus === "resolved" ? "hsl(var(--accent))" : "hsl(var(--destructive))";
        let opacity = 0.5;
        let width = 2;
        if (hoveredTableId) {
          if (isRelated) { opacity = 1; width = 3; } else { opacity = 0.15; }
        }
        if (isSelected) { stroke = "hsl(45, 93%, 47%)"; opacity = 1; width = 3; }

        const sourceRowY = sourceTable.y + HEADER_HEIGHT + (idx * ROW_HEIGHT) + (ROW_HEIGHT / 2);
        let targetRowIndex = targetTable.columns.findIndex(c => c.name === col.linkedColumn);
        if (targetRowIndex === -1) targetRowIndex = 0;
        const targetRowY = targetTable.y + HEADER_HEIGHT + (targetRowIndex * ROW_HEIGHT) + (ROW_HEIGHT / 2);

        const sourceCenter = sourceTable.x + TABLE_WIDTH / 2;
        const targetCenter = targetTable.x + TABLE_WIDTH / 2;
        const curvature = 80;
        let startX: number, endX: number, cp1X: number, cp2X: number;
        if (targetCenter > sourceCenter) {
          startX = sourceTable.x + TABLE_WIDTH; endX = targetTable.x;
          cp1X = startX + curvature; cp2X = endX - curvature;
        } else {
          startX = sourceTable.x; endX = targetTable.x + TABLE_WIDTH;
          cp1X = startX - curvature; cp2X = endX + curvature;
        }
        const pathD = `M ${startX} ${sourceRowY} C ${cp1X} ${sourceRowY}, ${cp2X} ${targetRowY}, ${endX} ${targetRowY}`;

        return (
          <g key={`${sourceTable.id}-${col.name}-${idx}`}>
            <path d={pathD} fill="none" stroke={stroke} strokeWidth={width} opacity={opacity} />
            <circle cx={startX} cy={sourceRowY} r={width + 1} fill={stroke} fillOpacity={opacity} />
            <circle cx={endX} cy={targetRowY} r={width + 1} fill={stroke} fillOpacity={opacity} />
          </g>
        );
      })
    ).filter(Boolean);
  }, [canvasItems, hoveredTableId, connectionMode]);

  const relatedNodeIds = useMemo(() => {
    if (!hoveredTableId) return new Set<string>();
    const ids = new Set<string>();
    ids.add(hoveredTableId);
    canvasItems.forEach(table => {
      table.columns.forEach(col => {
        if (col.isForeignKey && col.linkedTableId) {
          if (table.id === hoveredTableId) ids.add(col.linkedTableId);
          if (col.linkedTableId === hoveredTableId) ids.add(table.id);
        }
      });
    });
    return ids;
  }, [hoveredTableId, canvasItems]);

  const getTableOpacity = (tableId: string) => {
    if (!hoveredTableId) return 1;
    return relatedNodeIds.has(tableId) ? 1 : 0.3;
  };

  return (
    <div className="flex h-screen flex-col bg-background">
      {/* Top Bar */}
      <div className="flex items-center gap-3 border-b border-border px-4 py-3">
        <Link to="/" className="flex h-9 w-9 items-center justify-center rounded-lg bg-secondary text-muted-foreground hover:bg-secondary/80 transition">
          <ArrowLeft size={18} />
        </Link>
        <div className="flex items-center gap-2">
          <Database size={20} className="text-accent" />
          <span className="text-lg font-bold">VibeDB</span>
        </div>
        <div className="ml-4 flex flex-1 items-center gap-2">
          <div className="relative flex-1 max-w-xl">
            <input
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleGenerate()}
              placeholder="Describe your database... e.g. 'E-commerce with users, products, orders'"
              className="w-full rounded-xl border border-border bg-card px-4 py-2.5 pr-10 text-sm outline-none transition focus:border-primary focus:ring-1 focus:ring-primary"
            />
            <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          </div>
          <button onClick={handleGenerate} disabled={isGenerating || !prompt.trim()} className="flex items-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-accent-foreground transition hover:opacity-90 disabled:opacity-50">
            {isGenerating ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
            Generate
          </button>
        </div>

        {/* Expert Toggle */}
        <button onClick={() => setExpertMode(!expertMode)} className={`flex items-center gap-2 px-3 py-2 rounded-lg font-medium text-sm transition-colors ${expertMode ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-secondary"}`}>
          <Settings size={16} />
          Expert
        </button>

        <div className="flex items-center gap-1">
          <button onClick={undo} disabled={!canUndo} className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary disabled:opacity-30" title="Undo"><Undo2 size={16} /></button>
          <button onClick={redo} disabled={!canRedo} className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary disabled:opacity-30" title="Redo"><Redo2 size={16} /></button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-2 border-b border-border px-4 py-2">
        <div className="relative">
          <div className="flex rounded-lg overflow-hidden border border-border">
            <button onClick={addManualTable} className="flex items-center gap-1.5 bg-secondary px-3 py-1.5 text-xs font-semibold text-secondary-foreground hover:bg-secondary/80 transition"><Plus size={14} /> Add Table</button>
            <button onClick={() => setShowAddTableMenu(!showAddTableMenu)} className="flex items-center justify-center bg-secondary px-1.5 py-1.5 text-secondary-foreground hover:bg-secondary/80 transition border-l border-border"><ChevronDown size={12} /></button>
          </div>
          {showAddTableMenu && (
            <div className="absolute top-full left-0 mt-1 w-72 bg-card border border-border shadow-xl rounded-xl p-3 z-50 space-y-2">
              <div className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5"><Sparkles size={12} /> AI Generate Table</div>
              <div className="flex gap-1.5">
                <input value={aiTablePrompt} onChange={e => setAiTablePrompt(e.target.value)} onKeyDown={e => e.key === "Enter" && handleAiAddTable()} placeholder="e.g. 'user notifications'" className="flex-1 rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs outline-none focus:border-primary" />
                <button onClick={handleAiAddTable} disabled={isAddingAiTable || !aiTablePrompt.trim()} className="flex items-center gap-1 rounded-lg bg-accent px-2.5 py-1.5 text-xs font-semibold text-accent-foreground disabled:opacity-50">
                  {isAddingAiTable ? <Loader2 size={12} className="animate-spin" /> : <Wand2 size={12} />}
                </button>
              </div>
            </div>
          )}
        </div>

        <button onClick={handleAutoLayout} className="flex items-center gap-1.5 rounded-lg bg-secondary px-3 py-1.5 text-xs font-semibold text-secondary-foreground hover:bg-secondary/80 transition"><LayoutTemplate size={14} /> Auto Layout</button>
        <button onClick={handleSmartInference} className="flex items-center gap-1.5 rounded-lg bg-secondary px-3 py-1.5 text-xs font-semibold text-secondary-foreground hover:bg-secondary/80 transition"><Wand2 size={14} /> Magic Link</button>
        <button onClick={() => setShowImportModal(true)} className="flex items-center gap-1.5 rounded-lg bg-secondary px-3 py-1.5 text-xs font-semibold text-secondary-foreground hover:bg-secondary/80 transition"><Upload size={14} /> Import</button>
        <button onClick={() => setShowBatchModal(true)} className="flex items-center gap-1.5 rounded-lg bg-secondary px-3 py-1.5 text-xs font-semibold text-secondary-foreground hover:bg-secondary/80 transition"><Edit3 size={14} /> Batch Edit</button>
        <button onClick={handleAudit} className="flex items-center gap-1.5 rounded-lg bg-secondary px-3 py-1.5 text-xs font-semibold text-secondary-foreground hover:bg-secondary/80 transition">
          {isAuditing ? <Loader2 size={14} className="animate-spin" /> : <ShieldCheck size={14} />} Audit
        </button>
        <button onClick={handleGenerateMockData} className="flex items-center gap-1.5 rounded-lg bg-secondary px-3 py-1.5 text-xs font-semibold text-secondary-foreground hover:bg-secondary/80 transition"><DatabaseZap size={14} /> Seed Data</button>

        {/* Diff */}
        <button onClick={saveSnapshot} className="flex items-center gap-1.5 rounded-lg bg-secondary px-3 py-1.5 text-xs font-semibold text-secondary-foreground hover:bg-secondary/80 transition"><GitCompare size={14} /> Snapshot</button>
        {diffBase && <button onClick={() => setShowDiff(!showDiff)} className="flex items-center gap-1.5 rounded-lg bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/20 transition"><Eye size={14} /> Diff</button>}

        <div className="flex-1" />
        <button onClick={() => setShowPlayground(!showPlayground)} className="flex items-center gap-1.5 rounded-lg bg-secondary px-3 py-1.5 text-xs font-semibold text-secondary-foreground hover:bg-secondary/80 transition"><Terminal size={14} /> Query Lab</button>

        {/* Export Menu */}
        <div className="relative">
          <button onClick={handleCompileSQL} className="flex items-center gap-1.5 rounded-lg bg-foreground px-3 py-1.5 text-xs font-semibold text-background transition hover:opacity-90"><Code size={14} /> Export SQL</button>
        </div>
        <div className="relative">
          <button onClick={() => setShowExportMenu(!showExportMenu)} className="flex items-center gap-1.5 rounded-lg bg-secondary px-2 py-1.5 text-xs text-secondary-foreground hover:bg-secondary/80 transition"><Download size={14} /></button>
          {showExportMenu && (
            <div className="absolute right-0 top-full mt-1 w-48 bg-card border border-border shadow-xl rounded-xl overflow-hidden z-50">
              {[
                { key: "sql", icon: <Database size={14} className="text-accent" />, label: "SQL" },
                { key: "prisma", icon: <Box size={14} className="text-primary" />, label: "Prisma" },
                { key: "drizzle", icon: <Columns size={14} className="text-accent" />, label: "Drizzle" },
                { key: "graphql", icon: <Webhook size={14} className="text-destructive" />, label: "GraphQL" },
                { key: "csv", icon: <FileText size={14} className="text-primary" />, label: "CSV" },
              ].map(fmt => (
                <button key={fmt.key} onClick={() => handleExport(fmt.key)} className="w-full text-left px-4 py-2.5 hover:bg-secondary flex items-center gap-3 text-sm font-medium">
                  {fmt.icon} Export {fmt.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <VibeDBSidebar
          sidebarItems={sidebarItems}
          setSidebarItems={setSidebarItems}
          expertMode={expertMode}
          onAddToCanvas={addItemToCanvas}
          onGenerateMore={handleGenerateSidebarTables}
          isGeneratingMore={isGeneratingSidebar}
        />

        {/* Canvas */}
        <div className="relative flex-1 overflow-hidden" ref={canvasRef} onMouseDown={handleCanvasMouseDown} onWheel={handleWheel}
          onDrop={handleCanvasDrop} onDragOver={e => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; }}
        >
          <div className="pointer-events-none absolute inset-0 opacity-[0.04]" style={{
            backgroundImage: "radial-gradient(circle at 1px 1px, hsl(var(--foreground)) 1px, transparent 0)",
            backgroundSize: `${20 * view.zoom}px ${20 * view.zoom}px`,
            backgroundPosition: `${view.x}px ${view.y}px`,
          }} />

          {/* Connection mode banner */}
          {connectionMode && (
            <div className="absolute top-2 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2 rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground shadow-lg">
              <LinkIcon size={14} /> Select target column to link...
              <button onClick={() => setConnectionMode(null)} className="ml-2 hover:opacity-70"><X size={14} /></button>
            </div>
          )}

          {/* Diff banner */}
          {showDiff && diffBase && (
            <div className="absolute top-2 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2 rounded-xl bg-primary/10 px-4 py-2 text-sm font-semibold text-primary shadow-lg">
              <GitCompare size={14} /> Diff Mode: Comparing to snapshot
              <button onClick={() => setShowDiff(false)} className="ml-2 hover:opacity-70"><X size={14} /></button>
            </div>
          )}

          <svg className="pointer-events-none absolute inset-0" style={{ width: "100%", height: "100%" }}>
            <g transform={`translate(${view.x}, ${view.y}) scale(${view.zoom})`}>
              {connectionPaths}
            </g>
          </svg>

          <div style={{ transform: `translate(${view.x}px, ${view.y}px) scale(${view.zoom})`, transformOrigin: "0 0", position: "absolute", inset: 0 }}>
            {canvasItems.map(table => (
              <div
                key={table.id}
                data-table
                onMouseDown={e => handleTableMouseDown(e, table.id)}
                onMouseEnter={() => setHoveredTableId(table.id)}
                onMouseLeave={() => setHoveredTableId(null)}
                className="absolute cursor-grab select-none rounded-xl border border-border bg-card shadow-sm transition-all hover:shadow-md active:cursor-grabbing"
                style={{ left: table.x, top: table.y, width: TABLE_WIDTH, opacity: getTableOpacity(table.id), zIndex: hoveredTableId === table.id ? 50 : 10,
                  boxShadow: hoveredTableId === table.id ? "0 0 0 2px hsl(var(--accent)), 0 20px 25px -5px rgb(0 0 0 / 0.1)" : undefined,
                }}
              >
                {/* Header */}
                <div className="flex items-center justify-between rounded-t-xl bg-secondary/50 px-3 py-2" style={{ height: HEADER_HEIGHT }}>
                  {editingTable === table.id ? (
                    <input autoFocus value={table.name} onChange={e => updateTableName(table.id, e.target.value)}
                      onBlur={() => setEditingTable(null)} onKeyDown={e => e.key === "Enter" && setEditingTable(null)}
                      className="w-full border-none bg-transparent text-sm font-bold outline-none" onClick={e => e.stopPropagation()} />
                  ) : (
                    <span className="text-sm font-bold flex items-center gap-1.5" onDoubleClick={() => expertMode && setEditingTable(table.id)}>
                      <TableIcon size={12} className="text-muted-foreground" /> {table.name}
                    </span>
                  )}
                  <div className="flex items-center gap-0.5">
                    <button onClick={e => { e.stopPropagation(); handleSmartAddColumn(table.id); }} className="text-accent hover:opacity-80 p-1" title="AI Suggest Column">
                      {generatingTableId === table.id ? <Loader2 size={13} className="animate-spin" /> : <Wand2 size={13} />}
                    </button>
                    {expertMode && <button onClick={e => { e.stopPropagation(); addColumn(table.id); }} className="text-muted-foreground hover:text-accent p-1"><Plus size={13} /></button>}
                    <button onClick={e => { e.stopPropagation(); deleteTable(table.id); }} className="text-muted-foreground hover:text-destructive p-1"><Trash2 size={13} /></button>
                  </div>
                </div>

                {/* Columns */}
                {table.columns.map((col, idx) => (
                  <div key={col.id} className={`group flex items-center gap-1 border-t border-border px-3 text-[11px] transition-colors ${connectionMode ? "cursor-crosshair hover:bg-accent/10" : ""} ${connectionMode?.sourceColumnId === col.id ? "bg-primary/10" : ""}`}
                    style={{ height: ROW_HEIGHT }}
                    onClick={() => { if (connectionMode) completeConnection(table.id, col.id); }}
                  >
                    <div className="flex items-center gap-1.5 overflow-hidden flex-1">
                      {expertMode && <GripVertical size={10} className="text-muted-foreground cursor-grab" />}
                      {col.isForeignKey ? (
                        <button onClick={e => { e.stopPropagation(); if (expertMode) { connectionMode ? completeConnection(table.id, col.id) : startConnection(table.id, col.id); } }}
                          className={`shrink-0 ${col.fkStatus === "resolved" ? "text-accent" : "text-destructive"} ${connectionMode ? "animate-pulse" : ""}`}>
                          <LinkIcon size={11} />
                        </button>
                      ) : (col.constraints?.some(c => c.type === "primary") || col.name === "id") ? (
                        <Key size={11} className="text-primary shrink-0" />
                      ) : (
                        <Hash size={11} className="text-muted-foreground/50 shrink-0" />
                      )}

                      {editingColumn?.tableId === table.id && editingColumn?.columnId === col.id ? (
                        <input autoFocus className="bg-transparent border-none outline-none text-[11px] w-full font-mono font-semibold"
                          defaultValue={col.name}
                          onBlur={e => { updateColumn(table.id, col.id, { name: e.target.value }); setEditingColumn(null); }}
                          onKeyDown={e => { if (e.key === "Enter") { updateColumn(table.id, col.id, { name: (e.target as HTMLInputElement).value }); setEditingColumn(null); } }}
                          onClick={e => e.stopPropagation()} />
                      ) : (
                        <span className={`font-mono font-semibold truncate ${col.isForeignKey ? "text-accent" : "text-foreground"}`}
                          onDoubleClick={() => expertMode && setEditingColumn({ tableId: table.id, columnId: col.id })}>
                          {col.name}
                        </span>
                      )}
                    </div>

                    {expertMode ? (
                      <select value={col.type} onChange={e => { e.stopPropagation(); updateColumn(table.id, col.id, { type: e.target.value }); }}
                        onClick={e => e.stopPropagation()}
                        className="text-[10px] font-mono text-muted-foreground bg-transparent outline-none cursor-pointer appearance-none text-right pr-1 hover:text-foreground">
                        {COLUMN_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    ) : (
                      <span className="ml-auto text-muted-foreground text-[10px] font-mono">{col.type}</span>
                    )}

                    {col.constraints?.some(c => c.type === "primary") && <span className="ml-0.5 rounded bg-primary/10 px-1 text-[8px] font-bold text-primary">PK</span>}
                    {col.isForeignKey && <span className="ml-0.5 rounded bg-accent/10 px-1 text-[8px] font-bold text-accent">FK</span>}

                    {expertMode && (
                      <>
                        <button onClick={e => { e.stopPropagation(); deleteColumn(table.id, col.id); }} className="ml-0.5 hidden text-destructive group-hover:block"><X size={10} /></button>
                        <button onMouseDown={e => { e.stopPropagation(); if (!connectionMode) startConnection(table.id, col.id); }}
                          onClick={e => e.stopPropagation()} className="hidden group-hover:block text-muted-foreground hover:text-accent"><Plus size={10} /></button>
                      </>
                    )}
                  </div>
                ))}

                {/* Add Column button (non-expert) */}
                {!expertMode && (
                  <button onClick={e => { e.stopPropagation(); addColumn(table.id); }}
                    className="flex w-full items-center justify-center gap-1 border-t border-border py-1.5 text-[11px] text-muted-foreground hover:bg-secondary/30 transition rounded-b-xl">
                    <Plus size={10} /> Add Column
                  </button>
                )}
              </div>
            ))}
          </div>

          {canvasItems.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <Database size={48} className="mx-auto mb-4 text-muted-foreground/30" />
                <h3 className="mb-2 text-lg font-bold text-muted-foreground">Canvas is Empty</h3>
                <p className="text-sm text-muted-foreground/70">Generate a schema, then drag tables here.</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Query Playground */}
      <AnimatePresence>
        {showPlayground && (
          <motion.div initial={{ height: 0 }} animate={{ height: 200 }} exit={{ height: 0 }} className="overflow-hidden border-t border-border bg-card">
            <div className="flex h-full flex-col p-4">
              <div className="mb-2 flex items-center gap-2">
                <Terminal size={14} className="text-accent" />
                <span className="text-xs font-bold">Query Playground</span>
                <button onClick={() => setShowPlayground(false)} className="ml-auto text-muted-foreground"><X size={14} /></button>
              </div>
              <div className="flex flex-1 gap-4">
                <div className="flex flex-1 flex-col gap-2">
                  <input value={queryPrompt} onChange={e => setQueryPrompt(e.target.value)} onKeyDown={e => e.key === "Enter" && handleGenerateQuery()}
                    placeholder="Describe your query in natural language..." className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary" />
                  <button onClick={handleGenerateQuery} disabled={isQuerying} className="flex items-center gap-2 self-start rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-accent-foreground disabled:opacity-50">
                    {isQuerying ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />} Generate
                  </button>
                </div>
                <div className="flex-1 overflow-auto rounded-lg bg-background p-3 font-mono text-xs">
                  {generatedQuery || <span className="text-muted-foreground">Your query will appear here...</span>}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Diff Panel */}
      <AnimatePresence>
        {showDiff && diffBase && (
          <motion.div initial={{ height: 0 }} animate={{ height: 200 }} exit={{ height: 0 }} className="overflow-hidden border-t border-border bg-card">
            <div className="flex h-full flex-col p-4">
              <div className="mb-2 flex items-center gap-2">
                <GitCompare size={14} className="text-primary" />
                <span className="text-xs font-bold">Schema Changes</span>
                <button onClick={() => setShowDiff(false)} className="ml-auto text-muted-foreground"><X size={14} /></button>
              </div>
              <div className="flex-1 overflow-auto space-y-1">
                {(() => {
                  const changes = computeDiff();
                  if (!changes || changes.length === 0) return <p className="text-xs text-muted-foreground">No changes detected.</p>;
                  return changes.map((c, i) => (
                    <div key={i} className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs ${c.type === "added" ? "bg-accent/10 text-accent" : c.type === "removed" ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"}`}>
                      <span className="font-bold">{c.type === "added" ? "+" : c.type === "removed" ? "−" : "~"}</span>
                      <span className="font-mono font-semibold">{c.target}</span>
                      <span className="text-muted-foreground">{c.details}</span>
                      {c.breaking && <span className="ml-auto text-[9px] font-bold text-destructive">BREAKING</span>}
                    </div>
                  ));
                })()}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══ MODALS ═══ */}

      {/* SQL Modal */}
      <AnimatePresence>
        {showSqlModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/20 backdrop-blur-sm" onClick={() => setShowSqlModal(false)}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="mx-4 w-full max-w-2xl rounded-2xl bg-card p-6 shadow-xl" onClick={e => e.stopPropagation()}>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-bold">Generated SQL</h2>
                <div className="flex gap-2">
                  <button onClick={() => handleCopy(generatedSql)} className="flex items-center gap-1.5 rounded-lg bg-secondary px-3 py-1.5 text-xs font-semibold hover:bg-secondary/80">
                    {copied ? <Check size={14} /> : <Copy size={14} />} {copied ? "Copied" : "Copy"}
                  </button>
                  <button onClick={() => setShowSqlModal(false)} className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary"><X size={16} /></button>
                </div>
              </div>
              <pre className="max-h-[60vh] overflow-auto rounded-xl bg-background p-4 font-mono text-xs leading-relaxed">{generatedSql}</pre>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Import Modal */}
      <AnimatePresence>
        {showImportModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/20 backdrop-blur-sm" onClick={() => setShowImportModal(false)}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="mx-4 w-full max-w-2xl rounded-2xl bg-card p-6 shadow-xl" onClick={e => e.stopPropagation()}>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-bold flex items-center gap-2"><Upload size={18} /> Import SQL</h2>
                <button onClick={() => setShowImportModal(false)} className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary"><X size={16} /></button>
              </div>
              <p className="mb-3 text-sm text-muted-foreground">Paste your SQL CREATE TABLE statements below.</p>
              <textarea value={importText} onChange={e => setImportText(e.target.value)}
                placeholder={`CREATE TABLE users (\n  id UUID PRIMARY KEY,\n  name VARCHAR NOT NULL\n);`}
                className="w-full rounded-xl border border-border bg-background p-4 font-mono text-xs leading-relaxed outline-none focus:border-primary resize-none" rows={12} />
              <div className="mt-4 flex justify-end gap-2">
                <button onClick={() => setShowImportModal(false)} className="rounded-lg bg-secondary px-4 py-2 text-sm font-semibold hover:bg-secondary/80">Cancel</button>
                <button onClick={handleImport} disabled={!importText.trim()} className="flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground disabled:opacity-50"><Upload size={14} /> Import</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Batch Edit Modal */}
      <AnimatePresence>
        {showBatchModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/20 backdrop-blur-sm" onClick={() => setShowBatchModal(false)}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="mx-4 w-full max-w-lg rounded-2xl bg-card p-6 shadow-xl" onClick={e => e.stopPropagation()}>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-bold flex items-center gap-2"><Edit3 size={18} /> Batch Edit</h2>
                <button onClick={() => setShowBatchModal(false)} className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary"><X size={16} /></button>
              </div>
              <p className="mb-3 text-sm text-muted-foreground">Describe changes to apply across your schema.</p>
              <textarea value={batchPrompt} onChange={e => setBatchPrompt(e.target.value)}
                placeholder='e.g. "Add soft delete (deleted_at timestamp) to all tables"'
                className="w-full rounded-xl border border-border bg-background p-4 text-sm outline-none focus:border-primary resize-none" rows={4} />
              {batchError && <div className="mt-2 rounded-lg bg-destructive/10 border border-destructive/20 px-3 py-2 text-xs text-destructive">{batchError}</div>}
              <div className="mt-4 flex justify-end gap-2">
                <button onClick={() => setShowBatchModal(false)} className="rounded-lg bg-secondary px-4 py-2 text-sm font-semibold hover:bg-secondary/80">Cancel</button>
                <button onClick={handleBatchCommand} disabled={isBatchProcessing || !batchPrompt.trim()} className="flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground disabled:opacity-50">
                  {isBatchProcessing ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} />}
                  {isBatchProcessing ? "Processing..." : "Execute"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mock Data Modal */}
      <AnimatePresence>
        {showMockDataModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/20 backdrop-blur-sm" onClick={() => setShowMockDataModal(false)}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="mx-4 w-full max-w-2xl rounded-2xl bg-card p-6 shadow-xl" onClick={e => e.stopPropagation()}>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-bold flex items-center gap-2"><DatabaseZap size={18} /> Seed Data</h2>
                <div className="flex gap-2">
                  {mockDataSql && <button onClick={() => handleCopy(mockDataSql)} className="flex items-center gap-1.5 rounded-lg bg-secondary px-3 py-1.5 text-xs font-semibold hover:bg-secondary/80">
                    {copied ? <Check size={14} /> : <Copy size={14} />} {copied ? "Copied" : "Copy"}
                  </button>}
                  <button onClick={() => setShowMockDataModal(false)} className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary"><X size={16} /></button>
                </div>
              </div>
              {isGeneratingMockData ? (
                <div className="flex items-center justify-center py-12"><Loader2 size={32} className="animate-spin text-accent" /><span className="ml-3 text-sm text-muted-foreground">Generating mock data...</span></div>
              ) : (
                <pre className="max-h-[60vh] overflow-auto rounded-xl bg-background p-4 font-mono text-xs leading-relaxed">{mockDataSql || "-- No data generated --"}</pre>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Audit Modal */}
      <AnimatePresence>
        {showAuditModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/20 backdrop-blur-sm" onClick={() => setShowAuditModal(false)}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="mx-4 w-full max-w-2xl max-h-[80vh] overflow-auto rounded-2xl bg-card p-6 shadow-xl" onClick={e => e.stopPropagation()}>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-bold flex items-center gap-2"><ShieldCheck size={18} /> Schema Audit</h2>
                <button onClick={() => setShowAuditModal(false)} className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary"><X size={16} /></button>
              </div>
              {isAuditing ? (
                <div className="flex items-center justify-center py-12"><Loader2 size={32} className="animate-spin text-accent" /><span className="ml-3 text-sm text-muted-foreground">Auditing schema...</span></div>
              ) : auditReport ? (
                <div className="space-y-4">
                  {(auditReport.score || auditReport.confidence_score) && (
                    <div className="flex items-center gap-3 rounded-xl bg-secondary/50 px-4 py-3">
                      <div className="text-3xl font-bold text-accent">{auditReport.score || auditReport.confidence_score}</div>
                      <div className="text-sm text-muted-foreground">/ 100 confidence score</div>
                    </div>
                  )}
                  {auditReport.lintIssues && auditReport.lintIssues.length > 0 && (
                    <div><h3 className="text-sm font-bold mb-2 text-muted-foreground">Naming Issues</h3>
                      <div className="space-y-1">{auditReport.lintIssues.map((issue, i) => (
                        <div key={i} className="flex items-start gap-2 rounded-lg bg-primary/5 px-3 py-2 text-xs"><span className="text-primary font-bold mt-0.5">⚠</span><span>{issue.message}</span></div>
                      ))}</div></div>
                  )}
                  {auditReport.fkIssues && auditReport.fkIssues.length > 0 && (
                    <div><h3 className="text-sm font-bold mb-2 text-muted-foreground">Foreign Key Issues</h3>
                      <div className="space-y-1">{auditReport.fkIssues.map((issue, i) => (
                        <div key={i} className="flex items-start gap-2 rounded-lg bg-destructive/5 px-3 py-2 text-xs"><span className="text-destructive font-bold mt-0.5">✕</span><span>{issue.message}</span></div>
                      ))}</div></div>
                  )}
                  {auditReport.strengths && auditReport.strengths.length > 0 && (
                    <div><h3 className="text-sm font-bold mb-2 text-muted-foreground">Strengths</h3>
                      <div className="space-y-1">{auditReport.strengths.map((s, i) => (
                        <div key={i} className="flex items-start gap-2 rounded-lg bg-accent/5 px-3 py-2 text-xs"><span className="text-accent font-bold mt-0.5">✓</span><span>{s}</span></div>
                      ))}</div></div>
                  )}
                  {auditReport.risks && auditReport.risks.length > 0 && (
                    <div><h3 className="text-sm font-bold mb-2 text-muted-foreground">Risks</h3>
                      <div className="space-y-1">{auditReport.risks.map((r, i) => (
                        <div key={i} className="flex items-start gap-2 rounded-lg bg-destructive/5 px-3 py-2 text-xs"><span className="text-destructive font-bold mt-0.5">⚡</span><span>{r}</span></div>
                      ))}</div></div>
                  )}
                  {auditReport.suggestions && auditReport.suggestions.length > 0 && (
                    <div><h3 className="text-sm font-bold mb-2 text-muted-foreground">Suggestions</h3>
                      <div className="space-y-2">{auditReport.suggestions.map((s, i) => (
                        <div key={i} className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
                          <div className="text-xs flex-1">
                            <span className="font-semibold text-accent">[{s.type}]</span>{" "}
                            {s.description || s.reason}
                            {s.target_table && <span className="text-muted-foreground"> → {s.target_table}</span>}
                          </div>
                          <button onClick={() => handleApplySuggestion(s)} className="ml-2 flex items-center gap-1 rounded-lg bg-accent/10 px-2 py-1 text-[10px] font-semibold text-accent hover:bg-accent/20 transition shrink-0">
                            <Check size={10} /> Apply
                          </button>
                        </div>
                      ))}</div></div>
                  )}
                </div>
              ) : null}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toasts */}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
        <AnimatePresence>
          {toasts.map(t => (
            <motion.div key={t.id} initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 50 }}
              className={`rounded-xl px-4 py-2.5 text-sm font-medium shadow-lg ${
                t.type === "success" ? "bg-accent text-accent-foreground" :
                t.type === "error" ? "bg-destructive text-destructive-foreground" :
                t.type === "warning" ? "bg-primary/20 text-primary border border-primary/30" :
                "bg-card text-card-foreground border border-border"
              }`}>
              {t.message}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default VibeDBPage;
