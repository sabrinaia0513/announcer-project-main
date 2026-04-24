import React, { useState, useEffect } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';

function Navbar({ currentUser, handleLogout, notifications, setNotifications }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showNotiDropdown, setShowNotiDropdown] = useState(false);
  const location = useLocation();
  const brandLogoSrc = `${process.env.PUBLIC_URL}/logo.png`;
  const currentUserLevel = currentUser?.is_admin ? '관리자' : currentUser?.level;
  const navItems = [
    { to: '/', label: '홈' },
    { to: '/scripts', label: '대본 보관함' },
    ...(currentUser ? [{ to: '/write', label: '글쓰기' }, { to: '/mypage', label: '마이페이지' }] : []),
  ];

  const navItemClassName = ({ isActive }) => (
    `rounded-full px-4 py-2 text-sm font-bold transition-colors ${isActive ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}`
  );

  useEffect(() => {
    setIsMenuOpen(false);
    setShowNotiDropdown(false);
  }, [location]);

  return (
    <nav className="fixed left-0 top-0 z-50 w-full border-b border-white/70 bg-white/80 backdrop-blur-xl shadow-[0_10px_30px_-20px_rgba(15,23,42,0.45)]">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:h-20 sm:px-6 xl:px-8">
        <Link to="/" className="flex items-center gap-3">
          <img src={brandLogoSrc} alt="아우성" className="h-9 w-auto sm:h-11" />
          <div>
            <span className="block text-xl font-extrabold tracking-tight text-gray-900 sm:text-2xl">아우성</span>
            <span className="hidden text-[11px] font-medium tracking-[0.24em] text-slate-400 sm:block">ANNOUNCER COMMUNITY</span>
          </div>
        </Link>

        <div className="hidden lg:flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50/80 px-2 py-2">
          {navItems.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.to === '/'} className={navItemClassName}>
              {item.label}
            </NavLink>
          ))}
        </div>

        <div className="flex items-center gap-3 text-gray-700">
          {currentUser && (
            <div className="relative">
              <button onClick={() => setShowNotiDropdown(!showNotiDropdown)} className="relative rounded-full bg-slate-100 p-2.5 text-xl text-slate-700 transition-colors hover:bg-slate-200">
                🔔
                {notifications.length > 0 && <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full border-2 border-white">{notifications.length}</span>}
              </button>
              {showNotiDropdown && (
                <div className="absolute right-0 mt-3 w-80 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
                  <div className="flex items-center justify-between bg-slate-100 px-4 py-3 text-sm font-bold text-gray-700"><span>알림 목록</span><button onClick={() => setNotifications([])} className="text-xs text-gray-400 hover:text-red-500">모두 지우기</button></div>
                  <div className="max-h-64 overflow-y-auto">
                    {notifications.length === 0 ? <div className="p-4 text-center text-sm text-gray-500">새로운 알림이 없습니다.</div> : notifications.map((noti, idx) => <div key={idx} className="p-3 border-b border-gray-100 text-sm hover:bg-gray-50">{noti.text}</div>)}
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="hidden lg:flex items-center gap-3">
            {currentUser ? (
              <>
                <Link to="/mypage" className="flex items-center gap-3 rounded-full border border-slate-200 bg-white px-4 py-2 shadow-sm transition-colors hover:border-slate-300 hover:bg-slate-50">
                  <span className="text-lg">👤</span>
                  <div className="text-left">
                    <p className="text-sm font-bold text-slate-900">{currentUser.nickname}</p>
                    <p className={`text-[11px] font-bold ${currentUser.is_admin ? 'text-red-600' : 'text-indigo-600'}`}>{currentUserLevel}</p>
                  </div>
                </Link>
                <button onClick={handleLogout} className="rounded-full bg-slate-900 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-slate-700">
                  로그아웃
                </button>
              </>
            ) : (
              <Link to="/login" className="rounded-full bg-slate-900 px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-slate-700">
                로그인 / 회원가입
              </Link>
            )}
          </div>

          <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="text-2xl text-slate-700 transition-colors hover:text-blue-600 focus:outline-none lg:hidden">
            {isMenuOpen ? '✕' : '☰'}
          </button>
        </div>
      </div>

      {isMenuOpen && (
        <div className="absolute left-0 top-16 w-full border-b border-slate-200 bg-white/95 p-4 shadow-lg sm:top-20 lg:hidden">
          {currentUser ? (
            <>
              <div className="mb-4 rounded-2xl bg-slate-50 p-4">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">👤</span>
                  <div>
                    <span className="block font-bold text-gray-800">{currentUser.nickname}님</span>
                    <span className={`mt-1 inline-flex rounded-full px-2 py-1 text-xs font-bold ${currentUser.is_admin ? 'bg-red-100 text-red-700' : 'bg-indigo-100 text-indigo-700'}`}>{currentUserLevel}</span>
                  </div>
                </div>
              </div>
              <div className="grid gap-2">
                {navItems.map((item) => (
                  <NavLink key={item.to} to={item.to} end={item.to === '/'} className={({ isActive }) => `w-full rounded-xl px-4 py-3 text-sm font-bold ${isActive ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700'}`}>
                    {item.label}
                  </NavLink>
                ))}
              </div>
              <button onClick={handleLogout} className="mt-3 w-full rounded-xl bg-red-50 py-3 font-bold text-red-600">로그아웃</button>
            </>
          ) : (
            <>
              <p className="mb-3 text-sm text-gray-500">커뮤니티의 모든 기능을 이용해보세요!</p>
              <div className="grid gap-2">
                <NavLink to="/" end className={({ isActive }) => `w-full rounded-xl px-4 py-3 text-sm font-bold ${isActive ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700'}`}>홈</NavLink>
                <NavLink to="/scripts" className={({ isActive }) => `w-full rounded-xl px-4 py-3 text-sm font-bold ${isActive ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700'}`}>대본 보관함</NavLink>
                <Link to="/login" className="w-full rounded-xl bg-blue-600 py-3 text-center font-bold text-white shadow-sm">로그인 / 회원가입</Link>
              </div>
            </>
          )}
        </div>
      )}
    </nav>
  );
}

export default Navbar;
