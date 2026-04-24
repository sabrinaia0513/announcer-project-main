import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { BACKEND_URL, MEDIA_BASE_URL } from '../lib/api';
import { CATEGORIES, POSTS_PER_PAGE, MAX_PAGE_BUTTONS, inputStyle, calculateDday } from '../lib/utils';

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
      const response = await axios.get(`${BACKEND_URL}/scripts`);
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
  const postsLabel = sortBy === 'popular'
    ? '추천 5개 이상 받은 글만 모아봤습니다.'
    : '지금 커뮤니티에서 올라오는 최신 글입니다.';

  return (
    <div className="relative space-y-8 xl:space-y-10">
      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.7fr)_360px]">
        <div className="relative overflow-hidden rounded-[2rem] bg-slate-900 px-6 py-7 text-white shadow-[0_24px_80px_-48px_rgba(15,23,42,0.9)] sm:px-8 xl:px-10">
          <div className="absolute inset-y-0 right-0 w-1/2 bg-[radial-gradient(circle_at_top_right,_rgba(59,130,246,0.35),_transparent_55%)]" />
          <div className="relative z-10">
            <span className="inline-flex rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[11px] font-semibold tracking-[0.22em] text-sky-100">D-DAY BOARD</span>
            <div className="mt-4 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <h2 className="text-2xl font-black tracking-tight sm:text-3xl">공채 D-Day 전광판</h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">모바일에서는 빠르게 훑고, PC에서는 한눈에 비교할 수 있도록 현재 진행 중인 공고를 정리했습니다.</p>
              </div>
              <div className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-sm text-slate-200 backdrop-blur">
                <p className="text-[11px] uppercase tracking-[0.22em] text-slate-300">Live Status</p>
                <p className="mt-1 text-2xl font-black text-white">{announcements.length}</p>
                <p className="text-xs text-slate-300">현재 노출 중인 공고</p>
              </div>
            </div>
            <div className="mt-6 flex gap-4 overflow-x-auto pb-2 xl:grid xl:grid-cols-3 xl:overflow-visible">
              {announcements.length === 0 ? (
                <p className="text-sm text-slate-300">진행 중인 공채가 없습니다.</p>
              ) : (
                announcements.map((announcement) => {
                  const dday = calculateDday(announcement.마감일);
                  const isUrgent = dday === 'D-Day' || dday === '마감' || (dday.startsWith('D-') && parseInt(dday.replace('D-', ''), 10) <= 3);
                  const AnnouncementCard = announcement.링크 ? 'a' : 'div';

                  return (
                    <AnnouncementCard
                      {...(announcement.링크 ? { href: announcement.링크, target: '_blank', rel: 'noopener noreferrer' } : {})}
                      key={announcement.글번호}
                      className={`block min-w-[16rem] rounded-[1.5rem] border p-5 shadow-lg transition-all xl:min-w-0 ${announcement.링크 ? 'border-white/10 bg-white/95 text-slate-900 hover:-translate-y-1 hover:bg-white' : 'border-white/10 bg-slate-800/70 text-slate-300'}`}
                    >
                      <div className={`inline-flex rounded-full px-3 py-1 text-xs font-black ${isUrgent ? 'bg-red-500 text-white' : 'bg-blue-600 text-white'}`}>{dday}</div>
                      <h3 className="mt-4 text-base font-bold leading-snug sm:text-lg">{announcement.제목}</h3>
                      <p className={`mt-3 text-xs font-medium ${announcement.링크 ? 'text-slate-500' : 'text-slate-400'}`}>마감: {announcement.마감일}</p>
                      <p className={`mt-4 text-xs font-bold ${announcement.링크 ? 'text-sky-600' : 'text-slate-400'}`}>{announcement.링크 ? '공식 사이트로 이동' : '공식 링크 없음'}</p>
                    </AnnouncementCard>
                  );
                })
              )}
            </div>
          </div>
        </div>

        <aside className="space-y-4 rounded-[2rem] border border-slate-200 bg-white/90 p-6 shadow-sm backdrop-blur sm:p-7">
          <div>
            <p className="text-xs font-black tracking-[0.2em] text-slate-400">QUICK DESK</p>
            <h3 className="mt-2 text-2xl font-black tracking-tight text-slate-900">{currentUser ? `${currentUser.nickname}님, 오늘도 훈련해볼까요?` : '모바일은 빠르게, PC는 넓게'}</h3>
            <p className="mt-2 text-sm leading-6 text-slate-500">{currentUser ? '대본 다운로드와 글쓰기 액션을 따로 묶어 PC에서도 덜 답답하게 보이도록 정리했습니다.' : '로그인하면 오늘의 대본과 개인화 기능을 바로 사용할 수 있습니다.'}</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-slate-900 px-4 py-4 text-white">
              <p className="text-[11px] font-bold tracking-[0.2em] text-slate-300">POSTS</p>
              <p className="mt-2 text-2xl font-black">{totalPosts}</p>
              <p className="text-xs text-slate-300">현재 목록 기준 게시글</p>
            </div>
            <div className="rounded-2xl bg-sky-50 px-4 py-4 text-slate-900">
              <p className="text-[11px] font-bold tracking-[0.2em] text-sky-500">MODE</p>
              <p className="mt-2 text-xl font-black">{sortBy === 'popular' ? 'HOT' : 'LATEST'}</p>
              <p className="text-xs text-slate-500">{sortBy === 'popular' ? '추천 5개 이상' : '최근 글 우선'}</p>
            </div>
          </div>

          {currentUser ? (
            <div className="space-y-3 rounded-[1.5rem] border border-blue-100 bg-gradient-to-br from-blue-50 via-white to-indigo-50 p-5">
              <p className="text-sm font-bold text-blue-900">오늘의 고퀄리티 훈련 대본</p>
              <button
                onClick={handleDownloadLatestScript}
                disabled={isDownloading}
                className={`w-full rounded-2xl px-5 py-4 text-sm font-bold text-white transition-all ${isDownloading ? 'bg-slate-400' : 'bg-blue-600 hover:-translate-y-0.5 hover:bg-blue-700'}`}
              >
                {isDownloading ? '다운로드 준비 중...' : '오늘의 원고 바로 다운로드'}
              </button>
              <button onClick={() => navigate('/scripts')} className="w-full rounded-2xl border border-indigo-200 bg-white px-5 py-4 text-sm font-bold text-indigo-700 transition-colors hover:bg-indigo-50">
                지난 원고 보러 가기
              </button>
            </div>
          ) : (
            <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-5">
              <p className="text-sm font-bold text-slate-900">로그인하면 더 편합니다.</p>
              <p className="mt-2 text-sm text-slate-500">대본 다운로드, 댓글, 추천, 마이페이지 기능을 바로 사용할 수 있습니다.</p>
              <button onClick={() => navigate('/login')} className="mt-4 w-full rounded-2xl bg-slate-900 px-5 py-4 text-sm font-bold text-white transition-colors hover:bg-slate-700">
                로그인 / 회원가입
              </button>
            </div>
          )}
        </aside>
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

      <section className="grid gap-6 xl:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="space-y-4 xl:sticky xl:top-28 xl:self-start">
          <div className="rounded-[1.75rem] border border-slate-200 bg-white/90 p-5 shadow-sm backdrop-blur">
            <p className="text-xs font-black tracking-[0.2em] text-slate-400">FILTERS</p>
            <h3 className="mt-2 text-xl font-black tracking-tight text-slate-900">{sortBy === 'popular' ? '핫게시판' : '게시글 목록'}</h3>
            <p className="mt-2 text-sm leading-6 text-slate-500">{postsLabel}</p>

            <form onSubmit={(event) => { event.preventDefault(); setSearchKeyword(searchInput); setCurrentPage(1); }} className="mt-5 space-y-3">
              <input type="text" placeholder="검색어를 입력하세요" value={searchInput} onChange={(event) => setSearchInput(event.target.value)} className={`${inputStyle} py-3`} />
              <button type="submit" className="w-full rounded-2xl bg-slate-900 px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-slate-700">검색</button>
            </form>
          </div>

          <div className="rounded-[1.75rem] border border-slate-200 bg-white/90 p-5 shadow-sm backdrop-blur">
            <p className="text-xs font-black tracking-[0.2em] text-slate-400">CATEGORY</p>
            <div className="mt-4 grid grid-cols-2 gap-2 xl:grid-cols-1">
              <button onClick={() => { setSelectedTab('전체'); setCurrentPage(1); }} className={`rounded-2xl px-4 py-3 text-sm font-bold transition-colors ${selectedTab === '전체' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>전체</button>
              {CATEGORIES.map((category) => (
                <button key={category} onClick={() => { setSelectedTab(category); setCurrentPage(1); }} className={`rounded-2xl px-4 py-3 text-sm font-bold transition-colors ${selectedTab === category ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                  {category}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-[1.75rem] border border-slate-200 bg-white/90 p-5 shadow-sm backdrop-blur">
            <p className="text-xs font-black tracking-[0.2em] text-slate-400">SORT</p>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button onClick={() => { setSortBy('latest'); setCurrentPage(1); }} className={`rounded-2xl px-4 py-3 text-sm font-bold ${sortBy === 'latest' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>최신순</button>
              <button onClick={() => { setSortBy('popular'); setCurrentPage(1); }} className={`rounded-2xl px-4 py-3 text-sm font-bold ${sortBy === 'popular' ? 'bg-red-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>핫게시판</button>
            </div>
          </div>

          {currentUser && (
            <button onClick={() => navigate('/write')} className="hidden w-full rounded-[1.75rem] bg-slate-900 px-5 py-5 text-left text-white shadow-lg transition-transform hover:-translate-y-0.5 xl:block">
              <p className="text-xs font-black tracking-[0.22em] text-slate-300">CREATE</p>
              <p className="mt-2 text-xl font-black">새 글 작성하기</p>
              <p className="mt-1 text-sm text-slate-300">PC에서는 이 버튼을 고정해 두고 바로 이동할 수 있습니다.</p>
            </button>
          )}
        </aside>

        <div className="space-y-5">
          <div className="flex flex-col gap-2 rounded-[1.75rem] border border-slate-200 bg-white/85 px-5 py-5 shadow-sm backdrop-blur sm:flex-row sm:items-end sm:justify-between sm:px-6">
            <div>
              <p className="text-xs font-black tracking-[0.2em] text-slate-400">CONTENT FEED</p>
              <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-900">{sortBy === 'popular' ? '핫게시판' : '커뮤니티 피드'}</h2>
              <p className="mt-1 text-sm text-slate-500">{selectedTab === '전체' ? '전체 카테고리' : `${selectedTab} 카테고리`} · 결과 {totalPosts}건</p>
            </div>
            <div className="rounded-full bg-slate-100 px-4 py-2 text-sm font-bold text-slate-600">{sortBy === 'popular' ? '추천 5개 이상만 노출' : '최신 글 순서로 정렬'}</div>
          </div>

          {posts.length === 0 ? (
            <div className="rounded-[1.75rem] border border-dashed border-slate-300 bg-white/80 p-12 text-center text-slate-500">조건에 맞는 게시글이 없습니다.</div>
          ) : (
            posts.map((post) => (
              <article key={post.글번호} className="group relative overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white/90 p-5 shadow-sm transition-all hover:-translate-y-1 hover:shadow-xl sm:p-6" onClick={() => navigate(`/post/${post.글번호}`)}>
                <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-sky-500 via-blue-500 to-indigo-500 opacity-0 transition-opacity group-hover:opacity-100" />
                {sortBy === 'popular' && <div className="absolute right-5 top-5 rounded-full bg-red-50 px-3 py-1 text-[11px] font-bold text-red-500">HOT POST</div>}

                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="mb-3 flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-indigo-100 px-3 py-1 text-[11px] font-extrabold text-indigo-700">{post.카테고리}</span>
                      {post.file_url && <span className="text-sm text-slate-400">📎 첨부 있음</span>}
                    </div>
                    <h3 className="text-lg font-black tracking-tight text-slate-900 sm:text-xl">{post.제목}</h3>
                    <p className="mt-3 text-sm leading-6 text-slate-600 sm:text-[15px]">{post.내용}</p>
                  </div>
                </div>

                <div className="mt-6 flex flex-col gap-3 border-t border-slate-100 pt-4 text-sm text-slate-500 lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5 font-semibold text-slate-700">
                      <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-bold text-slate-500">{post.작성자등급}</span>
                      {post.작성자}
                    </span>
                    <span>{post.작성시간}</span>
                  </div>
                  <div className="flex items-center gap-4 font-bold">
                    <span className="text-red-500">❤️ {post.좋아요수}</span>
                    <span className="text-sky-600">자세히 보기 →</span>
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
              <div className="flex flex-wrap justify-center gap-2 pb-10 pt-3">
                {adjustedStart > 1 && <button onClick={() => setCurrentPage(1)} className="h-11 rounded-full border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700">1</button>}
                {adjustedStart > 2 && <span className="flex h-11 w-11 items-center justify-center text-slate-400">...</span>}
                {pageNumbers.map((pageNum) => <button key={pageNum} onClick={() => setCurrentPage(pageNum)} className={`h-11 min-w-11 rounded-full px-4 text-sm font-bold ${currentPage === pageNum ? 'bg-blue-600 text-white shadow-sm' : 'border border-slate-200 bg-white text-slate-700'}`}>{pageNum}</button>)}
                {endPage < totalPages - 1 && <span className="flex h-11 w-11 items-center justify-center text-slate-400">...</span>}
                {endPage < totalPages && <button onClick={() => setCurrentPage(totalPages)} className="h-11 rounded-full border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700">{totalPages}</button>}
              </div>
            );
          })()}
        </div>
      </section>
    </div>
  );
}

export default HomePage;
