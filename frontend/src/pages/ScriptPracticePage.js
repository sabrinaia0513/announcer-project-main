import React, { useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { BACKEND_URL, getAuthHeader } from '../lib/api';

const MIN_SCROLL_SPEED = 30;
const MAX_SCROLL_LEVEL = 100;
const MIN_FONT_SIZE = 22;
const MAX_FONT_SIZE = 72;

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

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
  const [scrollLevel, setScrollLevel] = useState(0);
  const [fontSize, setFontSize] = useState(36);
  const [overlayOpacity, setOverlayOpacity] = useState(96);
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

  const practiceText = selectedScript?.prompt_content || selectedScript?.content || '';
  const scriptParagraphs = practiceText
    ? practiceText.split('\n').map((line) => line.trim()).filter(Boolean)
    : [];
  const canAutoScroll = scriptParagraphs.length > 0;
  const effectiveScrollSpeed = MIN_SCROLL_SPEED + scrollLevel;

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const mediaQuery = window.matchMedia('(max-width: 639px)');

    const applyMobileDefaults = (matches) => {
      if (!matches || hasInitializedMobileDefaultsRef.current) return;

      setFontSize((prev) => (prev === 36 ? 28 : prev));
      setOverlayOpacity((prev) => (prev === 96 ? 100 : prev));
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
    if (!isPlaying || !selectedScript || !canAutoScroll) return undefined;

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
      const nextScrollTop = Math.min(container.scrollTop + (effectiveScrollSpeed * delta) / 1000, maxScrollTop);

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
  }, [canAutoScroll, effectiveScrollSpeed, isPlaying, selectedScript]);

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

  const handleTogglePlay = () => {
    if (!selectedScript || !canAutoScroll) return;
    setIsPlaying((prev) => !prev);
  };

  const adjustScrollLevel = (delta) => {
    setScrollLevel((prev) => clamp(prev + delta, 0, MAX_SCROLL_LEVEL));
  };

  const adjustFontSize = (delta) => {
    setFontSize((prev) => clamp(prev + delta, MIN_FONT_SIZE, MAX_FONT_SIZE));
  };

  const adjustOverlayOpacity = (delta) => {
    setOverlayOpacity((prev) => clamp(prev + delta, 60, 100));
  };

  const teleprompterStatus = !selectedScript
    ? 'NO SCRIPT'
    : isPlaying
      ? 'SCROLLING'
      : canAutoScroll
        ? 'READY'
        : 'TEXT READY';

  return (
    <div className="space-y-4 pb-48 sm:pb-56 xl:space-y-5">
      <section className="relative overflow-hidden rounded-[1.75rem] bg-slate-900 px-4 py-4 text-white shadow-[0_24px_80px_-48px_rgba(15,23,42,0.9)] sm:rounded-[2rem] sm:px-6 sm:py-5 xl:px-8">
        <div className="absolute inset-y-0 right-0 w-1/2 bg-[radial-gradient(circle_at_top_right,_rgba(56,189,248,0.35),_transparent_55%)]" />
        <div className="relative z-10 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.32em] text-sky-200">Reading Practice Mode</p>
            <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
              <h1 className="text-2xl font-black tracking-tight sm:text-3xl">카메라 리딩 프롬프터</h1>
              <div className="inline-flex self-start rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.22em] text-slate-200">
                {selectedScript ? `대본 #${selectedScript.id}` : 'NO SCRIPT'}
              </div>
            </div>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-200 sm:text-base">
              프롬프트를 화면 거의 전체 높이로 키우고, 하단 리모컨으로 속도와 글자 크기를 즉시 조절할 수 있게 구성했습니다.
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

      <section className="relative overflow-hidden rounded-[1.75rem] border border-slate-200 bg-slate-950 shadow-[0_24px_80px_-48px_rgba(15,23,42,0.9)] sm:rounded-[2rem] xl:h-[calc(100vh-10rem)] xl:min-h-[44rem]">
        <div className="relative h-[calc(100vh-14rem)] min-h-[32rem] sm:h-[calc(100vh-15rem)] xl:h-full">
          <div className="absolute inset-x-0 top-0 z-20 flex items-center justify-between bg-gradient-to-b from-black/80 via-black/35 to-transparent px-4 py-4 text-[11px] font-bold uppercase tracking-[0.24em] text-white/85 sm:px-6 sm:py-5">
            <span>ON AIR PRACTICE</span>
            <span>{cameraEnabled ? 'CAM READY' : 'CAM OFF'}</span>
          </div>

          {cameraEnabled ? (
            <video
              ref={videoRef}
              autoPlay
              muted
              playsInline
              className={`absolute inset-0 h-full w-full object-cover ${mirrored ? 'scale-x-[-1]' : ''}`}
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-[radial-gradient(circle_at_top,_rgba(14,165,233,0.22),_transparent_42%),linear-gradient(135deg,#020617,#111827_45%,#0f172a)] px-6 text-center text-slate-300">
              <div>
                <p className="text-sm font-bold uppercase tracking-[0.3em] text-sky-300">Camera Preview</p>
                <p className="mt-4 text-2xl font-black text-white sm:text-3xl">카메라를 켜면 이 영역 전체가 프롬프터 화면이 됩니다.</p>
                <p className="mt-3 text-sm leading-6 text-slate-300 sm:text-base">모바일과 PC 모두에서 가능한 한 크게 원고가 보이도록 카메라 위에 바로 텍스트를 띄웁니다.</p>
              </div>
            </div>
          )}

          <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-32 bg-gradient-to-b from-black/70 via-black/25 to-transparent sm:h-36" />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-40 bg-gradient-to-t from-black/80 via-black/25 to-transparent sm:h-48" />

          <div className="absolute inset-0 z-20 px-4 pb-28 pt-16 sm:px-8 sm:pb-36 sm:pt-20 lg:px-12">
            <div className="flex h-full flex-col text-white">
              <div className="mb-3 flex flex-col gap-2 text-[11px] font-bold uppercase tracking-[0.22em] text-slate-200 sm:mb-4 sm:flex-row sm:items-center sm:justify-between">
                <span>{selectedScript?.title || '원고를 선택해 주세요'}</span>
                <span>{teleprompterStatus}</span>
              </div>
              <div ref={teleprompterRef} className="min-h-0 flex-1 overflow-hidden">
                {scriptParagraphs.length > 0 ? (
                  <div
                    className="w-full pr-1 text-center font-black tracking-tight text-white sm:pr-2"
                    style={{
                      color: `rgba(255, 255, 255, ${overlayOpacity / 100})`,
                      fontSize: `${fontSize}px`,
                      textShadow: '0 2px 10px rgba(2, 6, 23, 0.98), 0 0 22px rgba(2, 6, 23, 0.92), 0 0 42px rgba(2, 6, 23, 0.68)',
                    }}
                  >
                    <div className="h-[12vh] sm:h-[9vh]" />
                    <div className="space-y-4 leading-[1.45] sm:space-y-5 sm:leading-[1.55]">
                      {scriptParagraphs.map((line, index) => (
                        <p key={`${selectedScript.id}-${index}`} className="whitespace-pre-wrap break-keep">
                          {line}
                        </p>
                      ))}
                    </div>
                    <div className="h-[74vh] sm:h-[62vh]" />
                  </div>
                ) : (
                  <div className="flex h-full items-center justify-center text-center text-sm font-semibold text-slate-300 sm:text-base">
                    선택된 원고가 없습니다.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {cameraError && (
        <div className="rounded-[1.5rem] border border-amber-200 bg-amber-50 px-5 py-4 text-sm font-semibold text-amber-800">
          {cameraError}
        </div>
      )}

      <div
        className="fixed left-1/2 z-40 w-[calc(100vw-1rem)] max-w-6xl -translate-x-1/2 rounded-[1.5rem] border border-white/15 bg-slate-950/88 p-3 text-white shadow-2xl backdrop-blur-xl sm:w-[calc(100vw-2rem)] sm:rounded-[1.75rem] sm:p-4"
        style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 0.75rem)' }}
      >
        <div className="max-h-[42vh] space-y-3 overflow-y-auto lg:max-h-none">
          <div className="grid gap-2 lg:grid-cols-[minmax(0,260px)_repeat(4,minmax(0,1fr))]">
            <label className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
              <span className="mb-2 block text-[11px] font-bold uppercase tracking-[0.22em] text-slate-300">연습 대본</span>
              <select
                value={selectedScript?.id || ''}
                onChange={handleScriptChange}
                className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-sm font-semibold text-white outline-none transition-colors hover:border-white/20 focus:border-sky-400"
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
            </label>

            <button
              type="button"
              onClick={handleTogglePlay}
              disabled={!selectedScript || !canAutoScroll}
              className={`rounded-2xl px-4 py-4 text-sm font-bold transition-colors ${selectedScript && canAutoScroll ? 'bg-sky-400 text-slate-950 hover:bg-sky-300' : 'bg-white/10 text-slate-400'}`}
            >
              {isPlaying ? '스크롤 정지' : '스크롤 시작'}
            </button>

            <button
              type="button"
              onClick={handleRestart}
              disabled={!selectedScript}
              className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4 text-sm font-bold text-white transition-colors hover:bg-white/10 disabled:text-slate-500"
            >
              처음부터 다시 보기
            </button>

            <button
              type="button"
              onClick={() => setCameraEnabled((prev) => !prev)}
              className={`rounded-2xl px-4 py-4 text-sm font-bold transition-colors ${cameraEnabled ? 'bg-white text-slate-950 hover:bg-slate-100' : 'bg-white/5 text-white hover:bg-white/10'}`}
            >
              {cameraEnabled ? '카메라 끄기' : '카메라 켜기'}
            </button>

            <button
              type="button"
              onClick={() => setMirrored((prev) => !prev)}
              className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4 text-sm font-bold text-white transition-colors hover:bg-white/10"
            >
              {mirrored ? '좌우 반전 켜짐' : '좌우 반전 꺼짐'}
            </button>
          </div>

          <div className="grid gap-3 lg:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-bold text-white">스크롤 속도</p>
                  <p className="mt-1 text-xs text-slate-300">0-100 단계, 내부 기준 {MIN_SCROLL_SPEED}px/s부터 시작</p>
                </div>
                <div className="rounded-full bg-white/10 px-3 py-1 text-sm font-black text-sky-300">{scrollLevel}</div>
              </div>
              <div className="mt-4 flex items-center gap-3">
                <button type="button" onClick={() => adjustScrollLevel(-5)} className="h-10 w-10 rounded-full border border-white/10 bg-white/10 text-lg font-black text-white transition-colors hover:bg-white/15">-</button>
                <input type="range" min="0" max="100" step="1" value={scrollLevel} onChange={(event) => setScrollLevel(Number(event.target.value))} className="w-full accent-sky-400" />
                <button type="button" onClick={() => adjustScrollLevel(5)} className="h-10 w-10 rounded-full border border-white/10 bg-white/10 text-lg font-black text-white transition-colors hover:bg-white/15">+</button>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-bold text-white">글자 크기</p>
                  <p className="mt-1 text-xs text-slate-300">화면을 꽉 채우되 가독성은 유지</p>
                </div>
                <div className="rounded-full bg-white/10 px-3 py-1 text-sm font-black text-sky-300">{fontSize}px</div>
              </div>
              <div className="mt-4 flex items-center gap-3">
                <button type="button" onClick={() => adjustFontSize(-2)} className="h-10 w-10 rounded-full border border-white/10 bg-white/10 text-lg font-black text-white transition-colors hover:bg-white/15">-</button>
                <input type="range" min={MIN_FONT_SIZE} max={MAX_FONT_SIZE} step="1" value={fontSize} onChange={(event) => setFontSize(Number(event.target.value))} className="w-full accent-sky-400" />
                <button type="button" onClick={() => adjustFontSize(2)} className="h-10 w-10 rounded-full border border-white/10 bg-white/10 text-lg font-black text-white transition-colors hover:bg-white/15">+</button>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-bold text-white">글자 선명도</p>
                  <p className="mt-1 text-xs text-slate-300">배경 위에서 글자가 또렷하게 보이도록 조절</p>
                </div>
                <div className="rounded-full bg-white/10 px-3 py-1 text-sm font-black text-sky-300">{overlayOpacity}%</div>
              </div>
              <div className="mt-4 flex items-center gap-3">
                <button type="button" onClick={() => adjustOverlayOpacity(-5)} className="h-10 w-10 rounded-full border border-white/10 bg-white/10 text-lg font-black text-white transition-colors hover:bg-white/15">-</button>
                <input type="range" min="60" max="100" step="1" value={overlayOpacity} onChange={(event) => setOverlayOpacity(Number(event.target.value))} className="w-full accent-sky-400" />
                <button type="button" onClick={() => adjustOverlayOpacity(5)} className="h-10 w-10 rounded-full border border-white/10 bg-white/10 text-lg font-black text-white transition-colors hover:bg-white/15">+</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ScriptPracticePage;