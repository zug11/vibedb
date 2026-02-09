

# Landing Page for VibeDB

## Overview
Add a public landing page at `/` that showcases VibeDB -- what it does, key features, and a clear call-to-action to sign up or sign in. The current protected route moves to `/app`.

## What Gets Built

**Hero Section**
- VibeDB logo + tagline ("Design databases visually. Deploy instantly.")
- Short description of the product
- Two CTAs: "Get Started Free" and "Sign In"
- Subtle animated gradient background matching the existing warm theme

**Features Section**
- 3-4 feature cards highlighting: Visual Schema Designer, AI-Powered Suggestions, One-Click Deploy to Supabase, Export to SQL/Prisma/Drizzle
- Uses existing card styling and lucide icons

**How It Works Section**
- 3-step flow: Design -> Generate -> Deploy
- Simple numbered steps with icons

**Footer**
- Minimal footer with "Built with VibeDB" and links

**Trial Banner**
- "14-day free trial -- No credit card required" callout near the CTA

## Routing Changes
- `/` becomes the public landing page (new `LandingPage.tsx`)
- `/app` becomes the protected VibeDB workspace (existing `VibeDBPage`)
- `/auth` stays the same
- Update navigation: landing page CTAs link to `/auth`, after login redirect to `/app`

## Technical Details

### New Files
- `src/pages/LandingPage.tsx` -- Full landing page component using framer-motion for scroll animations, existing Tailwind theme tokens (--gradient-warm, --gradient-hero, --shadow-glow), and lucide-react icons

### Modified Files
- `src/App.tsx` -- Update routes: `/` renders `LandingPage`, `/app` renders `ProtectedRoute > VibeDBPage`
- `src/pages/AuthPage.tsx` -- Update post-login redirect target to `/app`
- `src/hooks/use-auth.tsx` -- No changes needed (redirect handled in App.tsx route guards)

### Design Approach
- Matches existing color scheme (warm orange primary, accent green, dark foreground)
- Uses fonts already loaded (Space Grotesk for headings, DM Sans/Inter for body)
- Responsive -- works on mobile and desktop
- No new dependencies required

