import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';
import { BACKEND_URL, getAuthHeader } from '../lib/api';
import { getCategoryBadgeClass, inputStyle, renderMedia } from '../lib/utils';

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

  useEffect(() => { fetchPostDetail(true); }, [id]);
  useEffect(() => { fetchComments(); }, [id, commentSortBy]);
  const fetchPostDetail = async (incrementView = true) => { try { const response = await axios.get(`${BACKEND_URL}/posts/${id}`, { params: { increment_view: incrementView } }); setPost(response.data); } catch (error) { navigate('/'); } };
  const fetchComments = async () => { try { const response = await axios.get(`${BACKEND_URL}/posts/${id}/comments`, { params: { sort_by: commentSortBy } }); setComments(response.data); } catch (error) {} };

  const handleLikePost = async () => { if (!currentUser) return alert("로그인해주세요."); try { await axios.post(`${BACKEND_URL}/posts/${id}/like`, {}, getAuthHeader()); fetchPostDetail(false); } catch (error) {} };
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
  const canEditPost = currentUser?.username === post.작성자아이디;
  const canDeletePost = currentUser?.username === post.작성자아이디 || currentUser?.is_admin;
  const parentComments = comments.filter(c => c.부모댓글번호 === null);
  const childComments = comments.filter(c => c.부모댓글번호 !== null);

  return (
    <div className="mx-auto max-w-4xl space-y-6 pb-20 lg:pb-10">
      <button onClick={() => navigate(-1)} className="inline-flex items-center gap-2 rounded-full bg-white/90 px-4 py-2 text-sm font-bold text-gray-600 shadow-sm transition-colors hover:text-gray-900">
        <span>←</span>
        뒤로 가기
      </button>

      <article className="rounded-[2rem] border border-slate-200 bg-white/90 p-5 shadow-sm backdrop-blur sm:p-8">
          <div className="border-b border-gray-200 pb-8">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <span className={`mb-4 inline-flex rounded-full px-3 py-1 text-[11px] font-extrabold ${getCategoryBadgeClass(post.카테고리)}`}>{post.카테고리}</span>
                <h1 className="text-3xl font-black tracking-tight text-gray-900 break-keep sm:text-4xl">{post.제목}</h1>
              </div>
              <div className="flex items-center gap-2">
                {canEditPost && <button onClick={() => navigate(`/post/${id}/edit`)} className="rounded-full bg-slate-100 px-4 py-2 text-xs font-bold text-slate-700 transition-colors hover:bg-slate-200">수정</button>}
                {canDeletePost && <button onClick={handleDeletePost} className="rounded-full bg-red-50 px-4 py-2 text-xs font-bold text-red-500 transition-colors hover:bg-red-100">삭제</button>}
              </div>
            </div>

            {post.카테고리 === '공고' && post.deadline && (
              <div className="mt-6 flex flex-col gap-4 rounded-[1.5rem] border border-red-100 bg-red-50 p-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-center sm:text-left"><p className="text-xs font-bold text-red-500">지원 마감일</p><p className="mt-1 text-2xl font-black text-red-700">{post.deadline}</p></div>
                {post.external_link ? (
                  <a href={post.external_link} target="_blank" rel="noopener noreferrer" className="w-full rounded-2xl bg-red-600 px-6 py-3 text-center text-sm font-bold text-white transition-colors hover:bg-red-700 sm:w-auto">공식 사이트 지원하기 →</a>
                ) : (
                  <span className="w-full rounded-2xl bg-gray-200 px-6 py-3 text-center text-sm font-bold text-gray-500 sm:w-auto">공식 링크 없음</span>
                )}
              </div>
            )}

            <div className="mt-6 flex flex-wrap items-center gap-3 text-sm text-gray-500">
              <span>{post.작성시간}</span>
              <span>조회 {post.조회수}</span>
            </div>
          </div>

          <div className="pt-8">
            {post.file_url && renderMedia(post.file_url)}
            <div className="min-h-[180px] whitespace-pre-wrap text-base leading-8 text-gray-800 break-keep sm:text-lg">{post.내용}</div>
          </div>

          <div className="mt-8 flex items-center justify-between gap-3 border-t border-slate-100 pt-5">
            <div className="text-sm text-slate-500">좋아요 {post.좋아요수}</div>
            <button onClick={handleLikePost} className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-bold transition-colors ${isPostLiked ? 'border-red-200 bg-red-50 text-red-600' : 'border-slate-200 bg-white text-slate-700 hover:border-red-200 hover:text-red-500'}`}>
              <span>{isPostLiked ? '❤️' : '🤍'}</span>
              추천하기
            </button>
          </div>
        </article>

      <section className="rounded-[2rem] border border-slate-200 bg-white/90 p-5 shadow-sm backdrop-blur sm:p-8">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-2xl font-black tracking-tight text-gray-800">댓글 {comments.length}개</h3>
          </div>
          <div className="flex rounded-2xl bg-gray-100 p-1">
            <button onClick={() => setCommentSortBy('latest')} className={`rounded-xl px-4 py-2 text-xs font-bold ${commentSortBy === 'latest' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500'}`}>최신순</button>
            <button onClick={() => setCommentSortBy('popular')} className={`rounded-xl px-4 py-2 text-xs font-bold ${commentSortBy === 'popular' ? 'bg-white text-red-500 shadow-sm' : 'text-gray-500'}`}>인기순🔥</button>
          </div>
        </div>

        <div className="space-y-4 mb-24 lg:mb-0">
          {parentComments.map(parent => {
            const isParentLiked = currentUser && parent.좋아요누른사람들.includes(currentUser.nickname);
            const canDeleteParent = currentUser?.username === parent.작성자아이디 || currentUser?.is_admin;
            const replies = childComments.filter(child => child.부모댓글번호 === parent.댓글번호);
            return (
              <div key={parent.댓글번호} className="space-y-2">
                <div className="rounded-[1.5rem] border border-gray-100 bg-gray-50 p-4 sm:p-5">
                  <div className="flex justify-between mb-2">
                    <div className="flex items-center gap-2"><span className="flex items-center gap-1 text-sm font-bold text-gray-800"><span className="rounded-full bg-gray-200 px-2 py-0.5 text-[10px]">{parent.작성자등급}</span>{parent.작성자}</span><span className="text-[10px] text-gray-400">{parent.작성시간}</span></div>
                    {canDeleteParent && <button onClick={() => handleDeleteComment(parent.댓글번호)} className="text-[10px] font-bold text-red-400 hover:text-red-600">삭제</button>}
                  </div>
                  <p className="text-gray-800 mb-3 text-sm sm:text-base break-keep">{parent.내용}</p>
                  <div className="flex gap-4 items-center">
                    <button onClick={() => handleLikeComment(parent.댓글번호)} className={`flex items-center gap-1 text-xs sm:text-sm font-bold ${isParentLiked ? 'text-red-500' : 'text-gray-500'}`}><span>{isParentLiked ? '❤️' : '🤍'}</span><span>{parent.좋아요수}</span></button>
                    {currentUser && <button onClick={() => setReplyingTo(replyingTo === parent.댓글번호 ? null : parent.댓글번호)} className="text-[10px] sm:text-xs font-bold text-blue-500 bg-blue-50 px-2 py-1 rounded">{replyingTo === parent.댓글번호 ? '답글 취소' : '답글 달기'}</button>}
                  </div>
                </div>
                {replies.length > 0 && (
                  <div className="ml-4 space-y-2 border-l-2 border-blue-200 pl-3 sm:ml-8 sm:pl-4">
                    {replies.map(reply => {
                      const isReplyLiked = currentUser && reply.좋아요누른사람들.includes(currentUser.nickname);
                      const canDeleteReply = currentUser?.username === reply.작성자아이디 || currentUser?.is_admin;
                      return (
                        <div key={reply.댓글번호} className="relative rounded-2xl border border-gray-200 bg-white p-3 shadow-sm sm:p-4">
                          <span className="absolute -left-[16px] sm:-left-[20px] top-3 sm:top-4 text-blue-200 text-sm sm:text-base">↳</span>
                          <div className="flex justify-between mb-1">
                            <div className="flex items-center gap-2"><span className="flex items-center gap-1 text-xs font-bold text-gray-800"><span className="rounded-full bg-gray-200 px-2 py-0.5 text-[8px] sm:text-[10px]">{reply.작성자등급}</span>{reply.작성자}</span><span className="text-[10px] text-gray-400">{reply.작성시간}</span></div>
                            {canDeleteReply && <button onClick={() => handleDeleteComment(reply.댓글번호)} className="text-[10px] text-red-400 hover:text-red-600">삭제</button>}
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
          <div className="fixed bottom-0 left-0 z-40 w-full border-t border-gray-200 bg-white p-3 shadow-[0_-10px_15px_-3px_rgba(0,0,0,0.05)] lg:static lg:mt-8 lg:rounded-[1.75rem] lg:border lg:p-5 lg:shadow-none">
            <div className="mx-auto flex max-w-6xl flex-col gap-3 lg:max-w-none">
              {replyingTo && <div className="flex items-center justify-between rounded-xl bg-blue-50 p-3 text-[10px] font-bold text-blue-600 sm:text-xs"><span>↳ 선택한 댓글에 답글 작성 중</span><button onClick={() => setReplyingTo(null)} className="text-gray-400 hover:text-gray-600">✕ 취소</button></div>}
              <div className="flex gap-2">
                <input type="text" placeholder={replyingTo ? "답글 입력..." : "댓글을 남겨보세요..."} value={newComment} onChange={(e) => setNewComment(e.target.value)} className={`${inputStyle} py-3 text-sm`} />
                <button onClick={handleAddComment} className="rounded-2xl bg-gray-800 px-5 text-sm font-bold text-white whitespace-nowrap transition-colors hover:bg-gray-900 sm:px-8">등록</button>
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

export default PostDetailPage;
