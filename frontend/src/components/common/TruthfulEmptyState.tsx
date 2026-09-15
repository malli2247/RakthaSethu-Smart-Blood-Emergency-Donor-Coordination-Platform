import React from 'react';
import { Link } from 'react-router-dom';

interface TruthfulEmptyStateProps {
  icon?: React.ReactNode;
  count?: number;
  title: string;
  description: string;
  actionText?: string;
  actionLink?: string;
  onAction?: () => void;
  className?: string;
}

export const TruthfulEmptyState: React.FC<TruthfulEmptyStateProps> = ({
  icon,
  count,
  title,
  description,
  actionText,
  actionLink,
  onAction,
  className = '',
}) => {
  return (
    <div
      className={`flex flex-col items-center justify-center p-8 sm:p-10 text-center rounded-3xl bg-slate-50 border border-dashed border-slate-200 ${className}`}
    >
      {count !== undefined && (
        <span className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-white border border-slate-200 text-slate-800 text-xl font-black mb-3 shadow-xs">
          {count}
        </span>
      )}
      {icon && <div className="text-slate-400 mb-3">{icon}</div>}
      <h3 className="text-base font-bold text-slate-900 tracking-tight">{title}</h3>
      <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-md leading-relaxed">
        {description}
      </p>
      {(actionText && (actionLink || onAction)) && (
        <div className="mt-5">
          {actionLink ? (
            <Link
              to={actionLink}
              className="inline-flex items-center justify-center px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-xs transition-colors"
            >
              {actionText}
            </Link>
          ) : (
            <button
              type="button"
              onClick={onAction}
              className="inline-flex items-center justify-center px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-xs transition-colors"
            >
              {actionText}
            </button>
          )}
        </div>
      )}
    </div>
  );
};
