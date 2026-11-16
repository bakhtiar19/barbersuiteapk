import type { ReactNode } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  backTo?: string;
  onBack?: () => void;
  rightSlot?: ReactNode;
}

export function PageHeader({ title, subtitle, backTo, onBack, rightSlot }: PageHeaderProps) {
  const navigate = useNavigate();

  const handleBack = () => {
    if (onBack) {
      onBack();
      return;
    }
    if (backTo) {
      navigate(backTo);
    } else {
      navigate(-1);
    }
  };

  return (
    <header className="pt-safe sticky top-0 z-30 border-b border-stone-200/80 bg-canvas/90 backdrop-blur-md">
      <div className="mx-auto flex min-h-[56px] max-w-6xl items-center justify-between gap-3 px-4 py-2">
        <div className="flex min-w-0 items-center gap-2">
          {(backTo || onBack) && (
            <button
              type="button"
              onClick={handleBack}
              aria-label="Kembali"
              className="-ml-2 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-brand-900 hover:bg-stone-200/60 active:bg-stone-200"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
          )}
          <div className="min-w-0">
            <h1 className="truncate text-[17px] font-bold tracking-tight text-brand-900">{title}</h1>
            {subtitle && <p className="truncate text-xs text-muted">{subtitle}</p>}
          </div>
        </div>
        {rightSlot && <div className="flex shrink-0 items-center gap-1.5">{rightSlot}</div>}
      </div>
    </header>
  );
}
