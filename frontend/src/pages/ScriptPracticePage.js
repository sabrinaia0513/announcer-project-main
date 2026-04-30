import React, { useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { BACKEND_URL, getAuthHeader } from '../lib/api';

const MIN_SCROLL_SPEED = 30;
const MAX_SCROLL_LEVEL = 100;
const MIN_FONT_SIZE = 22;
const MAX_FONT_SIZE = 72;
const MAX_REMOTE_LIFT = 260;

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

function ScriptPracticePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { id: scriptId } = useParams();
  const videoRef = useRef(null);
  const teleprompterRef = useRef(null);
  const streamRef = useRef(null);
  const remoteDragStateRef = useRef({ startLift: 0, startY: 0 });
  const [scripts, setScripts] = useState([]);
  const [selectedScript, setSelectedScript] = useState(location.state?.script || null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCompactViewport, setIsCompactViewport] = useState(false);
  const [isRemoteExpanded, setIsRemoteExpanded] = useState(true);
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [isDraggingRemote, setIsDraggingRemote] = useState(false);
  const [remoteLift, setRemoteLift] = useState(0);
  const [cameraEnabled, setCameraEnabled] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [scrollLevel, setScrollLevel] = useState(0);
  const [fontSize, setFontSize] = useState(36);
  const [overlayOpacity, setOverlayOpacity] = useState(96);
  const [mirrored, setMirrored] = useState(true);
  const hasInitializedMobileDefaultsRef = useRef(false);
  const hasInitializedRemoteLayoutRef = useRef(false);

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

    const mediaQuery = window.matchMedia('(max-width: 767px)');

    const applyMobileDefaults = (matches) => {
      setIsCompactViewport(matches);

      if (!matches || hasInitializedMobileDefaultsRef.current) return;

      setFontSize((prev) => (prev === 36 ? 28 : prev));
      setOverlayOpacity((prev) => (prev === 96 ? 100 : prev));
      hasInitializedMobileDefaultsRef.current = true;
    };

    const applyRemoteLayout = (matches) => {
      if (!hasInitializedRemoteLayoutRef.current) {
        setIsRemoteExpanded(!matches);
        setRemoteLift(0);
        hasInitializedRemoteLayoutRef.current = true;
        return;
      }

      if (!matches) {
        setIsRemoteExpanded(true);
        setRemoteLift(0);
      }
    };

    applyMobileDefaults(mediaQuery.matches);
    applyRemoteLayout(mediaQuery.matches);

    const handleMediaQueryChange = (event) => {
      applyMobileDefaults(event.matches);
      applyRemoteLayout(event.matches);
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

  useEffect(() => {
    if (!isDraggingRemote) return undefined;

    const handlePointerMove = (event) => {
      const deltaY = remoteDragStateRef.current.startY - event.clientY;
      setRemoteLift(clamp(remoteDragStateRef.current.startLift + deltaY, 0, MAX_REMOTE_LIFT));
    };

    const handlePointerUp = () => {
      setIsDraggingRemote(false);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerUp);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);
    };
  }, [isDraggingRemote]);

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

  const handleToggleFocusMode = () => {
    setIsFocusMode((prev) => !prev);
  };

  const handleRemoteDragStart = (event) => {
    if (!isCompactViewport) return;

    remoteDragStateRef.current = {
      startLift: remoteLift,
      startY: event.clientY,
    };
    setIsDraggingRemote(true);
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
  const shellClassName = isFocusMode
    ? 'fixed inset-0 z-[70] overflow-hidden bg-slate-950'
    : 'space-y-4 pb-32 sm:pb-40 xl:space-y-5';
  const remoteBaseOffset = isFocusMode ? 0 : isCompactViewport ? 4 : 12;
  const remoteBottomOffset = `calc(env(safe-area-inset-bottom, 0px) + ${remoteBaseOffset + remoteLift}px)`;

  return (
    <div className={shellClassName}>
      {!isFocusMode && (
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
            <button
              type="button"
              onClick={handleToggleFocusMode}
              className="rounded-2xl border border-white/15 bg-white/10 px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-white/15"
            >
              집중 모드
            </button>
          </div>
        </div>
      </section>
      )}

      <section className={`relative overflow-hidden border border-slate-200 bg-slate-950 shadow-[0_24px_80px_-48px_rgba(15,23,42,0.9)] ${isFocusMode ? 'h-[100dvh] rounded-none border-0 shadow-none' : 'rounded-[1.75rem] sm:rounded-[2rem] xl:h-[calc(100vh-10rem)] xl:min-h-[44rem]'}`}>
        <div className={`relative ${isFocusMode ? 'h-[100dvh]' : 'h-[78svh] min-h-[32rem] max-h-[58rem] sm:h-[80svh] xl:h-full'}`}>
          {!isFocusMode && (
          <div className="absolute inset-x-0 top-0 z-20 flex items-center justify-between bg-gradient-to-b from-black/80 via-black/35 to-transparent px-4 py-4 text-[11px] font-bold uppercase tracking-[0.24em] text-white/85 sm:px-6 sm:py-5">
            <span>ON AIR PRACTICE</span>
            <span>{cameraEnabled ? 'CAM READY' : 'CAM OFF'}</span>
          </div>
          )}

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

          <div className={`absolute inset-0 z-20 px-4 sm:px-8 lg:px-12 ${isFocusMode ? 'pb-20 pt-8 sm:pb-24 sm:pt-10' : 'pb-24 pt-16 sm:pb-28 sm:pt-20'}`}>
            <div className="flex h-full flex-col text-white">
              {!isFocusMode && (
              <div className="mb-3 flex flex-col gap-2 text-[11px] font-bold uppercase tracking-[0.22em] text-slate-200 sm:mb-4 sm:flex-row sm:items-center sm:justify-between">
                <span>{selectedScript?.title || '원고를 선택해 주세요'}</span>
                <span>{teleprompterStatus}</span>
              </div>
              )}
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
                    <div className={`${isFocusMode ? 'h-[10svh]' : 'h-[10svh] sm:h-[8svh]'}`} />
                    <div className="space-y-4 leading-[1.45] sm:space-y-5 sm:leading-[1.55]">
                      {scriptParagraphs.map((line, index) => (
                        <p key={`${selectedScript.id}-${index}`} className="whitespace-pre-wrap break-keep">
                          {line}
                        </p>
                      ))}
                    </div>
                    <div className={`${isFocusMode ? 'h-[86svh]' : 'h-[82svh] sm:h-[66svh]'}`} />
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
        className={`fixed left-1/2 z-[80] -translate-x-1/2 border border-slate-200/90 bg-white/94 text-slate-950 shadow-2xl backdrop-blur-xl transition-all ${isRemoteExpanded || !isCompactViewport ? 'w-[calc(100vw-0.75rem)] rounded-[1.35rem] p-3 sm:w-[calc(100vw-2rem)] sm:max-w-6xl sm:rounded-[1.75rem] sm:p-4' : 'w-[calc(100vw-0.75rem)] rounded-[1.2rem] p-2.5'}`}
        style={{ bottom: remoteBottomOffset }}
      >
        {isCompactViewport && (
          <div className="mb-2 flex items-center justify-center">
            <button
              type="button"
              onPointerDown={handleRemoteDragStart}
              className={`flex w-full items-center justify-center gap-2 rounded-full px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.22em] text-slate-600 transition-colors ${isDraggingRemote ? 'bg-slate-200 text-slate-950' : 'bg-slate-100 hover:bg-slate-200'}`}
              style={{ touchAction: 'none' }}
            >
              <span className="h-1.5 w-10 rounded-full bg-slate-400" />
              <span>드래그로 위치 조절</span>
            </button>
          </div>
        )}
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2 text-sm font-bold text-slate-900">
            <span className="inline-flex rounded-full bg-sky-100 px-3 py-1 text-[11px] uppercase tracking-[0.22em] text-sky-700">Remote</span>
            <span className="truncate">{selectedScript?.title || '대본 선택 필요'}</span>
          </div>
          <div className="flex items-center gap-2">
            {isCompactViewport && (
              <button
                type="button"
                onClick={() => setIsRemoteExpanded((prev) => !prev)}
                className="rounded-full border border-slate-200 bg-slate-100 px-3 py-2 text-xs font-bold text-slate-900 transition-colors hover:bg-slate-200"
              >
                {isRemoteExpanded ? '접기' : '펼치기'}
              </button>
            )}
            <button
              type="button"
              onClick={handleToggleFocusMode}
              className="rounded-full border border-slate-200 bg-slate-100 px-3 py-2 text-xs font-bold text-slate-900 transition-colors hover:bg-slate-200"
            >
              {isFocusMode ? '기본 화면' : '집중 모드'}
            </button>
          </div>
        </div>

        {isCompactViewport && !isRemoteExpanded ? (
          <div className="mt-3 space-y-3">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-black text-slate-950">속도 조절</p>
                  <p className="mt-1 text-xs font-medium text-slate-500">가장 자주 쓰는 조절값</p>
                </div>
                <div className="rounded-full bg-sky-100 px-3 py-1 text-sm font-black text-sky-700">{scrollLevel}</div>
              </div>
              <div className="mt-3 flex items-center gap-2">
                <button type="button" onClick={() => adjustScrollLevel(-5)} className="h-10 w-10 rounded-full border border-slate-200 bg-white text-lg font-black text-slate-900 transition-colors hover:bg-slate-100">-</button>
                <input type="range" min="0" max="100" step="1" value={scrollLevel} onChange={(event) => setScrollLevel(Number(event.target.value))} className="w-full accent-sky-500" />
                <button type="button" onClick={() => adjustScrollLevel(5)} className="h-10 w-10 rounded-full border border-slate-200 bg-white text-lg font-black text-slate-900 transition-colors hover:bg-slate-100">+</button>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-2">
            <button
              type="button"
              onClick={handleTogglePlay}
              disabled={!selectedScript || !canAutoScroll}
              className={`rounded-2xl px-3 py-3 text-xs font-bold transition-colors ${selectedScript && canAutoScroll ? 'bg-sky-400 text-slate-950 hover:bg-sky-300' : 'bg-slate-200 text-slate-400'}`}
            >
              {isPlaying ? '정지' : '시작'}
            </button>
            <button
              type="button"
              onClick={handleRestart}
              disabled={!selectedScript}
              className="rounded-2xl border border-slate-200 bg-white px-3 py-3 text-xs font-bold text-slate-900 transition-colors hover:bg-slate-100 disabled:text-slate-400"
            >
              리셋
            </button>
            <button
              type="button"
              onClick={() => setCameraEnabled((prev) => !prev)}
              className={`rounded-2xl px-3 py-3 text-xs font-bold transition-colors ${cameraEnabled ? 'bg-slate-900 text-white hover:bg-slate-700' : 'bg-white text-slate-900 hover:bg-slate-100 border border-slate-200'}`}
            >
              {cameraEnabled ? '카메라 OFF' : '카메라 ON'}
            </button>
            <button
              type="button"
              onClick={() => setMirrored((prev) => !prev)}
              className="rounded-2xl border border-slate-200 bg-white px-3 py-3 text-xs font-bold text-slate-900 transition-colors hover:bg-slate-100"
            >
              반전
            </button>
          </div>
          </div>
        ) : (
        <div className="mt-3 max-h-[38vh] space-y-3 overflow-y-auto lg:max-h-none">
          <div className="rounded-[1.6rem] border border-sky-200 bg-sky-50 p-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-base font-black text-slate-950">속도 조절</p>
                <p className="mt-1 text-sm font-medium text-slate-600">가장 자주 건드리는 값이라 제일 위에 고정했습니다.</p>
              </div>
              <div className="rounded-full bg-white px-4 py-2 text-lg font-black text-sky-700 shadow-sm">{scrollLevel}</div>
            </div>
            <div className="mt-4 flex items-center gap-3">
              <button type="button" onClick={() => adjustScrollLevel(-5)} className="h-12 w-12 rounded-full border border-sky-200 bg-white text-xl font-black text-slate-900 transition-colors hover:bg-sky-100">-</button>
              <input type="range" min="0" max="100" step="1" value={scrollLevel} onChange={(event) => setScrollLevel(Number(event.target.value))} className="w-full accent-sky-500" />
              <button type="button" onClick={() => adjustScrollLevel(5)} className="h-12 w-12 rounded-full border border-sky-200 bg-white text-xl font-black text-slate-900 transition-colors hover:bg-sky-100">+</button>
            </div>
          </div>

          <div className="grid gap-2 lg:grid-cols-[minmax(0,260px)_repeat(4,minmax(0,1fr))]">
            <label className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <span className="mb-2 block text-[11px] font-bold uppercase tracking-[0.22em] text-slate-500">연습 대본</span>
              <select
                value={selectedScript?.id || ''}
                onChange={handleScriptChange}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-900 outline-none transition-colors hover:border-slate-300 focus:border-sky-400"
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
              className={`rounded-2xl px-4 py-4 text-sm font-bold transition-colors ${selectedScript && canAutoScroll ? 'bg-sky-400 text-slate-950 hover:bg-sky-300' : 'bg-slate-200 text-slate-400'}`}
            >
              {isPlaying ? '스크롤 정지' : '스크롤 시작'}
            </button>

            <button
              type="button"
              onClick={handleRestart}
              disabled={!selectedScript}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-4 text-sm font-bold text-slate-900 transition-colors hover:bg-slate-100 disabled:text-slate-400"
            >
              처음부터 다시 보기
            </button>

            <button
              type="button"
              onClick={() => setCameraEnabled((prev) => !prev)}
              className={`rounded-2xl px-4 py-4 text-sm font-bold transition-colors ${cameraEnabled ? 'bg-slate-900 text-white hover:bg-slate-700' : 'bg-white text-slate-900 hover:bg-slate-100 border border-slate-200'}`}
            >
              {cameraEnabled ? '카메라 끄기' : '카메라 켜기'}
            </button>

            <button
              type="button"
              onClick={() => setMirrored((prev) => !prev)}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-4 text-sm font-bold text-slate-900 transition-colors hover:bg-slate-100"
            >
              {mirrored ? '좌우 반전 켜짐' : '좌우 반전 꺼짐'}
            </button>
          </div>

          <div className="grid gap-3 lg:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-bold text-slate-900">스크롤 속도 세부 조절</p>
                  <p className="mt-1 text-xs text-slate-500">0-100 단계, 내부 기준 {MIN_SCROLL_SPEED}px/s부터 시작</p>
                </div>
                <div className="rounded-full bg-white px-3 py-1 text-sm font-black text-sky-700 shadow-sm">{scrollLevel}</div>
              </div>
              <div className="mt-4 flex items-center gap-3">
                <button type="button" onClick={() => adjustScrollLevel(-5)} className="h-10 w-10 rounded-full border border-slate-200 bg-white text-lg font-black text-slate-900 transition-colors hover:bg-slate-100">-</button>
                <input type="range" min="0" max="100" step="1" value={scrollLevel} onChange={(event) => setScrollLevel(Number(event.target.value))} className="w-full accent-sky-500" />
                <button type="button" onClick={() => adjustScrollLevel(5)} className="h-10 w-10 rounded-full border border-slate-200 bg-white text-lg font-black text-slate-900 transition-colors hover:bg-slate-100">+</button>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-bold text-slate-900">글자 크기</p>
                  <p className="mt-1 text-xs text-slate-500">화면을 꽉 채우되 가독성은 유지</p>
                </div>
                <div className="rounded-full bg-white px-3 py-1 text-sm font-black text-sky-700 shadow-sm">{fontSize}px</div>
              </div>
              <div className="mt-4 flex items-center gap-3">
                <button type="button" onClick={() => adjustFontSize(-2)} className="h-10 w-10 rounded-full border border-slate-200 bg-white text-lg font-black text-slate-900 transition-colors hover:bg-slate-100">-</button>
                <input type="range" min={MIN_FONT_SIZE} max={MAX_FONT_SIZE} step="1" value={fontSize} onChange={(event) => setFontSize(Number(event.target.value))} className="w-full accent-sky-500" />
                <button type="button" onClick={() => adjustFontSize(2)} className="h-10 w-10 rounded-full border border-slate-200 bg-white text-lg font-black text-slate-900 transition-colors hover:bg-slate-100">+</button>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-bold text-slate-900">글자 선명도</p>
                  <p className="mt-1 text-xs text-slate-500">배경 위에서 글자가 또렷하게 보이도록 조절</p>
                </div>
                <div className="rounded-full bg-white px-3 py-1 text-sm font-black text-sky-700 shadow-sm">{overlayOpacity}%</div>
              </div>
              <div className="mt-4 flex items-center gap-3">
                <button type="button" onClick={() => adjustOverlayOpacity(-5)} className="h-10 w-10 rounded-full border border-slate-200 bg-white text-lg font-black text-slate-900 transition-colors hover:bg-slate-100">-</button>
                <input type="range" min="60" max="100" step="1" value={overlayOpacity} onChange={(event) => setOverlayOpacity(Number(event.target.value))} className="w-full accent-sky-500" />
                <button type="button" onClick={() => adjustOverlayOpacity(5)} className="h-10 w-10 rounded-full border border-slate-200 bg-white text-lg font-black text-slate-900 transition-colors hover:bg-slate-100">+</button>
              </div>
            </div>
          </div>
        </div>
        )}
      </div>
    </div>
  );
}

export default ScriptPracticePage;