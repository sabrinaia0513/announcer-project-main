import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';

function Navbar({ currentUser, handleLogout, notifications, setNotifications }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showNotiDropdown, setShowNotiDropdown] = useState(false);
  const location = useLocation();
  const brandLogoSrc = `${process.env.PUBLIC_URL}/logo.png`;

  useEffect(() => {
    setIsMenuOpen(false);
    setShowNotiDropdown(false);
  }, [location]);

  return (
    <nav className="fixed top-0 left-0 w-full bg-white shadow-sm z-50 border-b border-gray-200">
      <div className="max-w-3xl mx-auto px-4 h-16 flex justify-between items-center">
        <Link to="/" className="flex items-center">
          <img src={brandLogoSrc} alt="아우성" className="h-9 w-auto sm:h-11" />
        </Link>

        <div className="flex items-center gap-4 text-gray-700">
          {currentUser && (
            <div className="relative">
              <button onClick={() => setShowNotiDropdown(!showNotiDropdown)} className="text-2xl relative mt-1">
                🔔
                {notifications.length > 0 && <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full border-2 border-white">{notifications.length}</span>}
              </button>
              {showNotiDropdown && (
                <div className="absolute right-0 mt-2 w-72 bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden">
                  <div className="bg-gray-100 px-4 py-2 font-bold text-sm text-gray-700 flex justify-between"><span>알림 목록</span><button onClick={() => setNotifications([])} className="text-xs text-gray-400 hover:text-red-500">모두 지우기</button></div>
                  <div className="max-h-64 overflow-y-auto">
                    {notifications.length === 0 ? <div className="p-4 text-center text-sm text-gray-500">새로운 알림이 없습니다.</div> : notifications.map((noti, idx) => <div key={idx} className="p-3 border-b border-gray-100 text-sm hover:bg-gray-50">{noti.text}</div>)}
                  </div>
                </div>
              )}
            </div>
          )}
          <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="text-2xl hover:text-blue-600 transition-colors focus:outline-none">
            {isMenuOpen ? '✕' : '☰'}
          </button>
        </div>
      </div>

      {isMenuOpen && (
        <div className="absolute top-16 left-0 w-full bg-white border-b border-gray-200 shadow-lg flex flex-col p-4 gap-2 animate-fade-in-down">
          {currentUser ? (
            <>
              <div className="flex items-center gap-2 mb-4 p-2 bg-gray-50 rounded-lg">
                <span className="text-xl">👤</span>
                <span className="font-bold text-gray-800">{currentUser.nickname}님</span>
                <span className="text-xs bg-indigo-100 text-indigo-700 font-bold px-2 py-1 rounded-md">{currentUser.level}</span>
                {currentUser.is_admin && <span className="text-xs bg-red-100 text-red-700 font-bold px-2 py-1 rounded-md ml-1">관리자</span>}
              </div>
              <Link to="/scripts" className="w-full py-3 bg-indigo-50 text-indigo-700 text-center font-bold rounded-lg shadow-sm">🎙️ 오늘의 대본 (연습용)</Link>
              <Link to="/write" className="w-full py-3 bg-blue-600 text-white text-center font-bold rounded-lg shadow-sm mt-1">✍️ 새 글 작성하기</Link>
              <Link to="/mypage" className="w-full py-3 bg-gray-100 text-gray-800 text-center font-bold rounded-lg mt-1">내 정보 / 마이페이지</Link>
              <button onClick={handleLogout} className="w-full py-3 bg-red-50 text-red-600 font-bold rounded-lg mt-2">로그아웃</button>
            </>
          ) : (
            <>
              <p className="text-sm text-gray-500 text-center mb-2">커뮤니티의 모든 기능을 이용해보세요!</p>
              <Link to="/login" className="w-full py-3 bg-blue-600 text-white text-center font-bold rounded-lg shadow-sm">🚀 로그인 / 회원가입</Link>
            </>
          )}
        </div>
      )}
    </nav>
  );
}

export default Navbar;
