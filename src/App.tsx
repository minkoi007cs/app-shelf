import { lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import Layout from './components/Layout';

const AppWallet = lazy(() => import('./pages/AppWallet'));

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Layout />}>
            {/* App Wallet — public read */}
            <Route index element={<AppWallet />} />
            <Route path="app-wallet" element={<AppWallet />} />
            <Route path="app-wallet/:appId" element={<AppWallet />} />
            <Route path="apps/:appId" element={<AppWallet />} />
            <Route path="app/:appId" element={<AppWallet />} />
            <Route path="code-experience" element={<AppWallet />} />
            <Route path="notes" element={<AppWallet />} />

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
