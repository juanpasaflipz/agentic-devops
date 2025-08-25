# Security Policy

## Supported Versions

We release patches to fix security vulnerabilities. Which versions are eligible
for such patches depends on the CVSS v3.0 Rating:

| Version | Supported          |
| ------- | ------------------ |
| 0.1.x   | :white_check_mark: |

## Reporting a Vulnerability

We take the security of Agentic DevOps seriously. If you believe you have
found a security vulnerability, please report it to us as described below.

**Please do not report security vulnerabilities through public GitHub issues.**

Instead, please report them via email to security@vibe2prod.dev.

You should receive a response within 48 hours. If for some reason you do not,
please follow up via email to ensure we received your original message.

Please include the requested information listed below (as much as you can provide) to help us better understand the nature and scope of the possible issue:

- Type of issue (buffer overflow, SQL injection, cross-site scripting, etc.)
- Full paths of source file(s) related to the vulnerability
- The location of the affected source code (tag/branch/commit or direct URL)
- Any special configuration required to reproduce the issue
- Step-by-step instructions to reproduce the issue
- Proof-of-concept or exploit code (if possible)
- Impact of the issue, including how an attacker might exploit it

This information will help us triage your report more quickly.

## Security Best Practices

### Environment Variables

- Never commit `.env` files to version control
- Use strong, unique tokens for external services
- Rotate credentials regularly
- Use environment-specific configuration files

### External Integrations

- Review and limit permissions for GitHub tokens
- Use webhook secrets for Slack integrations
- Implement proper authentication for GCP services
- Validate all incoming webhook payloads

### Infrastructure

- Use least-privilege access for database connections
- Enable TLS for all external communications
- Implement proper network segmentation
- Regular security updates for dependencies

## Disclosure Policy

When we receive a security bug report, we will:

1. Confirm the problem and determine affected versions
2. Audit code to find any similar problems
3. Prepare fixes for all supported versions
4. Release a new version with the fix
5. Disclose the vulnerability publicly

## Security Updates

Security updates will be released as patch versions (e.g., 0.1.1, 0.1.2) and
will be clearly marked in the changelog.

## Credits

We would like to thank all security researchers and contributors who responsibly disclose vulnerabilities to us.
