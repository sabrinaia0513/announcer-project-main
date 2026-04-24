import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { BACKEND_URL } from '../lib/api';
import { inputStyle } from '../lib/utils';

function LoginPage({ setCurrentUser }) {
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [loginId, setLoginId] = useState('');
  const [loginPw, setLoginPw] = useState('');
  const [nickname, setNickname] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const params = new URLSearchParams();
      params.append('username', loginId);
      params.append('password', loginPw);

      const response = await axios.post(`${BACKEND_URL}/login`, params);

      const userData = {
        username: response.data.username,
        nickname: response.data.nickname,
        level: response.data.level,
        is_admin: response.data.is_admin,
        access_token: response.data.access_token,
      };

      localStorage.setItem('announcer_user', JSON.stringify(userData));
      setCurrentUser(userData);
      alert(`${response.data.nickname}님, 환영합니다!`);
      navigate('/');
    } catch (error) {
      alert("로그인 실패: 아이디와 비밀번호를 확인해주세요.");
    }
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${BACKEND_URL}/signup`, { username: loginId, nickname, password: loginPw });
      alert(`${nickname}님, 가입 완료! 이제 로그인해주세요.`);
      setNickname(''); setLoginPw(''); setIsLoginMode(true);
    } catch (error) { alert("가입 실패: " + (error.response?.data?.detail || "회원가입 중 오류가 발생했습니다.")); }
  };

  return (
    <div className="mx-auto mt-6 grid max-w-6xl gap-6 xl:grid-cols-[minmax(0,1.1fr)_460px]">
      <section className="relative overflow-hidden rounded-[2rem] bg-slate-900 px-6 py-8 text-white shadow-[0_24px_80px_-48px_rgba(15,23,42,0.9)] sm:px-8 xl:px-10">
        <div className="absolute inset-y-0 right-0 w-1/2 bg-[radial-gradient(circle_at_top_right,_rgba(59,130,246,0.35),_transparent_55%)]" />
        <div className="relative z-10 max-w-2xl">
          <h1 className="text-3xl font-black tracking-tight sm:text-4xl">로그인 또는 회원가입</h1>
          <p className="mt-4 text-sm leading-7 text-slate-300 sm:text-base">계정으로 게시글, 댓글, 대본 보관함을 이용할 수 있습니다.</p>
        </div>
      </section>

      <section className="rounded-[2rem] border border-slate-200 bg-white/90 p-6 shadow-sm backdrop-blur sm:p-8">
        <div className="mb-6">
          <h2 className="text-3xl font-black tracking-tight text-gray-800">{isLoginMode ? '로그인' : '회원가입'}</h2>
        </div>

        <form onSubmit={isLoginMode ? handleLogin : handleSignup} className="space-y-4">
          <div><label className="mb-2 block text-sm font-bold text-gray-700">아이디</label><input type="text" value={loginId} onChange={(e) => setLoginId(e.target.value)} required className={inputStyle} /></div>
          {!isLoginMode && <div><label className="mb-2 block text-sm font-bold text-gray-700">사용할 닉네임</label><input type="text" value={nickname} onChange={(e) => setNickname(e.target.value)} required className={inputStyle} /></div>}
          <div><label className="mb-2 block text-sm font-bold text-gray-700">비밀번호</label><input type="password" value={loginPw} onChange={(e) => setLoginPw(e.target.value)} required className={inputStyle} /></div>
          <button type="submit" className={`mt-2 w-full rounded-2xl py-4 text-lg font-black text-white transition-all ${isLoginMode ? 'bg-blue-600 hover:-translate-y-0.5 hover:bg-blue-700' : 'bg-green-600 hover:-translate-y-0.5 hover:bg-green-700'}`}>
            {isLoginMode ? '로그인' : '회원가입 완료'}
          </button>
        </form>

        <div className="mt-6 rounded-[1.5rem] bg-slate-50 p-4 text-sm text-slate-500">
          <button onClick={() => setIsLoginMode(!isLoginMode)} className="font-bold text-blue-600 underline underline-offset-4">
            {isLoginMode ? '아직 계정이 없으신가요? 10초만에 회원가입' : '이미 계정이 있으신가요? 로그인하러 가기'}
          </button>
        </div>
      </section>
    </div>
  );
}

export default LoginPage;
