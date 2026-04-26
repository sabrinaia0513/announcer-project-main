import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { BACKEND_URL, MEDIA_BASE_URL, getAuthHeader } from '../lib/api';
import { CATEGORIES, POSTS_PER_PAGE, MAX_PAGE_BUTTONS, inputStyle, calculateDday, getCategoryBadgeClass } from '../lib/utils';

function HomePage({ currentUser }) {
  const navigate = useNavigate();
  const [posts, setPosts] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [selectedTab, setSelectedTab] = useState('전체');
  const [sortBy, setSortBy] = useState('latest');
  const [totalPosts, setTotalPosts] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
    fetchPosts();
    fetchAnnouncements();
  }, [selectedTab, currentPage, searchKeyword, sortBy]);

  const fetchPosts = async () => {
    try {
      const skip = (currentPage - 1) * POSTS_PER_PAGE;
      const response = await axios.get(`${BACKEND_URL}/posts`, {
        params: {
          skip,
          limit: POSTS_PER_PAGE,
          category: selectedTab,
          search: searchKeyword,
          sort_by: sortBy,
        },
      });
      setPosts(response.data.posts);
      setTotalPosts(response.data.total_count);
    } catch (error) {
      console.error('게시글 로딩 실패:', error);
    }
  };

  const fetchAnnouncements = async () => {
    try {
      const response = await axios.get(`${BACKEND_URL}/announcements`);
      setAnnouncements(response.data);
    } catch (error) {
      console.error('공고 로딩 실패:', error);
    }
  };

  const handleDownloadLatestScript = async () => {
    if (!currentUser) return alert('로그인이 필요합니다.');
    setIsDownloading(true);

    try {
      const response = await axios.get(`${BACKEND_URL}/scripts`, getAuthHeader());
      if (response.data.length === 0) {
        alert('아직 관리자가 등록한 오늘의 대본이 없습니다!');
        return;
      }

      const latestScript = response.data[0];
      const cleanTitle = latestScript.title.replace(/[/\\?%*:|"<>]/g, '_');

      if (latestScript.file_url) {
        const fileRes = await axios.get(`${MEDIA_BASE_URL}${latestScript.file_url}`, { responseType: 'blob' });
        const url = window.URL.createObjectURL(new Blob([fileRes.data]));
        const ext = latestScript.file_url.split('.').pop();

        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `[오늘의대본]_${cleanTitle}.${ext}`);
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
      } else {
        const textContent = `제목: ${latestScript.title}\n\n${latestScript.content}`;
        const blob = new Blob([textContent], { type: 'text/plain;charset=utf-8' });
        const url = window.URL.createObjectURL(blob);

        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `[오늘의대본]_${cleanTitle}.txt`);
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
      }
    } catch (error) {
      alert('대본 다운로드 중 오류가 발생했습니다.');
    } finally {
      setIsDownloading(false);
    }
  };

  const totalPages = Math.ceil(totalPosts / POSTS_PER_PAGE);

  return (
    <div className="mx-auto max-w-5xl space-y-5 sm:space-y-6">
      <section className="rounded-[1.75rem] border border-slate-200 bg-slate-900 px-5 py-5 text-white shadow-[0_18px_40px_-28px_rgba(15,23,42,0.95)] sm:px-6 sm:py-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-xl font-black tracking-tight sm:text-2xl">공채 전광판</h2>
          </div>
          <div className="inline-flex self-start rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-bold text-slate-200">
            진행 중 {announcements.length}개
          </div>
        </div>

        <div className="mt-4 flex gap-3 overflow-x-auto pb-1 md:grid md:grid-cols-2 md:overflow-visible xl:grid-cols-3">
          {announcements.length === 0 ? (
            <div className="rounded-[1.25rem] border border-white/10 bg-white/5 px-4 py-5 text-sm text-slate-300">
              진행 중인 공채가 없습니다.
            </div>
          ) : (
            announcements.map((announcement) => {
              const dday = calculateDday(announcement.마감일);
              const isUrgent = dday === 'D-Day' || dday === '마감' || (dday.startsWith('D-') && parseInt(dday.replace('D-', ''), 10) <= 3);
              const AnnouncementCard = announcement.링크 ? 'a' : 'div';

              return (
                <AnnouncementCard
                  {...(announcement.링크 ? { href: announcement.링크, target: '_blank', rel: 'noopener noreferrer' } : {})}
                  key={announcement.글번호}
                  className={`block min-w-[14.5rem] rounded-[1.25rem] border px-4 py-4 transition-all md:min-w-0 ${announcement.링크 ? 'border-white/10 bg-white text-slate-900 hover:-translate-y-0.5 hover:bg-slate-50' : 'border-white/10 bg-slate-800/80 text-slate-300'}`}
                >
                  <div className={`inline-flex rounded-full px-3 py-1 text-[11px] font-black ${isUrgent ? 'bg-red-500 text-white' : 'bg-blue-600 text-white'}`}>{dday}</div>
                  <h3 className="mt-3 text-sm font-black leading-6 sm:text-base">{announcement.제목}</h3>
                  <p className={`mt-2 text-xs ${announcement.링크 ? 'text-slate-500' : 'text-slate-400'}`}>마감: {announcement.마감일}</p>
                </AnnouncementCard>
              );
            })
          )}
        </div>
      </section>

      <section className="rounded-[1.75rem] border border-slate-200 bg-white/90 px-5 py-5 shadow-sm backdrop-blur sm:px-6 sm:py-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-black tracking-tight text-slate-900 sm:text-2xl">원고 보관함</h2>
          </div>
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
            <button
              onClick={currentUser ? handleDownloadLatestScript : () => navigate('/login')}
              disabled={isDownloading}
              className={`rounded-2xl px-5 py-3 text-sm font-bold text-white transition-colors ${isDownloading ? 'bg-slate-400' : 'bg-blue-600 hover:bg-blue-700'}`}
            >
              {currentUser ? (isDownloading ? '다운로드 준비 중...' : '오늘의 원고 다운로드') : '로그인 후 원고 받기'}
            </button>
            <button onClick={() => navigate(currentUser ? '/scripts' : '/login')} className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-50">
              원고 보관함 보기
            </button>
          </div>
        </div>
      </section>

      {currentUser && (
        <button
          onClick={() => navigate('/write')}
          className="fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-slate-900 text-3xl font-light text-white shadow-2xl transition-transform hover:scale-110 active:scale-95 xl:hidden"
          title="새 글 작성"
        >
          +
        </button>
      )}

      <section className="space-y-4">
        <div className="rounded-[1.75rem] border border-slate-200 bg-white/90 p-5 shadow-sm backdrop-blur sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-2xl font-black tracking-tight text-slate-900">게시글</h2>
              <p className="mt-1 text-sm text-slate-500">{selectedTab === '전체' ? '전체 카테고리' : `${selectedTab} 카테고리`} · 결과 {totalPosts}건</p>
            </div>
            {currentUser && (
              <button onClick={() => navigate('/write')} className="hidden rounded-2xl bg-slate-900 px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-slate-700 sm:inline-flex">
                글쓰기
              </button>
            )}
          </div>

          <div className="mt-5 flex flex-col gap-3">
            <div className="flex gap-2 overflow-x-auto pb-1">
              <button onClick={() => { setSelectedTab('전체'); setCurrentPage(1); }} className={`rounded-2xl px-4 py-2 text-sm font-bold whitespace-nowrap transition-colors ${selectedTab === '전체' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>전체</button>
              {CATEGORIES.map((category) => (
                <button key={category} onClick={() => { setSelectedTab(category); setCurrentPage(1); }} className={`rounded-2xl px-4 py-2 text-sm font-bold whitespace-nowrap transition-colors ${selectedTab === category ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                  {category}
                </button>
              ))}
            </div>

            <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
              <div className="flex self-start rounded-2xl bg-slate-100 p-1">
                <button onClick={() => { setSortBy('latest'); setCurrentPage(1); }} className={`rounded-xl px-4 py-2 text-xs font-bold sm:text-sm ${sortBy === 'latest' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}>최신순</button>
                <button onClick={() => { setSortBy('popular'); setCurrentPage(1); }} className={`rounded-xl px-4 py-2 text-xs font-bold sm:text-sm ${sortBy === 'popular' ? 'bg-white text-red-500 shadow-sm' : 'text-slate-500'}`}>인기글</button>
              </div>

              <form onSubmit={(event) => { event.preventDefault(); setSearchKeyword(searchInput); setCurrentPage(1); }} className="flex w-full items-center gap-2 lg:ml-auto lg:max-w-xl">
                <input type="text" placeholder="검색어를 입력하세요" value={searchInput} onChange={(event) => setSearchInput(event.target.value)} className={`${inputStyle} py-3`} />
                <button type="submit" className="shrink-0 whitespace-nowrap rounded-2xl bg-slate-900 px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-slate-700">검색</button>
              </form>
            </div>
          </div>
        </div>

        {posts.length === 0 ? (
          <div className="rounded-[1.75rem] border border-dashed border-slate-300 bg-white/80 p-12 text-center text-slate-500">조건에 맞는 게시글이 없습니다.</div>
        ) : (
          posts.map((post) => (
            <article key={post.글번호} className="group cursor-pointer rounded-[1.75rem] border border-slate-200 bg-white/90 p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md sm:p-6" onClick={() => navigate(`/post/${post.글번호}`)}>
              {sortBy === 'popular' && <div className="mb-3 inline-flex rounded-full bg-red-50 px-3 py-1 text-[11px] font-bold text-red-500">인기글</div>}

              <div className="min-w-0">
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <span className={`rounded-full px-3 py-1 text-[11px] font-extrabold ${getCategoryBadgeClass(post.카테고리)}`}>{post.카테고리}</span>
                  {post.file_url && <span className="text-sm text-slate-400">📎 첨부 있음</span>}
                </div>
                <h3 className="text-lg font-black tracking-tight text-slate-900 sm:text-xl">{post.제목}</h3>
                <p className="mt-3 text-sm leading-6 text-slate-600 sm:text-[15px]">{post.내용}</p>
              </div>

              <div className="mt-5 flex flex-col gap-3 border-t border-slate-100 pt-4 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5 font-semibold text-slate-700">
                    <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-bold text-slate-500">{post.작성자등급}</span>
                    {post.작성자}
                  </span>
                  <span>{post.작성시간}</span>
                  <span>조회 {post.조회수}</span>
                </div>
                <div className="flex items-center gap-4 font-bold">
                  <span className="text-red-500">❤️ {post.좋아요수}</span>
                </div>
              </div>
            </article>
          ))
        )}

        {totalPages > 0 && (() => {
          const startPage = Math.max(1, currentPage - Math.floor(MAX_PAGE_BUTTONS / 2));
          const endPage = Math.min(totalPages, startPage + MAX_PAGE_BUTTONS - 1);
          const adjustedStart = Math.max(1, endPage - MAX_PAGE_BUTTONS + 1);
          const pageNumbers = Array.from({ length: endPage - adjustedStart + 1 }, (_, index) => adjustedStart + index);

          return (
            <div className="flex flex-wrap justify-center gap-2 pb-8 pt-2">
              {adjustedStart > 1 && <button onClick={() => setCurrentPage(1)} className="h-11 rounded-full border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700">1</button>}
              {adjustedStart > 2 && <span className="flex h-11 w-11 items-center justify-center text-slate-400">...</span>}
              {pageNumbers.map((pageNum) => <button key={pageNum} onClick={() => setCurrentPage(pageNum)} className={`h-11 min-w-11 rounded-full px-4 text-sm font-bold ${currentPage === pageNum ? 'bg-blue-600 text-white shadow-sm' : 'border border-slate-200 bg-white text-slate-700'}`}>{pageNum}</button>)}
              {endPage < totalPages - 1 && <span className="flex h-11 w-11 items-center justify-center text-slate-400">...</span>}
              {endPage < totalPages && <button onClick={() => setCurrentPage(totalPages)} className="h-11 rounded-full border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700">{totalPages}</button>}
            </div>
          );
        })()}
      </section>
    </div>
  );
}

export default HomePage;
