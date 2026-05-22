import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import BrowsePage from "./pages/BrowsePage";
import AddonDetailPage from "./pages/AddonDetailPage";
import InstalledPage from "./pages/InstalledPage";

function App() {
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