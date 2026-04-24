import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { BACKEND_URL as API_URL, MEDIA_BASE_URL } from './lib/api';
import { inputStyle } from './lib/utils';

function ScriptBoard() {
  const [scripts, setScripts] = useState([]);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [file, setFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const navigate = useNavigate();

  const savedUser = localStorage.getItem('announcer_user');
  const currentUser = savedUser ? JSON.parse(savedUser) : null;
  const token = currentUser ? currentUser.access_token : null;
  const isAdmin = currentUser ? currentUser.is_admin : false;

  useEffect(() => {
    fetchScripts();
  }, []);

  const fetchScripts = async () => {
    try {
      const response = await axios.get(`${API_URL}/scripts`);
      setScripts(response.data);
    } catch (error) {
      console.error("대본을 불러오는 중 에러 발생:", error);
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!title || !content) {
      alert("제목과 내용을 입력해주세요.");
      return;
    }

    setIsUploading(true);

    const formData = new FormData();
    formData.append("title", title);
    formData.append("content", content);
    if (file) {
      formData.append("file", file);
    }

    try {
      await axios.post(`${API_URL}/scripts`, formData, {
        headers: { 
          "Content-Type": "multipart/form-data",
          "Authorization": `Bearer ${token}` 
        }
      });
      alert("대본이 성공적으로 업로드되었습니다!");
      setTitle('');
      setContent('');
      setFile(null);
      fetchScripts();
    } catch (error) {
      if (error.response && error.response.status === 403) {
        alert("권한이 없습니다. 관리자만 업로드 가능합니다.");
      } else if (error.response?.data?.detail) {
        alert(error.response.data.detail);
      } else {
        alert("업로드 중 오류가 발생했습니다.");
      }
    } finally {
      setIsUploading(false);
    }
  };

  const handleDownload = async (fileUrl, scriptTitle) => {
    try {
      const fileRes = await axios.get(`${MEDIA_BASE_URL}${fileUrl}`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([fileRes.data]));
      const ext = fileUrl.split('.').pop(); 
      const cleanTitle = scriptTitle.replace(/[/\\?%*:|"<>]/g, '_');

      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `[대본]_${cleanTitle}.${ext}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      alert("파일 다운로드 중 오류가 발생했습니다.");
    }
  };

  return (
    <div className="space-y-8 xl:space-y-10">
      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.65fr)_360px]">
        <div className="relative overflow-hidden rounded-[2rem] bg-slate-900 px-6 py-7 text-white shadow-[0_24px_80px_-48px_rgba(15,23,42,0.9)] sm:px-8 xl:px-10">
          <div className="absolute inset-y-0 right-0 w-1/2 bg-[radial-gradient(circle_at_top_right,_rgba(56,189,248,0.35),_transparent_55%)]" />
          <div className="relative z-10">
            <span className="inline-flex rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[11px] font-semibold tracking-[0.22em] text-sky-100">SCRIPT ARCHIVE</span>
            <div className="mt-4 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <h1 className="text-3xl font-black tracking-tight sm:text-4xl">🎙️ 아나운서 대본 보관함</h1>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">매일 업데이트되는 훈련용 대본을 모바일에서는 빠르게 내려받고, PC에서는 목록과 업로드 흐름을 넓게 볼 수 있도록 정리했습니다.</p>
              </div>
              <div className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-sm text-slate-200 backdrop-blur">
                <p className="text-[11px] uppercase tracking-[0.22em] text-slate-300">Archive Count</p>
                <p className="mt-1 text-3xl font-black text-white">{scripts.length}</p>
                <p className="text-xs text-slate-300">현재 등록된 대본 수</p>
              </div>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <div className="rounded-[1.5rem] border border-white/10 bg-white/10 p-4 backdrop-blur">
                <p className="text-[11px] font-black tracking-[0.2em] text-slate-300">ACCESS</p>
                <p className="mt-2 text-lg font-black">{currentUser ? '로그인 상태' : '비회원 열람 가능'}</p>
                <p className="mt-1 text-xs text-slate-300">원고 목록은 누구나 볼 수 있습니다.</p>
              </div>
              <div className="rounded-[1.5rem] border border-white/10 bg-white/10 p-4 backdrop-blur">
                <p className="text-[11px] font-black tracking-[0.2em] text-slate-300">DOWNLOAD</p>
                <p className="mt-2 text-lg font-black">원본 파일 지원</p>
                <p className="mt-1 text-xs text-slate-300">첨부가 있으면 바로 다운로드할 수 있습니다.</p>
              </div>
              <div className="rounded-[1.5rem] border border-white/10 bg-white/10 p-4 backdrop-blur">
                <p className="text-[11px] font-black tracking-[0.2em] text-slate-300">UPLOAD</p>
                <p className="mt-2 text-lg font-black">{isAdmin ? '관리자 업로드 가능' : '관리자 전용 업로드'}</p>
                <p className="mt-1 text-xs text-slate-300">운영자가 새 대본을 직접 보관함에 추가합니다.</p>
              </div>
            </div>
          </div>
        </div>

        <aside className="space-y-4 rounded-[2rem] border border-slate-200 bg-white/90 p-6 shadow-sm backdrop-blur sm:p-7">
          {isAdmin ? (
            <>
              <div>
                <p className="text-xs font-black tracking-[0.2em] text-slate-400">ADMIN DESK</p>
                <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-900">관리자 전용 업로드</h2>
                <p className="mt-2 text-sm leading-6 text-slate-500">PC에서는 고정 패널처럼 보이고, 모바일에서는 카드 하나로 자연스럽게 접히는 형태입니다.</p>
              </div>

              <form onSubmit={handleUpload} className="space-y-4">
                <div>
                  <label className="mb-2 block text-xs font-bold text-slate-600">대본 제목</label>
                  <input
                    type="text"
                    placeholder="예: [KBS] 9시 뉴스 단신"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className={inputStyle}
                  />
                </div>
                <div>
                  <label className="mb-2 block text-xs font-bold text-slate-600">대본 본문</label>
                  <textarea
                    placeholder="대본 본문 내용을 입력하세요"
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    rows="8"
                    className={`${inputStyle} resize-none`}
                  />
                </div>
                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4">
                  <label className="mb-2 block text-xs font-bold text-slate-600">첨부 파일</label>
                  <input
                    type="file"
                    accept=".txt,.pdf,.doc,.docx,.hwp,.hwpx,image/*,audio/*,video/*"
                    onChange={(e) => setFile(e.target.files[0])}
                    className="w-full text-sm text-slate-500 file:mr-4 file:rounded-full file:border-0 file:bg-sky-100 file:px-4 file:py-2 file:font-semibold file:text-sky-700 hover:file:bg-sky-200"
                  />
                  <p className="mt-2 text-xs text-slate-400">첨부가 없어도 본문만으로 등록할 수 있습니다.</p>
                </div>
                <button type="submit" disabled={isUploading} className={`w-full rounded-2xl px-5 py-4 text-sm font-bold text-white transition-all ${isUploading ? 'bg-slate-400' : 'bg-blue-600 hover:-translate-y-0.5 hover:bg-blue-700'}`}>
                  {isUploading ? '등록 중...' : '대본 등록하기'}
                </button>
              </form>
            </>
          ) : (
            <>
              <div>
                <p className="text-xs font-black tracking-[0.2em] text-slate-400">QUICK GUIDE</p>
                <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-900">훈련용 원고를 둘러보세요</h2>
                <p className="mt-2 text-sm leading-6 text-slate-500">필요한 원고를 내려받고, 최신 업로드된 자료를 빠르게 확인할 수 있습니다.</p>
              </div>

              <div className="space-y-3 rounded-[1.5rem] border border-slate-200 bg-slate-50 p-5">
                <div>
                  <p className="text-sm font-bold text-slate-900">추천 사용 흐름</p>
                  <p className="mt-2 text-sm text-slate-500">1. 제목으로 필요한 대본을 찾고 2. 첨부가 있으면 원본을 받고 3. 본문은 바로 읽으며 연습하면 됩니다.</p>
                </div>
                {!currentUser && (
                  <button onClick={() => navigate('/login')} className="w-full rounded-2xl bg-slate-900 px-5 py-4 text-sm font-bold text-white transition-colors hover:bg-slate-700">
                    로그인 / 회원가입
                  </button>
                )}
              </div>
            </>
          )}
        </aside>
      </section>

      <section className="space-y-5">
        <div className="flex flex-col gap-2 rounded-[1.75rem] border border-slate-200 bg-white/85 px-5 py-5 shadow-sm backdrop-blur sm:flex-row sm:items-end sm:justify-between sm:px-6">
          <div>
            <p className="text-xs font-black tracking-[0.2em] text-slate-400">ARCHIVE FEED</p>
            <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-900">등록된 대본 목록</h2>
            <p className="mt-1 text-sm text-slate-500">최신 업로드 순서로 정렬되며, 첨부가 있는 자료는 다운로드 버튼이 함께 노출됩니다.</p>
          </div>
          <div className="rounded-full bg-slate-100 px-4 py-2 text-sm font-bold text-slate-600">총 {scripts.length}개</div>
        </div>

        {scripts.length === 0 ? (
          <div className="rounded-[1.75rem] border border-dashed border-slate-300 bg-white/80 p-12 text-center text-slate-500">아직 등록된 대본이 없습니다.</div>
        ) : (
          <div className="grid gap-4 xl:grid-cols-2">
            {scripts.map((script) => (
              <article key={script.id} className="rounded-[1.75rem] border border-slate-200 bg-white/90 p-5 shadow-sm transition-all hover:-translate-y-1 hover:shadow-xl sm:p-6">
                <div className="flex flex-col gap-3 border-b border-slate-100 pb-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 flex-1">
                    <h3 className="text-xl font-black tracking-tight text-slate-900">{script.title}</h3>
                    <p className="mt-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">업로드 시각 {script.created_at || '정보 없음'}</p>
                  </div>
                  {script.file_url && <span className="inline-flex rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-bold text-emerald-600">첨부 파일 있음</span>}
                </div>

                <div className="mt-5 rounded-[1.5rem] bg-slate-50 p-4 text-sm leading-7 text-slate-700 sm:p-5">
                  <p className="whitespace-pre-wrap break-keep">{script.content}</p>
                </div>

                <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-xs text-slate-400">발성 연습이나 앵커 멘트 리딩에 바로 사용할 수 있습니다.</p>
                  {script.file_url && (
                    <button
                      onClick={() => handleDownload(script.file_url, script.title)}
                      className="inline-flex items-center justify-center rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-emerald-700"
                    >
                      원본 파일 다운로드
                    </button>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

export default ScriptBoard;