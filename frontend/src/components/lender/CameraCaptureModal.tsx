import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  Camera,
  RefreshCw,
  X,
  Check,
  Upload,
  AlertCircle,
  Sparkles,
  Layers,
  FlipHorizontal,
  Smartphone,
} from "lucide-react";
import { Button } from "@/components/common/Button";

interface CameraCaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (imageDataUrl: string, angleTag?: string) => Promise<void> | void;
  onFallbackUpload: () => void;
  angleTag?: string;
  closeOnConfirm?: boolean;
  isUploading?: boolean;
  uploadProgress?: number | null;
}

const AVAILABLE_ANGLES = [
  "Front View",
  "Back View",
  "Side View",
  "Top/Detail View",
];

export function CameraCaptureModal({
  isOpen,
  onClose,
  onCapture,
  onFallbackUpload,
  angleTag: initialAngleTag = "Front View",
  closeOnConfirm = true,
  isUploading = false,
  uploadProgress = null,
}: CameraCaptureModalProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const nativeCameraInputRef = useRef<HTMLInputElement | null>(null);

  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<"environment" | "user">(
    "environment"
  );
  const [selectedAngle, setSelectedAngle] = useState<string>(initialAngleTag);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isShuttering, setIsShuttering] = useState(false);

  useEffect(() => {
    setSelectedAngle(initialAngleTag);
  }, [initialAngleTag]);

  // Play shutter sound via Web Audio API
  const playShutterSound = useCallback(() => {
    try {
      const audioCtx = new (window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(800, audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(200, audioCtx.currentTime + 0.08);
      gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.08);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.08);
    } catch {
      // Audio fallback silent ignore
    }
  }, []);

  // Stop camera stream tracks
  const stopStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  }, []);

  // Trigger native phone camera app via HTML5 file input
  const triggerNativeCamera = useCallback(() => {
    if (nativeCameraInputRef.current) {
      nativeCameraInputRef.current.click();
    }
  }, []);

  const handleNativeFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        if (result) {
          setCapturedImage(result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Start camera stream with automated progressive retries
  const startCamera = useCallback(async () => {
    stopStream();
    setHasPermission(null);
    setErrorMsg(null);

    if (!navigator.mediaDevices?.getUserMedia) {
      setHasPermission(false);
      setErrorMsg("WebRTC stream unavailable. Launching native phone camera...");
      return;
    }

    const constraintConfigs: MediaStreamConstraints[] = [
      {
        video: {
          facingMode: facingMode === "environment" ? { ideal: "environment" } : { ideal: "user" },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      },
      {
        video: {
          facingMode: facingMode === "environment" ? "environment" : "user",
        },
        audio: false,
      },
      {
        video: true,
        audio: false,
      },
    ];

    let stream: MediaStream | null = null;
    let lastErr: unknown = null;

    for (const config of constraintConfigs) {
      try {
        stream = await navigator.mediaDevices.getUserMedia(config);
        if (stream) break;
      } catch (err) {
        lastErr = err;
      }
    }

    if (stream) {
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        try {
          await videoRef.current.play();
        } catch {
          // Play fallback
        }
      }
      setHasPermission(true);
    } else {
      console.warn("[CameraCaptureModal] WebRTC Camera permission error:", lastErr);
      setHasPermission(false);
      const message =
        lastErr instanceof Error
          ? lastErr.message
          : "Camera permission denied or blocked by browser settings.";
      setErrorMsg(message);
    }
  }, [facingMode, stopStream]);

  // Automated action for "Turn On Camera & Allow Access" button
  const handleTurnOnCameraClick = async () => {
    await startCamera();
    // If WebRTC remains blocked or denied, automatically trigger native camera app
    setTimeout(() => {
      if (!streamRef.current) {
        triggerNativeCamera();
      }
    }, 400);
  };

  // Manage camera open state
  useEffect(() => {
    if (isOpen && !capturedImage) {
      startCamera();
    } else {
      stopStream();
    }

    return () => {
      stopStream();
    };
  }, [isOpen, capturedImage, startCamera, stopStream]);

  // Toggle camera direction between Back ("environment") and Front ("user")
  const handleToggleCamera = () => {
    setFacingMode((prev) => (prev === "environment" ? "user" : "environment"));
  };

  // Capture photo snapshot onto canvas
  const handleTakeSnapshot = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;

    setIsShuttering(true);
    playShutterSound();

    setTimeout(() => {
      setIsShuttering(false);

      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth || 1280;
      canvas.height = video.videoHeight || 720;
      const ctx = canvas.getContext("2d");

      if (ctx) {
        // If front camera, mirror horizontally for natural preview
        if (facingMode === "user") {
          ctx.translate(canvas.width, 0);
          ctx.scale(-1, 1);
        }
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
        setCapturedImage(dataUrl);
        stopStream();
      }
    }, 150);
  };

  const handleRetake = () => {
    setCapturedImage(null);
    startCamera();
  };

  const handleConfirm = async (shouldClose = closeOnConfirm) => {
    if (capturedImage) {
      const img = capturedImage;
      const angle = selectedAngle;
      setCapturedImage(null);
      if (shouldClose) {
        stopStream();
        onClose();
      } else {
        startCamera();
      }
      await onCapture(img, angle);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-3 sm:p-4 animate-in fade-in duration-200">
      {/* Hidden Native Camera HTML5 File Input Fallback */}
      <input
        ref={nativeCameraInputRef}
        type="file"
        accept="image/*"
        capture={facingMode === "environment" ? "environment" : "user"}
        onChange={handleNativeFileChange}
        className="hidden"
      />

      <div className="relative w-full max-w-2xl overflow-hidden rounded-3xl bg-zinc-900 border border-zinc-800 shadow-2xl text-white flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex flex-col border-b border-zinc-800 px-5 py-3.5 space-y-3 bg-zinc-900/90">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-xl bg-primary/20 grid place-items-center text-primary border border-primary/30">
                <Camera className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  Snap Product Photo
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-primary/20 text-primary border border-primary/30">
                    {facingMode === "environment" ? "Back Camera" : "Front Camera"}
                  </span>
                </h3>
                <p className="text-xs text-zinc-400">
                  Tag: <span className="text-primary font-medium">{selectedAngle}</span>
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                stopStream();
                setCapturedImage(null);
                onClose();
              }}
              className="rounded-full p-2 text-zinc-400 hover:bg-zinc-800 hover:text-white transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Photo Angle Selector Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
            {AVAILABLE_ANGLES.map((angle) => (
              <button
                key={angle}
                type="button"
                onClick={() => setSelectedAngle(angle)}
                className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
                  selectedAngle === angle
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-zinc-800/80 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
                }`}
              >
                {angle}
              </button>
            ))}
          </div>
        </div>

        {/* Upload Progress Banner */}
        {isUploading && (
          <div className="bg-primary/20 border-b border-primary/30 px-5 py-2 flex items-center justify-between text-xs text-primary font-medium animate-pulse">
            <div className="flex items-center gap-2">
              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              <span>Uploading photo to cloud storage...</span>
            </div>
            {uploadProgress !== null && uploadProgress !== undefined && (
              <span className="font-mono font-bold">{uploadProgress}%</span>
            )}
          </div>
        )}

        {/* Viewfinder / Preview Body */}
        <div className="relative aspect-[4/3] w-full bg-black flex items-center justify-center overflow-hidden flex-1 min-h-[280px]">
          {/* Visual Camera Shutter Flash */}
          {isShuttering && (
            <div className="absolute inset-0 z-40 bg-white animate-in fade-in fade-out duration-150" />
          )}

          {capturedImage ? (
            /* Review Captured Photo */
            <div className="relative h-full w-full">
              <img
                src={capturedImage}
                alt="Captured product snapshot"
                className="h-full w-full object-cover"
              />
              <div className="absolute top-3 left-3 bg-black/70 backdrop-blur-md text-white text-xs px-3.5 py-1.5 rounded-full border border-white/10 flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-emerald-400" />
                <span>{selectedAngle} Snapshot Ready</span>
              </div>
            </div>
          ) : hasPermission === false || hasPermission === null ? (
            /* Permission / Turn On Camera Prompt State */
            <div className="p-6 text-center max-w-md mx-auto space-y-4 my-auto">
              <div className="h-16 w-16 rounded-full bg-primary/20 text-primary grid place-items-center mx-auto border border-primary/30 shadow-lg">
                <Camera className="h-8 w-8 animate-bounce" />
              </div>
              <div>
                <h4 className="text-lg font-bold text-white">
                  Turn On Camera Access
                </h4>
                <p className="mt-1.5 text-xs text-zinc-300 leading-relaxed">
                  {errorMsg ||
                    "Tap below to turn on device camera. If browser permissions are restricted, your phone's native camera app will open automatically."}
                </p>
              </div>
              <div className="pt-2 flex flex-col gap-2.5 items-center w-full">
                <Button
                  onClick={handleTurnOnCameraClick}
                  className="w-full bg-primary text-primary-foreground font-bold text-sm py-3.5 rounded-xl shadow-lg hover:bg-primary/90 flex items-center justify-center gap-2"
                >
                  <Camera className="h-5 w-5" />
                  Turn On Camera & Allow Access
                </Button>

                <Button
                  onClick={triggerNativeCamera}
                  variant="outline"
                  className="w-full border-primary/40 bg-primary/10 text-primary hover:bg-primary/20 text-xs font-semibold"
                >
                  <Smartphone className="h-4 w-4 mr-2" />
                  Open Phone Camera App Directly
                </Button>

                <Button
                  variant="outline"
                  onClick={() => {
                    onClose();
                    onFallbackUpload();
                  }}
                  className="w-full border-zinc-700 text-zinc-300 hover:bg-zinc-800 text-xs"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Image File From Gallery
                </Button>
              </div>
            </div>
          ) : (
            /* Live Camera Stream */
            <div className="relative h-full w-full flex items-center justify-center">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={`h-full w-full object-cover ${
                  facingMode === "user" ? "scale-x-[-1]" : ""
                }`}
              />

              {/* Viewfinder Target Framing Guidelines */}
              <div className="pointer-events-none absolute inset-6 sm:inset-10 border-2 border-dashed border-white/40 rounded-2xl flex flex-col justify-between p-4">
                <div className="flex justify-between">
                  <div className="w-4 h-4 border-t-2 border-l-2 border-primary" />
                  <div className="w-4 h-4 border-t-2 border-r-2 border-primary" />
                </div>
                <div className="text-center bg-black/60 backdrop-blur-md self-center px-3.5 py-1.5 rounded-full text-xs text-white font-medium border border-white/10">
                  Framing: {selectedAngle} ({facingMode === "environment" ? "Back Camera" : "Front Camera"})
                </div>
                <div className="flex justify-between">
                  <div className="w-4 h-4 border-b-2 border-l-2 border-primary" />
                  <div className="w-4 h-4 border-b-2 border-r-2 border-primary" />
                </div>
              </div>

              {/* Flip Camera Button (Always Visible) */}
              <button
                type="button"
                onClick={handleToggleCamera}
                className="absolute top-4 right-4 bg-black/70 backdrop-blur-md text-white text-xs px-3.5 py-2 rounded-full border border-white/20 hover:bg-black/90 active:scale-95 transition-all flex items-center gap-2 shadow-lg"
                title="Switch between back camera and front camera"
              >
                <FlipHorizontal className="h-4 w-4 text-primary" />
                <span>Switch to {facingMode === "environment" ? "Front" : "Back"} Camera</span>
              </button>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="border-t border-zinc-800 p-4 bg-zinc-900/90 flex items-center justify-between">
          {capturedImage ? (
            <>
              <Button
                variant="outline"
                onClick={handleRetake}
                className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-white"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Retake Photo
              </Button>
              <div className="flex items-center gap-2">
                {!closeOnConfirm ? (
                  <>
                    <Button
                      onClick={() => handleConfirm(false)}
                      disabled={isUploading}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 font-medium text-xs disabled:opacity-50"
                    >
                      {isUploading ? (
                        <>
                          <RefreshCw className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                          Uploading...
                        </>
                      ) : (
                        <>
                          <Check className="h-4 w-4 mr-1.5" />
                          Add & Snap Next
                        </>
                      )}
                    </Button>
                    <Button
                      onClick={() => handleConfirm(true)}
                      disabled={isUploading}
                      className="bg-primary hover:bg-primary/90 text-primary-foreground px-4 font-medium text-xs disabled:opacity-50"
                    >
                      Use & Done
                    </Button>
                  </>
                ) : (
                  <Button
                    onClick={() => handleConfirm(true)}
                    disabled={isUploading}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 font-medium disabled:opacity-50"
                  >
                    {isUploading ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Check className="h-4 w-4 mr-2" />
                        Use {selectedAngle} Photo
                      </>
                    )}
                  </Button>
                )}
              </div>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onFallbackUpload();
                }}
                className="text-xs text-zinc-400 hover:text-white flex items-center gap-1.5 px-2 py-1"
              >
                <Upload className="h-3.5 w-3.5" />
                Or pick from gallery
              </button>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  disabled={!hasPermission || isUploading}
                  onClick={handleTakeSnapshot}
                  className="relative group disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <div className="h-14 w-14 rounded-full border-4 border-white bg-transparent p-1 transition-transform group-active:scale-95">
                    <div className="h-full w-full rounded-full bg-white group-hover:bg-primary transition-colors grid place-items-center">
                      <Camera className="h-5 w-5 text-black group-hover:text-white" />
                    </div>
                  </div>
                </button>
              </div>

              <div className="w-24 text-right">
                <span className="text-[11px] text-zinc-500 flex items-center justify-end gap-1">
                  <Layers className="h-3 w-3" /> HQ Photo
                </span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
