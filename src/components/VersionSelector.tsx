import { useRef, useState } from "react";

interface VersionSelectorProps {
  versions: string[];
  selectedVersion: string;
  onVersionChange: (version: string) => void;
  loading?: boolean;
}

export default function VersionSelector({
  versions,
  selectedVersion,
  onVersionChange,
  loading,
}: VersionSelectorProps) {
  const detailsRef = useRef<HTMLDetailsElement>(null);
  const [filterQuery, setFilterQuery] = useState("");

  const filteredVersions = versions.filter((v) =>
    v.toLowerCase().includes(filterQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-wow-panel border border-wow-border-light rounded-sm min-w-[160px]">
        <svg className="animate-spin h-4 w-4 text-wow-gold" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        <span className="text-wow-text-dim text-sm">Loading...</span>
      </div>
    );
  }

  return (
    <details
      ref={detailsRef}
      className="relative"
      onToggle={() => {
        if (!detailsRef.current?.hasAttribute("open")) {
          setFilterQuery("");
        }
      }}
    >
      <summary
        className="flex items-center gap-2 px-3 py-2 bg-wow-panel border border-wow-border-light rounded-sm cursor-pointer hover:border-wow-border-gold transition-colors select-none list-none marker:hidden"
      >
        <svg className="w-4 h-4 text-wow-gold shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span className="text-wow-text text-sm font-wow-heading tracking-wider truncate max-w-[120px]">
          {selectedVersion || "Select Version"}
        </span>
        <svg className="w-3 h-3 text-wow-text-muted shrink-0 ml-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </summary>
      <div className="absolute top-full left-0 mt-1 w-64 max-h-72 overflow-y-auto bg-wow-panel border border-wow-border-light rounded-sm shadow-xl z-50">
        <div className="p-2">
          <input
            type="text"
            placeholder="Filter versions..."
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
            className="w-full px-2 py-1.5 text-sm bg-wow-bg border border-wow-border-light rounded-sm text-wow-text placeholder-wow-text-muted focus:outline-none focus:border-wow-border-gold"
            autoFocus
          />
        </div>
        <div className="border-t border-wow-border-light" />
        <div className="py-1 max-h-52 overflow-y-auto">
          {filteredVersions.map((version) => (
            <button
              key={version}
              onClick={() => {
                onVersionChange(version);
                setFilterQuery("");
                detailsRef.current?.removeAttribute("open");
              }}
              className={`w-full text-left px-3 py-1.5 text-sm transition-colors hover:bg-wow-panel-hover ${
                version === selectedVersion
                  ? "text-wow-gold bg-wow-border-gold/10"
                  : "text-wow-text-dim"
              }`}
            >
              {version}
            </button>
          ))}
          {filteredVersions.length === 0 && (
            <p className="px-3 py-2 text-sm text-wow-text-muted">No versions match</p>
          )}
        </div>
      </div>
    </details>
  );
}
