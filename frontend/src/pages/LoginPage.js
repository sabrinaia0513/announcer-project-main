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
    } catch (error) { alert("가입 실패: 이미 존재하는 아이디입니다."); }
  };

  return (
    <div className="mx-auto mt-6 grid max-w-6xl gap-6 xl:grid-cols-[minmax(0,1.1fr)_460px]">
      <section className="relative overflow-hidden rounded-[2rem] bg-slate-900 px-6 py-8 text-white shadow-[0_24px_80px_-48px_rgba(15,23,42,0.9)] sm:px-8 xl:px-10">
        <div className="absolute inset-y-0 right-0 w-1/2 bg-[radial-gradient(circle_at_top_right,_rgba(59,130,246,0.35),_transparent_55%)]" />
        <div className="relative z-10 max-w-2xl">
          <span className="inline-flex rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[11px] font-semibold tracking-[0.22em] text-sky-100">ACCOUNT ACCESS</span>
          <h1 className="mt-5 text-3xl font-black tracking-tight sm:text-4xl">모바일에서는 빠르게 로그인하고, PC에서는 계정 흐름을 한눈에 볼 수 있게 정리했습니다.</h1>
          <p className="mt-4 text-sm leading-7 text-slate-300 sm:text-base">회원가입과 로그인 폼을 같은 패널 안에서 전환하되, 안내 영역은 별도로 분리해서 웹사이트처럼 보이도록 구성했습니다.</p>

          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            <div className="rounded-[1.5rem] border border-white/10 bg-white/10 p-4 backdrop-blur">
              <p className="text-[11px] font-black tracking-[0.2em] text-slate-300">COMMUNITY</p>
              <p className="mt-2 text-lg font-black">게시글 · 댓글 · 대본</p>
              <p className="mt-1 text-xs text-slate-300">하나의 계정으로 전체 기능을 이용합니다.</p>
            </div>
            <div className="rounded-[1.5rem] border border-white/10 bg-white/10 p-4 backdrop-blur">
              <p className="text-[11px] font-black tracking-[0.2em] text-slate-300">ALERT</p>
              <p className="mt-2 text-lg font-black">실시간 알림</p>
              <p className="mt-1 text-xs text-slate-300">댓글과 좋아요 알림을 받을 수 있습니다.</p>
            </div>
            <div className="rounded-[1.5rem] border border-white/10 bg-white/10 p-4 backdrop-blur">
              <p className="text-[11px] font-black tracking-[0.2em] text-slate-300">PROFILE</p>
              <p className="mt-2 text-lg font-black">마이페이지 관리</p>
              <p className="mt-1 text-xs text-slate-300">내 글, 댓글, 등급을 한 번에 확인합니다.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-[2rem] border border-slate-200 bg-white/90 p-6 shadow-sm backdrop-blur sm:p-8">
        <div className="mb-6">
          <p className="text-xs font-black tracking-[0.2em] text-slate-400">{isLoginMode ? 'LOGIN' : 'SIGN UP'}</p>
          <h2 className="mt-2 text-3xl font-black tracking-tight text-gray-800">{isLoginMode ? '로그인' : '회원가입'}</h2>
          <p className="mt-2 text-sm leading-6 text-slate-500">{isLoginMode ? '기존 계정으로 커뮤니티 기능을 이어서 사용하세요.' : '새 계정을 만들고 게시판과 대본 보관함 기능을 이용해보세요.'}</p>
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
          <p>{isLoginMode ? '아직 계정이 없다면 아래 버튼으로 바로 회원가입 모드로 전환할 수 있습니다.' : '가입이 끝나면 같은 패널에서 바로 로그인할 수 있습니다.'}</p>
          <button onClick={() => setIsLoginMode(!isLoginMode)} className="mt-3 font-bold text-blue-600 underline underline-offset-4">
            {isLoginMode ? '아직 계정이 없으신가요? 10초만에 회원가입' : '이미 계정이 있으신가요? 로그인하러 가기'}
          </button>
        </div>
      </section>
    </div>
  );
}

export default LoginPage;
