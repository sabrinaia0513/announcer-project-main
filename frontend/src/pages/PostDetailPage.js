import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';
import { BACKEND_URL, getAuthHeader } from '../lib/api';
import { inputStyle, renderMedia } from '../lib/utils';

function PostDetailSpinner() {
  return (
    <div className="flex min-h-[55vh] items-center justify-center px-6">
      <div className="flex flex-col items-center gap-4 rounded-3xl border border-gray-100 bg-white/90 px-10 py-12 shadow-sm backdrop-blur">
        <div className="relative h-16 w-16">
          <div className="absolute inset-0 rounded-full border-4 border-gray-200" />
          <div className="absolute inset-0 animate-spin rounded-full border-4 border-transparent border-t-blue-600 border-r-sky-400" />
          <div className="absolute inset-3 rounded-full bg-blue-50 animate-pulse" />
        </div>
        <div className="text-center">
          <p className="text-sm font-semibold text-gray-700">게시글을 불러오는 중입니다</p>
          <p className="mt-1 text-xs text-gray-400">잠시만 기다려 주세요.</p>
        </div>
      </div>
    </div>
  );
}

function PostDetailPage({ currentUser }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [post, setPost] = useState(null);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [commentSortBy, setCommentSortBy] = useState('latest');
  const [replyingTo, setReplyingTo] = useState(null);

  useEffect(() => { fetchPostDetail(); fetchComments(); }, [id, commentSortBy]);
  const fetchPostDetail = async () => { try { const response = await axios.get(`${BACKEND_URL}/posts/${id}`); setPost(response.data); } catch (error) { navigate('/'); } };
  const fetchComments = async () => { try { const response = await axios.get(`${BACKEND_URL}/posts/${id}/comments`, { params: { sort_by: commentSortBy } }); setComments(response.data); } catch (error) {} };

  const handleLikePost = async () => { if (!currentUser) return alert("로그인해주세요."); try { await axios.post(`${BACKEND_URL}/posts/${id}/like`, {}, getAuthHeader()); fetchPostDetail(); } catch (error) {} };
  const handleLikeComment = async (commentId) => { if (!currentUser) return alert("로그인해주세요."); try { await axios.post(`${BACKEND_URL}/comments/${commentId}/like`, {}, getAuthHeader()); fetchComments(); } catch (error) {} };

  const handleAddComment = async () => {
    if (!currentUser) return alert("로그인이 필요합니다.");
    if (!newComment.trim()) return alert("내용을 입력하세요.");
    try {
      await axios.post(`${BACKEND_URL}/comments`, { post_id: parseInt(id), content: newComment, parent_id: replyingTo }, getAuthHeader());
      setNewComment(''); setReplyingTo(null); fetchComments();
    } catch (error) { alert("댓글 작성 실패: " + (error.response?.data?.detail || "알 수 없는 오류")); }
  };

  const handleDeletePost = async () => { if (!window.confirm("삭제하시겠습니까?")) return; try { await axios.delete(`${BACKEND_URL}/posts/${id}`, getAuthHeader()); alert("삭제됨"); navigate('/'); } catch (error) {} };
  const handleDeleteComment = async (commentId) => { if (!window.confirm("삭제하시겠습니까?")) return; try { await axios.delete(`${BACKEND_URL}/comments/${commentId}`, getAuthHeader()); fetchComments(); } catch (error) {} };

  if (!post) return <PostDetailSpinner />;
  const isPostLiked = currentUser && post.좋아요누른사람들.includes(currentUser.nickname);
  const parentComments = comments.filter(c => c.부모댓글번호 === null);
  const childComments = comments.filter(c => c.부모댓글번호 !== null);

  return (
    <div className="bg-white p-5 sm:p-8 rounded-2xl shadow-sm border border-gray-100 mb-20 max-w-2xl mx-auto">
      <button onClick={() => navigate(-1)} className="mb-6 text-gray-500 hover:text-gray-800 font-bold">← 뒤로 가기</button>
      <div className="border-b border-gray-200 pb-6 mb-6">
        <div className="flex justify-between items-start mb-4 gap-2">
          <div><span className="px-2 py-1 bg-indigo-100 text-indigo-700 text-[10px] sm:text-xs font-extrabold rounded-md mb-3 inline-block">{post.카테고리}</span><h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 break-keep">{post.제목}</h1></div>
          {(currentUser && (currentUser.nickname === post.작성자 || currentUser.is_admin)) && <button onClick={handleDeletePost} className="text-red-500 bg-red-50 px-3 py-1 rounded font-bold text-xs shrink-0 mt-1">삭제</button>}
        </div>

        {post.카테고리 === '공고' && post.deadline && (
          <div className="bg-red-50 border border-red-100 rounded-xl p-4 mb-6 flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="text-center sm:text-left"><p className="text-xs text-red-500 font-bold mb-1">지원 마감일</p><p className="text-xl font-extrabold text-red-700">{post.deadline}</p></div>
            <a href={post.external_link} target="_blank" rel="noopener noreferrer" className="w-full sm:w-auto text-center bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-6 rounded-lg transition-colors text-sm">공식 사이트 지원하기 →</a>
          </div>
        )}

        <div className="flex items-center gap-2 mb-8 text-xs sm:text-sm text-gray-500">
          <span className="font-bold text-gray-800 flex items-center gap-1"><span className="text-[10px] bg-gray-200 px-1 py-0.5 rounded-sm">{post.작성자등급}</span>{post.작성자}</span><span>|</span><span>{post.작성시간}</span>
        </div>

        {post.file_url && renderMedia(post.file_url)}
        <div className="text-base sm:text-lg text-gray-800 whitespace-pre-wrap min-h-[100px] leading-relaxed break-keep">{post.내용}</div>
        <div className="mt-10 flex justify-center">
          <button onClick={handleLikePost} className={`flex flex-col items-center p-3 sm:p-4 rounded-xl border-2 transition-all hover:scale-105 ${isPostLiked ? 'border-red-500 bg-red-50' : 'border-gray-200 bg-white hover:border-red-300'}`}>
            <span className="text-2xl sm:text-3xl mb-1">{isPostLiked ? '❤️' : '🤍'}</span><span className={`text-sm sm:text-base font-bold ${isPostLiked ? 'text-red-600' : 'text-gray-500'}`}>좋아요 {post.좋아요수}</span>
          </button>
        </div>
      </div>

      <div>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-2">
          <h3 className="text-lg sm:text-xl font-bold text-gray-800">댓글 {comments.length}개</h3>
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button onClick={() => setCommentSortBy('latest')} className={`px-3 py-1.5 rounded-md text-xs font-bold ${commentSortBy === 'latest' ? 'bg-white shadow text-gray-800' : 'text-gray-500'}`}>과거순</button>
            <button onClick={() => setCommentSortBy('popular')} className={`px-3 py-1.5 rounded-md text-xs font-bold ${commentSortBy === 'popular' ? 'bg-white shadow text-red-500' : 'text-gray-500'}`}>인기순🔥</button>
          </div>
        </div>

        <div className="space-y-4 mb-24 sm:mb-8">
          {parentComments.map(parent => {
            const isParentLiked = currentUser && parent.좋아요누른사람들.includes(currentUser.nickname);
            const replies = childComments.filter(child => child.부모댓글번호 === parent.댓글번호);
            return (
              <div key={parent.댓글번호} className="space-y-2">
                <div className="p-3 sm:p-4 bg-gray-50 rounded-xl border border-gray-100">
                  <div className="flex justify-between mb-2">
                    <div className="flex items-center gap-2"><span className="font-bold text-sm text-gray-800 flex items-center gap-1"><span className="text-[10px] bg-gray-200 px-1 py-0.5 rounded-sm">{parent.작성자등급}</span>{parent.작성자}</span><span className="text-[10px] text-gray-400">{parent.작성시간}</span></div>
                    {(currentUser && (currentUser.nickname === parent.작성자 || currentUser.is_admin)) && <button onClick={() => handleDeleteComment(parent.댓글번호)} className="text-[10px] text-red-400 hover:text-red-600 font-bold">삭제</button>}
                  </div>
                  <p className="text-gray-800 mb-3 text-sm sm:text-base break-keep">{parent.내용}</p>
                  <div className="flex gap-4 items-center">
                    <button onClick={() => handleLikeComment(parent.댓글번호)} className={`flex items-center gap-1 text-xs sm:text-sm font-bold ${isParentLiked ? 'text-red-500' : 'text-gray-500'}`}><span>{isParentLiked ? '❤️' : '🤍'}</span><span>{parent.좋아요수}</span></button>
                    {currentUser && <button onClick={() => setReplyingTo(replyingTo === parent.댓글번호 ? null : parent.댓글번호)} className="text-[10px] sm:text-xs font-bold text-blue-500 bg-blue-50 px-2 py-1 rounded">{replyingTo === parent.댓글번호 ? '답글 취소' : '답글 달기'}</button>}
                  </div>
                </div>
                {replies.length > 0 && (
                  <div className="ml-4 sm:ml-8 space-y-2 border-l-2 border-blue-200 pl-3 sm:pl-4">
                    {replies.map(reply => {
                      const isReplyLiked = currentUser && reply.좋아요누른사람들.includes(currentUser.nickname);
                      return (
                        <div key={reply.댓글번호} className="p-2 sm:p-3 bg-white rounded-lg border border-gray-200 shadow-sm relative">
                          <span className="absolute -left-[16px] sm:-left-[20px] top-3 sm:top-4 text-blue-200 text-sm sm:text-base">↳</span>
                          <div className="flex justify-between mb-1">
                            <div className="flex items-center gap-2"><span className="font-bold text-xs text-gray-800 flex items-center gap-1"><span className="text-[8px] sm:text-[10px] bg-gray-200 px-1 py-0.5 rounded-sm">{reply.작성자등급}</span>{reply.작성자}</span><span className="text-[10px] text-gray-400">{reply.작성시간}</span></div>
                            {(currentUser && (currentUser.nickname === reply.작성자 || currentUser.is_admin)) && <button onClick={() => handleDeleteComment(reply.댓글번호)} className="text-[10px] text-red-400 hover:text-red-600">삭제</button>}
                          </div>
                          <p className="text-gray-700 text-xs sm:text-sm mb-2 break-keep">{reply.내용}</p>
                          <button onClick={() => handleLikeComment(reply.댓글번호)} className={`flex items-center gap-1 text-[10px] sm:text-xs font-bold ${isReplyLiked ? 'text-red-500' : 'text-gray-400'}`}><span>{isReplyLiked ? '❤️' : '🤍'}</span><span>{reply.좋아요수}</span></button>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {currentUser && (
          <div className="fixed bottom-0 left-0 w-full bg-white border-t border-gray-200 p-3 sm:p-4 shadow-[0_-10px_15px_-3px_rgba(0,0,0,0.05)] z-40">
            <div className="max-w-2xl mx-auto flex flex-col gap-2">
              {replyingTo && <div className="flex justify-between items-center text-[10px] sm:text-xs text-blue-600 font-bold bg-blue-50 p-2 rounded-md"><span>↳ 선택한 댓글에 답글 작성 중</span><button onClick={() => setReplyingTo(null)} className="text-gray-400 hover:text-gray-600">✕ 취소</button></div>}
              <div className="flex gap-2">
                <input type="text" placeholder={replyingTo ? "답글 입력..." : "댓글을 남겨보세요..."} value={newComment} onChange={(e) => setNewComment(e.target.value)} className={`${inputStyle} py-2 sm:py-3 text-sm`} />
                <button onClick={handleAddComment} className="px-4 sm:px-8 bg-gray-800 hover:bg-gray-900 text-white text-sm font-bold rounded-lg whitespace-nowrap transition-colors">등록</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default PostDetailPage;
