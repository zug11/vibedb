import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { sql, supabaseUrl, serviceRoleKey, action } = await req.json();

    // Action: "test" just validates the connection
    // Action: "deploy" runs the SQL
    if (!supabaseUrl || !serviceRoleKey) {
      return new Response(JSON.stringify({ error: "Missing Supabase URL or service role key" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Normalize URL
    const baseUrl = supabaseUrl.replace(/\/$/, "");

    if (action === "test") {
      // Test connection by querying pg_tables
      const testRes = await fetch(`${baseUrl}/rest/v1/rpc/`, {
        method: "POST",
        headers: {
          "apikey": serviceRoleKey,
          "Authorization": `Bearer ${serviceRoleKey}`,
          "Content-Type": "application/json",
        },
      });
      
      // Try a simple query to verify connection
      const healthRes = await fetch(`${baseUrl}/rest/v1/`, {
        method: "GET",
        headers: {
          "apikey": serviceRoleKey,
          "Authorization": `Bearer ${serviceRoleKey}`,
        },
      });

      if (healthRes.ok) {
        return new Response(JSON.stringify({ success: true, message: "Connection successful" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } else {
        const errText = await healthRes.text();
        return new Response(JSON.stringify({ error: `Connection failed: ${healthRes.status} ${errText}` }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    if (action === "deploy") {
      if (!sql) {
        return new Response(JSON.stringify({ error: "No SQL to deploy" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Execute SQL via the Supabase SQL endpoint (pg-meta)
      // We use the /rest/v1/rpc endpoint won't work for DDL, 
      // so we use the pg-meta query endpoint
      const queryUrl = `${baseUrl}/pg/query`;
      
      // Split SQL into individual statements and execute them
      const statements = sql
        .split(/;\s*\n/)
        .map((s: string) => s.trim())
        .filter((s: string) => s.length > 0 && !s.startsWith("--"));

      const results: { statement: string; success: boolean; error?: string }[] = [];
      let hasErrors = false;

      for (const statement of statements) {
        try {
          const execRes = await fetch(`${baseUrl}/rest/v1/rpc/exec_sql`, {
            method: "POST",
            headers: {
              "apikey": serviceRoleKey,
              "Authorization": `Bearer ${serviceRoleKey}`,
              "Content-Type": "application/json",
              "Prefer": "return=minimal",
            },
            body: JSON.stringify({ query: statement + ";" }),
          });

          if (execRes.ok) {
            await execRes.text(); // consume
            results.push({ statement: statement.substring(0, 80) + "...", success: true });
          } else {
            const errText = await execRes.text();
            hasErrors = true;
            results.push({ 
              statement: statement.substring(0, 80) + "...", 
              success: false, 
              error: errText 
            });
          }
        } catch (e: unknown) {
          hasErrors = true;
          const msg = e instanceof Error ? e.message : "Unknown error";
          results.push({ statement: statement.substring(0, 80) + "...", success: false, error: msg });
        }
      }

      return new Response(JSON.stringify({ 
        success: !hasErrors, 
        results,
        message: hasErrors 
          ? `Deployed with ${results.filter(r => !r.success).length} error(s)` 
          : `Successfully deployed ${results.length} statement(s)` 
      }), {
        status: hasErrors ? 207 : 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid action. Use 'test' or 'deploy'" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("vibedb-deploy error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
