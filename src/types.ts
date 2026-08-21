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
}