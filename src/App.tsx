import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import AddonDetailPage from './pages/AddonDetailPage';
import BrowsePage from './pages/BrowsePage';
import InstalledPage from './pages/InstalledPage';
import SettingsPage from './pages/SettingsPage';
import { loadPrefs } from './services/preferences';

function App() {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            refetchOnWindowFocus: false,
            retry: 2,
          },
        },
      }),
  );

  useEffect(() => {
    const prefs = loadPrefs();
    document.documentElement.setAttribute('data-theme', prefs.colorScheme);
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route path='/' element={<BrowsePage />} />
            <Route path='/addon/:id' element={<AddonDetailPage />} />
            <Route path='/installed' element={<InstalledPage />} />
            <Route path='/settings' element={<SettingsPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
