import type {
  PayrollDocument,
  ValidationFinding,
  ValidationResult,
} from './types.js';


/** RFC for companies: 3 letters, 6 digits (YYMMDD), 3 alphanumeric. */
const RFC_COMPANY = /^[A-ZÑ&]{3}\d{6}[A-Z0-9]{3}$/;

/** NSS: exactly 11 digits. */
const NSS = /^\d{11}$/;

/** Reported period: YYYY-MM. */
const PERIOD = /^\d{4}-(0[1-9]|1[0-2])$/;



/**
 * Monetary tolerance in MXN.
 * Amounts are IEEE 754 doubles, so exact equality is unreliable.
 * Known limitation: production code should use integer cents.
 */
const TOLERANCE = 0.01;

/** Sum of both contribution sides for one location. */
function sumLocation(employees: PayrollDocument['locations'][number]['employees']): number {
  return employees.reduce(
    (total, e) => total + e.employerContribution + e.employeeContribution,
    0,
  );
}

/**
 * Runs deterministic business rules against an extracted document.
 * This layer never calls the model: it is the loud counterpart to the
 * model's silent inference.
 */
export function validate(doc: PayrollDocument): ValidationResult {
  
  const findings: ValidationFinding[] = [];

  // --- Document-level format rules ---

  if (!RFC_COMPANY.test(doc.employerTaxId)) {
    findings.push({
      code: 'INVALID_RFC_FORMAT',
      severity: 'error',
      message: `Employer RFC "${doc.employerTaxId}" does not match the expected company format.`,
      path: 'employerTaxId',
    });
  }

  if (!PERIOD.test(doc.period)) {
    findings.push({
      code: 'INVALID_PERIOD_FORMAT',
      severity: 'error',
      message: `Period "${doc.period}" is not in YYYY-MM format.`,
      path: 'period',
    });
  }

  if (doc.locations.length === 0) {
    findings.push({
      code: 'NO_LOCATIONS',
      severity: 'error',
      message: 'No work locations were extracted from the document.',
      path: 'locations',
    });
  }

  /** Tracks NSS across the whole document to detect duplicates. */
  const seenNSS = new Map<string, string>();

  let sumOfSubtotals = 0;

  doc.locations.forEach((location, i) => {
    const computed = sumLocation(location.employees);
    sumOfSubtotals += location.statedSubtotal;

    // Rule 1: employees must reconcile with the location subtotal.
    if (Math.abs(computed - location.statedSubtotal) > TOLERANCE) {
      findings.push({
        code: 'LOCATION_SUBTOTAL_MISMATCH',
        severity: 'error',
        message:
          `Location "${location.locationName}": employee contributions add up to ` +
          `${computed.toFixed(2)} but the document states ${location.statedSubtotal.toFixed(2)}.`,
        path: `locations[${i}]`,
      });
    }

    // Rule 2: a location with no employees is almost certainly an extraction failure.
    if (location.employees.length === 0) {
      findings.push({
        code: 'EMPTY_LOCATION',
        severity: 'warning',
        message: `Location "${location.locationName}" has no employee records.`,
        path: `locations[${i}]`,
      });
    }

    location.employees.forEach((employee, j) => {
      const at = `locations[${i}].employees[${j}]`;

      if (!NSS.test(employee.socialSecurityNumber)) {
        findings.push({
          code: 'INVALID_NSS_FORMAT',
          severity: 'error',
          message: `NSS "${employee.socialSecurityNumber}" for ${employee.fullName} is not 11 digits.`,
          path: at,
        });
      }

      // A duplicated NSS usually means a row was read twice.
      const previous = seenNSS.get(employee.socialSecurityNumber);
      if (previous) {
        findings.push({
          code: 'DUPLICATE_NSS',
          severity: 'error',
          message: `NSS ${employee.socialSecurityNumber} appears twice: ${previous} and ${employee.fullName}.`,
          path: at,
        });
      } else {
        seenNSS.set(employee.socialSecurityNumber, employee.fullName);
      }

      if (employee.daysWorked < 1 || employee.daysWorked > 31) {
        findings.push({
          code: 'DAYS_OUT_OF_RANGE',
          severity: 'error',
          message: `${employee.fullName} has ${employee.daysWorked} days worked, outside 1–31.`,
          path: at,
        });
      }

      if (employee.dailyBaseSalary <= 0) {
        findings.push({
          code: 'NON_POSITIVE_SALARY',
          severity: 'error',
          message: `${employee.fullName} has a daily base salary of ${employee.dailyBaseSalary}.`,
          path: at,
        });
      }

      if (employee.employerContribution < 0 || employee.employeeContribution < 0) {
        findings.push({
          code: 'NEGATIVE_CONTRIBUTION',
          severity: 'error',
          message: `${employee.fullName} has a negative contribution amount.`,
          path: at,
        });
      }

      // Heuristic: contributions should bear some relation to salary × days.
      const base = employee.dailyBaseSalary * employee.daysWorked;
      const total = employee.employerContribution + employee.employeeContribution;
      if (base > 0 && total > base) {
        findings.push({
          code: 'CONTRIBUTION_EXCEEDS_BASE',
          severity: 'warning',
          message:
            `${employee.fullName}: contributions (${total.toFixed(2)}) exceed ` +
            `salary × days (${base.toFixed(2)}). Possible misread.`,
          path: at,
        });
      }
    });

  });

  // Rule 3: subtotals must reconcile with the grand total.
  if (Math.abs(sumOfSubtotals - doc.statedTotal) > TOLERANCE) {
    findings.push({
      code: 'GRAND_TOTAL_MISMATCH',
      severity: 'error',
      message:
        `Location subtotals add up to ${sumOfSubtotals.toFixed(2)} but the ` +
        `document states a grand total of ${doc.statedTotal.toFixed(2)}.`,
      path: 'statedTotal',
    });
  }

  // Rule 4: the model reported fields it could not read.
  if (doc.missingFields.length > 0) {
    findings.push({
      code: 'MISSING_FIELDS_REPORTED',
      severity: 'warning',
      message: `The extractor could not read: ${doc.missingFields.join(', ')}.`,
      path: 'missingFields',
    });
  }

    // Rule 5: low-confidence inferences should reach a human.
  const lowConfidence = doc.anomalies.filter((a) => a.confidence === 'low');
  if (lowConfidence.length > 0) {
    findings.push({
      code: 'LOW_CONFIDENCE_INFERENCE',
      severity: 'error',
      message: `${lowConfidence.length} value(s) were inferred with low confidence. Manual review required.`,
      path: 'anomalies',
    });
  }

  for (const anomaly of doc.anomalies) {
    if (anomaly.confidence !== 'low') {
      findings.push({
        code: 'INFERENCE_REPORTED',
        severity: 'warning',
        message: `${anomaly.location}: ${anomaly.issue} → ${anomaly.resolution} (${anomaly.confidence} confidence).`,
        path: 'anomalies',
      });
    }
  }

  return {
    findings,
    passed: !findings.some((f) => f.severity === 'error'),
  };
}