import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { BrowserRouter, Route, Routes, useNavigate } from 'react-router-dom';
import Layout from './components/Layout';
import AddonDetailPage from './pages/AddonDetailPage';
import BrowsePage from './pages/BrowsePage';
import InstalledPage from './pages/InstalledPage';
import SettingsPage from './pages/SettingsPage';
import { loadPrefs } from './services/preferences';

function DeepLinkListener() {
  const navigate = useNavigate();
  const processingRef = useRef(false);

  function handleDeepLink(urlStr: string) {
    if (processingRef.current) return;
    try {
      const url = new URL(urlStr);
      if (url.protocol !== 'curseforge:') return;
      const addonId = url.searchParams.get('addonId');
      const fileId = url.searchParams.get('fileId');
      if (!addonId) return;

      const prefs = loadPrefs();
      if (!prefs.deepLink) return;

      processingRef.current = true;
      const params = new URLSearchParams();
      if (fileId) params.set('fileId', fileId);
      const to = `/addon/${addonId}${params.toString() ? '?' + params.toString() : ''}`;
      navigate(to);
    } catch {}
  }

  useEffect(() => {
    let unlisten: (() => void) | undefined;

    async function setup() {
      // Primary: deep-link plugin handles first-instance URLs
      const { onOpenUrl } = await import('@tauri-apps/plugin-deep-link');
      unlisten = await onOpenUrl((urls) => {
        for (const urlStr of urls) {
          handleDeepLink(urlStr);
        }
      });

      // Fallback: single-instance forwarded URLs via custom event
      const { listen } = await import('@tauri-apps/api/event');
      const unlisten2 = await listen<string>('deep-link-url', (event) => {
        handleDeepLink(event.payload);
      });

      const origUnlisten = unlisten;
      unlisten = () => {
        origUnlisten?.();
        unlisten2();
      };
    }

    setup();
    return () => {
      unlisten?.();
    };
  }, [navigate]);

  return null;
}

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
    document.documentElement.style.setProperty('--font-wow-heading', `'${prefs.headingFont}', serif`);
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <DeepLinkListener />
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
