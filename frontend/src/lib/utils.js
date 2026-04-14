import React from 'react';
import { BACKEND_URL } from './api';

export const CATEGORIES = ['자유', '스터디', '질문', '정보', '공고'];
export const POSTS_PER_PAGE = 5;
export const MAX_PAGE_BUTTONS = 5;
export const inputStyle = "w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all";

export const renderMedia = (url) => {
  if (!url) return null;
  const fullUrl = url.startsWith('/') ? `${BACKEND_URL}${url}` : url;
  const lowerUrl = fullUrl.toLowerCase();

  if (lowerUrl.match(/\.(jpeg|jpg|gif|png|webp)$/)) return <img src={fullUrl} alt="첨부 이미지" className="max-w-full h-auto rounded-xl shadow-sm mb-6 border border-gray-100" />;
  if (lowerUrl.match(/\.(mp4|webm|mov)$/)) return <video controls src={fullUrl} className="max-w-full h-auto rounded-xl shadow-sm mb-6 bg-black" />;
  if (lowerUrl.match(/\.(mp3|wav|ogg)$/)) return <audio controls src={fullUrl} className="w-full mb-6" />;
  return <a href={fullUrl} target="_blank" rel="noopener noreferrer" className="inline-block px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-lg font-bold mb-6 transition-colors">📎 첨부파일 다운로드</a>;
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
