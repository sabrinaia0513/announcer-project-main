import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { BACKEND_URL, MEDIA_BASE_URL } from '../lib/api';
import { CATEGORIES, POSTS_PER_PAGE, MAX_PAGE_BUTTONS, inputStyle, calculateDday } from '../lib/utils';

function HomePage({ currentUser }) {
  const [posts, setPosts] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [selectedTab, setSelectedTab] = useState('전체');
  const [sortBy, setSortBy] = useState('latest');
  const [totalPosts, setTotalPosts] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [isDownloading, setIsDownloading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => { fetchPosts(); fetchAnnouncements(); }, [selectedTab, currentPage, searchKeyword, sortBy]);

  const fetchPosts = async () => {
    try {
      const skip = (currentPage - 1) * POSTS_PER_PAGE;
      const response = await axios.get(`${BACKEND_URL}/posts`, { params: { skip, limit: POSTS_PER_PAGE, category: selectedTab, search: searchKeyword, sort_by: sortBy } });
      setPosts(response.data.posts); setTotalPosts(response.data.total_count);
    } catch (error) {
      console.error('게시글 로딩 실패:', error);
    }
  };

  const fetchAnnouncements = async () => {
    try { const response = await axios.get(`${BACKEND_URL}/announcements`); setAnnouncements(response.data); } catch (error) {
      console.error('공고 로딩 실패:', error);
    }
  };

  const handleDownloadLatestScript = async () => {
    if (!currentUser) return alert("로그인이 필요합니다.");
    setIsDownloading(true);

    try {
      const response = await axios.get(`${BACKEND_URL}/scripts`);
      if (response.data.length === 0) {
        alert("아직 관리자가 등록한 오늘의 대본이 없습니다!");
        setIsDownloading(false);
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
      alert("대본 다운로드 중 오류가 발생했습니다.");
    } finally {
      setIsDownloading(false);
    }
  };

  const totalPages = Math.ceil(totalPosts / POSTS_PER_PAGE);

  return (
    <div className="space-y-8 relative">
      <div className="bg-gray-900 rounded-2xl p-6 shadow-lg overflow-hidden relative">
        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500 rounded-full mix-blend-multiply filter blur-2xl opacity-30 animate-pulse"></div>
        <h2 className="text-xl font-extrabold text-white mb-4 flex items-center gap-2 relative z-10"><span></span> <span>공채 D-Day 전광판</span></h2>
        <div className="flex space-x-4 overflow-x-auto pb-4 relative z-10 scrollbar-hide">
          {announcements.length === 0 ? <p className="text-gray-400 text-sm">진행 중인 공채가 없습니다.</p> : announcements.map(ann => {
             const dday = calculateDday(ann.마감일);
             const isUrgent = dday === 'D-Day' || dday === '마감' || (dday.startsWith('D-') && parseInt(dday.replace('D-', '')) <= 3);
             return (
               <a href={ann.링크} target="_blank" rel="noopener noreferrer" key={ann.글번호} className="flex-shrink-0 bg-white hover:bg-gray-50 transition-colors rounded-xl p-4 w-56 sm:w-60 block shadow-md border border-gray-100">
                 <div className={`text-sm font-extrabold mb-2 inline-block px-2.5 py-1 rounded-md ${isUrgent ? 'bg-red-500 text-white' : 'bg-blue-600 text-white'}`}>{dday}</div>
                 <h3 className="text-gray-900 font-bold truncate text-sm sm:text-base">{ann.제목}</h3>
                 <p className="text-gray-500 text-xs mt-2 font-medium">마감: {ann.마감일}</p>
               </a>
             )
          })}
        </div>
      </div>

      {currentUser && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 sm:p-8 rounded-2xl shadow-sm border border-blue-100 text-center space-y-4">
          <h2 className="text-xl sm:text-2xl font-bold text-blue-800">🎙️ 오늘의 고퀄리티 훈련 대본</h2>
          <div className="flex flex-col sm:flex-row justify-center gap-3">
            <button
              onClick={handleDownloadLatestScript}
              disabled={isDownloading}
              className={`w-full sm:w-auto px-8 py-4 rounded-full font-bold text-white text-base sm:text-lg transition-all shadow-md ${isDownloading ? 'bg-gray-400' : 'bg-blue-600 hover:bg-blue-700 hover:-translate-y-1'}`}
            >
              {isDownloading ? '다운로드 준비 중...' : ' 오늘의 원고 바로 다운로드'}
            </button>
            <button
              onClick={() => navigate('/scripts')}
              className="w-full sm:w-auto px-8 py-4 rounded-full font-bold text-indigo-700 bg-white border border-indigo-200 text-base sm:text-lg transition-all shadow-sm hover:bg-indigo-50"
            >
              지난 원고 보러 가기 →
            </button>
          </div>
        </div>
      )}

      {currentUser && (
        <button
          onClick={() => navigate('/write')}
          className="fixed bottom-24 right-6 sm:bottom-6 sm:right-28 z-40 w-14 h-14 sm:w-16 sm:h-16 bg-gray-900 hover:bg-black text-white rounded-full shadow-2xl flex items-center justify-center text-3xl font-light transition-transform hover:scale-110 active:scale-95"
          title="새 글 작성"
        >
          +
        </button>
      )}

      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center px-1 mb-2 gap-4">
          <h2 className="text-xl font-bold text-gray-800 shrink-0">{sortBy === 'popular' ? '🔥 인기글' : '게시글 목록'}</h2>
          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            <div className="flex space-x-2 overflow-x-auto pb-1 scrollbar-hide">
              <button onClick={() => {setSelectedTab('전체'); setCurrentPage(1);}} className={`px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap ${selectedTab === '전체' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'}`}>전체</button>
              {CATEGORIES.map(cat => <button key={cat} onClick={() => {setSelectedTab(cat); setCurrentPage(1);}} className={`px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap ${selectedTab === cat ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'}`}>{cat}</button>)}
            </div>
            <div className="flex bg-gray-200 rounded-lg p-1 shrink-0 self-start sm:self-auto">
              <button onClick={() => { setSortBy('latest'); setCurrentPage(1); }} className={`px-3 py-1.5 rounded-md text-xs sm:text-sm font-bold ${sortBy === 'latest' ? 'bg-white shadow text-blue-600' : 'text-gray-500'}`}>🕒 최신순</button>
              <button onClick={() => { setSortBy('popular'); setCurrentPage(1); }} className={`px-3 py-1.5 rounded-md text-xs sm:text-sm font-bold ${sortBy === 'popular' ? 'bg-white shadow text-red-500' : 'text-gray-500'}`}>🔥 핫게시판</button>
            </div>
          </div>
        </div>

        <form onSubmit={(e) => { e.preventDefault(); setSearchKeyword(searchInput); setCurrentPage(1); }} className="flex gap-2 mb-6">
          <input type="text" placeholder="검색어를 입력하세요" value={searchInput} onChange={(e) => setSearchInput(e.target.value)} className={`${inputStyle} py-2`} />
          <button type="submit" className="px-6 bg-gray-800 text-white font-bold rounded-lg hover:bg-gray-900 whitespace-nowrap">검색</button>
        </form>

        {posts.length === 0 ? <div className="bg-white p-10 rounded-2xl text-center text-gray-500 border border-gray-100">게시글이 없습니다.</div> : (
          posts.map((post) => (
            <div key={post.글번호} className="bg-white p-5 sm:p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow relative overflow-hidden cursor-pointer" onClick={() => navigate(`/post/${post.글번호}`)}>
              {sortBy === 'popular' && <div className="absolute top-0 right-0 bg-red-50 text-red-500 text-[10px] font-bold px-2 py-1 rounded-bl-lg border-b border-l border-red-100">HOT🔥</div>}
              <div className="flex items-center gap-2 mb-3 flex-wrap">
                <span className="px-2 py-1 bg-indigo-100 text-indigo-700 text-[10px] sm:text-xs font-extrabold rounded-md">{post.카테고리}</span>
                <h3 className="text-base sm:text-lg font-bold text-gray-900 truncate flex-1">{post.제목}</h3>
                {post.file_url && <span className="text-sm text-gray-400">📎</span>}
              </div>
              <p className="text-gray-600 text-sm truncate mb-4">{post.내용}</p>
              <div className="flex flex-col sm:flex-row sm:justify-between items-start sm:items-center text-xs text-gray-500 pt-4 border-t border-gray-50 gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-gray-700 flex items-center gap-1">
                    <span className="text-[10px] bg-gray-200 px-1 py-0.5 rounded-sm">{post.작성자등급}</span>{post.작성자}
                  </span>
                  <span>•</span><span>{post.작성시간}</span>
                </div>
                <div className="flex items-center gap-3"><span className="font-bold text-red-500">❤️ {post.좋아요수}</span><span className="font-medium text-blue-500">💬 상세 보기</span></div>
              </div>
            </div>
          ))
        )}
        {totalPages > 0 && (() => {
          const startPage = Math.max(1, currentPage - Math.floor(MAX_PAGE_BUTTONS / 2));
          const endPage = Math.min(totalPages, startPage + MAX_PAGE_BUTTONS - 1);
          const adjustedStart = Math.max(1, endPage - MAX_PAGE_BUTTONS + 1);
          const pageNumbers = Array.from({length: endPage - adjustedStart + 1}, (_, i) => adjustedStart + i);
          return (
            <div className="flex justify-center space-x-2 mt-8 pb-10">
              {adjustedStart > 1 && <button onClick={() => setCurrentPage(1)} className="w-10 h-10 rounded-full font-bold bg-white border border-gray-200">1</button>}
              {adjustedStart > 2 && <span className="w-10 h-10 flex items-center justify-center text-gray-400">...</span>}
              {pageNumbers.map(pageNum => <button key={pageNum} onClick={() => setCurrentPage(pageNum)} className={`w-10 h-10 rounded-full font-bold ${currentPage === pageNum ? 'bg-blue-600 text-white' : 'bg-white border border-gray-200'}`}>{pageNum}</button>)}
              {endPage < totalPages - 1 && <span className="w-10 h-10 flex items-center justify-center text-gray-400">...</span>}
              {endPage < totalPages && <button onClick={() => setCurrentPage(totalPages)} className="w-10 h-10 rounded-full font-bold bg-white border border-gray-200">{totalPages}</button>}
            </div>
          );
        })()}
      </div>
    </div>
  );
}

export default HomePage;
