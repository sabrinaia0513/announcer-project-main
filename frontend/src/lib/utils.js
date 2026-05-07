import React from 'react';
import { MEDIA_BASE_URL } from './api';

export const CATEGORIES = ['자유', '스터디', '질문', '정보', '공고', '장터'];
export const POSTS_PER_PAGE = 5;
export const MAX_PAGE_BUTTONS = 5;
export const inputStyle = "w-full rounded-2xl border border-slate-200 bg-white/95 px-4 py-3 text-slate-800 shadow-sm outline-none transition-all placeholder:text-slate-400 hover:border-slate-300 focus:border-sky-400 focus:ring-4 focus:ring-sky-100";

export const getCategoryBadgeClass = (category) => {
  if (category === '공고') {
    return 'bg-red-100 text-red-700';
  }

  if (category === '장터') {
    return 'bg-amber-100 text-amber-800';
  }

  return 'bg-indigo-100 text-indigo-700';
};

export const getPostContentPlaceholder = (category) => {
  if (category === '공고') {
    return '공고 핵심 내용, 지원 자격, 준비 팁 등을 정리해 주세요';
  }

  return '내용을 자유롭게 남겨주세요';
};

export const renderMedia = (url, linkLabel = '첨부파일 다운로드') => {
  if (!url) return null;
  const fullUrl = url.startsWith('/') ? `${MEDIA_BASE_URL}${url}` : url;
  const lowerUrl = fullUrl.toLowerCase();

  if (lowerUrl.match(/\.(jpeg|jpg|gif|png|webp)$/)) return <img src={fullUrl} alt="첨부 이미지" className="mb-8 max-w-full rounded-[1.75rem] border border-slate-200 shadow-sm" />;
  if (lowerUrl.match(/\.(mp4|webm|mov)$/)) return <video controls src={fullUrl} className="mb-8 max-w-full rounded-[1.75rem] bg-black shadow-sm" />;
  if (lowerUrl.match(/\.(mp3|wav|ogg)$/)) return <audio controls src={fullUrl} className="mb-8 w-full rounded-2xl" />;
  return <a href={fullUrl} target="_blank" rel="noopener noreferrer" className="mb-8 inline-flex items-center justify-center rounded-2xl bg-slate-100 px-5 py-3 font-bold text-slate-800 transition-colors hover:bg-slate-200">📎 {linkLabel}</a>;
};

export const parseDeadlineValue = (value) => {
  if (!value) return null;

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  const normalizedValue = String(value).trim();
  const localDateMatch = normalizedValue.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T\s](\d{2}):(\d{2})(?::(\d{2}))?)?$/);

  if (localDateMatch) {
    const [, year, month, day, hours = '00', minutes = '00', seconds = '00'] = localDateMatch;
    return new Date(
      Number(year),
      Number(month) - 1,
      Number(day),
      Number(hours),
      Number(minutes),
      Number(seconds),
    );
  }

  const parsedDate = new Date(normalizedValue);
  return Number.isNaN(parsedDate.getTime()) ? null : parsedDate;
};

const formatTwoDigits = (value) => String(value).padStart(2, '0');

export const formatDeadlineInputValue = (deadline) => {
  if (!deadline) return '';

  const normalizedValue = String(deadline).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(normalizedValue)) {
    return `${normalizedValue}T23:59`;
  }

  const targetDate = parseDeadlineValue(deadline);
  if (!targetDate) return '';

  return `${targetDate.getFullYear()}-${formatTwoDigits(targetDate.getMonth() + 1)}-${formatTwoDigits(targetDate.getDate())}T${formatTwoDigits(targetDate.getHours())}:${formatTwoDigits(targetDate.getMinutes())}`;
};

export const formatDeadlineDisplay = (deadline) => {
  const targetDate = parseDeadlineValue(deadline);
  if (!targetDate) return '';

  const formattedDate = `${targetDate.getFullYear()}.${formatTwoDigits(targetDate.getMonth() + 1)}.${formatTwoDigits(targetDate.getDate())}`;
  const normalizedValue = String(deadline).trim();

  if (!/[T\s]\d{2}:\d{2}/.test(normalizedValue)) {
    return formattedDate;
  }

  return `${formattedDate} ${formatTwoDigits(targetDate.getHours())}:${formatTwoDigits(targetDate.getMinutes())}`;
};

export const calculateDday = (deadline) => {
  const targetDate = parseDeadlineValue(deadline);
  if (!targetDate) return "";

  const today = new Date();
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const deadlineStart = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());
  const diffDays = Math.round((deadlineStart - todayStart) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return "마감";
  if (diffDays === 0) return "D-Day";
  return `D-${diffDays}`;
};
