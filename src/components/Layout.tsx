import { Outlet, Link, useLocation } from "react-router-dom";

export default function Layout() {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col">
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