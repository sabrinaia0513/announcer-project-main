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
    } catch (error) { alert(error.response?.data?.detail || "수정 실패."); }
  };

  if (!currentUser) return null;

  return (
    <div className="mx-auto max-w-5xl rounded-[2rem] border border-gray-100 bg-white/90 p-5 shadow-sm backdrop-blur sm:p-8 lg:p-10">
      <div className="mb-8 flex flex-col gap-4 border-b border-gray-200 pb-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-3xl font-extrabold text-gray-900">👤 마이페이지</h2>
        </div>
        <button onClick={() => navigate('/')} className="inline-flex items-center justify-center rounded-full bg-slate-100 px-4 py-2 text-sm font-bold text-gray-600 transition-colors hover:bg-slate-200 hover:text-blue-600">메인으로 가기</button>
      </div>

      <div className="mb-8 grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(280px,0.8fr)]">
        <div className="rounded-[2rem] bg-gradient-to-r from-blue-600 to-indigo-600 p-6 text-white shadow-lg sm:p-7">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-bold text-blue-100">나의 커뮤니티 등급</p>
              <h3 className="mt-2 text-3xl font-extrabold sm:text-4xl">{activity.level}</h3>
              <p className="mt-3 text-sm text-blue-100">프로필, 활동, 관리자 권한을 한 곳에서 관리합니다.</p>
            </div>
            <div className="rounded-2xl bg-white/15 px-5 py-4 text-right backdrop-blur">
              <p className="text-xs font-bold text-blue-100">현재 포인트</p>
              <h3 className="mt-2 text-3xl font-bold">{activity.points} <span className="text-lg">P</span></h3>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 rounded-[2rem] border border-slate-200 bg-slate-50 p-5">
          <div className="rounded-2xl bg-white p-4 shadow-sm">
            <p className="text-[11px] font-black tracking-[0.2em] text-slate-400">내 글</p>
            <p className="mt-2 text-2xl font-black text-slate-900">{activity.my_posts.length}</p>
            <p className="text-xs text-slate-500">내가 쓴 글</p>
          </div>
          <div className="rounded-2xl bg-white p-4 shadow-sm">
            <p className="text-[11px] font-black tracking-[0.2em] text-slate-400">댓글</p>
            <p className="mt-2 text-2xl font-black text-slate-900">{activity.my_comments.length}</p>
            <p className="text-xs text-slate-500">작성한 댓글</p>
          </div>
        </div>
      </div>

      <div className="mb-6 flex flex-wrap gap-2 rounded-[1.5rem] border border-slate-200 bg-slate-50 p-2">
        <button onClick={() => setActiveTab('profile')} className={`rounded-2xl px-4 py-2 text-xs font-bold whitespace-nowrap transition-colors sm:text-sm ${activeTab === 'profile' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:bg-white hover:text-slate-900'}`}>내 정보 수정</button>
        <button onClick={() => setActiveTab('posts')} className={`rounded-2xl px-4 py-2 text-xs font-bold whitespace-nowrap transition-colors sm:text-sm ${activeTab === 'posts' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:bg-white hover:text-slate-900'}`}>내가 쓴 글 ({activity.my_posts.length})</button>
        <button onClick={() => setActiveTab('comments')} className={`rounded-2xl px-4 py-2 text-xs font-bold whitespace-nowrap transition-colors sm:text-sm ${activeTab === 'comments' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:bg-white hover:text-slate-900'}`}>작성한 댓글 ({activity.my_comments.length})</button>
        {currentUser.is_admin && (
          <button onClick={() => setActiveTab('admin')} className={`rounded-2xl px-4 py-2 text-xs font-bold whitespace-nowrap transition-colors sm:text-sm ${activeTab === 'admin' ? 'bg-red-600 text-white shadow-sm' : 'text-red-600 hover:bg-white'}`}>👑 관리자 전용</button>
        )}
      </div>
      <div className="min-h-[300px]">
        {activeTab === 'profile' && (
          <div className="rounded-[1.75rem] border border-gray-200 bg-gray-50 p-5 sm:p-6">
            <p className="text-sm text-gray-500 mb-6">현재 닉네임: <strong className="text-blue-600">{currentUser.nickname}</strong></p>
            <form onSubmit={handleUpdateProfile} className="grid gap-4 lg:grid-cols-2">
              <div><label className="block text-xs font-bold text-gray-700 mb-1">새로운 닉네임</label><input type="text" value={newNickname} onChange={(e) => setNewNickname(e.target.value)} className={`${inputStyle} py-2`} /></div>
              <div><label className="block text-xs font-bold text-gray-700 mb-1">새로운 비밀번호</label><input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className={`${inputStyle} py-2`} /></div>
              <div className="lg:col-span-2">
                <button type="submit" className="w-full rounded-2xl bg-blue-600 py-3 text-sm font-bold text-white transition-colors hover:bg-blue-700 lg:w-auto lg:px-8">정보 수정하기</button>
              </div>
            </form>
          </div>
        )}
        {activeTab === 'posts' && <div className="grid gap-3 xl:grid-cols-2">{activity.my_posts.map(post => <Link to={`/post/${post.글번호}`} key={post.글번호} className="block rounded-[1.5rem] border border-gray-200 bg-gray-50 p-4 transition-colors hover:bg-indigo-50"><div className="flex justify-between items-center gap-3"><h4 className="font-bold text-sm text-gray-800 truncate">{post.제목}</h4><span className="text-[10px] text-gray-500 shrink-0">{post.작성시간}</span></div></Link>)}</div>}
        {activeTab === 'comments' && <div className="grid gap-3 xl:grid-cols-2">{activity.my_comments.map(comment => <Link to={`/post/${comment.원문번호}`} key={comment.댓글번호} className="block rounded-[1.5rem] border border-gray-200 bg-gray-50 p-4 transition-colors hover:bg-indigo-50"><div className="flex justify-between items-center gap-3"><p className="text-sm text-gray-800 truncate pr-4">{comment.내용}</p><span className="text-[10px] text-gray-500 whitespace-nowrap">{comment.작성시간}</span></div></Link>)}</div>}
        {activeTab === 'admin' && currentUser.is_admin && (
          <div className="rounded-[1.75rem] border border-red-200 bg-red-50 p-6">
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
              <button type="submit" className="rounded-2xl bg-red-600 px-6 py-3 font-bold text-white whitespace-nowrap transition-colors shadow-sm hover:bg-red-700">
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
