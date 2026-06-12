import { UserCircle, CreditCard, Shield, Building2 } from 'lucide-react';

const SECTION_META = {
  rms:                { icon: UserCircle, label: 'Relationship Managers', description: 'Manage RM profiles, territories, and commission tiers.' },
  loan_products:      { icon: CreditCard, label: 'Loan Products',         description: 'Configure loan product types, LTV ratios, and eligible banks.' },
  insurance_products: { icon: Shield,     label: 'Insurance Products',    description: 'Manage insurance product catalogue and premium rules.' },
  banks:              { icon: Building2,  label: 'Banks / NBFCs',         description: 'Add or update bank and NBFC partner details.' },
} as const;

type SectionKey = keyof typeof SECTION_META;

export default function PartnerManagement({ section = 'rms' }: { section?: SectionKey }) {
  const meta = SECTION_META[section];
  const Icon = meta.icon;
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center px-6">
      <div className="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center mb-4">
        <Icon className="w-8 h-8 text-blue-500" />
      </div>
      <h2 className="text-lg font-semibold text-slate-800 mb-2">{meta.label}</h2>
      <p className="text-slate-500 text-sm max-w-xs mb-4">{meta.description}</p>
      <span className="px-3 py-1 bg-amber-50 text-amber-600 text-xs font-medium rounded-full border border-amber-200">
        Coming Soon
      </span>
    </div>
  );
}
