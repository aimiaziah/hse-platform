/* eslint-disable */
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Camera, CheckCircle2, RefreshCw, Loader2, Zap, ZapOff } from 'lucide-react';

interface CaptureStep {
  id: string;
  title: string;
  description: string;
  icon: string;
}

interface CapturedImage {
  stepId: string;
  dataUrl: string;
  timestamp: number;
}

interface AICameraCaptureProps {
  onComplete: (images: CapturedImage[]) => void;
  onCancel: () => void;
}

const CAPTURE_STEPS: CaptureStep[] = [
  {
    id: 'overall',
    title: 'Overall View',
    description: 'Capture a clear photo of the entire fire extinguisher',
    icon: '',
  },
  {
    id: 'closeup',
    title: 'Close-up Details',
    description: 'Capture a close-up of the pressure gauge, tags, and serial number',
    icon: '',
  },
];

const AICameraCapture: React.FC<AICameraCaptureProps> = ({ onComplete, onCancel }) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [capturedImages, setCapturedImages] = useState<CapturedImage[]>([]);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [currentPreview, setCurrentPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [debugLog, setDebugLog] = useState<string[]>([]);
  const [torchEnabled, setTorchEnabled] = useState(false);
  const [showDebug, setShowDebug] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const initializingRef = useRef<boolean>(false);

  // Helper to add debug logs
  const addDebugLog = useCallback((message: string) => {
    console.log(message);
    setDebugLog((prev) => [...prev.slice(-4), `${new Date().toLocaleTimeString()}: ${message}`]);
  }, []);

  const currentStep = CAPTURE_STEPS[currentStepIndex];
  const isLastStep = currentStepIndex === CAPTURE_STEPS.length - 1;

  // Initialize camera
  const startCamera = useCallback(async () => {
    // Clear previous debug logs on new attempt
    setDebugLog([]);

    try {
      setError(null);
      setIsInitializing(true);
      initializingRef.current = true;

      // Log environment info
      addDebugLog(`${window.location.protocol}//${window.location.host}`);
      addDebugLog('Starting camera...');

      // Clear any existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }

      // Check if getUserMedia is supported
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        console.error('[AI Camera] getUserMedia not supported');
        throw new Error('Camera API not supported in this browser');
      }

      addDebugLog('Requesting camera permission...');
      let mediaStream: MediaStream | null = null;

      // Mobile-optimized camera constraints
      try {
        console.log('[AI Camera] Trying back camera with mobile-optimized settings...');
        addDebugLog('Requesting back camera...');

        // Try back camera first (ideal for taking photos)
        mediaStream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: 'environment' },
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
          audio: false,
        });
        console.log('[AI Camera] Got back camera stream');
        addDebugLog('Got back camera stream');
      } catch (envError) {
        console.warn('[AI Camera] Back camera failed, trying any camera:', envError);
        addDebugLog('Trying any camera...');

        // Fallback: try ANY available camera with minimal constraints (for testing)
        try {
          mediaStream = await navigator.mediaDevices.getUserMedia({
            video: {
              width: { ideal: 1280 },
              height: { ideal: 720 },
            },
            audio: false,
          });
          console.log('[AI Camera] Got camera stream (any)');
          addDebugLog('Got camera stream (any)');
        } catch (anyError) {
          console.error('[AI Camera] All camera attempts failed:', anyError);
          addDebugLog('Camera failed: ' + (anyError as Error).message);
          throw anyError;
        }
      }

      if (!mediaStream) {
        console.error('[AI Camera] No media stream obtained');
        throw new Error('Failed to get camera stream');
      }

      addDebugLog('Setting up video...');
      setStream(mediaStream);

      if (!videoRef.current) {
        console.error('[AI Camera] Video element not found');
        throw new Error('Video element not found');
      }

      const video = videoRef.current;
      video.srcObject = mediaStream;

      // Set video attributes for mobile
      video.setAttribute('playsinline', 'true');
      video.setAttribute('webkit-playsinline', 'true');
      video.setAttribute('autoplay', 'true');
      video.muted = true;
      video.playsInline = true;

      console.log('[AI Camera] Video element configured, waiting for video to be ready...');
      addDebugLog('Waiting for video...');

      // Wait for video to be ready with polling and timeout
      const videoReady = new Promise<void>((resolve, reject) => {
        let attempts = 0;
        const maxAttempts = 50; // 50 attempts * 200ms = 10 seconds max

        const checkReady = async () => {
          attempts++;
          console.log(`[AI Camera] Check attempt ${attempts}, readyState: ${video.readyState}`);

          if (video.readyState >= 2) {
            // HAVE_CURRENT_DATA or better
            try {
              await video.play();
              addDebugLog('Video ready and playing');
              console.log('[AI Camera] Video playing successfully');
              resolve();
            } catch (playErr) {
              console.error('[AI Camera] Play failed:', playErr);

              // Some browsers block autoplay, try to continue anyway
              if (video.readyState >= 2) {
                console.warn('[AI Camera] Play blocked but video is ready, continuing...');
                addDebugLog('Video ready (play blocked)');
                resolve();
              } else {
                reject(playErr);
              }
            }
          } else if (attempts >= maxAttempts) {
            reject(new Error('Camera timeout - video not ready after 10 seconds'));
          } else {
            // Keep checking every 200ms
            setTimeout(checkReady, 200);
          }
        };

        // Start checking
        checkReady();
      });

      // Wait for video to be ready
      await videoReady;

      // Success!
      if (initializingRef.current) {
        console.log('[AI Camera] Camera initialization successful!');
        addDebugLog('Camera ready!');
        setIsCameraActive(true);
        setIsInitializing(false);
        initializingRef.current = false;
      }
    } catch (err: any) {
      console.error('[AI Camera] Camera access error:', err);
      const errorMessage = err.message || 'Unable to access camera';

      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setError('Camera permission denied. Please tap "Allow" when prompted for camera access.');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setError('No camera found on this device.');
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        setError('Camera is already in use by another application.');
      } else if (err.name === 'NotSupportedError' || err.name === 'TypeError') {
        setError('Camera not supported. Please use HTTPS or try a different browser.');
      } else {
        setError(errorMessage);
      }

      setIsInitializing(false);
      initializingRef.current = false;

      // Clean up stream on error
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
        setStream(null);
      }
    }
  }, [addDebugLog, stream]);

  // Stop camera
  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
      setIsCameraActive(false);
    }

    // Clear timeout and refs
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    initializingRef.current = false;
    setIsInitializing(false);
    setTorchEnabled(false);
  }, [stream]);

  // Toggle flashlight/torch
  const toggleTorch = async () => {
    if (stream) {
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        try {
          const capabilities = videoTrack.getCapabilities() as any;
          if (capabilities.torch) {
            await videoTrack.applyConstraints({
              advanced: [{ torch: !torchEnabled } as any],
            });
            setTorchEnabled(!torchEnabled);
          } else {
            alert('Flash/torch not supported on this device');
          }
        } catch (err) {
          console.error('Failed to toggle torch:', err);
          alert('Failed to toggle flash');
        }
      }
    }
  };

  // Capture photo
  const capturePhoto = () => {
    console.log('[AI Camera] Capturing photo...');
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;

      console.log('[AI Camera] Video dimensions:', video.videoWidth, 'x', video.videoHeight);
      console.log('[AI Camera] Video readyState:', video.readyState);

      // Check if video has valid dimensions
      if (video.videoWidth === 0 || video.videoHeight === 0) {
        console.error('[AI Camera] Video has invalid dimensions, cannot capture');
        alert('Camera not ready. Please wait a moment and try again.');
        return;
      }

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
        console.log('[AI Camera] Photo captured successfully, data URL length:', dataUrl.length);

        // Verify we actually got image data
        if (dataUrl.length < 100) {
          console.error('[AI Camera] Captured image is too small, likely failed');
          alert('Failed to capture photo. Please try again.');
          return;
        }

        setCurrentPreview(dataUrl);
        setShowPreview(true);
        console.log('[AI Camera] Preview state set, should show preview now');
      } else {
        console.error('[AI Camera] Failed to get canvas context');
        alert('Failed to capture photo. Please try again.');
      }
    } else {
      console.error('[AI Camera] Video or canvas ref not available');
      alert('Camera not ready. Please try again.');
    }
  };

  // Confirm captured photo
  const confirmCapture = () => {
    console.log('[AI Camera] Confirming capture, isLastStep:', isLastStep);
    if (currentPreview) {
      const newCapture: CapturedImage = {
        stepId: currentStep.id,
        dataUrl: currentPreview,
        timestamp: Date.now(),
      };

      console.log('[AI Camera] Adding capture to list:', newCapture.stepId);
      const allCaptures = [...capturedImages, newCapture];
      console.log('[AI Camera] Total captures:', allCaptures.length);

      // Update captured images first
      setCapturedImages(allCaptures);

      // Clear preview
      setShowPreview(false);
      setCurrentPreview(null);

      // Move to next step or complete immediately for single-step capture
      if (isLastStep) {
        console.log('[AI Camera] Last step reached, completing capture');
        stopCamera();

        // For single-step capture, call onComplete immediately
        // This triggers the AI processing in the parent component
        setTimeout(() => {
          console.log('[AI Camera] Calling onComplete with captures');
          onComplete(allCaptures);
        }, 100);
      } else {
        console.log('[AI Camera] Moving to next step');
        setCurrentStepIndex((prev) => prev + 1);
      }
    } else {
      console.warn('[AI Camera] No preview to confirm');
    }
  };

  // Retake photo
  const retakePhoto = () => {
    setShowPreview(false);
    setCurrentPreview(null);
  };

  // Go to previous step
  const goToPreviousStep = () => {
    if (currentStepIndex > 0) {
      // Remove the last captured image
      setCapturedImages((prev) => prev.slice(0, -1));
      setCurrentStepIndex((prev) => prev - 1);
      if (!isCameraActive) {
        startCamera();
      }
    }
  };

  // Complete capture process
  const handleComplete = () => {
    stopCamera();
    onComplete(capturedImages);
  };

  // Cancel and cleanup
  const handleCancel = () => {
    stopCamera();
    onCancel();
  };

  // Auto-start camera on mount and cleanup on unmount
  useEffect(() => {
    // Start camera automatically when component mounts
    startCamera();

    // Prevent body scroll on mobile when camera is active
    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.width = '100%';
    document.body.style.height = '100%';

    return () => {
      stopCamera();
      // Restore body scroll
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.width = '';
      document.body.style.height = '';
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      className="fixed inset-0 bg-black z-[9999] flex flex-col"
      style={{
        touchAction: 'none',
        WebkitOverflowScrolling: 'touch',
        overscrollBehavior: 'none',
      }}
    >
      {/* Camera View or Preview */}
      <div className="flex-1 relative bg-black">
        {/* Debug toggle button - top left corner */}
        <button
          type="button"
          onClick={() => setShowDebug(!showDebug)}
          className="fixed top-20 left-2 bg-black/50 text-white text-xs px-2 py-1 rounded z-[99998]"
        >
          {showDebug ? '✗ Debug' : '⚙️'}
        </button>

        {/* Debug info panel - collapsible, only shown when toggled */}
        {showDebug && (
          <div className="fixed top-28 left-2 right-2 bg-black/90 text-white text-xs p-3 rounded-lg z-[99999] font-mono border border-white/20">
            <p className="font-bold mb-2 text-yellow-400">Camera Status:</p>
            <div className="space-y-1">
              <div>
                Camera Active:{' '}
                <span className={isCameraActive ? 'text-green-400' : 'text-red-400'}>
                  {isCameraActive ? 'YES ✓' : 'NO ✗'}
                </span>
              </div>
              <div>
                Initializing:{' '}
                <span className={isInitializing ? 'text-yellow-400' : 'text-gray-400'}>
                  {isInitializing ? 'YES...' : 'NO'}
                </span>
              </div>
              <div>
                Error:{' '}
                <span className={error ? 'text-red-400' : 'text-green-400'}>
                  {error ? `YES - ${error}` : 'NONE ✓'}
                </span>
              </div>
              <div>Preview Showing: {showPreview ? 'YES' : 'NO'}</div>
              <div>
                Captured: {capturedImages.length}/{CAPTURE_STEPS.length}
              </div>
            </div>
            {!isCameraActive && !isInitializing && !error && (
              <button
                onClick={startCamera}
                className="mt-3 w-full bg-blue-600 text-white py-2 px-4 rounded font-bold"
              >
                Start Camera Manually
              </button>
            )}
          </div>
        )}

        {/* Video element - always present in DOM but hidden when not active */}
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={`w-full h-full object-cover ${
            isCameraActive && !showPreview ? 'block' : 'hidden'
          }`}
          style={{ transform: 'scaleX(1)' }}
        />

        {isInitializing && !error ? (
          // Loading state while camera initializes
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-black z-10">
            <div className="bg-blue-100 p-4 rounded-full mb-4 animate-pulse">
              <Camera className="w-12 h-12 text-blue-600" />
            </div>
            <h3 className="text-white text-2xl font-bold mb-2">Initializing Camera...</h3>
            <p className="text-gray-300 mb-4 text-lg">Please allow camera access if prompted</p>
            <Loader2 className="w-8 h-8 text-white animate-spin mb-6" />

            {/* Debug Log Display */}
            {debugLog.length > 0 && (
              <div className="mt-4 bg-black/50 rounded-lg p-3 max-w-md w-full">
                <p className="text-yellow-400 font-bold mb-2">Camera Log:</p>
                {debugLog.map((log, idx) => (
                  <p key={idx} className="text-xs text-gray-300 font-mono mb-1">
                    {log}
                  </p>
                ))}
              </div>
            )}

            {/* Manual cancel if taking too long */}
            <button
              onClick={handleCancel}
              className="mt-6 bg-gray-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-gray-700"
            >
              Cancel
            </button>
          </div>
        ) : error ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-black z-10">
            <div className="bg-red-100 p-4 rounded-full mb-4">
              <Camera className="w-12 h-12 text-red-600" />
            </div>
            <h3 className="text-white text-2xl font-bold mb-3">Camera Error</h3>
            <p className="text-red-300 text-base mb-4 px-4">{error}</p>

            {/* Debug Log Display */}
            {debugLog.length > 0 && (
              <div className="mt-4 bg-black/50 rounded-lg p-3 max-w-md w-full mb-4">
                <p className="text-yellow-400 font-bold mb-2">Error Log:</p>
                {debugLog.map((log, idx) => (
                  <p key={idx} className="text-xs text-gray-300 font-mono mb-1">
                    {log}
                  </p>
                ))}
              </div>
            )}

            <div className="flex flex-col gap-3 w-full max-w-xs">
              <button
                onClick={startCamera}
                className="bg-red-600 text-white px-8 py-4 rounded-xl font-bold text-lg hover:bg-red-700 transition-colors"
              >
                Try Again
              </button>
              <button
                onClick={handleCancel}
                className="bg-gray-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
            </div>

            {/* Help text */}
            <div className="mt-6 bg-blue-900/30 rounded-lg p-4 max-w-md">
              <p className="text-sm text-blue-200">
                <strong>Troubleshooting:</strong>
                <br />
                • Make sure camera permissions are allowed
                <br />
                • Try using HTTPS instead of HTTP
                <br />
                • Close other apps using the camera
                <br />• Refresh the page and try again
              </p>
            </div>
          </div>
        ) : !isCameraActive && capturedImages.length === CAPTURE_STEPS.length ? (
          // All photos captured - show completion screen
          <div className="absolute inset-0 h-full flex flex-col items-center justify-center p-6 text-center bg-black z-50 overflow-y-auto">
            {/* Show captured images preview */}
            {capturedImages.length > 0 && (
              <div className="mb-6 space-y-4 max-w-md w-full">
                {capturedImages.map((img, idx) => (
                  <div key={img.stepId} className="rounded-lg overflow-hidden shadow-2xl">
                    <div className="bg-gradient-to-r from-red-600 to-orange-600 text-white px-3 py-2 text-sm font-semibold">
                      Photo {idx + 1}: {CAPTURE_STEPS[idx]?.title}
                    </div>
                    <img src={img.dataUrl} alt={`Captured ${idx + 1}`} className="w-full h-auto" />
                  </div>
                ))}
              </div>
            )}
            <div className="bg-green-100 p-4 rounded-full mb-4 animate-bounce">
              <CheckCircle2 className="w-12 h-12 text-green-600" />
            </div>
            <h3 className="text-white text-2xl font-bold mb-2">
              {capturedImages.length} Photos Captured Successfully!
            </h3>
            <p className="text-gray-300 mb-8 text-lg">Ready to process with AI</p>
            <div className="flex flex-col gap-4 w-full max-w-md">
              <button
                type="button"
                onTouchStart={(e) => {
                  e.stopPropagation();
                  console.log('[AI Camera] Process with AI button TOUCHED');
                }}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  console.log('[AI Camera] Process with AI button CLICKED');
                  handleComplete();
                }}
                className="bg-gradient-to-r from-red-600 to-orange-600 text-white py-6 px-8 rounded-xl font-bold text-lg active:scale-95 transition-transform flex items-center justify-center gap-3 shadow-2xl"
                style={{
                  WebkitTapHighlightColor: 'transparent',
                  touchAction: 'manipulation',
                  userSelect: 'none',
                }}
              >
                <CheckCircle2 className="w-6 h-6" />
                Submit for AI Analysis
              </button>
              <button
                type="button"
                onTouchStart={(e) => {
                  e.stopPropagation();
                  console.log('[AI Camera] Retake button TOUCHED');
                }}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  console.log('[AI Camera] Retake button CLICKED');
                  setCurrentStepIndex(0);
                  setCapturedImages([]);
                  startCamera();
                }}
                className="bg-gray-600 text-white py-4 px-6 rounded-xl font-semibold active:bg-gray-700 transition-colors flex items-center justify-center gap-2"
                style={{
                  WebkitTapHighlightColor: 'transparent',
                  touchAction: 'manipulation',
                  userSelect: 'none',
                }}
              >
                <RefreshCw className="w-5 h-5" />
                Retake Photos
              </button>
            </div>
          </div>
        ) : showPreview && currentPreview ? (
          // Show preview of captured photo - MOBILE OPTIMIZED
          <div
            className="absolute inset-0 h-full flex flex-col bg-black z-[99999]"
            style={{
              touchAction: 'auto',
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
            }}
          >
            <div className="flex-1 overflow-hidden bg-black flex items-center justify-center">
              <img
                src={currentPreview}
                alt="Preview"
                className="max-w-full max-h-full object-contain"
              />
            </div>
            {/* MOBILE OPTIMIZED BUTTONS - Large touch targets */}
            <div
              className="p-6 bg-gradient-to-t from-black via-black to-transparent flex gap-4 z-[99999]"
              style={{ touchAction: 'auto' }}
            >
              <button
                type="button"
                onTouchStart={(e) => {
                  e.stopPropagation();
                  console.log('[AI Camera] Retake button TOUCHED');
                }}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  console.log('[AI Camera] Retake button CLICKED');
                  retakePhoto();
                }}
                className="flex-1 bg-gray-600 text-white py-6 px-4 rounded-xl font-bold active:bg-gray-700 flex flex-col items-center justify-center gap-2 text-base min-h-[80px]"
                style={{
                  WebkitTapHighlightColor: 'transparent',
                  touchAction: 'manipulation',
                  userSelect: 'none',
                }}
              >
                <span>Retake</span>
              </button>
              <button
                type="button"
                onTouchStart={(e) => {
                  e.stopPropagation();
                  console.log('[AI Camera] Submit button TOUCHED');
                }}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  console.log('[AI Camera] Submit button CLICKED');
                  confirmCapture();
                }}
                className="flex-1 bg-green-600 text-white py-6 px-4 rounded-xl font-bold active:bg-green-700 flex flex-col items-center justify-center gap-2 text-base shadow-2xl min-h-[80px] animate-pulse"
                style={{
                  WebkitTapHighlightColor: 'transparent',
                  touchAction: 'manipulation',
                  userSelect: 'none',
                }}
              >
                <span>Submit & Analyze</span>
              </button>
            </div>
          </div>
        ) : isCameraActive ? (
          // Show live camera feed with overlays
          <>
            {/* Simple center crosshair - minimal and non-intrusive */}
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              {/* Center crosshair indicator */}
              <div className="relative">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1 h-8 bg-white/60 shadow-lg"></div>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-1 bg-white/60 shadow-lg"></div>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 bg-green-400 rounded-full shadow-lg"></div>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 border-2 border-white/40 rounded-full animate-pulse"></div>
              </div>
            </div>

            {/* Instruction banner */}
            <div className="absolute top-4 left-4 right-4">
              <div className="bg-black/60 backdrop-blur-md rounded-2xl p-4 shadow-2xl border border-white/20">
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-3xl">{currentStep.icon}</span>
                  <h3 className="text-white text-lg font-bold flex-1">{currentStep.title}</h3>
                  <span className="bg-white/20 text-white text-xs font-bold px-3 py-1 rounded-full">
                    {currentStepIndex + 1}/{CAPTURE_STEPS.length}
                  </span>
                </div>
                <p className="text-white/90 text-sm">{currentStep.description}</p>
              </div>
            </div>

            {/* Flash/Torch toggle button */}
            <div className="absolute top-32 right-4">
              <button
                type="button"
                onClick={toggleTorch}
                className={`p-4 rounded-full backdrop-blur-md transition-all shadow-lg ${
                  torchEnabled
                    ? 'bg-yellow-500 text-white'
                    : 'bg-black/60 text-white hover:bg-black/80'
                }`}
                style={{
                  WebkitTapHighlightColor: 'transparent',
                  touchAction: 'manipulation',
                }}
              >
                {torchEnabled ? <Zap className="w-6 h-6" /> : <ZapOff className="w-6 h-6" />}
              </button>
            </div>

            {/* Capture button - MOBILE OPTIMIZED - LARGER & MORE OBVIOUS */}
            <div className="fixed bottom-0 left-0 right-0 pb-8 pt-6 bg-gradient-to-t from-black via-black/80 to-transparent flex justify-center gap-4 px-4 z-[9999]">
              {currentStepIndex > 0 && (
                <button
                  type="button"
                  onClick={goToPreviousStep}
                  className="bg-gray-600/90 backdrop-blur-sm text-white px-6 py-3 rounded-full font-semibold active:bg-gray-700"
                  style={{
                    WebkitTapHighlightColor: 'transparent',
                    touchAction: 'manipulation',
                  }}
                >
                  Back
                </button>
              )}
              <button
                type="button"
                onTouchStart={(e) => {
                  e.stopPropagation();
                  console.log('[AI Camera] Capture button TOUCHED');
                }}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  console.log('[AI Camera] Capture button CLICKED');
                  capturePhoto();
                }}
                className="bg-white text-red-600 rounded-full active:scale-95 shadow-2xl flex items-center justify-center border-8 border-red-600 transition-transform"
                style={{
                  WebkitTapHighlightColor: 'transparent',
                  touchAction: 'manipulation',
                  userSelect: 'none',
                  width: '90px',
                  height: '90px',
                }}
              >
                <div className="bg-red-600 rounded-full p-4">
                  <Camera className="w-10 h-10 text-white" />
                </div>
              </button>
            </div>

            {/* Removed label for capture button to reduce clutter */}
          </>
        ) : (
          // Initial state - start camera
          <div className="h-full flex flex-col items-center justify-center p-6 text-center">
            <div className="bg-red-100 p-4 rounded-full mb-4">
              <Camera className="w-12 h-12 text-red-600" />
            </div>
            <h3 className="text-white text-xl font-bold mb-2">Start Camera</h3>
            <p className="text-gray-300 mb-6">
              We'll guide you through capturing {CAPTURE_STEPS.length} photos
            </p>
            <button
              onClick={startCamera}
              className="bg-gradient-to-r from-red-600 to-orange-600 text-white px-6 py-3 rounded-lg font-semibold hover:shadow-lg transition-all"
            >
              Start Capturing
            </button>
          </div>
        )}
      </div>

      {/* Hidden canvas for capturing */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Removed photo quality tips to reduce clutter */}
    </div>
  );
};

export default AICameraCapture;
