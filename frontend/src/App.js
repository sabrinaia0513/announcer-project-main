import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { getAccessToken } from './lib/api';
import Navbar from './components/Navbar';
import ChatWidget from './components/ChatWidget';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import WritePostPage from './pages/WritePostPage';
import PostDetailPage from './pages/PostDetailPage';
import MyPage from './pages/MyPage';
import ScriptBoard from './ScriptBoard';

function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    const savedUser = localStorage.getItem('announcer_user');
    if (savedUser) setCurrentUser(JSON.parse(savedUser));
  }, []);

  useEffect(() => {
    let wsNotify;
    if (currentUser) {
      const token = getAccessToken();
      if (!token) return;
      wsNotify = new WebSocket(`ws://43.201.164.155:8000/ws/notify/${currentUser.username}?token=${token}`);
      wsNotify.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          setNotifications((prev) => [data, ...prev]);
          if (Notification.permission === 'granted') {
            new Notification('새로운 알림', { body: data.text });
          }
        } catch (e) { console.error('알림 파싱 실패:', e); }
      };
      wsNotify.onerror = () => console.error('알림 WebSocket 연결 오류');
      if (Notification.permission !== 'denied') Notification.requestPermission();
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
      <Navbar
        currentUser={currentUser}
        handleLogout={handleLogout}
        notifications={notifications}
        setNotifications={setNotifications}
      />

      <ChatWidget currentUser={currentUser} />

      <div className="min-h-screen bg-gray-50 pt-24 pb-10 px-4 font-sans text-gray-800">
        <div className="max-w-3xl mx-auto">
          <Routes>
            <Route path="/" element={<HomePage currentUser={currentUser} />} />
            <Route path="/login" element={<LoginPage setCurrentUser={setCurrentUser} />} />
            <Route path="/write" element={<WritePostPage currentUser={currentUser} />} />
            <Route path="/post/:id" element={<PostDetailPage currentUser={currentUser} />} />
            <Route path="/mypage" element={<MyPage currentUser={currentUser} setCurrentUser={setCurrentUser} />} />
            <Route path="/scripts" element={<ScriptBoard />} />
          </Routes>
        </div>
      </div>
    </BrowserRouter>
  );
}

export default App;
