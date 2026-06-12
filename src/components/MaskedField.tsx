import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { useRBAC } from '../contexts/RBACContext';
import { useAuth } from '../contexts/AuthContext';
import { maskValue } from '../lib/dataMasking';
import { logAuditEvent } from '../lib/auditLogger';

type FieldType = 'pan' | 'aadhaar' | 'bank_account' | 'mobile' | 'income';

const DOC_TYPE_MAP: Record<FieldType, string> = {
  pan: 'PAN Card',
  aadhaar: 'Aadhaar Card',
  bank_account: 'Bank Statement',
  mobile: 'mobile',
  income: 'Salary Slip',
};

interface MaskedFieldProps {
  value: string;
  fieldType: FieldType;
  className?: string;
}

export function MaskedField({ value, fieldType, className = '' }: MaskedFieldProps) {
  const { canViewDocument, can } = useRBAC();
  const { user, profile } = useAuth();
  const [revealed, setRevealed] = useState(false);

  const docType = DOC_TYPE_MAP[fieldType];
  const { canView, isMasked } = canViewDocument(docType);
  const { allowed: canViewSensitive } = can('customers', 'view_sensitive');

  if (!canView) {
    return <span className={`text-slate-300 italic text-xs ${className}`}>Restricted</span>;
  }

  const shouldMask = isMasked && !revealed;
  const display = shouldMask ? maskValue(value, fieldType) : (value || '—');

  function handleReveal() {
    logAuditEvent({
      actor_id: user.id,
      actor_name: profile.full_name,
      actor_role: profile.role,
      action: 'view_sensitive',
      resource_type: 'customers',
      new_values: { field: fieldType },
    });
    setRevealed(true);
  }

  function handleHide() {
    setRevealed(false);
  }

  return (
    <span className={`inline-flex items-center gap-1.5 ${className}`}>
      <span className={shouldMask ? 'font-mono tracking-wider text-slate-500' : ''}>{display}</span>
      {isMasked && canViewSensitive && (
        <button
          onClick={revealed ? handleHide : handleReveal}
          className="text-blue-400 hover:text-blue-600 transition-colors flex-shrink-0"
          title={revealed ? 'Hide' : 'Reveal'}
        >
          {revealed ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
        </button>
      )}
    </span>
  );
}
