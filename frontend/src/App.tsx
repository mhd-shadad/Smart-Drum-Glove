import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useGloveStore } from './store/useGloveStore';
import Layout from './components/Layout';
import HomePage from './pages/HomePage';
import StudioPage from './pages/StudioPage';
import DrumsPage from './pages/DrumsPage';
import CalibratePage from './pages/CalibratePage';
import SettingsPage from './pages/SettingsPage';
import LogsPage from './pages/LogsPage';
import AboutPage from './pages/AboutPage';

export const App: React.FC = () => {
  const connectWebSocket = useGloveStore((s) => s.connectWebSocket);

  useEffect(() => {
    connectWebSocket();
  }, [connectWebSocket]);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<HomePage />} />
          <Route path="studio" element={<StudioPage />} />
          <Route path="drums" element={<DrumsPage />} />
          <Route path="calibrate" element={<CalibratePage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="logs" element={<LogsPage />} />
          <Route path="about" element={<AboutPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
};

export default App;
