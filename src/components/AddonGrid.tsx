import type { CF2Addon } from "../types/curseforge";
import AddonCard from "./AddonCard";

interface AddonGridProps {
  addons: CF2Addon[];
  onAddonClick: (id: number) => void;
  loading?: boolean;
  error?: string | null;
}

export default function AddonGrid({
  addons,
  onAddonClick,
  loading,
  error,
}: AddonGridProps) {
  if (error) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="w-12 h-12 mx-auto mb-3 rounded-sm border border-wow-danger/40 bg-wow-danger/10 flex items-center justify-center">
            <svg className="w-6 h-6 text-wow-danger" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <p className="text-wow-danger text-sm font-wow-heading tracking-wider">Failed to load addons</p>
          <p className="text-wow-text-muted text-xs mt-1">{error}</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="grid gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="bg-wow-panel border border-wow-border-light rounded-sm p-3.5 animate-pulse">
            <div className="flex gap-3.5">
              <div className="w-16 h-16 rounded-sm bg-wow-panel-hover" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-wow-panel-hover rounded w-2/3" />
                <div className="h-3 bg-wow-panel-hover/70 rounded w-full" />
                <div className="h-3 bg-wow-panel-hover/70 rounded w-1/2" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (addons.length === 0) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="w-12 h-12 mx-auto mb-3 rounded-sm border border-wow-border-light bg-wow-panel flex items-center justify-center">
            <svg className="w-6 h-6 text-wow-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <p className="text-wow-text-dim text-sm font-wow-heading tracking-wider">No addons found</p>
          <p className="text-wow-text-muted text-xs mt-1">Try a different search or filter</p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-3">
      {addons.map((addon) => (
        <AddonCard key={addon.id} addon={addon} onClick={onAddonClick} />
      ))}
    </div>
  );
}
