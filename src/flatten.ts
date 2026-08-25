import type { PayrollDocument } from './types.js';

/** A single comparable value, addressed by its path in the document. */
export type FlatField = { path: string; value: string | number };

/**
 * Flattens a document into a list of leaf fields addressed by path.
 * `anomalies` is deliberately excluded: it is the model's own judgment,
 * not an objective property of the source document.
 */
export function flatten(doc: PayrollDocument): FlatField[] {
  const fields: FlatField[] = [
    { path: 'employerTaxId', value: doc.employerTaxId },
    { path: 'employerName', value: doc.employerName },
    { path: 'period', value: doc.period },
    { path: 'statedTotal', value: doc.statedTotal },
  ];

  doc.locations.forEach((location, i) => {
    fields.push({ path: `locations[${i}].registrationNumber`, value: location.registrationNumber });
    fields.push({ path: `locations[${i}].locationName`, value: location.locationName });
    fields.push({ path: `locations[${i}].statedSubtotal`, value: location.statedSubtotal });

    location.employees.forEach((employee, j) => {
      const at = `locations[${i}].employees[${j}]`;
      fields.push({ path: `${at}.socialSecurityNumber`, value: employee.socialSecurityNumber });
      fields.push({ path: `${at}.fullName`, value: employee.fullName });
      fields.push({ path: `${at}.dailyBaseSalary`, value: employee.dailyBaseSalary });
      fields.push({ path: `${at}.daysWorked`, value: employee.daysWorked });
      fields.push({ path: `${at}.employerContribution`, value: employee.employerContribution });
      fields.push({ path: `${at}.employeeContribution`, value: employee.employeeContribution });
    });
  });

  return fields;
}