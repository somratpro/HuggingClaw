# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability, please report it responsibly:

1. **Do NOT open a public issue**
2. Email the maintainer or open a private security advisory on GitHub
3. Include steps to reproduce if possible

We'll respond within 48 hours and work on a fix.

## Security Best Practices

When deploying HuggingClaw:

- **Set your Space to Private** — prevents unauthorized access to your gateway
- **Use a strong `GATEWAY_TOKEN`** — generate with `openssl rand -hex 32`
- **Keep your HF token scoped** — use fine-grained tokens with minimum permissions
- **Don't commit `.env` files** — the `.gitignore` already excludes them
- **Use `TELEGRAM_USER_ID`** — restricts bot access to your account only
- **Review logs regularly** — check for unauthorized access attempts

## Supported Versions

| Version | Supported |
|---------|-----------|
| 1.0.x   | ✅        |
