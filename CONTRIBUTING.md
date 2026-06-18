# Contributing

Thanks for helping improve VibeDB.

## Local Setup

1. Install Node.js 18 or newer.
2. Run `npm install`.
3. Copy `.env.example` to `.env` and fill in the values you need.
4. Run `npm run dev`.

## Development

- Use `npm test` for the Vitest suite.
- Use `npm run lint` before sending larger changes.
- Keep generated files, local environment files, and desktop build artifacts out of commits.
- Do not commit API keys, Supabase service role keys, Stripe secrets, or `.env` files.

## Pull Requests

Please include:

- a short description of the change;
- validation performed, such as tests or manual checks;
- screenshots or screen recordings for visible UI changes.
