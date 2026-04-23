import React from 'react';
import { Link } from 'react-router-dom';

function NotFoundPage() {
  return (
    <div className="relative overflow-hidden rounded-[2rem] border border-gray-100 bg-white px-6 py-16 text-center shadow-sm sm:px-10">
      <div className="absolute -left-12 top-10 h-32 w-32 rounded-full bg-sky-100 blur-3xl" />
      <div className="absolute -right-10 bottom-6 h-36 w-36 rounded-full bg-indigo-100 blur-3xl" />
      <div className="relative mx-auto max-w-lg">
        <div className="inline-flex items-center rounded-full border border-sky-100 bg-sky-50 px-4 py-1 text-xs font-bold tracking-[0.2em] text-sky-700">
          ERROR 404
        </div>
        <h1 className="mt-6 text-4xl font-black tracking-tight text-gray-900 sm:text-5xl">페이지를 찾을 수 없습니다</h1>
        <p className="mt-4 text-sm leading-6 text-gray-500 sm:text-base">
          주소가 잘못 입력되었거나, 페이지가 이동 또는 삭제되었을 수 있습니다. 메인 페이지로 돌아가 다시 탐색해 주세요.
        </p>
        <Link
          to="/"
          className="mt-8 inline-flex items-center justify-center rounded-full bg-gray-900 px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-black"
        >
          메인으로 돌아가기
        </Link>
      </div>
    </div>
  );
}

export default NotFoundPage;