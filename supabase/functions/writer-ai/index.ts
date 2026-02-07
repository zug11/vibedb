import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { action, context, systemPrompt, userMessage, generateLength, customInstructions, threadContext } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    let messages: { role: string; content: string }[] = [];

    if (action === "generate") {
      const cognitiveContext = threadContext || "No active context.";
      const sysPrompt = `You are a dedicated ghostwriter. EXTEND the user's text seamlessly.

META-RULES:
1. ADOPT THE PREMISE: Accept user logic as truth.
2. MATCH VOICE: If informal, stay informal.
3. FORMATTING (STRICT):
   - Do not use Markdown syntax (no **bold**, no __italics__, no # headings).
   - Do not use inline emphasis of any kind.
   - Return paragraphs wrapped in <p> tags.
   - Headings should be HTML tags <h1>, <h2> etc, but text content inside must NOT be bolded.
   - Output plain text or HTML blocks only.

ACTIVE CONSTRAINTS:
${cognitiveContext}

INSTRUCTIONS:
Continue the text immediately.
Length: ${(generateLength || 50) > 70 ? "Long" : "Standard"}.
${customInstructions ? `Additional instructions: ${customInstructions}` : ''}`;

      messages = [
        { role: "system", content: sysPrompt },
        { role: "user", content: context || "" },
      ];
    } else if (action === "chat") {
      messages = [
        { role: "system", content: systemPrompt || "You are a helpful writing assistant." },
        { role: "user", content: userMessage || "" },
      ];
    } else {
      return new Response(JSON.stringify({ error: "Invalid action" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Writer AI: action=${action}, message length=${messages.length}`);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages,
        stream: false,
      }),
    });

    if (!response.ok) {
      const status = response.status;
      if (status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add credits to continue." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const text = await response.text();
      console.error("AI gateway error:", status, text);
      return new Response(JSON.stringify({ error: "AI service error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const result = data.choices?.[0]?.message?.content || "No response generated.";

    return new Response(JSON.stringify({ result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Writer AI error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
