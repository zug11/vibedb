

# User-Owned API Keys for VibeDB AI

## Problem
Currently, all AI calls in VibeDB go through the `LOVABLE_API_KEY`, which means **your** Lovable credits get consumed every time any user generates a schema, runs an audit, etc. You want users to pay for their own AI usage.

## Solution
Let users bring their own OpenAI-compatible API key (e.g., OpenAI, Google AI, or any provider). Their key is stored securely per-user in the database and used server-side for AI calls instead of your Lovable key.

## What Changes

### 1. Database: Store user API keys (encrypted at rest)
- Add an `ai_api_key` column to the `profiles` table (encrypted text, nullable)
- Add an `ai_provider` column (e.g., "openai", "google") so users can pick their provider
- RLS already restricts profiles to owner-only access

### 2. Edge Function: Use user's key instead of yours
- Update `vibedb-ai` to accept the user's API key from the request (passed via authorization header -- the user is already authenticated)
- Look up the user's `ai_api_key` from their profile using the service role
- Route to the appropriate provider endpoint based on `ai_provider`
- Fall back to `LOVABLE_API_KEY` only if no user key is set (optional -- or block entirely)

### 3. UI: Settings panel for API key
- Add an "AI Settings" section (accessible from the user menu or a settings icon)
- Simple form: provider dropdown (OpenAI / Google AI) + API key input
- Key is saved to their profile
- Show a status indicator (key configured vs. not configured)

### 4. Client-side: No changes to `callAI`
- The edge function handles key resolution server-side, so the existing `callAI` helper stays the same

## Flow

```text
User action (e.g. "Generate Schema")
       |
       v
callAI() --> supabase.functions.invoke("vibedb-ai")
       |
       v
Edge function reads user's JWT --> looks up profiles.ai_api_key
       |
       v
  [key found?] --yes--> Call OpenAI/Google directly with user's key
       |
      no
       |
       v
  Return error: "Please add your API key in Settings"
```

## Technical Details

### Migration SQL
```sql
ALTER TABLE public.profiles
  ADD COLUMN ai_api_key TEXT,
  ADD COLUMN ai_provider TEXT DEFAULT 'openai';
```

### Edge Function Changes (`vibedb-ai/index.ts`)
- Extract user ID from the `Authorization` JWT
- Query `profiles` for `ai_api_key` and `ai_provider`
- If `ai_provider = 'openai'`: call `https://api.openai.com/v1/chat/completions`
- If `ai_provider = 'google'`: call Google's Gemini API endpoint
- Remove dependency on `LOVABLE_API_KEY` for user requests

### New UI Component
- `src/components/vibedb/AISettingsModal.tsx` -- modal with provider picker + key input
- Button added to the `UserMenu` dropdown to open it
- Visual indicator in header when no key is configured

### Files Modified
- `supabase/functions/vibedb-ai/index.ts` -- use user's key
- `src/pages/VibeDBPage.tsx` -- add AI settings button to UserMenu
- `src/hooks/use-auth.tsx` -- include `ai_provider` / key-exists flag in profile

### New Files
- `src/components/vibedb/AISettingsModal.tsx`
- Migration file for new columns

