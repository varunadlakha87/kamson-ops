type MaskType = 'pan' | 'aadhaar' | 'bank_account' | 'mobile' | 'income';

const MASKERS: Record<MaskType, (v: string) => string> = {
  pan:          v => v.length >= 4 ? `${v.slice(0, 2)}•••••${v.slice(-2)}` : '•••••',
  aadhaar:      v => v.replace(/\d(?=\d{4})/g, '•'),
  bank_account: v => v.length > 4 ? `••••${v.slice(-4)}` : '••••',
  mobile:       v => v.length >= 6 ? `${v.slice(0, 2)}••••${v.slice(-2)}` : '••••',
  income:       _  => '₹ ••••••',
};

export function maskValue(value: string, type: MaskType): string {
  if (!value) return '';
  return MASKERS[type]?.(value) ?? '••••••';
}

export const SENSITIVE_DOC_TYPES = [
  'PAN Card', 'Aadhaar Card', 'Passport', 'Voter ID',
  'Bank Statement', 'Salary Slip', 'ITR',
];
