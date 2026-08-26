import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Dashboard from './pages/Dashboard';
import NouvelleActivite from './pages/NouvelleActivite';
import Feed from './pages/Feed';
import Profile from './pages/Profile';
import Badges from './pages/Badges';
import Rewards from './pages/Rewards';
import Courses from './pages/Courses';
import CourseDetail from './pages/CourseDetail';
import AdminCourses from './pages/admin/AdminCourses';
import AdminRewards from './pages/admin/AdminRewards';
import AdminNotifications from './pages/admin/AdminNotifications';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminRoute from './components/AdminRoute';
import Login from './pages/Login';
import Signup from './pages/Signup';
import TargetModal from './components/TargetModal';
import SuccessModal from './components/SuccessModal';
import AmbientBackground from './components/AmbientBackground';
import { apiFetch } from './utils/api';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

function AppLayout({ children }) {
  const [showModal, setShowModal] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [currentToday, setCurrentToday] = useState(0);
  const [dailyTarget, setDailyTarget] = useState(5);
  const token = localStorage.getItem('token');

  useEffect(() => {
    if (!token) return;
    apiFetch(`${API_URL}/api/activities/my-quota`)
      .then((r) => r.json())
      .then((d) => setDailyTarget(d.daily_target));
  }, [token]);

  useEffect(() => {
    if (!token) return;
    if (sessionStorage.getItem('popupShownThisSession')) return;

    apiFetch(`${API_URL}/api/activities/today`)
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
  }, [token, dailyTarget]);

  return (
    <div className="min-h-screen bg-black flex flex-col relative">
      <AmbientBackground />
      {showModal && (
        <TargetModal onClose={() => setShowModal(false)} target={dailyTarget} current={currentToday} />
      )}
      {showSuccess && <SuccessModal onClose={() => setShowSuccess(false)} />}
      <div className="relative z-10 flex flex-col min-h-screen">
        <Navbar />
        <main className="flex-1 pb-6">{children}</main>
        <Footer />
      </div>
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
        <Route path="/profile" element={<AppLayout><Profile /></AppLayout>} />
        <Route path="/badges" element={<AppLayout><Badges /></AppLayout>} />
        <Route path="/rewards" element={<AppLayout><Rewards /></AppLayout>} />
        <Route path="/courses" element={<AppLayout><Courses /></AppLayout>} />
        <Route path="/courses/:id" element={<AppLayout><CourseDetail /></AppLayout>} />
        <Route path="/admin" element={<AdminRoute><AppLayout><AdminDashboard /></AppLayout></AdminRoute>} />
        <Route path="/admin/courses" element={<AdminRoute><AppLayout><AdminCourses /></AppLayout></AdminRoute>} />
        <Route path="/admin/rewards" element={<AdminRoute><AppLayout><AdminRewards /></AppLayout></AdminRoute>} />
        <Route path="/admin/notifications" element={<AdminRoute><AppLayout><AdminNotifications /></AppLayout></AdminRoute>} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;