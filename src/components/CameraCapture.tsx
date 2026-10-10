import React, { useRef, useState, useCallback, useEffect } from 'react';
import { Camera, RefreshCw, X, Zap, AlertTriangle, Send, Layers } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface CapturedPhoto {
  dataUrl: string;
  base64: string;
}

interface CameraCaptureProps {
  onCapture: (primaryBase64: string, secondaryBase64?: string) => void;
  onClose: () => void;
  isProcessing: boolean;
  extractionError?: string | null;
}

export const CameraCapture: React.FC<CameraCaptureProps> = ({ 
  onCapture, 
  onClose, 
  isProcessing, 
  extractionError 
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isFlashOn, setIsFlashOn] = useState(false);
  const [hasFlash, setHasFlash] = useState(false);
  const [showShutterFlash, setShowShutterFlash] = useState(false);

  // Dual-photo states: Photo 1 (Front) and optional Photo 2 (Back)
  const [firstPhoto, setFirstPhoto] = useState<CapturedPhoto | null>(null);
  const [secondPhoto, setSecondPhoto] = useState<CapturedPhoto | null>(null);

  const startCamera = useCallback(async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: { ideal: 'environment' },
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false,
      });
      
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }

      // Check for flash/torch support
      const track = mediaStream.getVideoTracks()[0];
      if (track) {
        const capabilities = track.getCapabilities?.() as any;
        if (capabilities && capabilities.torch) {
          setHasFlash(true);
        }
      }
    } catch (err) {
      setError("Could not access camera. Please ensure camera permissions are granted.");
      console.error("Camera access error:", err);
    }
  }, []);

  useEffect(() => {
    startCamera();
  }, [startCamera]);

  // Clean up media tracks and torch on unmount
  useEffect(() => {
    return () => {
      if (stream) {
        const tracks = stream.getTracks();
        const track = tracks.find(t => t.kind === 'video');
        if (track && hasFlash) {
          track.applyConstraints({ advanced: [{ torch: false }] } as any)
            .catch(() => {});
        }
        tracks.forEach(t => t.stop());
      }
    };
  }, [stream, hasFlash]);

  const toggleFlash = async () => {
    if (!stream || !hasFlash) return;
    const track = stream.getVideoTracks()[0];
    try {
      const newFlashState = !isFlashOn;
      await track.applyConstraints({
        advanced: [{ torch: newFlashState }]
      } as any);
      setIsFlashOn(newFlashState);
    } catch (err) {
      console.error("Failed to toggle flash:", err);
    }
  };

  const handleRetake = () => {
    setFirstPhoto(null);
    setSecondPhoto(null);
  };

  const grabCurrentFrame = (): CapturedPhoto | null => {
    if (!videoRef.current || !canvasRef.current) return null;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    if (!context) return null;

    // High resolution dimension scaling (max 1600px for crystal-clear medicine label text)
    const MAX_DIMENSION = 1600;
    let width = video.videoWidth || 1280;
    let height = video.videoHeight || 720;
    
    if (width > height) {
      if (width > MAX_DIMENSION) {
        height = Math.round((height * MAX_DIMENSION) / width);
        width = MAX_DIMENSION;
      }
    } else {
      if (height > MAX_DIMENSION) {
        width = Math.round((width * MAX_DIMENSION) / height);
        height = MAX_DIMENSION;
      }
    }
    
    canvas.width = width;
    canvas.height = height;
    context.drawImage(video, 0, 0, width, height);
    
    const dataUrl = canvas.toDataURL('image/jpeg', 0.88);
    const base64 = dataUrl.split(',')[1];
    return { dataUrl, base64 };
  };

  const captureFrame = () => {
    if (isProcessing) return;

    const frame = grabCurrentFrame();
    if (!frame) return;

    // Trigger visual shutter flash effect
    setShowShutterFlash(true);
    setTimeout(() => setShowShutterFlash(false), 150);

    // Turn off torch if it was on
    if (isFlashOn && stream) {
      const track = stream.getVideoTracks()[0];
      if (track) {
        track.applyConstraints({ advanced: [{ torch: false }] } as any)
          .catch(e => console.warn("Failed to reset torch after scan", e));
        setIsFlashOn(false);
      }
    }

    if (!firstPhoto) {
      // Step 1: Capture Photo 1 (Front/Name side) and keep viewfinder live for Photo 2
      setFirstPhoto(frame);
    } else {
      // Step 2: Capture Photo 2 (Back/Expiry side) and immediately send both to Gemini AI
      setSecondPhoto(frame);
      onCapture(firstPhoto.base64, frame.base64);
    }
  };

  // User chose to send only the 1st photo (for single-sided packaging)
  const handleSendSingle = () => {
    if (firstPhoto && !isProcessing) {
      onCapture(firstPhoto.base64);
    }
  };

  // Determine if viewfinder is frozen (frozen only when processing both or final freeze)
  const isViewfinderFrozen = isProcessing && !!secondPhoto;

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center select-none"
    >
      <div className="relative w-full h-full max-w-md mx-auto overflow-hidden bg-neutral-950 flex flex-col">
        {error ? (
          <div className="p-8 text-center text-white my-auto">
            <p className="mb-4">{error}</p>
            <button 
              onClick={onClose}
              className="px-6 py-2 bg-white/10 border border-white/20 rounded-full text-white backdrop-blur-md"
            >
              Close
            </button>
          </div>
        ) : (
          <>
            {/* Viewfinder: Live Camera or Frozen Frame */}
            <div className="relative flex-1 w-full h-full overflow-hidden">
              <video 
                ref={videoRef} 
                autoPlay 
                playsInline 
                className={`w-full h-full object-cover ${isViewfinderFrozen ? 'hidden' : 'block'}`}
              />

              {isViewfinderFrozen && secondPhoto && (
                <img 
                  src={secondPhoto.dataUrl} 
                  alt="Captured Medicine Back" 
                  className="w-full h-full object-cover"
                />
              )}

              {/* Camera Shutter Flash Effect */}
              <AnimatePresence>
                {showShutterFlash && (
                  <motion.div 
                    key="shutter-flash-overlay"
                    initial={{ opacity: 0.95 }}
                    animate={{ opacity: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15, ease: "easeOut" }}
                    className="absolute inset-0 bg-white z-40 pointer-events-none"
                  />
                )}
              </AnimatePresence>

              {/* Viewfinder Framing Guidelines */}
              {!isViewfinderFrozen && (
                <div className="absolute inset-0 pointer-events-none border-[16px] border-black/40">
                  <div className="w-full h-full border-2 border-white/40 rounded-2xl relative shadow-[inset_0_0_20px_rgba(0,0,0,0.5)]">
                    {/* Corner Guides */}
                    <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-emerald-400 rounded-tl-lg" />
                    <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-emerald-400 rounded-tr-lg" />
                    <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-emerald-400 rounded-bl-lg" />
                    <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-emerald-400 rounded-br-lg" />
                    
                    {/* Subtle Crosshairs */}
                    <div className="absolute top-1/2 left-0 w-full h-[1px] bg-white/15" />
                    <div className="absolute top-0 left-1/2 w-[1px] h-full bg-white/15" />
                  </div>
                </div>
              )}

              {/* Subtle top indicator during AI analysis */}
              <AnimatePresence>
                {isProcessing && (
                  <motion.div 
                    key="processing-camera-banner"
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="absolute top-20 left-6 right-6 bg-black/75 backdrop-blur-md border border-emerald-500/40 rounded-xl px-4 py-2.5 flex items-center justify-between shadow-lg z-30"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                      <span className="text-white text-xs font-medium tracking-wide">
                        {secondPhoto ? 'Analyzing Front & Back photos...' : 'Analyzing medicine packaging...'}
                      </span>
                    </div>
                    <span className="text-[10px] text-emerald-400 font-semibold uppercase tracking-wider bg-emerald-950/80 px-2 py-0.5 rounded-full border border-emerald-600/40">
                      {secondPhoto ? '2 Photos' : '1 Photo'}
                    </span>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Top Navigation Bar */}
            <div className="absolute top-6 left-6 right-6 flex justify-between items-center z-20">
              <button 
                onClick={onClose}
                disabled={isProcessing}
                className="p-3 bg-black/50 backdrop-blur-xl border border-white/15 rounded-full text-white hover:bg-black/70 active:scale-95 transition-all disabled:opacity-40"
                aria-label="Close camera"
              >
                <X size={22} />
              </button>
              
              <div className="flex gap-2">
                {hasFlash && (
                  <button 
                    onClick={toggleFlash}
                    disabled={isProcessing}
                    className={`p-3 backdrop-blur-xl border border-white/15 rounded-full transition-all active:scale-95 ${
                      isFlashOn ? 'bg-amber-400 text-black border-amber-300' : 'bg-black/50 text-white hover:bg-black/70'
                    }`}
                    aria-label="Toggle flash"
                  >
                    <Zap size={22} fill={isFlashOn ? "currentColor" : "none"} />
                  </button>
                )}
              </div>
            </div>

            {/* Error Notification Banner */}
            <AnimatePresence>
              {extractionError && (
                <motion.div 
                  key="extraction-error-banner"
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="absolute top-20 left-6 right-6 bg-red-950/90 border border-red-500/60 backdrop-blur-xl rounded-2xl p-4 text-center shadow-2xl z-30"
                >
                  <div className="flex items-center justify-center gap-2 mb-1.5">
                    <AlertTriangle size={18} className="text-red-400" />
                    <p className="text-red-300 font-semibold text-xs tracking-wider uppercase">Capture Unclear</p>
                  </div>
                  <p className="text-white/90 text-xs mb-3">{extractionError}</p>
                  <button
                    onClick={handleRetake}
                    className="px-4 py-1.5 bg-white text-black font-semibold text-xs rounded-full shadow hover:bg-neutral-100 active:scale-95 transition-all"
                  >
                    Retake Photos
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Bottom Camera Shutter Section */}
            <div className="absolute bottom-8 left-0 right-0 flex flex-col items-center gap-3 z-20 pointer-events-auto px-6">
              {/* Guidance text above buttons */}
              {!isProcessing && (
                <div className="bg-black/60 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-white/10 text-center max-w-xs shadow-md">
                  {!firstPhoto ? (
                    <p className="text-white/90 text-xs font-medium tracking-wide">
                      Tap shutter for <span className="text-emerald-400 font-bold">Photo 1 (Front / Name)</span>
                    </p>
                  ) : (
                    <p className="text-white/90 text-xs font-medium tracking-wide">
                      Tap shutter for <span className="text-emerald-400 font-bold">Photo 2 (Back / Expiry)</span> or tap send sign
                    </p>
                  )}
                </div>
              )}

              {/* Shutter row with: [Left circle box (Photo 1)] [Center Capture Shutter] [Right circle box (Send sign)] */}
              <div className="w-full max-w-xs flex items-center justify-between">
                
                {/* 1. Left Circle Box: Displays 1st captured photo or placeholder */}
                <div className="w-14 h-14 flex items-center justify-center">
                  {firstPhoto ? (
                    <div className="relative group">
                      <button
                        onClick={handleRetake}
                        disabled={isProcessing}
                        title="Photo 1 (Front) - Tap to retake"
                        className="w-14 h-14 rounded-full overflow-hidden border-2 border-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.5)] relative active:scale-95 transition-all bg-neutral-900 focus:outline-none"
                      >
                        <img 
                          src={firstPhoto.dataUrl} 
                          alt="Photo 1 preview" 
                          className="w-full h-full object-cover" 
                        />
                        <span className="absolute bottom-0 inset-x-0 bg-black/75 text-[8px] text-emerald-300 font-bold uppercase tracking-wider py-0.5 text-center leading-none">
                          Side 1
                        </span>
                      </button>
                      {!isProcessing && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRetake();
                          }}
                          title="Remove and retake Photo 1"
                          className="absolute -top-1 -right-1 w-5 h-5 bg-red-600 border border-white text-white rounded-full flex items-center justify-center shadow-md active:scale-90 transition-transform"
                        >
                          <X size={12} strokeWidth={3} />
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="w-14 h-14 rounded-full border-2 border-dashed border-white/25 flex flex-col items-center justify-center text-white/40">
                      <Layers size={18} className="opacity-60 mb-0.5" />
                      <span className="text-[9px] font-bold tracking-wider uppercase">Photo 1</span>
                    </div>
                  )}
                </div>

                {/* 2. Center Capture Button */}
                <button 
                  onClick={captureFrame}
                  disabled={isProcessing || (!!firstPhoto && !!secondPhoto)}
                  className={`group relative w-20 h-20 rounded-full flex items-center justify-center transition-all ${
                    isProcessing ? 'scale-100 opacity-100 cursor-wait' : 'active:scale-90'
                  }`}
                  aria-label={firstPhoto ? "Capture Photo 2 (Back side)" : "Capture Photo 1 (Front side)"}
                >
                  {/* Outer ring */}
                  <div className={`absolute inset-0 rounded-full border-4 transition-colors ${
                    isProcessing 
                      ? 'border-emerald-400/40' 
                      : firstPhoto 
                        ? 'border-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.6)] animate-pulse'
                        : 'border-white/80 shadow-[0_0_20px_rgba(0,0,0,0.6)] group-hover:border-white'
                  }`} />

                  {/* Shutter Button Body */}
                  <div className="w-14 h-14 bg-white rounded-full transition-all shadow-[0_4px_12px_rgba(0,0,0,0.5)] flex items-center justify-center">
                    {isProcessing ? (
                      <RefreshCw className="animate-spin text-emerald-600" size={26} />
                    ) : firstPhoto ? (
                      <Camera className="text-emerald-700" size={24} />
                    ) : (
                      <Camera className="text-neutral-800" size={24} />
                    )}
                  </div>
                </button>

                {/* 3. Right Circle Box: Send button with ONLY icon/sign, NO text, appears after Photo 1 */}
                <div className="w-14 h-14 flex items-center justify-center">
                  <AnimatePresence>
                    {firstPhoto && !isProcessing && (
                      <motion.button
                        key="single-photo-send-circle-btn"
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0, opacity: 0 }}
                        whileHover={{ scale: 1.08 }}
                        whileTap={{ scale: 0.92 }}
                        onClick={handleSendSingle}
                        title="Send single photo to Gemini AI"
                        aria-label="Send photo"
                        className="w-14 h-14 rounded-full bg-emerald-500 hover:bg-emerald-400 text-white shadow-[0_4px_16px_rgba(16,185,129,0.6)] border border-emerald-300/40 flex items-center justify-center transition-colors"
                      >
                        <Send size={22} className="translate-x-0.5" strokeWidth={2.5} />
                      </motion.button>
                    )}
                  </AnimatePresence>
                </div>

              </div>

              {/* Status text during extraction */}
              {isProcessing && (
                <div className="flex items-center gap-1.5 px-3 py-1 bg-black/60 backdrop-blur-md rounded-full border border-white/10 mt-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-white text-xs font-medium tracking-wide">
                    {secondPhoto ? 'Analyzing Front & Back photos...' : 'Analyzing photo with Gemini...'}
                  </span>
                </div>
              )}
            </div>
          </>
        )}
      </div>
      <canvas ref={canvasRef} className="hidden" />
    </motion.div>
  );
};
