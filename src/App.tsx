import { useEffect } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import BrowsePage from "./pages/BrowsePage";
import AddonDetailPage from "./pages/AddonDetailPage";
import InstalledPage from "./pages/InstalledPage";
import SettingsPage from "./pages/SettingsPage";
import { loadPrefs } from "./services/preferences";

function App() {
  useEffect(() => {
    const prefs = loadPrefs();
    document.documentElement.setAttribute("data-theme", prefs.colorScheme);
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<BrowsePage />} />
          <Route path="/addon/:id" element={<AddonDetailPage />} />
          <Route path="/installed" element={<InstalledPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;