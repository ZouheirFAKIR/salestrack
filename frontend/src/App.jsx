import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Dashboard from './pages/Dashboard';
import NouvelleActivite from './pages/NouvelleActivite';
import Feed from './pages/Feed';
import Login from './pages/Login';
import Signup from './pages/Signup';
import TargetModal from './components/TargetModal';
import SuccessModal from './components/SuccessModal';
import { apiFetch } from './utils/api';

const dailyTarget = 5;

function AppLayout({ children }) {
  const [showModal, setShowModal] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [currentToday, setCurrentToday] = useState(0);
  const token = localStorage.getItem('token');

  useEffect(() => {
    if (!token) return;
    if (sessionStorage.getItem('popupShownThisSession')) return;

    apiFetch('${API_URL}/api/activities/today')
      .then((r) => r.json())
      .then((d) => {
        const total = Number(d.total);
        setCurrentToday(total);
        if (total >= dailyTarget) {
          setShowSuccess(true);
        } else {
          setShowModal(true);
        }
        sessionStorage.setItem('popupShownThisSession', 'true');
      });
  }, [token]);

  return (
    <div className="min-h-screen bg-black flex flex-col">
      {showModal && (
        <TargetModal
          onClose={() => setShowModal(false)}
          target={dailyTarget}
          current={currentToday}
        />
      )}
      {showSuccess && <SuccessModal onClose={() => setShowSuccess(false)} />}
      <Navbar />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/" element={<AppLayout><Dashboard /></AppLayout>} />
        <Route path="/nouvelle-activite" element={<AppLayout><NouvelleActivite /></AppLayout>} />
        <Route path="/feed" element={<AppLayout><Feed /></AppLayout>} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;