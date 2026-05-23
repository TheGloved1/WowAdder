import type { CF2Addon } from "../types/curseforge";
import { isAddonInstalled } from "../services/addonManager";
import WoWBadge from "./wow/WoWBadge";
import WoWIconFrame from "./wow/WoWIcon";

interface AddonCardProps {
  addon: CF2Addon;
  onClick: (id: number) => void;
}

export default function AddonCard({ addon, onClick }: AddonCardProps) {
  const latestRelease =
    addon.latestFiles?.find((f) => f.releaseType === 1) ??
    addon.latestFiles?.[0];

  const gameVersion = latestRelease?.gameVersions?.slice(-1)[0] ?? "";
  const downloadCount = addon.downloadCount.toLocaleString();
  const installed = isAddonInstalled(addon.id);

  const classNames = [
    addon.categories?.find((c) => c.isClass)?.name,
    addon.categories?.find(
      (c) =>
        c.name === "Healer" || c.name === "Tank" || c.name === "Damage Dealer",
    )?.name,
  ].filter(Boolean);

  return (
    <button
      onClick={() => onClick(addon.id)}
      className="w-full text-left bg-wow-panel border border-wow-border-light rounded-sm p-3.5 hover:border-wow-border-gold/60 hover:shadow-[0_0_10px_rgba(161,98,7,0.1)] transition-all group relative
        before:pointer-events-none before:absolute before:inset-px
        before:border before:border-wow-border-gold/10 before:rounded-sm
        hover:before:border-wow-border-gold/20"
    >
      <div className="flex gap-3.5 relative">
        <WoWIconFrame size="md">
          {addon.logo?.thumbnailUrl ? (
            <img
              src={addon.logo.thumbnailUrl}
              alt={addon.name}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-wow-text-muted">
              <svg
                className="w-6 h-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
            </div>
          )}
        </WoWIconFrame>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-sm font-wow-heading tracking-wide text-wow-gold truncate group-hover:text-wow-gold/80 transition-colors">
              {addon.name}
            </h3>
            <span className="text-xs text-wow-text-muted shrink-0 whitespace-nowrap">
              {downloadCount} DL
            </span>
          </div>
          <p className="text-xs text-wow-text-dim mt-1 line-clamp-2 leading-relaxed">
            {addon.summary}
          </p>
          <div className="flex items-center gap-1.5 mt-2 flex-wrap">
            {installed && <WoWBadge variant="installed">Installed</WoWBadge>}
            {classNames.length > 0 && (
              <WoWBadge variant="class">{classNames[0]}</WoWBadge>
            )}
            {gameVersion && <WoWBadge variant="info">{gameVersion}</WoWBadge>}
            {latestRelease?.releaseType === 1 && (
              <WoWBadge variant="release">Release</WoWBadge>
            )}
            {latestRelease?.releaseType === 2 && (
              <WoWBadge variant="beta">Beta</WoWBadge>
            )}
            {latestRelease?.releaseType === 3 && (
              <WoWBadge variant="alpha">Alpha</WoWBadge>
            )}
          </div>
        </div>
      </div>
    </button>
  );
}
