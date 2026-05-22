import { useEffect } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { check } from "@tauri-apps/plugin-updater";
import Layout from "./components/Layout";
import BrowsePage from "./pages/BrowsePage";
import AddonDetailPage from "./pages/AddonDetailPage";
import InstalledPage from "./pages/InstalledPage";

function App() {
  useEffect(() => {
    const doUpdate = async () => {
      try {
        const update = await check();
        if (update) {
          await update.downloadAndInstall();
        }
      } catch {
        // silently fail - update check is non-critical
      }
    };
    doUpdate();
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<BrowsePage />} />
          <Route path="/addon/:id" element={<AddonDetailPage />} />
          <Route path="/installed" element={<InstalledPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;