import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { BACKEND_URL as API_URL, MEDIA_BASE_URL } from './lib/api';

function ScriptBoard() {
  const [scripts, setScripts] = useState([]);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [file, setFile] = useState(null);

  const savedUser = localStorage.getItem('announcer_user');
  const currentUser = savedUser ? JSON.parse(savedUser) : null;
  // 💡 [수정됨] 토큰 가져오기 (권한 인증용)
  const token = currentUser ? currentUser.access_token : null;
  const isAdmin = currentUser ? currentUser.is_admin : false;

  useEffect(() => {
    fetchScripts();
  }, []);

  const fetchScripts = async () => {
    try {
      const response = await axios.get(`${API_URL}/scripts`);
      setScripts(response.data);
    } catch (error) {
      console.error("대본을 불러오는 중 에러 발생:", error);
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!title || !content) {
      alert("제목과 내용을 입력해주세요.");
      return;
    }

    const formData = new FormData();
    formData.append("title", title);
    formData.append("content", content);
    if (file) {
      formData.append("file", file);
    }

    try {
      // 💡 [수정됨] 업로드 시 헤더에 Bearer 토큰 추가
      await axios.post(`${API_URL}/scripts`, formData, {
        headers: { 
          "Content-Type": "multipart/form-data",
          "Authorization": `Bearer ${token}` 
        }
      });
      alert("대본이 성공적으로 업로드되었습니다!");
      setTitle('');
      setContent('');
      setFile(null);
      fetchScripts();
    } catch (error) {
      if (error.response && error.response.status === 403) {
        alert("권한이 없습니다. 관리자만 업로드 가능합니다.");
      } else if (error.response?.data?.detail) {
        alert(error.response.data.detail);
      } else {
        alert("업로드 중 오류가 발생했습니다.");
      }
    }
  };

  const handleDownload = async (fileUrl, scriptTitle) => {
    try {
      const fileRes = await axios.get(`${MEDIA_BASE_URL}${fileUrl}`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([fileRes.data]));
      const ext = fileUrl.split('.').pop(); 
      const cleanTitle = scriptTitle.replace(/[/\\?%*:|"<>]/g, '_');

      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `[대본]_${cleanTitle}.${ext}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      alert("파일 다운로드 중 오류가 발생했습니다.");
    }
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '20px' }}>
      <h2>🎙️ 아나운서 대본 보관함</h2>
      <p>매일 업데이트되는 고퀄리티 대본으로 훈련해보세요!</p>

      {isAdmin && (
        <div style={{ border: '2px solid #007bff', padding: '20px', borderRadius: '10px', marginBottom: '30px' }}>
          <h3 style={{ color: '#007bff', marginTop: 0 }}>관리자 전용 업로드</h3>
          <form onSubmit={handleUpload}>
            <input
              type="text" placeholder="대본 제목 (예: [KBS] 9시 뉴스 단신)"
              value={title} onChange={(e) => setTitle(e.target.value)}
              style={{ width: '100%', padding: '10px', marginBottom: '10px' }}
            />
            <textarea
              placeholder="대본 본문 내용"
              value={content} onChange={(e) => setContent(e.target.value)}
              style={{ width: '100%', padding: '10px', height: '150px', marginBottom: '10px' }}
            />
            <input
              type="file" accept=".txt,.pdf,.doc,.docx,.hwp,.hwpx,image/*,audio/*,video/*" onChange={(e) => setFile(e.target.files[0])}
              style={{ display: 'block', marginBottom: '10px' }}
            />
            <button type="submit" style={{ padding: '10px 20px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '5px' }}>
              대본 등록하기
            </button>
          </form>
        </div>
      )}

      <div>
        {scripts.map(script => (
          <div key={script.id} style={{ border: '1px solid #ddd', padding: '20px', marginBottom: '15px', borderRadius: '8px' }}>
            <h3 style={{ marginTop: 0 }}>{script.title}</h3>
            <p style={{ whiteSpace: 'pre-wrap', backgroundColor: '#f9f9f9', padding: '15px', borderRadius: '5px' }}>
              {script.content}
            </p>
            {script.file_url && (
              <button
                onClick={() => handleDownload(script.file_url, script.title)}
                style={{ display: 'inline-block', marginTop: '10px', padding: '8px 15px', backgroundColor: '#28a745', color: 'white', border: 'none', cursor: 'pointer', borderRadius: '5px', fontWeight: 'bold' }}
              >
                원본 파일 다운로드
              </button>
            )}
          </div>
        ))}
        {scripts.length === 0 && <p>아직 등록된 대본이 없습니다.</p>}
      </div>
    </div>
  );
}

export default ScriptBoard;