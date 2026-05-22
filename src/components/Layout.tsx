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
    <div className="min-h-screen bg-gray-900 text-white flex flex-col">
      {updateState !== "idle" && (
        <div className={`px-4 py-2 text-sm text-center border-b flex items-center justify-center gap-3 ${
          updateState === "error"
            ? "bg-red-900/40 border-red-800 text-red-300"
            : "bg-blue-900/40 border-blue-800 text-blue-200"
        }`}>
          {updateState === "checking" && (
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
              Checking for updates...
            </div>
          )}
          {updateState === "downloading" && (
            <div className="flex items-center gap-3 w-full max-w-sm">
              <span className="shrink-0">Downloading v{updateVersion}</span>
              <div className="flex-1 h-1.5 bg-blue-950 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-400 rounded-full transition-all duration-200"
                  style={{
                    width: totalSize > 0
                      ? `${Math.min(100, (downloaded / totalSize) * 100)}%`
                      : "0%"
                  }}
                />
              </div>
              <span className="shrink-0 text-xs w-12 text-right">
                {totalSize > 0
                  ? `${Math.min(99, Math.round((downloaded / totalSize) * 100))}%`
                  : `${(downloaded / 1024 / 1024).toFixed(1)} MB`}
              </span>
            </div>
          )}
          {updateState === "installing" && (
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
              Installing v{updateVersion}...
            </div>
          )}
          {updateState === "error" && "Update check failed"}
        </div>
      )}
      <header className="border-b border-gray-800 bg-gray-900/95 backdrop-blur sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-xs font-bold">
              WA
            </div>
            <span className="font-bold text-lg">WowAdder</span>
          </Link>
          <nav className="flex items-center gap-1">
            <Link
              to="/"
              className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                location.pathname === "/"
                  ? "bg-blue-600/20 text-blue-400"
                  : "text-gray-400 hover:text-white hover:bg-gray-800"
              }`}
            >
              Browse
            </Link>
            <Link
              to="/installed"
              className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                location.pathname === "/installed"
                  ? "bg-blue-600/20 text-blue-400"
                  : "text-gray-400 hover:text-white hover:bg-gray-800"
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