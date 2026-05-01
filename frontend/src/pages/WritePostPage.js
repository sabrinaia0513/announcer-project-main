import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate, useParams } from 'react-router-dom';
import { BACKEND_URL, getAuthHeader } from '../lib/api';
import { CATEGORIES, getPostContentPlaceholder, inputStyle } from '../lib/utils';

const isValidExternalLink = (value) => {
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch (error) {
    return false;
  }
};

function WritePostPage({ currentUser }) {
  const navigate = useNavigate();
  const { id: editPostId } = useParams();
  const isEditMode = Boolean(editPostId);
  const [category, setCategory] = useState('자유');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [file, setFile] = useState(null);
  const [existingFileUrl, setExistingFileUrl] = useState(null);
  const [deadline, setDeadline] = useState('');
  const [externalLink, setExternalLink] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isLoadingPost, setIsLoadingPost] = useState(false);

  useEffect(() => { if (!currentUser) { alert("로그인이 필요한 페이지입니다."); navigate('/login'); } }, [currentUser, navigate]);

  useEffect(() => {
    if (!currentUser || !isEditMode) return undefined;

    let ignore = false;

    const fetchPost = async () => {
      setIsLoadingPost(true);

      try {
        const response = await axios.get(`${BACKEND_URL}/posts/${editPostId}`, { params: { increment_view: false } });
        if (ignore) return;

        const editablePost = response.data;
        if (editablePost.작성자아이디 !== currentUser.username) {
          alert('본인이 작성한 게시글만 수정할 수 있습니다.');
          navigate(`/post/${editPostId}`);
          return;
        }

        setCategory(editablePost.카테고리 || '자유');
        setTitle(editablePost.제목 || '');
        setContent(editablePost.내용 || '');
        setDeadline(editablePost.deadline || '');
        setExternalLink(editablePost.external_link || '');
        setExistingFileUrl(editablePost.file_url || null);
      } catch (error) {
        if (!ignore) {
          alert('수정할 게시글을 불러오지 못했습니다.');
          navigate(editPostId ? `/post/${editPostId}` : '/');
        }
      } finally {
        if (!ignore) {
          setIsLoadingPost(false);
        }
      }
    };

    fetchPost();

    return () => {
      ignore = true;
    };
  }, [currentUser, editPostId, isEditMode, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsUploading(true);
    if (file && file.size > 10 * 1024 * 1024) {
      alert("🚨 파일 크기가 너무 큽니다! (최대 10MB까지만 업로드 가능)");
      setIsUploading(false);
      return;
    }

    if (category === '공고' && !isValidExternalLink(externalLink)) {
      alert("공고 링크는 http:// 또는 https:// 로 시작하는 올바른 주소여야 합니다.");
      setIsUploading(false);
      return;
    }

    try {
      let uploadedFileUrl = existingFileUrl;
      if (file) {
        const formData = new FormData();
        formData.append("file", file);
        const uploadRes = await axios.post(`${BACKEND_URL}/upload`, formData, {
          headers: {
            "Content-Type": "multipart/form-data",
            ...getAuthHeader().headers,
          },
        });
        uploadedFileUrl = uploadRes.data.file_url;
      }

      const payload = {
        title, content, category, file_url: uploadedFileUrl,
        deadline: category === '공고' ? deadline : null,
        external_link: category === '공고' ? externalLink : null,
      };

      if (isEditMode) {
        await axios.put(`${BACKEND_URL}/posts/${editPostId}`, payload, getAuthHeader());
      } else {
        await axios.post(`${BACKEND_URL}/posts`, payload, getAuthHeader());
      }

      alert(isEditMode ? '게시글이 수정되었습니다.' : '글이 등록되었습니다! (+10점)');
      navigate(isEditMode ? `/post/${editPostId}` : '/');
    } catch (error) {
      alert((isEditMode ? "수정 실패: " : "작성 실패: ") + (error.response?.data?.detail || "알 수 없는 오류"));
    } finally {
      setIsUploading(false);
    }
  };

  if (!currentUser) return null;
  if (isEditMode && isLoadingPost) {
    return (
      <div className="mx-auto max-w-3xl rounded-[2rem] border border-slate-200 bg-white/90 px-6 py-16 text-center shadow-sm backdrop-blur sm:px-8">
        <p className="text-base font-bold text-slate-900">수정할 게시글을 불러오는 중입니다.</p>
        <p className="mt-2 text-sm text-slate-500">잠시만 기다려 주세요.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <button onClick={() => navigate(-1)} className="inline-flex items-center gap-2 rounded-full bg-white/90 px-4 py-2 text-sm font-bold text-gray-600 shadow-sm transition-colors hover:text-gray-900">
        <span>←</span>
        뒤로 가기
      </button>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <section className="rounded-[2rem] border border-gray-100 bg-white/90 p-6 shadow-sm backdrop-blur sm:p-8">
          <div className="mb-6 border-b border-gray-100 pb-6">
            <h1 className="text-3xl font-black tracking-tight text-gray-900">{isEditMode ? '게시글 수정' : '✍️ 새 게시글 작성'}</h1>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid gap-5 lg:grid-cols-[240px_minmax(0,1fr)]">
              <div>
                <label className="mb-2 block text-sm font-bold text-gray-700">게시판 카테고리</label>
                <select value={category} onChange={(e) => setCategory(e.target.value)} className={`${inputStyle} bg-white font-bold`}>{CATEGORIES.map(cat => <option key={cat} value={cat}>[{cat}] 게시판</option>)}</select>
              </div>
              <div>
                <label className="mb-2 block text-sm font-bold text-gray-700">제목</label>
                <input type="text" placeholder="제목을 입력하세요" value={title} onChange={(e) => setTitle(e.target.value)} required className={inputStyle} />
              </div>
            </div>

            {category === '공고' && (
              <div className="grid gap-4 rounded-[1.5rem] border border-red-100 bg-red-50 p-5 lg:grid-cols-[220px_minmax(0,1fr)]">
                <div>
                  <label className="mb-2 block text-xs font-bold text-red-700">마감일 (D-Day용)</label>
                  <input type="date" value={deadline} onChange={e => setDeadline(e.target.value)} className={`${inputStyle} py-2`} required />
                </div>
                <div>
                  <label className="mb-2 block text-xs font-bold text-red-700">공식 채용 사이트 링크</label>
                  <input type="url" placeholder="https://example.com" value={externalLink} onChange={e => setExternalLink(e.target.value)} className={`${inputStyle} py-2`} required />
                </div>
              </div>
            )}

            <div>
              <label className="mb-2 block text-sm font-bold text-gray-700">내용</label>
              <textarea placeholder={getPostContentPlaceholder(category)} value={content} onChange={(e) => setContent(e.target.value)} required rows="10" className={`${inputStyle} resize-none whitespace-pre-wrap`} />
            </div>

            <div className="rounded-[1.5rem] border border-gray-200 bg-gray-50 p-4">
              <label className="mb-2 block text-sm font-bold text-gray-700">📎 첨부 파일 (선택)</label>
              <input type="file" accept="image/*, audio/*, video/*" onChange={(e) => setFile(e.target.files[0])} className="w-full text-sm text-gray-500 file:mr-4 file:rounded-full file:border-0 file:bg-blue-50 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-blue-700 hover:file:bg-blue-100 cursor-pointer" />
              {existingFileUrl && !file && <p className="mt-2 text-xs font-semibold text-slate-500">현재 첨부 파일이 유지됩니다.</p>}
              {file && <p className="mt-2 text-xs font-semibold text-blue-600">새 파일을 저장하면 기존 첨부를 대체합니다.</p>}
            </div>

            <div className="pt-2">
              <button type="submit" disabled={isUploading} className={`w-full rounded-2xl py-4 text-lg font-extrabold text-white shadow-md transition-all ${isUploading ? 'cursor-not-allowed bg-gray-400' : 'bg-blue-600 hover:-translate-y-0.5 hover:bg-blue-700'}`}>
                {isUploading ? (isEditMode ? '수정 저장 중...' : '업로드 중...') : (isEditMode ? '게시글 수정하기' : '게시글 등록하기')}
              </button>
            </div>
          </form>
        </section>

        <aside className="space-y-4 xl:sticky xl:top-28 xl:self-start">
          <div className="rounded-[2rem] border border-slate-200 bg-white/90 p-5 shadow-sm backdrop-blur">
            <h2 className="text-2xl font-black tracking-tight text-slate-900">작성 전에 체크할 것</h2>
            <div className="mt-4 space-y-4 text-sm leading-6 text-slate-500">
              <p>카테고리에 맞는 제목을 붙이고, 본문 첫 문장에 핵심 요점을 먼저 쓰는 편이 읽기 좋습니다.</p>
              <p>공고 게시글은 마감일과 공식 링크를 같이 넣어야 신뢰도가 올라갑니다.</p>
              <p>수정 모드에서는 새 파일을 올리지 않으면 기존 첨부 파일이 그대로 유지됩니다.</p>
              <p>중고거래 게시글은 상태, 사용 기간, 희망 가격, 거래 지역을 함께 적으면 확인이 빠릅니다.</p>
              <p>첨부 파일은 이미지, 오디오, 비디오만 업로드할 수 있습니다.</p>
            </div>
          </div>

          <div className="rounded-[2rem] border border-slate-200 bg-slate-900 p-5 text-white shadow-sm">
            <p className="text-sm font-semibold text-slate-200">현재 선택한 카테고리</p>
            <p className="mt-1 text-2xl font-black">{category}</p>
            <p className="mt-4 text-sm leading-6 text-slate-300">{category === '공고' ? '공고 모드에서는 링크와 마감일이 함께 들어갑니다.' : category === '중고거래' ? '중고거래 모드에서는 물품 상태와 거래 조건을 자세히 적는 편이 좋습니다.' : '일반 게시글 모드입니다. 자유롭게 내용을 작성할 수 있습니다.'}</p>
          </div>
        </aside>
      </div>
    </div>
  );
}

export default WritePostPage;
