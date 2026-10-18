import { useEffect } from 'react';
import { AppHeader, Footer, RefreshToast, SyncBanner } from './components/Layout';
import { AllItemsPage, CategoriesPage, CategoryPage, GroupPage, SearchPage } from './pages/BrowsePages';
import { AuthScreen, ConnectScreen, ErrorScreen, LoadingScreen } from './pages/GateScreens';
import { ItemEditPage } from './pages/ItemEditPage';
import { SettingsPage } from './pages/SettingsPage';
import { parseHash, useHash, type Route } from './router';
import { useStore } from './store/store';

function Page({ route }: { route: Route }) {
  switch (route.name) {
    case 'categories':
      return <CategoriesPage />;
    case 'category':
      return <CategoryPage id={route.id} />;
    case 'group':
      return <GroupPage id={route.id} />;
    case 'items':
      return <AllItemsPage group={route.group} />;
    case 'search':
      return <SearchPage q={route.q} />;
    case 'itemNew':
      return <ItemEditPage group={route.group} />;
    case 'item':
      return <ItemEditPage id={route.id} />;
    case 'settings':
      return <SettingsPage />;
  }
}

export function App() {
  const phase = useStore((s) => s.phase);
  const error = useStore((s) => s.error);
  const route = parseHash(useHash());

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [route.name, 'id' in route ? route.id : '']);

  if (phase === 'loading') return <LoadingScreen />;
  if (phase === 'connect') return <ConnectScreen />;
  if (phase === 'auth') return <AuthScreen />;
  if (phase === 'error' && error) return <ErrorScreen error={error} />;

  return (
    <div className="app">
      <AppHeader route={route} />
      <main className="container main">
        <SyncBanner />
        <Page route={route} />
      </main>
      <Footer />
      <RefreshToast />
    </div>
  );
}
