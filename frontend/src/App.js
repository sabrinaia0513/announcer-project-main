import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { getAccessToken, WS_BACKEND_URL } from './lib/api';
import Navbar from './components/Navbar';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import WritePostPage from './pages/WritePostPage';
import PostDetailPage from './pages/PostDetailPage';
import MyPage from './pages/MyPage';
import NotFoundPage from './pages/NotFoundPage';
import ScriptPracticePage from './pages/ScriptPracticePage';
import ScriptBoard from './ScriptBoard';

function AppShell({ currentUser, handleLogout, notifications, setNotifications, setCurrentUser }) {
  const location = useLocation();
  const isPracticeRoute = location.pathname.startsWith('/scripts/practice');

  return (
    <div className={`min-h-screen ${isPracticeRoute ? 'bg-slate-950 text-white' : 'bg-slate-100 text-gray-800'}`}>
      {!isPracticeRoute && (
        <>
          <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
            <div className="absolute left-0 top-0 h-[28rem] w-[28rem] -translate-x-1/3 -translate-y-1/3 rounded-full bg-sky-200/50 blur-3xl" />
            <div className="absolute right-0 top-24 h-[30rem] w-[30rem] translate-x-1/4 rounded-full bg-indigo-200/40 blur-3xl" />
            <div className="absolute bottom-0 left-1/2 h-[24rem] w-[24rem] -translate-x-1/2 translate-y-1/3 rounded-full bg-white/70 blur-3xl" />
          </div>

          <Navbar
            currentUser={currentUser}
            handleLogout={handleLogout}
            notifications={notifications}
            setNotifications={setNotifications}
          />
        </>
      )}

      <main className={isPracticeRoute ? 'min-h-screen' : 'pb-12 pt-24 sm:pt-28 xl:pt-32'}>
        <div className={isPracticeRoute ? 'w-full' : 'mx-auto w-full max-w-7xl px-4 sm:px-6 xl:px-8'}>
          <Routes>
            <Route path="/" element={<HomePage currentUser={currentUser} />} />
            <Route path="/login" element={<LoginPage setCurrentUser={setCurrentUser} />} />
            <Route path="/write" element={<WritePostPage currentUser={currentUser} />} />
            <Route path="/post/:id/edit" element={<WritePostPage currentUser={currentUser} />} />
            <Route path="/post/:id" element={<PostDetailPage currentUser={currentUser} />} />
            <Route path="/mypage" element={<MyPage currentUser={currentUser} setCurrentUser={setCurrentUser} />} />
            <Route path="/scripts" element={<ScriptBoard />} />
            <Route path="/scripts/practice" element={<ScriptPracticePage />} />
            <Route path="/scripts/practice/:id" element={<ScriptPracticePage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </div>
      </main>
    </div>
  );
}

function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    const savedUser = localStorage.getItem('announcer_user');
    if (!savedUser) return;

    try {
      setCurrentUser(JSON.parse(savedUser));
    } catch (error) {
      console.error('저장된 사용자 정보 파싱 실패:', error);
      localStorage.removeItem('announcer_user');
    }
  }, []);

  useEffect(() => {
    let wsNotify;
    if (currentUser) {
      const token = getAccessToken();
      if (!token) return;

      const isNotificationSupported = typeof window !== 'undefined' && 'Notification' in window;
      const canUseSystemNotification = isNotificationSupported && window.isSecureContext;

      wsNotify = new WebSocket(`${WS_BACKEND_URL}/ws/notify/${currentUser.username}?token=${token}`);
      wsNotify.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          setNotifications((prev) => [data, ...prev]);
          if (canUseSystemNotification && Notification.permission === 'granted') {
            try {
              new Notification('새로운 알림', { body: data.text });
            } catch (error) {
              console.error('시스템 알림 생성 실패:', error);
            }
          }
        } catch (e) { console.error('알림 파싱 실패:', e); }
      };
      wsNotify.onerror = () => console.error('알림 WebSocket 연결 오류');

      if (canUseSystemNotification && Notification.permission === 'default') {
        try {
          Notification.requestPermission().catch((error) => {
            console.error('알림 권한 요청 실패:', error);
          });
        } catch (error) {
          console.error('알림 권한 요청 실패:', error);
        }
      }
    }
    return () => { if (wsNotify) wsNotify.close(); };
  }, [currentUser]);

  const handleLogout = () => {
    localStorage.removeItem('announcer_user');
    setCurrentUser(null);
    alert("로그아웃 되었습니다.");
    window.location.href = '/';
  };

  return (
    <BrowserRouter>
      <AppShell
        currentUser={currentUser}
        handleLogout={handleLogout}
        notifications={notifications}
        setNotifications={setNotifications}
        setCurrentUser={setCurrentUser}
      />
    </BrowserRouter>
  );
}

export default App;
