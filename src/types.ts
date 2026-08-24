/**
 * Domain types for payroll compliance documents (Mexican IMSS/SUA format).
 * Contract between LLM extraction and everything downstream:
 * validation, reporting and evaluation.
 */

export type Confidence = 'high' | 'medium' | 'low';
export type Severity = 'error' | 'warning' | 'ok';

/** A single employee line inside a work location. */
export interface EmployeeRecord {
  /** Mexican social security number (11 digits). Kept as string: leading zeros matter. */
  socialSecurityNumber: string;
  fullName: string;
  /** Daily contribution base salary, in MXN. */
  dailyBaseSalary: number;
  daysWorked: number;
  employerContribution: number;
  employeeContribution: number;
}

/** Employees are grouped by work location in the source document. */
export interface WorkLocation {
  /** Employer registration number for this location. */
  registrationNumber: string;
  locationName: string;
  employees: EmployeeRecord[];
  /** Subtotal stated by the document for this location, not computed by us. */
  statedSubtotal: number;
}

/** A full payroll document extracted from a PDF. */
export interface PayrollDocument {
  /** Employer tax ID (RFC), 12 chars for companies. */
  employerTaxId: string;
  employerName: string;
  /** Reported period, YYYY-MM. Not a Date: a payroll month is not an instant. */
  period: string;
  locations: WorkLocation[];
  /** Grand total stated on the document itself. */
  statedTotal: number;
  /** Fields the model could not find. Gives the model a place to report absence
   *  instead of inventing a value. */
  missingFields: string[];

  /** Judgment calls the model made. Empty means everything was read directly. */
  anomalies: ExtractionAnomaly[];
}

/** A single finding produced by the validation engine. */
export interface ValidationFinding {
  /** Stable machine-readable code, e.g. 'LOCATION_SUBTOTAL_MISMATCH'. */
  code: string;
  severity: Severity;
  /** Human-readable explanation, safe to show in the UI. */
  message: string;
  /** Where the problem is, e.g. 'locations[0].employees[2]'. */
  path: string;
}

/** Full result of validating one document. */
export interface ValidationResult {
  findings: ValidationFinding[];
  /** True when there are no findings with severity 'error'. */
  passed: boolean;
}

/** Something the model had to resolve rather than read directly. */
export interface ExtractionAnomaly {
  /** Where in the source it occurred, in the model's own words. */
  location: string;
  /** What was ambiguous or malformed. */
  issue: string;
  /** How the model resolved it. */
  resolution: string;
  confidence: Confidence;
}