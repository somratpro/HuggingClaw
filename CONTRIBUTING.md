# Contributing to HuggingClaw

Thanks for your interest in contributing! 🦞

## How to Contribute

### Bug Reports
- Open an issue with a clear description
- Include your HF Space logs if possible
- Mention which LLM provider you're using

### Feature Requests
- Open an issue with the `enhancement` label
- Describe the use case — why is this needed?

### Pull Requests
1. Fork the repo
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Make your changes
4. Test locally with Docker: `docker build -t huggingclaw . && docker run -p 7860:7860 --env-file .env huggingclaw`
5. Commit with a clear message
6. Push and open a PR

### Code Style
- Shell scripts: use `set -e`, quote variables, comment non-obvious logic
- Keep it simple — this project should stay easy to understand
- No unnecessary dependencies

### Testing
- Test with at least one LLM provider (Anthropic, OpenAI, or Google)
- Test with and without Telegram enabled
- Test with and without workspace backup enabled
- Verify keep-alive and auto-sync work

## Development Setup

```bash
cp .env.example .env
# Fill in your values
docker build -t huggingclaw .
docker run -p 7860:7860 --env-file .env huggingclaw
```

## Questions?

Open an issue or start a discussion. We're friendly! 🤝
