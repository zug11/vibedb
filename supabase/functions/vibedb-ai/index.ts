import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Credit costs per action type
const CREDIT_COSTS: Record<string, number> = {
  "generate-schema": 3,
  "batch-command": 3,
  "inspect-schema": 2,
  "generate-sql": 1,
  "generate-mock-data": 1,
  "generate-query": 1,
  "smart-add-column": 1,
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { prompt, type, context } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // ─── Credit check ───────────────────────────────────
    const authHeader = req.headers.get("Authorization");
    let userId: string | null = null;

    if (authHeader) {
      const supabaseAdmin = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
        { auth: { persistSession: false } }
      );

      const token = authHeader.replace("Bearer ", "");
      const { data: userData } = await supabaseAdmin.auth.getUser(token);
      userId = userData.user?.id ?? null;

      if (userId) {
        const creditCost = CREDIT_COSTS[type] ?? 1;

        const { data: profile } = await supabaseAdmin
          .from("profiles")
          .select("ai_credits, subscription_tier")
          .eq("user_id", userId)
          .maybeSingle();

        if (!profile || profile.subscription_tier === "none") {
          return new Response(JSON.stringify({
            error: "Active subscription required. Please subscribe to use AI features.",
            code: "NO_SUBSCRIPTION",
          }), {
            status: 403,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        if ((profile.ai_credits ?? 0) < creditCost) {
          return new Response(JSON.stringify({
            error: `Not enough credits. This action costs ${creditCost} credit${creditCost > 1 ? "s" : ""}. You have ${profile.ai_credits ?? 0}. Buy more credits to continue.`,
            code: "NO_CREDITS",
            credits_remaining: profile.ai_credits ?? 0,
            credits_required: creditCost,
          }), {
            status: 402,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Deduct credits
        await supabaseAdmin.from("profiles").update({
          ai_credits: (profile.ai_credits ?? 0) - creditCost,
        }).eq("user_id", userId);
      }
    }

    // ─── AI request ─────────────────────────────────────
    let systemPrompt = "";
    let userPrompt = prompt;

    if (type === "generate-schema") {
      systemPrompt = `You are an expert database architect. Given a user's description, generate a complete database schema.
Return a JSON object with a "tables" key containing an array of table objects.
Each table has: name (string), columns (array of {name, type, isForeignKey, linkedTable, linkedColumn, constraints}).
Column types must be one of: uuid, varchar, int, timestamp, boolean, numeric, text, jsonb, decimal, float.
Constraints is an array of {type: "primary"|"unique"|"notNull"|"default", value?: string}.
Always include an 'id' column with uuid type and primary constraint.
Always include created_at and updated_at timestamps.
Make the schema comprehensive and well-normalized.`;
    } else if (type === "generate-sql") {
      systemPrompt = `You are a SQL expert. Given a database schema context, generate valid PostgreSQL DDL statements.
Include CREATE TABLE statements with proper types, constraints, foreign keys, and indexes.
Return ONLY valid SQL code, no markdown formatting.`;
      userPrompt = `Generate SQL DDL for this schema:\n${context}`;
    } else if (type === "generate-mock-data") {
      systemPrompt = `You are a SQL data generator. Generate realistic INSERT statements for the given schema.
Generate 3-5 rows per table. Respect foreign key relationships.
Return ONLY valid SQL INSERT statements, no markdown formatting.`;
      userPrompt = `Generate mock data for:\n${context}`;
    } else if (type === "generate-query") {
      systemPrompt = `You are a SQL query expert. Given the schema context and a user request, generate a valid PostgreSQL query.
Return ONLY valid SQL, no markdown formatting.`;
      userPrompt = `Schema:\n${context}\n\nRequest: ${prompt}`;
    } else if (type === "inspect-schema") {
      systemPrompt = `You are a database architecture reviewer. Analyze the given schema and return a JSON object with:
{
  "score": number (1-100),
  "issues": [{"severity": "error"|"warning"|"info", "message": string}],
  "suggestions": [{"type": "add_table"|"add_column"|"add_index", "target_table": string, "payload": object, "reason": string}]
}
Check for: missing indexes, denormalization, naming conventions, missing audit fields, relationship issues.`;
      userPrompt = `Inspect this schema:\n${context}`;
    } else if (type === "smart-add-column") {
      systemPrompt = `You are a database expert. Given a table name and its existing columns, suggest ONE relevant missing column.
Return a JSON object with: name (string), type (string), description (string).`;
    } else if (type === "batch-command") {
      systemPrompt = `You are a database batch processor. Given the current schema and a user command, modify the schema accordingly.
Return a JSON object with a "tables" key containing the FULL updated array of tables.
Maintain existing IDs where possible. For new columns, do NOT generate UUIDs - leave id field empty.
Ensure consistent types from: uuid, varchar, int, timestamp, boolean, numeric, text, jsonb, decimal, float.
For foreign keys, set isForeignKey: true and linkedTable: 'TargetTableName'.`;
      userPrompt = `Current Schema: ${context}\n\nCommand: ${prompt}`;
    } else {
      systemPrompt = "You are a helpful AI assistant.";
    }

    console.log(`Processing request type: ${type}`);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        ...(["generate-schema", "inspect-schema", "smart-add-column", "batch-command"].includes(type)
          ? { response_format: { type: "json_object" } }
          : {}),
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        // Refund credits on rate limit
        if (userId) {
          const supabaseAdmin = createClient(
            Deno.env.get("SUPABASE_URL") ?? "",
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
            { auth: { persistSession: false } }
          );
          const creditCost = CREDIT_COSTS[type] ?? 1;
          const { data: profile } = await supabaseAdmin.from("profiles").select("ai_credits").eq("user_id", userId).maybeSingle();
          if (profile) {
            await supabaseAdmin.from("profiles").update({ ai_credits: (profile.ai_credits ?? 0) + creditCost }).eq("user_id", userId);
          }
        }
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add credits in Settings." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      return new Response(JSON.stringify({ error: "AI service error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";
    
    console.log(`Successfully processed ${type} request`);

    // Return remaining credits in response
    let creditsRemaining: number | undefined;
    if (userId) {
      const supabaseAdmin = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
        { auth: { persistSession: false } }
      );
      const { data: profile } = await supabaseAdmin.from("profiles").select("ai_credits").eq("user_id", userId).maybeSingle();
      creditsRemaining = profile?.ai_credits ?? 0;
    }

    return new Response(JSON.stringify({ result: content, credits_remaining: creditsRemaining }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("vibedb-ai error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
