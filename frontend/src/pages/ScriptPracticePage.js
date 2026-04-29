import React, { useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { BACKEND_URL, getAuthHeader } from '../lib/api';

function ScriptPracticePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { id: scriptId } = useParams();
  const videoRef = useRef(null);
  const teleprompterRef = useRef(null);
  const streamRef = useRef(null);
  const [scripts, setScripts] = useState([]);
  const [selectedScript, setSelectedScript] = useState(location.state?.script || null);
  const [isLoading, setIsLoading] = useState(true);
  const [cameraEnabled, setCameraEnabled] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [scrollSpeed, setScrollSpeed] = useState(34);
  const [fontSize, setFontSize] = useState(32);
  const [overlayOpacity, setOverlayOpacity] = useState(74);
  const [mirrored, setMirrored] = useState(true);
  const hasInitializedMobileDefaultsRef = useRef(false);

  const currentUser = useMemo(() => {
    const savedUser = localStorage.getItem('announcer_user');
    if (!savedUser) return null;

    try {
      return JSON.parse(savedUser);
    } catch (error) {
      console.error('저장된 사용자 정보 파싱 실패:', error);
      localStorage.removeItem('announcer_user');
      return null;
    }
  }, []);

  const stopCameraStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  useEffect(() => {
    if (!currentUser) {
      navigate('/login');
    }
  }, [currentUser, navigate]);

  useEffect(() => {
    if (!currentUser) return undefined;

    let ignore = false;

    const fetchScripts = async () => {
      setIsLoading(true);

      try {
        const response = await axios.get(`${BACKEND_URL}/scripts`, getAuthHeader());
        if (ignore) return;

        const availableScripts = response.data;
        const targetId = scriptId ? Number(scriptId) : null;
        const stateScript = location.state?.script || null;
        const nextScript = targetId
          ? availableScripts.find((item) => item.id === targetId) || null
          : availableScripts.find((item) => item.id === stateScript?.id) || stateScript || availableScripts[0] || null;

        setScripts(availableScripts);
        setSelectedScript(nextScript);
      } catch (error) {
        if (!ignore) {
          console.error('대본을 불러오는 중 에러 발생:', error);
        }
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    };

    fetchScripts();

    return () => {
      ignore = true;
    };
  }, [currentUser, location.state, scriptId]);

  useEffect(() => {
    if (teleprompterRef.current) {
      teleprompterRef.current.scrollTop = 0;
    }
    setIsPlaying(false);
  }, [selectedScript?.id]);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const mediaQuery = window.matchMedia('(max-width: 639px)');

    const applyMobileDefaults = (matches) => {
      if (!matches || hasInitializedMobileDefaultsRef.current) return;

      setScrollSpeed((prev) => (prev === 34 ? 26 : prev));
      setFontSize((prev) => (prev === 32 ? 24 : prev));
      setOverlayOpacity((prev) => (prev === 74 ? 82 : prev));
      hasInitializedMobileDefaultsRef.current = true;
    };

    applyMobileDefaults(mediaQuery.matches);

    const handleMediaQueryChange = (event) => {
      applyMobileDefaults(event.matches);
    };

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleMediaQueryChange);
      return () => mediaQuery.removeEventListener('change', handleMediaQueryChange);
    }

    mediaQuery.addListener(handleMediaQueryChange);
    return () => mediaQuery.removeListener(handleMediaQueryChange);
  }, []);

  useEffect(() => {
    if (!cameraEnabled) {
      stopCameraStream();
      return undefined;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError('이 브라우저는 카메라 미리보기를 지원하지 않습니다.');
      setCameraEnabled(false);
      return undefined;
    }

    const isLocalHost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    if (!window.isSecureContext && !isLocalHost) {
      setCameraError('카메라 기능은 HTTPS 또는 localhost 환경에서만 사용할 수 있습니다.');
      setCameraEnabled(false);
      return undefined;
    }

    let cancelled = false;

    const enableCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: 'user',
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });

        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
        setCameraError('');
      } catch (error) {
        console.error('카메라 시작 실패:', error);
        setCameraError('카메라 권한이 없거나 장치를 찾을 수 없습니다. 브라우저 권한을 확인해 주세요.');
        setCameraEnabled(false);
      }
    };

    enableCamera();

    return () => {
      cancelled = true;
      stopCameraStream();
    };
  }, [cameraEnabled]);

  useEffect(() => {
    if (!isPlaying || !selectedScript) return undefined;

    let animationFrameId = 0;
    let previousTime = performance.now();

    const tick = (currentTime) => {
      const container = teleprompterRef.current;
      if (!container) {
        animationFrameId = window.requestAnimationFrame(tick);
        return;
      }

      const delta = currentTime - previousTime;
      previousTime = currentTime;
      const maxScrollTop = Math.max(container.scrollHeight - container.clientHeight, 0);
      const nextScrollTop = Math.min(container.scrollTop + (scrollSpeed * delta) / 1000, maxScrollTop);

      container.scrollTop = nextScrollTop;
      if (nextScrollTop >= maxScrollTop) {
        setIsPlaying(false);
        return;
      }

      animationFrameId = window.requestAnimationFrame(tick);
    };

    animationFrameId = window.requestAnimationFrame(tick);

    return () => {
      window.cancelAnimationFrame(animationFrameId);
    };
  }, [isPlaying, scrollSpeed, selectedScript]);

  useEffect(() => () => stopCameraStream(), []);

  const handleScriptChange = (event) => {
    const nextScriptId = Number(event.target.value);
    const nextScript = scripts.find((item) => item.id === nextScriptId);
    if (!nextScript) return;

    setSelectedScript(nextScript);
    navigate(`/scripts/practice/${nextScript.id}`, { replace: true, state: { script: nextScript } });
  };

  const handleRestart = () => {
    if (teleprompterRef.current) {
      teleprompterRef.current.scrollTop = 0;
    }
    setIsPlaying(false);
  };

  const scriptParagraphs = selectedScript?.content
    ? selectedScript.content.split('\n').map((line) => line.trim()).filter(Boolean)
    : [];

  return (
    <div className="space-y-6 pb-28 xl:space-y-8 xl:pb-0">
      <section className="relative overflow-hidden rounded-[2rem] bg-slate-900 px-6 py-7 text-white shadow-[0_24px_80px_-48px_rgba(15,23,42,0.9)] sm:px-8 xl:px-10">
        <div className="absolute inset-y-0 right-0 w-1/2 bg-[radial-gradient(circle_at_top_right,_rgba(56,189,248,0.35),_transparent_55%)]" />
        <div className="relative z-10 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.32em] text-sky-200">Reading Practice Mode</p>
            <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">카메라 리딩 프롬프터</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-200 sm:text-base">
              카메라 미리보기 위에 뉴스 원고를 겹쳐두고, 속도와 글자 크기를 조절하면서 실제 앵커 멘트처럼 읽는 연습 화면입니다.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => navigate('/scripts')}
              className="rounded-2xl border border-white/15 bg-white/10 px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-white/15"
            >
              대본 보관함으로 돌아가기
            </button>
            <button
              type="button"
              onClick={() => setCameraEnabled((prev) => !prev)}
              className={`rounded-2xl px-5 py-3 text-sm font-bold transition-colors ${cameraEnabled ? 'bg-white text-slate-900 hover:bg-slate-100' : 'bg-sky-400 text-slate-950 hover:bg-sky-300'}`}
            >
              {cameraEnabled ? '카메라 끄기' : '카메라 켜기'}
            </button>
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.5fr)_380px]">
        <div className="space-y-4">
          <div className="rounded-[2rem] border border-slate-200 bg-white/90 p-4 shadow-sm backdrop-blur sm:p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-2xl font-black tracking-tight text-slate-900">실전 프롬프터 화면</h2>
                <p className="mt-2 text-sm text-slate-500">정면 카메라 미리보기 위에 원고가 반투명 레이어로 표시됩니다.</p>
              </div>
              <div className="rounded-full bg-slate-100 px-4 py-2 text-xs font-bold text-slate-600">
                {selectedScript ? `선택 대본 #${selectedScript.id}` : '대본을 선택해 주세요'}
              </div>
            </div>
          </div>

          <div className="relative overflow-hidden rounded-[1.75rem] border border-slate-200 bg-slate-950 shadow-[0_24px_80px_-48px_rgba(15,23,42,0.9)] sm:rounded-[2rem]">
            <div className="absolute inset-x-0 top-0 z-20 flex items-center justify-between bg-gradient-to-b from-black/65 to-transparent px-5 py-4 text-xs font-bold tracking-[0.24em] text-white/80">
              <span>ON AIR PRACTICE</span>
              <span>{cameraEnabled ? 'CAM READY' : 'CAM OFF'}</span>
            </div>

            {cameraEnabled ? (
              <video
                ref={videoRef}
                autoPlay
                muted
                playsInline
                className={`aspect-[10/16] w-full object-cover sm:aspect-[16/10] ${mirrored ? 'scale-x-[-1]' : ''}`}
              />
            ) : (
              <div className="flex aspect-[10/16] w-full items-center justify-center bg-[radial-gradient(circle_at_top,_rgba(14,165,233,0.2),_transparent_45%),linear-gradient(135deg,#020617,#111827_45%,#0f172a)] px-6 text-center text-slate-300 sm:aspect-[16/10]">
                <div>
                  <p className="text-sm font-bold uppercase tracking-[0.3em] text-sky-300">Camera Preview</p>
                  <p className="mt-4 text-2xl font-black text-white">카메라를 켜면 이 영역 위로 원고가 흐릅니다.</p>
                  <p className="mt-3 text-sm leading-6 text-slate-300">모바일이나 HTTPS 환경에서 권한을 허용하면 실제 셀프캠처럼 시선 처리 연습에 바로 사용할 수 있습니다.</p>
                </div>
              </div>
            )}

            <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/55" />
            <div className="absolute inset-x-0 bottom-0 z-20 px-4 pb-4 sm:px-6 sm:pb-6">
              <div className="mx-auto max-w-3xl rounded-[1.5rem] border border-white/15 px-4 py-4 text-white shadow-2xl backdrop-blur-md sm:rounded-[1.75rem] sm:px-6 sm:py-5" style={{ backgroundColor: `rgba(15, 23, 42, ${overlayOpacity / 100})` }}>
                <div className="mb-3 flex flex-col gap-1 text-[11px] font-bold uppercase tracking-[0.22em] text-slate-300 sm:flex-row sm:items-center sm:justify-between">
                  <span>{selectedScript?.title || '원고를 선택해 주세요'}</span>
                  <span>{isPlaying ? 'SCROLLING' : 'PAUSED'}</span>
                </div>
                <div ref={teleprompterRef} className="max-h-[44vh] overflow-hidden sm:max-h-[20rem]">
                  {scriptParagraphs.length > 0 ? (
                    <div className="space-y-4 pr-1 font-semibold leading-[1.7] text-white sm:space-y-5 sm:pr-2 sm:leading-[1.85]" style={{ fontSize: `${fontSize}px` }}>
                      {scriptParagraphs.map((line, index) => (
                        <p key={`${selectedScript.id}-${index}`} className="drop-shadow-[0_4px_12px_rgba(15,23,42,0.5)]">
                          {line}
                        </p>
                      ))}
                    </div>
                  ) : (
                    <div className="py-10 text-center text-sm text-slate-300">선택된 원고가 없습니다.</div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {cameraError && (
            <div className="rounded-[1.5rem] border border-amber-200 bg-amber-50 px-5 py-4 text-sm font-semibold text-amber-800">
              {cameraError}
            </div>
          )}
        </div>

        <aside className="space-y-4 rounded-[2rem] border border-slate-200 bg-white/90 p-5 shadow-sm backdrop-blur sm:p-6">
          <div>
            <h2 className="text-2xl font-black tracking-tight text-slate-900">연습 설정</h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">대본을 선택하고 스크롤 속도, 글자 크기, 오버레이 농도를 상황에 맞게 조절하세요.</p>
          </div>

          <div className="space-y-4 rounded-[1.5rem] bg-slate-50 p-4">
            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-[0.18em] text-slate-500">연습할 대본</label>
              <select
                value={selectedScript?.id || ''}
                onChange={handleScriptChange}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800 outline-none transition-colors hover:border-slate-300 focus:border-sky-400"
                disabled={isLoading || scripts.length === 0}
              >
                {scripts.length === 0 ? (
                  <option value="">등록된 대본이 없습니다</option>
                ) : (
                  scripts.map((script) => (
                    <option key={script.id} value={script.id}>{script.title}</option>
                  ))
                )}
              </select>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
              <button
                type="button"
                onClick={() => setIsPlaying((prev) => !prev)}
                disabled={!selectedScript}
                className={`rounded-2xl px-5 py-4 text-sm font-bold text-white transition-colors ${selectedScript ? 'bg-slate-900 hover:bg-slate-700' : 'bg-slate-300'}`}
              >
                {isPlaying ? '자동 스크롤 일시정지' : '자동 스크롤 시작'}
              </button>
              <button
                type="button"
                onClick={handleRestart}
                disabled={!selectedScript}
                className="rounded-2xl border border-slate-200 bg-white px-5 py-4 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
              >
                처음부터 다시 보기
              </button>
            </div>
          </div>

          <div className="space-y-4">
            <label className="block rounded-[1.5rem] border border-slate-200 bg-white p-4">
              <div className="flex items-center justify-between gap-4 text-sm font-bold text-slate-800">
                <span>스크롤 속도</span>
                <span>{scrollSpeed}px/s</span>
              </div>
              <input type="range" min="16" max="90" step="2" value={scrollSpeed} onChange={(event) => setScrollSpeed(Number(event.target.value))} className="mt-4 w-full accent-sky-500" />
            </label>

            <label className="block rounded-[1.5rem] border border-slate-200 bg-white p-4">
              <div className="flex items-center justify-between gap-4 text-sm font-bold text-slate-800">
                <span>글자 크기</span>
                <span>{fontSize}px</span>
              </div>
              <input type="range" min="24" max="52" step="2" value={fontSize} onChange={(event) => setFontSize(Number(event.target.value))} className="mt-4 w-full accent-sky-500" />
            </label>

            <label className="block rounded-[1.5rem] border border-slate-200 bg-white p-4">
              <div className="flex items-center justify-between gap-4 text-sm font-bold text-slate-800">
                <span>원고 배경 농도</span>
                <span>{overlayOpacity}%</span>
              </div>
              <input type="range" min="35" max="92" step="1" value={overlayOpacity} onChange={(event) => setOverlayOpacity(Number(event.target.value))} className="mt-4 w-full accent-sky-500" />
            </label>

            <button
              type="button"
              onClick={() => setMirrored((prev) => !prev)}
              className="w-full rounded-[1.5rem] border border-slate-200 bg-white px-5 py-4 text-left text-sm font-bold text-slate-700 transition-colors hover:bg-slate-50"
            >
              {mirrored ? '현재 카메라 좌우 반전 켜짐' : '현재 카메라 좌우 반전 꺼짐'}
            </button>
          </div>

          <div className="rounded-[1.5rem] bg-slate-900 px-5 py-5 text-sm text-slate-200">
            <p className="font-bold text-white">연습 팁</p>
            <ul className="mt-3 space-y-2 leading-6 text-slate-300">
              <li>문단이 너무 빨리 지나가면 스크롤 속도를 20~30px/s로 낮춰 시작하세요.</li>
              <li>시선이 흔들리면 카메라를 켠 뒤 좌우 반전 상태를 바꿔 가장 자연스러운 쪽을 선택하세요.</li>
              <li>실제 뉴스 리딩처럼 상체 구도와 표정까지 같이 보려면 모바일 세로 화면보다 노트북 가로 화면이 더 안정적입니다.</li>
            </ul>
          </div>
        </aside>
      </section>

      <div
        className="fixed inset-x-4 z-40 rounded-[1.5rem] border border-slate-200 bg-white/95 p-3 shadow-2xl backdrop-blur sm:hidden"
        style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 1rem)' }}
      >
        <div className="grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => setCameraEnabled((prev) => !prev)}
            className={`rounded-2xl px-3 py-3 text-xs font-bold transition-colors ${cameraEnabled ? 'bg-slate-900 text-white' : 'bg-sky-100 text-sky-900'}`}
          >
            {cameraEnabled ? '카메라 끄기' : '카메라 켜기'}
          </button>
          <button
            type="button"
            onClick={() => setIsPlaying((prev) => !prev)}
            disabled={!selectedScript}
            className={`rounded-2xl px-3 py-3 text-xs font-bold transition-colors ${selectedScript ? 'bg-slate-900 text-white' : 'bg-slate-200 text-slate-400'}`}
          >
            {isPlaying ? '스크롤 정지' : '스크롤 시작'}
          </button>
          <button
            type="button"
            onClick={handleRestart}
            disabled={!selectedScript}
            className="rounded-2xl border border-slate-200 bg-white px-3 py-3 text-xs font-bold text-slate-700 transition-colors hover:bg-slate-50 disabled:text-slate-400"
          >
            처음부터
          </button>
        </div>
      </div>
    </div>
  );
}

export default ScriptPracticePage;