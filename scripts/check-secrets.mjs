#!/usr/bin/env node
/* global console, process */
/**
 * Pre-commit secret scanner — blocks commits that contain obvious API keys.
 * Patterns cover the providers used (and historically misused) in this repo.
 */
import { execSync } from 'node:child_process';

const PATTERNS = [
  { name: 'Anthropic key', regex: /\bsk-ant-[A-Za-z0-9_-]{20,}\b/g },
  { name: 'OpenAI project key', regex: /\bsk-proj-[A-Za-z0-9_-]{20,}\b/g },
  { name: 'OpenAI legacy key', regex: /(?<![A-Za-z0-9])sk-[A-Za-z0-9]{40,}\b/g },
  { name: 'Meshy key', regex: /\bmsy_[A-Za-z0-9_-]{20,}\b/g },
  { name: 'GitHub token', regex: /\bghp_[A-Za-z0-9_-]{30,}\b/g },
  { name: 'GitHub fine-grained', regex: /\bgithub_pat_[A-Za-z0-9_]{50,}\b/g },
  { name: 'AWS access key', regex: /\bAKIA[0-9A-Z]{16}\b/g },
  { name: 'Slack bot token', regex: /\bxoxb-[0-9]+-[0-9]+-[A-Za-z0-9]+\b/g },
];

let diff;
try {
  diff = execSync('git diff --cached', { encoding: 'utf-8' });
} catch (err) {
  console.error('check-secrets: failed to read git diff');
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
}

if (!diff.trim()) {
  // Nothing staged — let git handle the empty-commit case
  process.exit(0);
}

const offenders = [];
for (const { name, regex } of PATTERNS) {
  const matches = diff.match(regex);
  if (matches) {
    const unique = [...new Set(matches)];
    offenders.push({
      name,
      count: matches.length,
      samples: unique.slice(0, 2).map((s) => s.slice(0, 12) + '…'),
    });
  }
}

if (offenders.length > 0) {
  console.error('\n❌ Secret scan blocked the commit:');
  for (const { name, count, samples } of offenders) {
    console.error(`  • ${name}: ${count} occurrence(s) — e.g. ${samples.join(', ')}`);
  }
  console.error('\nMove the secret(s) to .env (gitignored) or remove from the diff.\n');
  process.exit(1);
}

console.info('✓ Secret scan clean.');
