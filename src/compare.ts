import type { PayrollDocument } from './types';
import { flatten } from './flatten';

/** Monetary tolerance, consistent with the validation engine. */
const TOLERANCE = 0.01;

export interface FieldMismatch {
  path: string;
  expected: string | number | undefined;
  actual: string | number | undefined;
}

export interface ComparisonResult {
  totalFields: number;
  correctFields: number;
  accuracy: number;
  mismatches: FieldMismatch[];
  /** Fields present in ground truth but absent from the extraction, and vice versa. */
  structuralMismatch: boolean;
}

/**
 * Normalizes text before comparison: trims and collapses internal whitespace.
 * Documented decision: trailing spaces are treated as formatting noise,
 * not as extraction errors. This choice raises the reported accuracy and
 * must be stated alongside any number produced here.
 */
function normalizeText(value: string): string {
  return value.trim().replace(/\s+/g, ' ');
}

function isEqual(expected: string | number, actual: string | number): boolean {
  if (typeof expected === 'number' && typeof actual === 'number') {
    return Math.abs(expected - actual) <= TOLERANCE;
  }
  if (typeof expected === 'string' && typeof actual === 'string') {
    return normalizeText(expected) === normalizeText(actual);
  }
  return false;
}

export function compare(expected: PayrollDocument, actual: PayrollDocument): ComparisonResult {
  const expectedFields = flatten(expected);
  const actualFields = new Map(flatten(actual).map((f) => [f.path, f.value]));

  const mismatches: FieldMismatch[] = [];
  let correct = 0;

  for (const field of expectedFields) {
    const actualValue = actualFields.get(field.path);

    if (actualValue === undefined) {
      // The path does not exist in the extraction: a row or location is missing.
      mismatches.push({ path: field.path, expected: field.value, actual: undefined });
      continue;
    }

    if (isEqual(field.value, actualValue)) {
      correct += 1;
    } else {
      mismatches.push({ path: field.path, expected: field.value, actual: actualValue });
    }

    actualFields.delete(field.path);
  }

  // Anything left over was extracted but does not exist in ground truth: hallucinated rows.
  for (const [path, value] of actualFields) {
    mismatches.push({ path, expected: undefined, actual: value });
  }

  return {
    totalFields: expectedFields.length,
    correctFields: correct,
    accuracy: expectedFields.length === 0 ? 0 : correct / expectedFields.length,
    mismatches,
    structuralMismatch: mismatches.some((m) => m.expected === undefined || m.actual === undefined),
  };
}