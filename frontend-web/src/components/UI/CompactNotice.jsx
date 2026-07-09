import React from 'react';

const toneClasses = {
  amber: 'border-amber-200 bg-amber-50 text-amber-950',
  emerald: 'border-emerald-200 bg-emerald-50 text-emerald-950',
  red: 'border-red-200 bg-red-50 text-red-800',
  slate: 'border-slate-200 bg-slate-50 text-slate-700',
  teal: 'border-teal-100 bg-teal-50 text-teal-950',
};

function CompactNotice({ children, className = '', items = [], title, tone = 'slate' }) {
  const classes = toneClasses[tone] || toneClasses.slate;

  return (
    <section className={`rounded-md border px-4 py-3 text-sm ${classes} ${className}`}>
      {title && <p className="font-semibold">{title}</p>}
      {children && <p className={title ? 'mt-1 leading-5' : 'leading-5'}>{children}</p>}
      {items.length > 0 && (
        <ul className="mt-2 list-disc space-y-1 pl-5 leading-5">
          {items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default CompactNotice;
