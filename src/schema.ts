/**
 * JSON Schema describing the shape we force the model to return.
 * This mirrors the PayrollDocument interface in types.ts.
 *
 * The descriptions are not documentation for humans: the model reads them
 * and they measurably change extraction quality. Treat them as prompt.
 */
export const payrollTool = {
  name: 'record_payroll_document',
  description:
    'Record the structured contents of a Mexican IMSS/SUA payroll determination document.',
  input_schema: {
    type: 'object' as const,
    properties: {
      employerTaxId: {
        type: 'string',
        description: 'Employer RFC exactly as printed. 12 characters for companies.',
      },
      employerName: {
        type: 'string',
        description: 'Employer legal name as printed.',
      },
      period: {
        type: 'string',
        description: 'Reported period in YYYY-MM format.',
      },
      locations: {
        type: 'array',
        description: 'One entry per work location listed in the document.',
        items: {
          type: 'object',
          properties: {
            registrationNumber: {
              type: 'string',
              description: 'Employer registration number (registro patronal) for this location.',
            },
            locationName: { type: 'string' },
            employees: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  socialSecurityNumber: {
                    type: 'string',
                    description: '11-digit NSS. Keep leading zeros. Never reformat.',
                  },
                  fullName: { type: 'string' },
                  dailyBaseSalary: {
                    type: 'number',
                    description: 'SDI, daily contribution base salary in MXN.',
                  },
                  daysWorked: { type: 'number' },
                  employerContribution: {
                    type: 'number',
                    description: 'Employer share in MXN.',
                  },
                  employeeContribution: {
                    type: 'number',
                    description: 'Employee withheld share in MXN.',
                  },
                },
                required: [
                  'socialSecurityNumber',
                  'fullName',
                  'dailyBaseSalary',
                  'daysWorked',
                  'employerContribution',
                  'employeeContribution',
                ],
              },
            },
            statedSubtotal: {
              type: 'number',
              description:
                'Subtotal as printed for this location. Copy it, never compute it.',
            },
          },
          required: ['registrationNumber', 'locationName', 'employees', 'statedSubtotal'],
        },
      },
      statedTotal: {
        type: 'number',
        description: 'Grand total as printed on the document. Copy it, never compute it.',
      },
      missingFields: {
        type: 'array',
        items: { type: 'string' },
        description:
          'Names of any required fields that are absent or unreadable. Report them here instead of guessing a value.',
      },
            anomalies: {
        type: 'array',
        description:
          'Every place where you had to infer, reconstruct or disambiguate rather than read a value directly. Report split rows, run-together numbers, values in unexpected positions, unclear characters, or anything you resolved by reasoning about context. An empty array means every value was read verbatim.',
        items: {
          type: 'object',
          properties: {
            location: {
              type: 'string',
              description: 'Where in the document, e.g. "employee row 2, PLANTA IRAPUATO".',
            },
            issue: { type: 'string', description: 'What was ambiguous or malformed.' },
            resolution: { type: 'string', description: 'How you resolved it.' },
            confidence: {
              type: 'string',
              enum: ['high', 'medium', 'low'],
              description: 'Your confidence in the resolution.',
            },
          },
          required: ['location', 'issue', 'resolution', 'confidence'],
        },
      },
    },
    required: [
      'employerTaxId',
      'employerName',
      'period',
      'locations',
      'statedTotal',
      'missingFields',
      'anomalies',
    ],
  },
};