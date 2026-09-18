#!/usr/bin/env node
/**
 * Content gate — `npm run validate:questions`.
 *
 * Validates the shipped Ontario bank against the *app's own* Zod contracts, so
 * CI can never pass a bank the app would reject at module load. It loads the
 * real `src/**` TypeScript rather than a copy of the data: the schema lives in
 * one place or it eventually diverges.
 *
 * Errors fail the build:
 *   1. `questionBankSchema.parse` on the assembled bank
 *   2. `regionConfigSchema.parse` on the region config
 *   3. duplicate question IDs across the whole bank
 *   4. each scored section holds at least `testFormat.split[section]` questions
 *      (`--allow-incomplete` downgrades this to a warning while authoring)
 *   5. the free tier can fill one practice session
 *   6. every `handbookRef` root is still a heading in `mto-drivers-handbook.md`
 *
 * Warnings never fail: id prefixes, bank size vs `testFormat.bankTarget`.
 *
 * Flags: `--allow-incomplete`, `--json`
 */

import { existsSync, readFileSync, statSync } from 'node:fs';
import Module, { createRequire } from 'node:module';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const ROOT = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const SRC = path.join(ROOT, 'src');
const HANDBOOK = path.join(ROOT, 'mto-drivers-handbook.md');

const argv = new Set(process.argv.slice(2));
const allowIncomplete = argv.has('--allow-incomplete');
const asJson = argv.has('--json');

/**
 * Minimal TypeScript loader.
 *
 * Node cannot `require` TypeScript and does not know the `@/*` alias, so the
 * two hooks below make `src/**` loadable from a plain-Node script.
 * `transpileModule` strips type syntax only, which is all the content, schema
 * and region modules need.
 */
const require = createRequire(import.meta.url);
const extensions = Module._extensions ?? require.extensions;

function compile(filename) {
  const { outputText, diagnostics } = ts.transpileModule(readFileSync(filename, 'utf8'), {
    fileName: filename,
    reportDiagnostics: true,
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
    },
  });
  const fatal = (diagnostics ?? []).filter((d) => d.category === ts.DiagnosticCategory.Error);
  if (fatal.length > 0) {
    const details = fatal
      .map((d) => ts.flattenDiagnosticMessageText(d.messageText, ' '))
      .join('; ');
    throw new SyntaxError(`${path.relative(ROOT, filename)}: ${details}`);
  }
  return outputText;
}

for (const extension of ['.ts', '.tsx']) {
  extensions[extension] = (module, filename) => module._compile(compile(filename), filename);
}

const resolveFilename = Module._resolveFilename;
Module._resolveFilename = function patchedResolve(request, parent, isMain, options) {
  if (typeof request === 'string' && request.startsWith('@/')) {
    const base = path.join(SRC, request.slice(2));
    for (const candidate of [base, `${base}.ts`, `${base}.tsx`, path.join(base, 'index.ts')]) {
      if (existsSync(candidate) && statSync(candidate).isFile()) {
        return resolveFilename.call(this, candidate, parent, isMain, options);
      }
    }
  }
  return resolveFilename.call(this, request, parent, isMain, options);
};

function load(relativePath) {
  return require(path.join(SRC, relativePath));
}

const errors = [];
const warnings = [];
const fail = (message) => errors.push(message);
const warn = (message) => warnings.push(message);

function describeZodError(error) {
  if (!error || !Array.isArray(error.issues)) return error?.message ?? String(error);
  return error.issues
    .map((issue) => `${issue.path.join('.') || '<root>'}: ${issue.message}`)
    .join('\n      ');
}

const { ontarioBank } = load('content/ontario/questions.ts');
const { region } = load('content/ontario/index.ts');
const { questionBankSchema } = load('schema/question.ts');
const { regionConfigSchema } = load('schema/region.ts');

// 1 + 2 — the app's own contracts, applied to the shipped data.
try {
  questionBankSchema.parse(ontarioBank);
} catch (error) {
  fail(`bank does not satisfy questionBankSchema:\n      ${describeZodError(error)}`);
}

try {
  regionConfigSchema.parse(region);
} catch (error) {
  fail(`region does not satisfy regionConfigSchema:\n      ${describeZodError(error)}`);
}

const questions = ontarioBank.questions;

// 3 — duplicate IDs would make progress tracking unrecoverable.
const seen = new Map();
for (const question of questions) {
  seen.set(question.id, (seen.get(question.id) ?? 0) + 1);
}
for (const [id, count] of seen) {
  if (count > 1) fail(`duplicate question id "${id}" (${count} occurrences)`);
}

// 4 — a section cannot be sampled if the bank is smaller than the section.
const sections = Object.keys(region.testFormat.split);
const coverage = {};
for (const section of sections) {
  const inSection = questions.filter((question) => question.category === section);
  coverage[section] = inSection.length;
  const required = region.testFormat.split[section];
  if (inSection.length < required) {
    const message = `${section}: ${inSection.length} questions, but a full simulation needs ${required}`;
    if (allowIncomplete) warn(message);
    else fail(`${message} (pass --allow-incomplete while authoring)`);
  }
}

// 5 — a free tier that cannot fill one practice session is a broken paywall.
const freeQuestions = questions.filter((question) => question.isFree);
if (freeQuestions.length < region.freeTier.practicePerDay) {
  fail(
    `free tier broken: ${freeQuestions.length} free questions for practicePerDay=${region.freeTier.practicePerDay}`,
  );
}
for (const section of sections) {
  const freeInSection = freeQuestions.filter((question) => question.category === section).length;
  if (freeInSection === 0 && coverage[section] > 0) {
    warn(`${section}: no free questions, so the paywall teaser is empty for that section`);
  }
}

// 6 — `handbookRef` is the promise that content is traceable; make it checkable.
if (existsSync(HANDBOOK)) {
  const handbook = readFileSync(HANDBOOK, 'utf8');
  const roots = new Set(questions.map((question) => question.handbookRef.split('>')[0].trim()));
  for (const root of roots) {
    if (!handbook.includes(root)) {
      fail(`handbookRef "${root}" is not a heading in mto-drivers-handbook.md`);
    }
  }
} else {
  warn('mto-drivers-handbook.md not found; skipped handbookRef grounding check');
}

// Warnings only — authoring conventions, not correctness.
for (const question of questions) {
  if (!question.id.startsWith(`${question.category}-`)) {
    warn(`id "${question.id}" is not prefixed with its category "${question.category}"`);
  }
}
const target = region.testFormat.bankTarget;
if (questions.length < target) {
  warn(`bank ${questions.length}/${target} questions (${Math.round((questions.length / target) * 100)}% of target)`);
}

const summary = {
  bank: `${ontarioBank.region} v${ontarioBank.version} (verified ${ontarioBank.verifiedAt})`,
  handbookEdition: ontarioBank.handbookEdition,
  questions: questions.length,
  coverage,
  free: freeQuestions.length,
  bankTarget: target,
  errors,
  warnings,
};

if (asJson) {
  process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
} else {
  process.stdout.write(`Ontario content bank — ${summary.bank}\n`);
  process.stdout.write(`  handbook edition  ${summary.handbookEdition}\n`);
  process.stdout.write(
    `  section coverage  ${sections
      .map((section) => `${section} ${coverage[section]}/${region.testFormat.split[section]}`)
      .join(', ')}\n`,
  );
  process.stdout.write(`  free questions    ${summary.free}\n`);
  process.stdout.write(`  bank target       ${summary.questions}/${target}\n`);
  for (const warning of warnings) process.stdout.write(`  warn: ${warning}\n`);
  for (const error of errors) process.stdout.write(`  ERROR: ${error}\n`);
  process.stdout.write(errors.length === 0 ? 'OK\n' : `FAILED with ${errors.length} error(s)\n`);
}

process.exitCode = errors.length === 0 ? 0 : 1;