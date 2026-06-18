# Security

## Reporting Vulnerabilities

Please do not open a public issue for suspected vulnerabilities. Contact the project maintainers privately with:

- a summary of the issue;
- steps to reproduce;
- affected versions or commit SHAs;
- any logs or screenshots that help explain impact.

## Secret Handling

Never commit `.env` files or provider credentials. Use `.env.example` for placeholder values only, and configure production secrets through Supabase or your deployment provider.
