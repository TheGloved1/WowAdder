import type { CF2Addon } from "../types/curseforge";
import { isAddonInstalled } from "../services/addonManager";

interface AddonCardProps {
  addon: CF2Addon;
  onClick: (id: number) => void;
}

export default function AddonCard({ addon, onClick }: AddonCardProps) {
  const latestRelease = addon.latestFiles?.find(
    (f) => f.releaseType === 1
  ) ?? addon.latestFiles?.[0];

  const gameVersion = latestRelease?.gameVersions?.slice(-1)[0] ?? "";
  const downloadCount = addon.downloadCount.toLocaleString();
  const installed = isAddonInstalled(addon.id);

  const classNames = [
    addon.categories?.find((c) => c.isClass)?.name,
    addon.categories?.find((c) => c.name === "Healer" || c.name === "Tank" || c.name === "Damage Dealer")?.name,
  ].filter(Boolean);

  return (
    <button
      onClick={() => onClick(addon.id)}
      className="w-full text-left bg-gray-800/50 border border-gray-700/50 rounded-lg p-4 hover:bg-gray-800 hover:border-gray-600 transition-all group"
    >
      <div className="flex gap-3">
        <div className="w-16 h-16 shrink-0 rounded-lg overflow-hidden bg-gray-700">
          {addon.logo?.thumbnailUrl ? (
            <img
              src={addon.logo.thumbnailUrl}
              alt={addon.name}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-500">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-sm font-medium text-white truncate group-hover:text-blue-400 transition-colors">
              {addon.name}
            </h3>
            <span className="text-xs text-gray-500 shrink-0">{downloadCount} DL</span>
          </div>
          <p className="text-xs text-gray-400 mt-1 line-clamp-2">{addon.summary}</p>
          <div className="flex items-center gap-2 mt-2">
            {installed && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-500/10 text-green-400 border border-green-500/20 flex items-center gap-0.5">
                <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
                Installed
              </span>
            )}
            {classNames.length > 0 && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400">
                {classNames[0]}
              </span>
            )}
            {gameVersion && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-500/10 text-green-400">
                {gameVersion}
              </span>
            )}
            {latestRelease?.releaseType === 2 && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-yellow-500/10 text-yellow-400">
                Beta
              </span>
            )}
            {latestRelease?.releaseType === 3 && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/10 text-red-400">
                Alpha
              </span>
            )}
          </div>
        </div>
      </div>
    </button>
  );
}