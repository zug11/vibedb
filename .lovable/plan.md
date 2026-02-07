

# Writer AI - AI-Powered Writing Tool

Add a new "Writer AI" page to the portfolio — a rich text editor with AI writing assistance, based on the code from your document.

## What It Does

- **Rich Text Editor**: A `contentEditable` editor with formatting (bold, italic, underline, headings, lists, alignment), font selection (Inter, Garamond, Baskerville, etc.), undo/redo
- **AI Ghostwriting**: "Continue" button that generates text from cursor position, matching your voice and style, with adjustable length and custom instructions
- **AI Chat & Tools**: A bottom HUD with chat input and cognitive tools:
  - **Critique** - Get feedback on pacing, dialogue, etc.
  - **Idea Gen** - Brainstorm ideas for your story
  - **Explain** - Get explanations of writing concepts
  - **Write Like** - Set a style for future AI generation
  - **Write Note** - Pin sticky notes as context for AI
- **Thread Carousel**: AI responses appear as draggable, expandable cards you can reply to, reorder, and delete
- **Document Management**: Create, save, load, and delete multiple documents (stored in localStorage)
- **Export**: Download documents as Markdown
- **Multi-Select Mode**: Highlight multiple text sections to provide context to AI
- **Focus Mode**: UI fades when you're typing, reappears on hover

## Technical Approach

### 1. New Edge Function: `writer-ai`
A backend function using Lovable AI (Gemini) to handle:
- Text continuation/ghostwriting
- Chat responses for critique, ideas, explanations
- Style analysis for "Write Like" tool
- Thread-aware context (reads all active cards/notes)

### 2. New Page: `src/pages/WriterPage.tsx`
The main Writer AI component with:
- ContentEditable editor with custom selection highlighting
- Bottom HUD layer with carousel, chat input, and tools menu
- Document list overlay for managing multiple docs
- Generation settings panel (length slider, custom instructions)
- All state managed with React hooks, localStorage for persistence

### 3. Updated Files
- **`src/App.tsx`**: Add `/writer` route
- **`src/pages/Index.tsx`**: Add Writer AI project card to portfolio
- **`supabase/config.toml`**: Register the new edge function
- **`src/index.css`**: Add custom scrollbar styles and print styles for the editor

### 4. Key Design Decisions
- AI calls routed through `writer-ai` edge function (using Lovable AI gateway, no API key needed)
- Documents stored in localStorage (matching the original code's approach)
- Google Fonts loaded via CSS import for the font picker
- Matches existing portfolio design language while having its own distinct editor UI

