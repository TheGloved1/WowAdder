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
          <svg className="w-12 h-12 text-red-400 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <p className="text-red-400 text-sm font-medium">Failed to load addons</p>
          <p className="text-gray-500 text-xs mt-1">{error}</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="grid gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="bg-gray-800/30 border border-gray-700/30 rounded-lg p-4 animate-pulse">
            <div className="flex gap-3">
              <div className="w-16 h-16 rounded-lg bg-gray-700/50" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-700/50 rounded w-2/3" />
                <div className="h-3 bg-gray-700/30 rounded w-full" />
                <div className="h-3 bg-gray-700/30 rounded w-1/2" />
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
          <svg className="w-12 h-12 text-gray-600 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <p className="text-gray-400 text-sm font-medium">No addons found</p>
          <p className="text-gray-600 text-xs mt-1">Try a different search or filter</p>
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