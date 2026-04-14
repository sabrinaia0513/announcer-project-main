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
    <div className="max-w-md mx-auto bg-white p-8 rounded-2xl shadow-sm border border-gray-100 mt-10">
      <h2 className="text-2xl font-bold text-center mb-6 text-gray-800">{isLoginMode ? '다시 오셨군요! 👋' : '새 스터디원 가입 🎉'}</h2>
      <form onSubmit={isLoginMode ? handleLogin : handleSignup} className="space-y-4">
        <div><label className="block text-sm font-bold text-gray-700 mb-1">아이디</label><input type="text" value={loginId} onChange={(e) => setLoginId(e.target.value)} required className={inputStyle} /></div>
        {!isLoginMode && <div><label className="block text-sm font-bold text-gray-700 mb-1">사용할 닉네임</label><input type="text" value={nickname} onChange={(e) => setNickname(e.target.value)} required className={inputStyle} /></div>}
        <div><label className="block text-sm font-bold text-gray-700 mb-1">비밀번호</label><input type="password" value={loginPw} onChange={(e) => setLoginPw(e.target.value)} required className={inputStyle} /></div>
        <button type="submit" className={`w-full py-3.5 rounded-lg font-bold text-white text-lg transition-colors shadow-md mt-4 ${isLoginMode ? 'bg-blue-600 hover:bg-blue-700' : 'bg-green-600 hover:bg-green-700'}`}>
          {isLoginMode ? '로그인' : '회원가입 완료'}
        </button>
      </form>
      <button onClick={() => setIsLoginMode(!isLoginMode)} className="w-full mt-6 text-sm text-gray-500 hover:text-blue-600 underline">
        {isLoginMode ? '아직 계정이 없으신가요? 10초만에 회원가입' : '이미 계정이 있으신가요? 로그인하러 가기'}
      </button>
    </div>
  );
}

export default LoginPage;
