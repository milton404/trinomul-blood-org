# Strix Security Configuration

This document configures Strix AI penetration testing for the Trinomul Blood Bank Rangpur application.

## Installation

### Prerequisites
- Docker (running)
- LLM API key (OpenAI, Anthropic, Google, etc.)

### Install Strix

```bash
# Using the official installer
curl -sSL https://strix.ai/install | bash

# Or using pip (Python 3.12+)
pip install strix-agent
```

## Configuration

### Environment Variables

```bash
# LLM Provider (required)
export STRIX_LLM="openai/gpt-5.4"
export LLM_API_KEY="your-api-key"

# Optional: Custom base URL for local models
# export LLM_API_BASE="http://localhost:11434"

# Optional: Perplexity for search capabilities
# export PERPLEXITY_API_KEY="your-perplexity-key"

# Optional: Reasoning effort (high/medium/low)
# export STRIX_REASONING_EFFORT="high"
```

### Project-Specific Settings

**Target:** This Next.js blood bank application

**Key Areas to Test:**
- Authentication and session management
- Blood request submission and access control
- Donor data privacy and PII protection
- API endpoints (Supabase, Cloudinary, AI)
- File upload handling
- Input validation and sanitization
- Rate limiting effectiveness
- CSRF protection

## Usage

### Quick Security Scan

```bash
npm run security:scan

# Or directly
strix -n -t ./ --scan-mode quick --max-budget 10
```

### Full Penetration Test

```bash
strix -n -t ./ --scan-mode deep --max-budget 50
```

### Web Application Test (Deployed)

```bash
# Test the deployed application
strix -n -t https://your-domain.com --scan-mode standard

# Authenticated testing
strix -n -t https://your-domain.com \
  --instruction "Test admin panel at /admin with test credentials"
```

## Results

### Output Files

Results are saved to `strix_runs/<run-name>/`:

| File | Description |
|------|-------------|
| `penetration_test_report.md` | Full human-readable report |
| `vulnerabilities/*.md` | Individual vulnerability details |
| `vulnerabilities.json` | JSON format findings |
| `findings.sarif` | SARIF 2.1.0 format (for CI integration) |
| `run.json` | Run metadata and statistics |

### Interpreting Results

**Exit Codes:**
- `0` - Clean (no critical vulnerabilities found)
- `1` - Fatal error
- `2` - Vulnerabilities found

**Severity Levels:**
- Critical - Immediate action required
- High - Address within 24 hours
- Medium - Address within 1 week
- Low - Address when possible

## CI/CD Integration

### GitHub Actions

```yaml
name: Security Scan

on:
  pull_request:
    branches: [main, master]
  push:
    branches: [main, master]

jobs:
  security-scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v6
        with:
          fetch-depth: 0

      - name: Install Strix
        run: curl -sSL https://strix.ai/install | bash

      - name: Run Security Scan
        env:
          STRIX_LLM: ${{ secrets.STRIX_LLM }}
          LLM_API_KEY: ${{ secrets.LLM_API_KEY }}
        run: strix -n -t ./ --scan-mode quick

      - name: Upload Results
        uses: actions/upload-artifact@v4
        with:
          name: strix-results
          path: strix_runs/
```

## Remediation Workflow

1. **Run scan:** `npm run security:scan`
2. **Review findings:** Check `strix_runs/<run-name>/vulnerabilities.json`
3. **Fix vulnerabilities:** Address critical/high issues first
4. **Re-scan:** Run scan again to verify fixes
5. **Document:** Keep reports for compliance

## Security Best Practices

1. **Pre-deployment:** Always scan before deploying to production
2. **PR checks:** Block PRs with critical vulnerabilities
3. **Regular scans:** Schedule weekly deep scans
4. **After changes:** Scan after significant code changes
5. **Compliance:** Keep pentest reports for audits

## Resources

- [Strix Documentation](https://docs.strix.ai)
- [Strix Platform](https://app.strix.ai)
- [LLM Provider Docs](https://docs.strix.ai/llm-providers/overview)
- [Discord Community](https://discord.gg/strix-ai)

## Disclaimer

**Authorized use only.** Only run Strix against systems you own or have explicit written permission to test. Unauthorized testing is illegal. You are responsible for obtaining authorization and complying with applicable laws.