import { useState, useEffect } from "react";
import { Outlet, Link, useLocation } from "react-router-dom";
import { check } from "@tauri-apps/plugin-updater";

export default function Layout() {
  const location = useLocation();
  const [updateState, setUpdateState] = useState<"idle" | "checking" | "downloading" | "installing" | "error">("idle");
  const [downloaded, setDownloaded] = useState(0);
  const [totalSize, setTotalSize] = useState(0);
  const [updateVersion, setUpdateVersion] = useState("");

  useEffect(() => {
    let cancelled = false;
    const doUpdate = async () => {
      try {
        setUpdateState("checking");
        const update = await check();
        if (cancelled || !update) {
          if (!cancelled) setUpdateState("idle");
          return;
        }
        setUpdateVersion(update.version);
        setUpdateState("downloading");
        await update.download((event) => {
          if (event.event === "Started") {
            setTotalSize(event.data.contentLength ?? 0);
          } else if (event.event === "Progress") {
            setDownloaded((prev) => prev + event.data.chunkLength);
          }
        });
        if (cancelled) return;
        setUpdateState("installing");
        await update.install();
      } catch {
        if (!cancelled) setUpdateState("error");
      }
    };
    doUpdate();
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="min-h-screen text-wow-text flex flex-col">
      {updateState !== "idle" && (
        <div className={`px-4 py-2 text-sm text-center border-b flex items-center justify-center gap-3 ${
          updateState === "error"
            ? "bg-wow-danger/15 border-wow-danger/30 text-wow-danger"
            : "bg-wow-border-gold/10 border-wow-border-gold/30 text-wow-gold"
        }`}>
          {updateState === "checking" && (
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 border-2 border-wow-gold border-t-transparent rounded-full animate-spin" />
              Checking for updates...
            </div>
          )}
          {updateState === "downloading" && (
            <div className="flex items-center gap-3 w-full max-w-sm">
              <span className="shrink-0 font-wow-heading">Downloading v{updateVersion}</span>
              <div className="flex-1 h-2 bg-wow-panel rounded-sm overflow-hidden border border-wow-border-gold/30 relative">
                <div className="absolute inset-0 bg-gradient-to-r from-wow-border-gold to-wow-gold transition-all duration-200"
                  style={{
                    width: totalSize > 0
                      ? `${Math.min(100, (downloaded / totalSize) * 100)}%`
                      : "0%"
                  }}
                />
              </div>
              <span className="shrink-0 text-xs w-12 text-right text-wow-text-dim">
                {totalSize > 0
                  ? `${Math.min(99, Math.round((downloaded / totalSize) * 100))}%`
                  : `${(downloaded / 1024 / 1024).toFixed(1)} MB`}
              </span>
            </div>
          )}
          {updateState === "installing" && (
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 border-2 border-wow-gold border-t-transparent rounded-full animate-spin" />
              <span className="font-wow-heading">Installing v{updateVersion}...</span>
            </div>
          )}
          {updateState === "error" && "Update check failed"}
        </div>
      )}
      <header className="border-b border-wow-border relative">
        <div className="absolute inset-0 bg-gradient-to-b from-wow-border-gold/5 to-transparent pointer-events-none" />
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between relative">
          <Link to="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity group">
            <div className="w-8 h-8 rounded-sm bg-gradient-to-br from-wow-gold to-wow-border-gold flex items-center justify-center shadow-[0_0_8px_rgba(251,191,36,0.2)]">
              <svg className="w-4 h-4 text-wow-bg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <span className="font-wow-heading text-lg tracking-wider text-wow-gold group-hover:text-wow-gold/80 transition-colors">
              WowAdder
            </span>
          </Link>
          <nav className="flex items-center gap-1">
            <Link
              to="/"
              className={`px-3 py-1.5 text-sm font-wow-heading tracking-wider uppercase transition-all duration-150 relative ${
                location.pathname === "/"
                  ? "text-wow-gold after:absolute after:bottom-0 after:left-1/2 after:-translate-x-1/2 after:w-3/4 after:h-px after:bg-wow-gold/60"
                  : "text-wow-text-dim hover:text-wow-text"
              }`}
            >
              Browse
            </Link>
            <Link
              to="/installed"
              className={`px-3 py-1.5 text-sm font-wow-heading tracking-wider uppercase transition-all duration-150 relative ${
                location.pathname === "/installed"
                  ? "text-wow-gold after:absolute after:bottom-0 after:left-1/2 after:-translate-x-1/2 after:w-3/4 after:h-px after:bg-wow-gold/60"
                  : "text-wow-text-dim hover:text-wow-text"
              }`}
            >
              Installed
            </Link>
          </nav>
        </div>
      </header>
      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  );
}
