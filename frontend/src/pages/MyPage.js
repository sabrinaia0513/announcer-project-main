import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';
import { BACKEND_URL, getAuthHeader } from '../lib/api';
import { inputStyle } from '../lib/utils';

function MyPage({ currentUser, setCurrentUser }) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('profile');
  const [activity, setActivity] = useState({ my_posts: [], my_comments: [], liked_posts: [], points: 0, level: '🌱 씨앗' });
  const [newNickname, setNewNickname] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [targetUserId, setTargetUserId] = useState('');

  const handlePromoteAdmin = async (e) => {
    e.preventDefault();
    if (!targetUserId.trim()) return alert("승격시킬 유저의 아이디를 입력하세요.");
    if (!window.confirm(`'${targetUserId}' 유저를 관리자로 임명하시겠습니까?`)) return;

    try {
      const formData = new FormData();
      formData.append("target_username", targetUserId);
      const res = await axios.post(`${BACKEND_URL}/admin/promote`, formData, getAuthHeader());
      alert(res.data.message);
      setTargetUserId('');
    } catch (error) {
      alert(error.response?.data?.detail || "관리자 임명에 실패했습니다.");
    }
  };

  useEffect(() => {
    if (!currentUser) { alert("로그인이 필요합니다."); navigate('/'); return; }
    const fetchActivity = async () => {
      try {
        const response = await axios.get(`${BACKEND_URL}/users/me/activity`, getAuthHeader());
        setActivity(response.data);
      } catch (error) {}
    };
    fetchActivity();
  }, [currentUser, navigate]);

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    if (!newNickname && !newPassword) return alert("변경할 내용을 입력해주세요.");
    try {
      const response = await axios.put(`${BACKEND_URL}/users/me`, { new_nickname: newNickname, new_password: newPassword }, getAuthHeader());
      alert("정보 수정 완료!");
      const updatedUser = { ...currentUser, nickname: response.data.new_nickname };
      localStorage.setItem('announcer_user', JSON.stringify(updatedUser)); setCurrentUser(updatedUser);
      setNewNickname(''); setNewPassword('');
    } catch (error) { alert("수정 실패."); }
  };

  if (!currentUser) return null;

  return (
    <div className="bg-white p-5 sm:p-8 rounded-2xl shadow-sm border border-gray-100 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6 border-b border-gray-200 pb-4">
        <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900">👤 마이페이지</h2>
        <button onClick={() => navigate('/')} className="text-sm text-gray-500 font-bold hover:text-blue-600">메인으로 가기</button>
      </div>
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-5 sm:p-6 text-white mb-8 shadow-lg">
        <div className="flex justify-between items-center mb-4">
          <div><p className="text-blue-100 text-xs sm:text-sm mb-1">나의 커뮤니티 등급</p><h3 className="text-2xl sm:text-3xl font-extrabold">{activity.level}</h3></div>
          <div className="text-right"><p className="text-blue-100 text-xs sm:text-sm mb-1">현재 포인트</p><h3 className="text-2xl sm:text-3xl font-bold">{activity.points} <span className="text-sm sm:text-lg">P</span></h3></div>
        </div>
      </div>
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2 scrollbar-hide">
        <button onClick={() => setActiveTab('profile')} className={`px-4 py-2 rounded-lg text-xs sm:text-sm font-bold whitespace-nowrap transition-colors ${activeTab === 'profile' ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-600'}`}>내 정보 수정</button>
        <button onClick={() => setActiveTab('posts')} className={`px-4 py-2 rounded-lg text-xs sm:text-sm font-bold whitespace-nowrap transition-colors ${activeTab === 'posts' ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-600'}`}>내가 쓴 글 ({activity.my_posts.length})</button>
        <button onClick={() => setActiveTab('comments')} className={`px-4 py-2 rounded-lg text-xs sm:text-sm font-bold whitespace-nowrap transition-colors ${activeTab === 'comments' ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-600'}`}>작성한 댓글 ({activity.my_comments.length})</button>
        {currentUser.is_admin && (
          <button onClick={() => setActiveTab('admin')} className={`px-4 py-2 rounded-lg text-xs sm:text-sm font-bold whitespace-nowrap transition-colors ${activeTab === 'admin' ? 'bg-red-600 text-white' : 'bg-red-50 text-red-600'}`}>👑 관리자 전용</button>
        )}
      </div>
      <div className="min-h-[300px]">
        {activeTab === 'profile' && (
          <div className="bg-gray-50 p-5 rounded-xl border border-gray-200">
            <p className="text-sm text-gray-500 mb-6">현재 닉네임: <strong className="text-blue-600">{currentUser.nickname}</strong></p>
            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div><label className="block text-xs font-bold text-gray-700 mb-1">새로운 닉네임</label><input type="text" value={newNickname} onChange={(e) => setNewNickname(e.target.value)} className={`${inputStyle} py-2`} /></div>
              <div><label className="block text-xs font-bold text-gray-700 mb-1">새로운 비밀번호</label><input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className={`${inputStyle} py-2`} /></div>
              <button type="submit" className="w-full py-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 text-sm">정보 수정하기</button>
            </form>
          </div>
        )}
        {activeTab === 'posts' && <div className="space-y-3">{activity.my_posts.map(post => <Link to={`/post/${post.글번호}`} key={post.글번호} className="block p-4 bg-gray-50 hover:bg-indigo-50 rounded-lg border border-gray-200"><div className="flex justify-between items-center"><h4 className="font-bold text-sm text-gray-800 truncate">{post.제목}</h4><span className="text-[10px] text-gray-500 shrink-0 ml-2">{post.작성시간}</span></div></Link>)}</div>}
        {activeTab === 'comments' && <div className="space-y-3">{activity.my_comments.map(comment => <Link to={`/post/${comment.원문번호}`} key={comment.댓글번호} className="block p-4 bg-gray-50 hover:bg-indigo-50 rounded-lg border border-gray-200"><div className="flex justify-between items-center"><p className="text-sm text-gray-800 truncate pr-4">{comment.내용}</p><span className="text-[10px] text-gray-500 whitespace-nowrap">{comment.작성시간}</span></div></Link>)}</div>}
        {activeTab === 'admin' && currentUser.is_admin && (
          <div className="bg-red-50 p-6 rounded-xl border border-red-200">
            <h3 className="text-lg font-extrabold text-red-800 mb-2">신규 관리자 임명 (권한 부여)</h3>
            <p className="text-xs text-red-600 mb-6">입력한 아이디의 유저에게 게시글 삭제 및 대본 업로드 권한을 영구적으로 부여합니다. 신중하게 사용하세요.</p>

            <form onSubmit={handlePromoteAdmin} className="flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                placeholder="승격시킬 유저의 아이디(ID) 입력"
                value={targetUserId}
                onChange={(e) => setTargetUserId(e.target.value)}
                className={`${inputStyle} py-3 flex-1 bg-white`}
              />
              <button type="submit" className="bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-6 rounded-lg whitespace-nowrap transition-colors shadow-sm">
                관리자로 임명하기
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}

export default MyPage;
