import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { AdminProvider } from './modules/shared/context/AdminContext';
import Particles from './modules/shared/components/Particles/Particles';
import BackgroundMusic from './modules/shared/components/BackgroundMusic/BackgroundMusic';
import SoloGamePage from './modules/game/pages/SoloGamePage';

// Lazy load gameday pages
const GamedayListPage = lazy(() => import('./modules/gameday/pages/GamedayListPage/GamedayListPage'));
const GamedayDetailPage = lazy(() => import('./modules/gameday/pages/GamedayDetailPage/GamedayDetailPage'));
const DashboardPage = lazy(() => import('./modules/gameday/pages/DashboardPage/DashboardPage'));
const PlayPage = lazy(() => import('./modules/gameday/pages/PlayPage/PlayPage'));
const HomePage = lazy(() => import('./modules/home/pages/HomePage'));

// Lazy load tournament pages
const TournamentListPage = lazy(() => import('./modules/tournament/pages/TournamentListPage/TournamentListPage'));
const TournamentDetailPage = lazy(() => import('./modules/tournament/pages/TournamentDetailPage/TournamentDetailPage'));
const TournamentBracketPage = lazy(() => import('./modules/tournament/pages/TournamentBracketPage/TournamentBracketPage'));
const TournamentMatchPage = lazy(() => import('./modules/tournament/pages/TournamentMatchPage/TournamentMatchPage'));
const TournamentPlayPage = lazy(() => import('./modules/tournament/pages/TournamentPlayPage/TournamentPlayPage'));
const TournamentMatchHistoryPage = lazy(() => import('./modules/tournament/pages/TournamentMatchHistoryPage/TournamentMatchHistoryPage'));
const TournamentChampionPage = lazy(() => import('./modules/tournament/pages/TournamentChampionPage/TournamentChampionPage'));

function LoadingFallback() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-display)' }}>⏳ Cargando...</p>
    </div>
  );
}

export default function App() {
  return (
    <AdminProvider>
      <Particles />
      <BackgroundMusic />
      <BrowserRouter>
        <Suspense fallback={<LoadingFallback />}>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/solo" element={<SoloGamePage />} />
            <Route path="/gamedays" element={<GamedayListPage />} />
            <Route path="/gameday/:id" element={<GamedayDetailPage />} />
            <Route path="/gameday/:id/dashboard" element={<DashboardPage />} />
            <Route path="/gameday/:id/play" element={<PlayPage />} />
            <Route path="/tournaments" element={<TournamentListPage />} />
            <Route path="/tournament/:id" element={<TournamentDetailPage />} />
            <Route path="/tournament/:id/bracket" element={<TournamentBracketPage />} />
            <Route path="/tournament/:id/play" element={<TournamentPlayPage />} />
            <Route path="/tournament/:id/history" element={<TournamentMatchHistoryPage />} />
            <Route path="/tournament/:id/champion" element={<TournamentChampionPage />} />
            <Route path="/tournament/:id/match/:matchId" element={<TournamentMatchPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </AdminProvider>
  );
}
