const DEFAULT_PATTERNS = [
  /AKIA[0-9A-Z]{16}/g, // AWS access key id
  /ghp_[A-Za-z0-9]{36}/g, // GitHub token
];

export function redactText(text: string, patterns: RegExp[] = DEFAULT_PATTERNS): string {
  let output = text;
  for (const re of patterns) {
    output = output.replace(re, '***REDACTED***');
  }
  return output;
}
