import React from 'react';
import { CheckCircle2, XCircle } from 'lucide-react';
import { getPlanFunctionality, getPlanLimits } from '../config/publicPlanPresentation';

function PlanFunctionalityList({ plan, showExcluded = true, compact = false }) {
  const functionality = getPlanFunctionality(plan);
  const limits = getPlanLimits(plan);
  const visibleItems = showExcluded ? functionality : functionality.filter((item) => item.enabled);

  return (
    <div className={compact ? 'space-y-3' : 'space-y-4'}>
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Funcionalidad incluida</p>
        <ul className={compact ? 'mt-2 grid gap-2 text-sm' : 'mt-3 grid gap-2 text-sm'}>
          {visibleItems.map((item) => {
            const Icon = item.enabled ? CheckCircle2 : XCircle;
            return (
              <li className={item.enabled ? 'flex items-center gap-2 text-slate-700' : 'flex items-center gap-2 text-slate-400'} key={item.key}>
                <Icon className={item.enabled ? 'h-4 w-4 shrink-0 text-teal-700' : 'h-4 w-4 shrink-0 text-slate-300'} />
                <span>{item.label}</span>
              </li>
            );
          })}
        </ul>
      </div>
      <div className="flex flex-wrap gap-2">
        {limits.map((limit) => (
          <span className="rounded-md bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-600" key={limit}>
            {limit}
          </span>
        ))}
      </div>
    </div>
  );
}

export default PlanFunctionalityList;
