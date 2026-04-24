import React from 'react';
import { MEDIA_BASE_URL } from './api';

export const CATEGORIES = ['자유', '스터디', '질문', '정보', '공고'];
export const POSTS_PER_PAGE = 5;
export const MAX_PAGE_BUTTONS = 5;
export const inputStyle = "w-full rounded-2xl border border-slate-200 bg-white/95 px-4 py-3 text-slate-800 shadow-sm outline-none transition-all placeholder:text-slate-400 hover:border-slate-300 focus:border-sky-400 focus:ring-4 focus:ring-sky-100";

export const renderMedia = (url) => {
  if (!url) return null;
  const fullUrl = url.startsWith('/') ? `${MEDIA_BASE_URL}${url}` : url;
  const lowerUrl = fullUrl.toLowerCase();

  if (lowerUrl.match(/\.(jpeg|jpg|gif|png|webp)$/)) return <img src={fullUrl} alt="첨부 이미지" className="mb-8 max-w-full rounded-[1.75rem] border border-slate-200 shadow-sm" />;
  if (lowerUrl.match(/\.(mp4|webm|mov)$/)) return <video controls src={fullUrl} className="mb-8 max-w-full rounded-[1.75rem] bg-black shadow-sm" />;
  if (lowerUrl.match(/\.(mp3|wav|ogg)$/)) return <audio controls src={fullUrl} className="mb-8 w-full rounded-2xl" />;
  return <a href={fullUrl} target="_blank" rel="noopener noreferrer" className="mb-8 inline-flex items-center justify-center rounded-2xl bg-slate-100 px-5 py-3 font-bold text-slate-800 transition-colors hover:bg-slate-200">📎 첨부파일 다운로드</a>;
};

export const calculateDday = (deadline) => {
  if (!deadline) return "";
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const dDate = new Date(deadline);
  const diffTime = dDate - today;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return "마감";
  if (diffDays === 0) return "D-Day";
  return `D-${diffDays}`;
};
