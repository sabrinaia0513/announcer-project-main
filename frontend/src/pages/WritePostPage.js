import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { BACKEND_URL, getAuthHeader } from '../lib/api';
import { CATEGORIES, inputStyle } from '../lib/utils';

function WritePostPage({ currentUser }) {
  const navigate = useNavigate();
  const [category, setCategory] = useState('자유');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [file, setFile] = useState(null);
  const [deadline, setDeadline] = useState('');
  const [externalLink, setExternalLink] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => { if (!currentUser) { alert("로그인이 필요한 페이지입니다."); navigate('/login'); } }, [currentUser, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsUploading(true);
    if (file && file.size > 10 * 1024 * 1024) {
      alert("🚨 파일 크기가 너무 큽니다! (최대 10MB까지만 업로드 가능)");
      setIsUploading(false);
      return;
    }

    try {
      let uploadedFileUrl = null;
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

      await axios.post(`${BACKEND_URL}/posts`, {
        title, content, category, file_url: uploadedFileUrl,
        deadline: category === '공고' ? deadline : null,
        external_link: category === '공고' ? externalLink : null,
      }, getAuthHeader());

      alert("글이 등록되었습니다! (+10점)");
      navigate('/');
    } catch (error) {
      alert("작성 실패: " + (error.response?.data?.detail || "알 수 없는 오류"));
    } finally {
      setIsUploading(false);
    }
  };

  if (!currentUser) return null;

  return (
    <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-sm border border-gray-100 max-w-2xl mx-auto">
      <button onClick={() => navigate(-1)} className="mb-6 text-gray-500 hover:text-gray-800 font-bold">← 뒤로 가기</button>
      <h2 className="text-2xl font-extrabold mb-6 text-gray-900">✍️ 새 게시글 작성</h2>
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">게시판 카테고리</label>
          <select value={category} onChange={(e) => setCategory(e.target.value)} className={`${inputStyle} bg-white font-bold`}>{CATEGORIES.map(cat => <option key={cat} value={cat}>[{cat}] 게시판</option>)}</select>
        </div>
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">제목</label>
          <input type="text" placeholder="제목을 입력하세요" value={title} onChange={(e) => setTitle(e.target.value)} required className={inputStyle} />
        </div>
        {category === '공고' && (
          <div className="flex flex-col sm:flex-row gap-4 bg-red-50 p-5 rounded-xl border border-red-100">
            <div className="w-full sm:w-1/3">
              <label className="block text-xs font-bold text-red-700 mb-1">마감일 (D-Day용)</label>
              <input type="date" value={deadline} onChange={e => setDeadline(e.target.value)} className={`${inputStyle} py-2`} required />
            </div>
            <div className="w-full sm:w-2/3">
              <label className="block text-xs font-bold text-red-700 mb-1">공식 채용 사이트 링크</label>
              <input type="url" placeholder="http://..." value={externalLink} onChange={e => setExternalLink(e.target.value)} className={`${inputStyle} py-2`} required />
            </div>
          </div>
        )}
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">내용</label>
          <textarea placeholder="내용을 자유롭게 남겨주세요" value={content} onChange={(e) => setContent(e.target.value)} required rows="6" className={`${inputStyle} resize-none`} />
        </div>
        <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl">
          <label className="block text-sm font-bold text-gray-700 mb-2">📎 첨부 파일 (선택)</label>
          <input type="file" accept="image/*, audio/*, video/*" onChange={(e) => setFile(e.target.files[0])} className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer" />
        </div>
        <div className="pt-4">
          <button type="submit" disabled={isUploading} className={`w-full py-4 text-white text-lg font-extrabold rounded-xl shadow-md transition-all ${isUploading ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 hover:-translate-y-1'}`}>
            {isUploading ? '업로드 중...' : '게시글 등록하기'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default WritePostPage;
