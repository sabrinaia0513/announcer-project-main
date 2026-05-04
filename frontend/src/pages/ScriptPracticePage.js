import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
  const promptContentRef = useRef(null);
  const streamRef = useRef(null);
  const promptAnimationFrameRef = useRef(0);
  const promptOffsetRef = useRef(0);
  const promptMaxOffsetRef = useRef(0);
  const isPlayingRef = useRef(false);
  const remoteDragStateRef = useRef({ startLift: 0, startY: 0 });
  const [selectedScript, setSelectedScript] = useState(location.state?.script || null);
  const [editableScriptText, setEditableScriptText] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isCompactViewport, setIsCompactViewport] = useState(false);
  const [isRemoteVisible, setIsRemoteVisible] = useState(true);
  const [isRemoteExpanded, setIsRemoteExpanded] = useState(false);
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [isDraggingRemote, setIsDraggingRemote] = useState(false);
  const [isDraggingPrompt, setIsDraggingPrompt] = useState(false);
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
  const promptDragStateRef = useRef({ startY: 0, startScrollTop: 0 });

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

  const applyPromptOffset = useCallback((nextOffset) => {
    const clampedOffset = clamp(nextOffset, 0, promptMaxOffsetRef.current);
    promptOffsetRef.current = clampedOffset;

    if (promptContentRef.current) {
      promptContentRef.current.style.transform = `translate3d(0, ${-clampedOffset}px, 0)`;
    }

    return clampedOffset;
  }, []);

  const measurePromptBounds = useCallback(() => {
    const container = teleprompterRef.current;
    const content = promptContentRef.current;

    if (!container || !content) {
      promptMaxOffsetRef.current = 0;
      applyPromptOffset(0);
      return;
    }

    promptMaxOffsetRef.current = Math.max(content.scrollHeight - container.clientHeight, 0);
    const appliedOffset = applyPromptOffset(promptOffsetRef.current);

    if (appliedOffset >= promptMaxOffsetRef.current && isPlayingRef.current) {
      setIsPlaying(false);
    }
  }, [applyPromptOffset]);

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
    const nextPracticeText = selectedScript?.prompt_content || selectedScript?.content || '';

    setEditableScriptText(nextPracticeText);
    applyPromptOffset(0);
    setIsPlaying(false);
  }, [applyPromptOffset, selectedScript?.content, selectedScript?.id, selectedScript?.prompt_content]);

  const scriptParagraphs = editableScriptText
    ? editableScriptText.replace(/\r/g, '').split('\n')
    : [];
  const canAutoScroll = scriptParagraphs.some((line) => line.trim().length > 0);
  const effectiveScrollSpeed = MIN_SCROLL_SPEED + scrollLevel;

  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const container = teleprompterRef.current;
    const content = promptContentRef.current;
    if (!container || !content) return undefined;

    const scheduleMeasure = () => {
      window.cancelAnimationFrame(promptAnimationFrameRef.current);
      promptAnimationFrameRef.current = window.requestAnimationFrame(measurePromptBounds);
    };

    scheduleMeasure();

    let resizeObserver;
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(scheduleMeasure);
      resizeObserver.observe(container);
      resizeObserver.observe(content);
    } else {
      window.addEventListener('resize', scheduleMeasure);
    }

    return () => {
      window.cancelAnimationFrame(promptAnimationFrameRef.current);
      if (resizeObserver) {
        resizeObserver.disconnect();
      } else {
        window.removeEventListener('resize', scheduleMeasure);
      }
    };
  }, [editableScriptText, fontSize, isCompactViewport, isFocusMode, isRemoteExpanded, isRemoteVisible, measurePromptBounds]);

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
        setIsRemoteVisible(true);
        setIsRemoteExpanded(false);
        setRemoteLift(0);
        hasInitializedRemoteLayoutRef.current = true;
        return;
      }

      setIsRemoteVisible(true);
      setIsRemoteExpanded(false);
      setRemoteLift(0);
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
    const videoConstraints = isCompactViewport
      ? {
          facingMode: 'user',
          width: { ideal: 960, max: 960 },
          height: { ideal: 540, max: 540 },
          frameRate: { ideal: 24, max: 24 },
        }
      : {
          facingMode: 'user',
          width: { ideal: 1280 },
          height: { ideal: 720 },
        };

    const enableCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: videoConstraints,
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
  }, [cameraEnabled, isCompactViewport]);

  useEffect(() => {
    if (!isPlaying || !canAutoScroll) return undefined;

    let animationFrameId = 0;
    let previousTime = performance.now();

    const tick = (currentTime) => {
      if (!promptContentRef.current) {
        animationFrameId = window.requestAnimationFrame(tick);
        return;
      }

      const delta = currentTime - previousTime;
      previousTime = currentTime;
      const nextOffset = applyPromptOffset(promptOffsetRef.current + (effectiveScrollSpeed * delta) / 1000);

      if (nextOffset >= promptMaxOffsetRef.current) {
        setIsPlaying(false);
        return;
      }

      animationFrameId = window.requestAnimationFrame(tick);
    };

    animationFrameId = window.requestAnimationFrame(tick);

    return () => {
      window.cancelAnimationFrame(animationFrameId);
    };
  }, [applyPromptOffset, canAutoScroll, effectiveScrollSpeed, isPlaying]);

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

  useEffect(() => {
    if (!isDraggingPrompt) return undefined;

    const handlePointerMove = (event) => {
      const deltaY = event.clientY - promptDragStateRef.current.startY;
      applyPromptOffset(promptDragStateRef.current.startScrollTop - deltaY);
    };

    const handlePointerUp = () => {
      setIsDraggingPrompt(false);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerUp);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);
    };
  }, [applyPromptOffset, isDraggingPrompt]);

  const handleRestart = () => {
    applyPromptOffset(0);
    setIsPlaying(false);
  };

  const handleTogglePlay = () => {
    if (!canAutoScroll) return;
    setIsPlaying((prev) => !prev);
  };

  const handleToggleFocusMode = () => {
    setIsFocusMode((prev) => !prev);
  };

  const handlePromptDragStart = (event) => {
    if (!teleprompterRef.current) return;

    promptDragStateRef.current = {
      startY: event.clientY,
      startScrollTop: promptOffsetRef.current,
    };
    setIsPlaying(false);
    setIsDraggingPrompt(true);
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

  const teleprompterStatus = !canAutoScroll
    ? '원고 없음'
    : isPlaying
      ? '재생 중'
      : '준비 완료';
  const shellClassName = isFocusMode
    ? 'fixed inset-0 z-[70] overflow-hidden bg-slate-950'
    : 'space-y-4 pb-32 sm:pb-40 xl:space-y-5';
  const teleprompterPaddingClass = isFocusMode
    ? isRemoteVisible
      ? isRemoteExpanded
        ? 'pb-32 pt-8 sm:pb-36 sm:pt-10'
        : 'pb-20 pt-8 sm:pb-24 sm:pt-10'
      : 'pb-10 pt-8 sm:pb-12 sm:pt-10'
    : isRemoteVisible
      ? isRemoteExpanded
        ? 'pb-36 pt-16 sm:pb-40 sm:pt-20'
        : 'pb-24 pt-16 sm:pb-28 sm:pt-20'
      : 'pb-12 pt-16 sm:pb-16 sm:pt-20';
  const remoteBaseOffset = isFocusMode ? 0 : isCompactViewport ? 2 : 8;
  const remoteBottomOffset = `calc(env(safe-area-inset-bottom, 0px) + ${remoteBaseOffset + remoteLift}px)`;
  const promptTextShadow = isCompactViewport
    ? '0 1px 4px rgba(2, 6, 23, 0.88), 0 0 10px rgba(2, 6, 23, 0.52)'
    : '0 2px 10px rgba(2, 6, 23, 0.98), 0 0 22px rgba(2, 6, 23, 0.92), 0 0 42px rgba(2, 6, 23, 0.68)';

  return (
    <div className={shellClassName}>
      {!isFocusMode && (
      <section className="relative overflow-hidden rounded-[1.75rem] bg-slate-900 px-4 py-4 text-white shadow-[0_24px_80px_-48px_rgba(15,23,42,0.9)] sm:rounded-[2rem] sm:px-6 sm:py-5 xl:px-8">
        <div className="absolute inset-y-0 right-0 w-1/2 bg-[radial-gradient(circle_at_top_right,_rgba(56,189,248,0.35),_transparent_55%)]" />
        <div className="relative z-10 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
              <h1 className="text-2xl font-black tracking-tight sm:text-3xl">연습용 프롬프터</h1>
              <div className="inline-flex self-start rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[11px] font-bold tracking-[0.08em] text-slate-200">
                {selectedScript ? `대본 #${selectedScript.id}` : '대본 없음'}
              </div>
            </div>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-200 sm:text-base">
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
          {cameraEnabled ? (
            <video
              ref={videoRef}
              autoPlay
              muted
              playsInline
              className={`absolute inset-0 h-full w-full object-cover ${mirrored ? 'scale-x-[-1]' : ''}`}
            />
          ) : (
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(14,165,233,0.22),_transparent_42%),linear-gradient(135deg,#020617,#111827_45%,#0f172a)]" />
          )}

          <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-32 bg-gradient-to-b from-black/70 via-black/25 to-transparent sm:h-36" />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-40 bg-gradient-to-t from-black/80 via-black/25 to-transparent sm:h-48" />

          <div className={`absolute inset-0 z-20 px-4 sm:px-8 lg:px-12 ${teleprompterPaddingClass}`}>
            <div className="flex h-full flex-col text-white">
              {!isFocusMode && (
              <div className="mb-3 flex flex-col gap-2 text-[11px] font-bold uppercase tracking-[0.22em] text-slate-200 sm:mb-4 sm:flex-row sm:items-center sm:justify-between">
                <span>{selectedScript?.title || '원고를 선택해 주세요'}</span>
                <span>{teleprompterStatus}</span>
              </div>
              )}
              <div
                ref={teleprompterRef}
                className={`min-h-0 flex-1 overflow-hidden ${isDraggingPrompt ? 'cursor-grabbing' : 'cursor-grab'}`}
                onPointerDown={handlePromptDragStart}
                style={{ touchAction: 'none' }}
              >
                {scriptParagraphs.length > 0 ? (
                  <div
                    ref={promptContentRef}
                    className="w-full pr-1 text-center font-black tracking-tight text-white sm:pr-2"
                    style={{
                      backfaceVisibility: 'hidden',
                      contain: 'layout paint style',
                      color: `rgba(255, 255, 255, ${overlayOpacity / 100})`,
                      fontSize: `${fontSize}px`,
                      textShadow: promptTextShadow,
                      transform: 'translate3d(0, 0, 0)',
                      willChange: isPlaying || isDraggingPrompt ? 'transform' : 'auto',
                    }}
                  >
                    <div className={`${isFocusMode ? 'h-[10svh]' : 'h-[10svh] sm:h-[8svh]'}`} />
                    <div className="space-y-4 leading-[1.45] sm:space-y-5 sm:leading-[1.55]">
                      {scriptParagraphs.map((line, index) => (
                        <p key={`${selectedScript?.id || 'manual'}-${index}`} className="whitespace-pre-wrap break-keep">
                          {line || '\u00A0'}
                        </p>
                      ))}
                    </div>
                    <div className={`${isFocusMode ? 'h-[86svh]' : 'h-[82svh] sm:h-[66svh]'}`} />
                  </div>
                ) : (
                  <div className="h-full" />
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {!isFocusMode && (
        <section className="rounded-[1.75rem] border border-slate-200 bg-white px-4 py-4 shadow-[0_24px_80px_-52px_rgba(15,23,42,0.35)] sm:rounded-[2rem] sm:px-6 sm:py-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-black text-slate-950">프롬프트 원고 편집</p>
            </div>
            <div className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-600">
              {scriptParagraphs.length > 0 ? `${scriptParagraphs.length}문단` : '원고 없음'}
            </div>
          </div>
          <textarea
            value={editableScriptText}
            onChange={(event) => setEditableScriptText(event.target.value)}
            placeholder="여기에서 프롬프트 원고를 직접 수정하세요"
            className="mt-4 min-h-[13rem] w-full rounded-[1.4rem] border border-slate-200 bg-slate-50 px-4 py-4 text-sm leading-7 text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-sky-400 focus:bg-white"
          />
        </section>
      )}

      {cameraError && (
        <div className="rounded-[1.5rem] border border-amber-200 bg-amber-50 px-5 py-4 text-sm font-semibold text-amber-800">
          {cameraError}
        </div>
      )}

      {isRemoteVisible ? (
      <div
        className={`fixed left-1/2 z-[80] -translate-x-1/2 border border-slate-200/90 bg-white/92 text-slate-950 shadow-2xl backdrop-blur-xl transition-all ${isRemoteExpanded ? 'w-[calc(100vw-0.75rem)] rounded-[1.35rem] p-3 sm:w-[min(92vw,64rem)] sm:rounded-[1.6rem] sm:p-3.5' : 'w-[calc(100vw-0.75rem)] rounded-[1.1rem] p-2 sm:w-[min(88vw,56rem)] sm:rounded-[1.2rem] sm:p-2.5'}`}
        style={{ bottom: remoteBottomOffset }}
      >
        {isCompactViewport && (
          <div className="mb-2 flex items-center justify-center">
            <button
              type="button"
              onPointerDown={handleRemoteDragStart}
              className={`flex w-full items-center justify-center gap-2 rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-600 transition-colors ${isDraggingRemote ? 'bg-slate-200 text-slate-950' : 'bg-slate-100 hover:bg-slate-200'}`}
              style={{ touchAction: 'none' }}
            >
              <span className="h-1.5 w-8 rounded-full bg-slate-400" />
              <span>드래그로 위치 조절</span>
            </button>
          </div>
        )}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 overflow-x-auto">
            <button
              type="button"
              onClick={handleTogglePlay}
              disabled={!canAutoScroll}
              className={`rounded-full px-3 py-2 text-xs font-bold transition-colors sm:px-4 ${selectedScript && canAutoScroll ? 'bg-sky-400 text-slate-950 hover:bg-sky-300' : 'bg-slate-200 text-slate-400'}`}
            >
              {isPlaying ? '정지' : '시작'}
            </button>
            <button
              type="button"
              onClick={handleRestart}
              className="rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-900 transition-colors hover:bg-slate-100 disabled:text-slate-400 sm:px-4"
            >
              처음부터
            </button>
            <button
              type="button"
              onClick={() => setIsRemoteExpanded((prev) => !prev)}
              className="rounded-full border border-slate-200 bg-slate-100 px-3 py-2 text-xs font-bold text-slate-900 transition-colors hover:bg-slate-200"
            >
              {isRemoteExpanded ? '간단히' : '세부 조절'}
            </button>
            <button
              type="button"
              onClick={handleToggleFocusMode}
              className="rounded-full border border-slate-200 bg-slate-100 px-3 py-2 text-xs font-bold text-slate-900 transition-colors hover:bg-slate-200"
            >
              {isFocusMode ? '기본 화면' : '집중 모드'}
            </button>
            <button
              type="button"
              onClick={() => setIsRemoteVisible(false)}
              className="rounded-full border border-slate-200 bg-slate-100 px-3 py-2 text-xs font-bold text-slate-900 transition-colors hover:bg-slate-200"
            >
              숨기기
            </button>
          </div>
        </div>
        <div className="mt-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5">
          <div className="flex items-center gap-3 text-xs font-bold text-slate-700">
            <span className="shrink-0">속도 {scrollLevel}</span>
            <input type="range" min="0" max="100" step="1" value={scrollLevel} onChange={(event) => setScrollLevel(Number(event.target.value))} className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-slate-300 accent-sky-500" />
          </div>
        </div>

        {isRemoteExpanded && (
          <div className={`mt-2 grid gap-2 ${isCompactViewport ? 'grid-cols-1' : 'lg:grid-cols-2'}`}>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-bold text-slate-900">글자 크기</p>
                </div>
                <div className="rounded-full bg-white px-3 py-1 text-sm font-black text-sky-700 shadow-sm">{fontSize}px</div>
              </div>
              <div className="mt-3 flex items-center gap-2">
                <button type="button" onClick={() => adjustFontSize(-2)} className="h-9 w-9 rounded-full border border-slate-200 bg-white text-lg font-black text-slate-900 transition-colors hover:bg-slate-100 sm:h-10 sm:w-10">-</button>
                <input type="range" min={MIN_FONT_SIZE} max={MAX_FONT_SIZE} step="1" value={fontSize} onChange={(event) => setFontSize(Number(event.target.value))} className="w-full accent-sky-500" />
                <button type="button" onClick={() => adjustFontSize(2)} className="h-9 w-9 rounded-full border border-slate-200 bg-white text-lg font-black text-slate-900 transition-colors hover:bg-slate-100 sm:h-10 sm:w-10">+</button>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-bold text-slate-900">글자 선명도</p>
                </div>
                <div className="rounded-full bg-white px-3 py-1 text-sm font-black text-sky-700 shadow-sm">{overlayOpacity}%</div>
              </div>
              <div className="mt-3 flex items-center gap-2">
                <button type="button" onClick={() => adjustOverlayOpacity(-5)} className="h-9 w-9 rounded-full border border-slate-200 bg-white text-lg font-black text-slate-900 transition-colors hover:bg-slate-100 sm:h-10 sm:w-10">-</button>
                <input type="range" min="60" max="100" step="1" value={overlayOpacity} onChange={(event) => setOverlayOpacity(Number(event.target.value))} className="w-full accent-sky-500" />
                <button type="button" onClick={() => adjustOverlayOpacity(5)} className="h-9 w-9 rounded-full border border-slate-200 bg-white text-lg font-black text-slate-900 transition-colors hover:bg-slate-100 sm:h-10 sm:w-10">+</button>
              </div>
            </div>
          </div>
        )}
      </div>
      ) : (
        <div className="fixed bottom-[calc(env(safe-area-inset-bottom,0px)+0.75rem)] left-1/2 z-[80] flex -translate-x-1/2 items-center gap-2">
          <button
            type="button"
            onClick={handleTogglePlay}
            disabled={!canAutoScroll}
            className={`rounded-full px-4 py-2 text-xs font-bold shadow-xl backdrop-blur-xl transition-colors ${canAutoScroll ? 'bg-sky-400 text-slate-950 hover:bg-sky-300' : 'bg-slate-200 text-slate-400'}`}
          >
            {isPlaying ? '정지' : '시작'}
          </button>
          <button
            type="button"
            onClick={() => setIsRemoteVisible(true)}
            className="rounded-full border border-slate-200 bg-white/92 px-4 py-2 text-xs font-bold text-slate-900 shadow-xl backdrop-blur-xl transition-colors hover:bg-white"
          >
            리모컨 열기
          </button>
        </div>
      )}
    </div>
  );
}

export default ScriptPracticePage;