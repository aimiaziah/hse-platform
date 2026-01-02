/* eslint-disable */
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { X } from 'lucide-react';
import { compressAndUploadImage } from '@/utils/imageStorage';
import { COMPRESSION_PRESETS } from '@/utils/imageCompression';

export interface CapturedImage {
  dataUrl: string;
  url?: string; // URL from DigitalOcean Spaces
  timestamp: number;
}

interface SimpleCameraCaptureProps {
  onComplete: (images: CapturedImage[]) => void;
  onCancel: () => void;
  maxPhotos?: number;
}

const SimpleCameraCapture: React.FC<SimpleCameraCaptureProps> = ({
  onComplete,
  onCancel,
  maxPhotos = 5,
}) => {
  const [capturedImages, setCapturedImages] = useState<CapturedImage[]>([]);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [currentPreview, setCurrentPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Initialize camera
  const startCamera = useCallback(async () => {
    try {
      setError(null);
      setIsInitializing(true);

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera API not supported in this browser');
      }

      let mediaStream: MediaStream | null = null;

      // Try back camera first (ideal for taking photos)
      try {
        mediaStream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: 'environment' },
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
          audio: false,
        });
      } catch (envError) {
        // Fallback: try ANY available camera
        mediaStream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });
      }

      if (!mediaStream) {
        throw new Error('Failed to get camera stream');
      }

      setStream(mediaStream);

      if (!videoRef.current) {
        throw new Error('Video element not found');
      }

      const video = videoRef.current;
      video.srcObject = mediaStream;
      video.setAttribute('playsinline', 'true');
      video.setAttribute('webkit-playsinline', 'true');
      video.setAttribute('autoplay', 'true');
      video.muted = true;
      video.playsInline = true;

      // Wait for video to be ready
      const videoReady = new Promise<void>((resolve, reject) => {
        let attempts = 0;
        const maxAttempts = 50;

        const checkReady = async () => {
          attempts++;
          if (video.readyState >= 2) {
            try {
              await video.play();
              resolve();
            } catch (playErr) {
              if (video.readyState >= 2) {
                resolve();
              } else {
                reject(playErr);
              }
            }
          } else if (attempts >= maxAttempts) {
            reject(new Error('Camera timeout'));
          } else {
            setTimeout(checkReady, 200);
          }
        };
        checkReady();
      });

      await videoReady;
      setIsCameraActive(true);
      setIsInitializing(false);
    } catch (err: any) {
      const errorMessage = err.message || 'Unable to access camera';
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setError('Camera permission denied. Please allow camera access.');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setError('No camera found on this device.');
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        setError('Camera is already in use by another application.');
      } else {
        setError(errorMessage);
      }
      setIsInitializing(false);
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
        setStream(null);
      }
    }
  }, [stream]);

  // Stop camera
  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
      setIsCameraActive(false);
    }
    setIsInitializing(false);
  }, [stream]);

  // Capture photo
  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;

      if (video.videoWidth === 0 || video.videoHeight === 0) {
        alert('Camera not ready. Please wait a moment and try again.');
        return;
      }

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.9);

        if (dataUrl.length < 100) {
          alert('Failed to capture photo. Please try again.');
          return;
        }

        setCurrentPreview(dataUrl);
        setShowPreview(true);
      } else {
        alert('Failed to capture photo. Please try again.');
      }
    } else {
      alert('Camera not ready. Please try again.');
    }
  };

  // Confirm captured photo
  const confirmCapture = async () => {
    if (currentPreview) {
      setIsUploading(true);

      try {
        // Upload image to DigitalOcean Spaces (with compression)
        const uploadResult = await compressAndUploadImage(
          currentPreview,
          'inspections/photos',
          COMPRESSION_PRESETS.photo
        );

        const newCapture: CapturedImage = {
          dataUrl: currentPreview, // Keep as fallback
          url: uploadResult.isUrl ? uploadResult.data : undefined, // Use URL if available
          timestamp: Date.now(),
        };

        const allCaptures = [...capturedImages, newCapture];
        setCapturedImages(allCaptures);
        setShowPreview(false);
        setCurrentPreview(null);

        console.log('[SimpleCameraCapture] Image captured:', {
          hasUrl: !!newCapture.url,
          url: newCapture.url,
        });
      } catch (error) {
        console.error('[SimpleCameraCapture] Error uploading image:', error);
        // If upload fails, still save with base64
        const newCapture: CapturedImage = {
          dataUrl: currentPreview,
          timestamp: Date.now(),
        };
        setCapturedImages([...capturedImages, newCapture]);
        setShowPreview(false);
        setCurrentPreview(null);
      } finally {
        setIsUploading(false);
      }
    }
  };

  // Retake photo
  const retakePhoto = () => {
    setShowPreview(false);
    setCurrentPreview(null);
  };

  // Delete a captured image
  const deleteImage = (index: number) => {
    setCapturedImages((prev) => prev.filter((_, i) => i !== index));
  };

  // Complete capture process
  const handleComplete = () => {
    if (capturedImages.length === 0) {
      alert('Please capture at least one photo');
      return;
    }
    stopCamera();
    onComplete(capturedImages);
  };

  // Cancel and cleanup
  const handleCancel = () => {
    stopCamera();
    onCancel();
  };

  // Auto-start camera on mount
  useEffect(() => {
    startCamera();
    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.width = '100%';
    document.body.style.height = '100%';

    return () => {
      stopCamera();
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.width = '';
      document.body.style.height = '';
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const canTakeMore = capturedImages.length < maxPhotos;

  return (
    <div className="fixed inset-0 bg-black z-[9999] flex flex-col">
      {/* Header */}
      <div className="bg-gray-900 text-white px-6 py-4 flex items-center justify-between border-b border-gray-800">
        <div>
          <h3 className="text-lg font-semibold">Capture Images</h3>
          <p className="text-sm text-gray-400 mt-0.5">
            {capturedImages.length} of {maxPhotos} images
          </p>
        </div>
        <button
          onClick={handleCancel}
          className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Camera View */}
      <div className="flex-1 relative bg-black overflow-hidden">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={`w-full h-full object-cover ${
            isCameraActive && !showPreview ? 'block' : 'hidden'
          }`}
        />

        {isInitializing && !error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black">
            <div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-white text-sm">Initializing camera...</p>
          </div>
        )}

        {error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black p-6">
            <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mb-4">
              <div className="w-8 h-8 border-2 border-red-500 rounded-full"></div>
            </div>
            <p className="text-white text-center mb-6 text-sm">{error}</p>
            <button
              onClick={startCamera}
              className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
            >
              Try Again
            </button>
          </div>
        )}

        {showPreview && currentPreview && (
          <div className="absolute inset-0 flex flex-col bg-black">
            <div className="flex-1 overflow-hidden flex items-center justify-center p-4">
              <img src={currentPreview} alt="Preview" className="max-w-full max-h-full object-contain rounded-lg" />
            </div>
            <div className="p-6 bg-gray-900 border-t border-gray-800 flex gap-3">
              <button
                onClick={retakePhoto}
                disabled={isUploading}
                className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-3.5 px-4 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Retake
              </button>
              <button
                onClick={confirmCapture}
                disabled={isUploading}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3.5 px-4 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isUploading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Uploading...</span>
                  </>
                ) : (
                  'Confirm'
                )}
              </button>
            </div>
          </div>
        )}

        {isCameraActive && !showPreview && (
          <>
            {/* Center focus indicator */}
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              <div className="w-64 h-64 border-2 border-white/30 rounded-lg"></div>
            </div>

            {/* Captured images indicator */}
            {capturedImages.length > 0 && (
              <div className="absolute top-4 left-4 right-4">
                <div className="bg-gray-900/90 backdrop-blur-sm rounded-lg p-3 border border-gray-800">
                  <div className="flex items-center gap-3">
                    <div className="flex gap-2 flex-1">
                      {capturedImages.map((img, idx) => (
                        <div key={idx} className="relative">
                          <img
                            src={img.dataUrl}
                            alt={`Image ${idx + 1}`}
                            className="w-12 h-12 object-cover rounded border border-gray-700"
                          />
                          <button
                            onClick={() => deleteImage(idx)}
                            className="absolute -top-1.5 -right-1.5 bg-red-600 hover:bg-red-700 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs transition-colors"
                            aria-label="Delete image"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                    <div className="text-white text-sm font-medium">
                      {capturedImages.length}/{maxPhotos}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Bottom controls */}
            <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black via-black/95 to-transparent">
              <div className="flex items-center justify-center gap-4">
                {canTakeMore && (
                  <button
                    onClick={capturePhoto}
                    className="w-20 h-20 bg-white rounded-full active:scale-95 shadow-lg transition-transform flex items-center justify-center border-4 border-gray-200"
                    aria-label="Capture photo"
                  >
                    <div className="w-14 h-14 bg-white rounded-full border-2 border-gray-300"></div>
                  </button>
                )}
                {capturedImages.length > 0 && (
                  <button
                    onClick={handleComplete}
                    className="ml-4 bg-blue-600 hover:bg-blue-700 text-white px-8 py-3.5 rounded-lg font-semibold shadow-lg transition-colors min-w-[140px]"
                  >
                    Submit ({capturedImages.length})
                  </button>
                )}
              </div>
              {capturedImages.length === 0 && (
                <p className="text-center text-white/70 text-sm mt-3">
                  Tap the button to capture an image
                </p>
              )}
            </div>
          </>
        )}
      </div>

      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
};

export default SimpleCameraCapture;
