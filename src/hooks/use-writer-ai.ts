import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function useWriterAI() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isChatLoading, setIsChatLoading] = useState(false);

  const callAI = useCallback(async (action: string, payload: Record<string, any>): Promise<string> => {
    try {
      const { data, error } = await supabase.functions.invoke("writer-ai", {
        body: { action, ...payload },
      });
      if (error) {
        console.error("Writer AI error:", error);
        toast.error("AI request failed. Please try again.");
        return "Error: Could not connect to AI service.";
      }
      if (data?.error) {
        toast.error(data.error);
        return `Error: ${data.error}`;
      }
      return data?.result || "No response generated.";
    } catch (err) {
      console.error("Writer AI call failed:", err);
      toast.error("Failed to reach AI service.");
      return "Error: Could not connect to AI service.";
    }
  }, []);

  const generate = useCallback(
    async (context: string, threadContext: string, generateLength: number, customInstructions: string) => {
      setIsGenerating(true);
      try {
        const result = await callAI("generate", { context, threadContext, generateLength, customInstructions });
        return result;
      } finally {
        setIsGenerating(false);
      }
    },
    [callAI]
  );

  const chat = useCallback(
    async (userMessage: string, systemPrompt: string) => {
      setIsChatLoading(true);
      try {
        const result = await callAI("chat", { userMessage, systemPrompt });
        return result;
      } finally {
        setIsChatLoading(false);
      }
    },
    [callAI]
  );

  return { isGenerating, isChatLoading, generate, chat };
}
