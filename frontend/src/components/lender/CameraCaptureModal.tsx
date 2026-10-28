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

export interface CameraCaptureModalProps {
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

  // Camera operational states
  const [cameraState, setCameraState] = useState<
    "idle" | "initializing" | "streaming" | "captured" | "error"
  >("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<"environment" | "user">(
    "environment"
  );
  const [selectedAngle, setSelectedAngle] = useState<string>(initialAngleTag);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isShuttering, setIsShuttering] = useState(false);
  const [activeStream, setActiveStream] = useState<MediaStream | null>(null);

  useEffect(() => {
    setSelectedAngle(initialAngleTag);
  }, [initialAngleTag]);

  // Audio shutter feedback via Web Audio API
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
      // Audio optional, fail silently
    }
  }, []);

  // Safe track cleanup to release hardware resources and turn off camera LED
  const stopStream = useCallback(() => {
    if (streamRef.current) {
      try {
        streamRef.current.getTracks().forEach((track) => {
          track.stop();
        });
      } catch (err) {
        console.warn("[CameraCaptureModal] error stopping tracks:", err);
      }
      streamRef.current = null;
    }
    setActiveStream(null);
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  // Trigger native phone camera app fallback via HTML5 capture file input
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
          setCameraState("captured");
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Start live WebRTC camera stream with progressive fallback constraints
  const startCamera = useCallback(
    async (targetFacingMode?: "environment" | "user") => {
      const mode = targetFacingMode || facingMode;
      stopStream();
      setCameraState("initializing");
      setErrorMsg(null);

      // Check browser WebRTC availability & secure context
      if (!navigator?.mediaDevices?.getUserMedia) {
        setCameraState("error");
        setErrorMsg(
          "Direct camera access is unavailable in this environment. Camera access requires a secure context (HTTPS) or a supported browser."
        );
        return;
      }

      const constraintConfigs: MediaStreamConstraints[] = [
        {
          video: {
            facingMode: mode === "environment" ? { ideal: "environment" } : { ideal: "user" },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        },
        {
          video: {
            facingMode: mode === "environment" ? "environment" : "user",
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
        setActiveStream(stream);

        // Bind stream to the video element
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          try {
            await videoRef.current.play();
          } catch (playErr) {
            console.warn("[CameraCaptureModal] video play error:", playErr);
          }
        }

        setCameraState("streaming");
      } else {
        console.warn("[CameraCaptureModal] getUserMedia error:", lastErr);
        setCameraState("error");

        let friendlyMsg = "Unable to access camera.";
        if (lastErr instanceof DOMException) {
          if (
            lastErr.name === "NotAllowedError" ||
            lastErr.name === "PermissionDeniedError"
          ) {
            friendlyMsg =
              "Camera permission was denied. Please allow camera permissions in your browser address bar settings.";
          } else if (
            lastErr.name === "NotFoundError" ||
            lastErr.name === "DevicesNotFoundError"
          ) {
            friendlyMsg = "No camera hardware detected on this device.";
          } else if (
            lastErr.name === "NotReadableError" ||
            lastErr.name === "TrackStartError"
          ) {
            friendlyMsg = "Camera is currently in use by another application.";
          } else {
            friendlyMsg = lastErr.message || friendlyMsg;
          }
        } else if (lastErr instanceof Error) {
          friendlyMsg = lastErr.message;
        }
        setErrorMsg(friendlyMsg);
      }
    },
    [facingMode, stopStream]
  );

  // Manage modal open/close lifecycle and guarantee clean track teardown
  useEffect(() => {
    if (isOpen) {
      setCapturedImage(null);
      startCamera();
    } else {
      stopStream();
      setCameraState("idle");
    }

    return () => {
      stopStream();
    };
  }, [isOpen]); // Only run on modal open/close toggle to prevent premature stream teardown

  // Guarantee that when activeStream is set, videoRef receives it even if DOM just finished updating
  useEffect(() => {
    if (videoRef.current && activeStream && cameraState === "streaming") {
      if (videoRef.current.srcObject !== activeStream) {
        videoRef.current.srcObject = activeStream;
        videoRef.current.play().catch(() => {});
      }
    }
  }, [activeStream, cameraState]);

  // Toggle between Rear camera and Front camera
  const handleToggleCamera = () => {
    const nextMode = facingMode === "environment" ? "user" : "environment";
    setFacingMode(nextMode);
    startCamera(nextMode);
  };

  // Capture current video frame onto canvas
  const handleTakeSnapshot = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;

    setIsShuttering(true);
    playShutterSound();

    setTimeout(() => {
      setIsShuttering(false);

      try {
        const canvas = document.createElement("canvas");
        canvas.width = video.videoWidth || 1280;
        canvas.height = video.videoHeight || 720;
        const ctx = canvas.getContext("2d");

        if (ctx) {
          // If front-facing camera, mirror horizontally for natural preview
          if (facingMode === "user") {
            ctx.translate(canvas.width, 0);
            ctx.scale(-1, 1);
          }
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
          setCapturedImage(dataUrl);
          setCameraState("captured");
          stopStream();
        }
      } catch (err) {
        console.error("[CameraCaptureModal] snapshot failed:", err);
      }
    }, 120);
  };

  const handleRetake = () => {
    setCapturedImage(null);
    startCamera();
  };

  const handleConfirm = async (shouldClose = closeOnConfirm) => {
    if (capturedImage) {
      const img = capturedImage;
      const angle = selectedAngle;

      if (shouldClose) {
        stopStream();
        onClose();
        await onCapture(img, angle);
      } else {
        // Sequential capture mode (gallery): reset preview & re-start camera for next angle
        setCapturedImage(null);
        startCamera();
        await onCapture(img, angle);
      }
    }
  };

  const handleCloseModal = () => {
    stopStream();
    setCapturedImage(null);
    setCameraState("idle");
    onClose();
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
                    {facingMode === "environment" ? "Rear Camera" : "Front Camera"}
                  </span>
                </h3>
                <p className="text-xs text-zinc-400">
                  Tag: <span className="text-primary font-medium">{selectedAngle}</span>
                </p>
              </div>
            </div>
            <button
              onClick={handleCloseModal}
              className="rounded-full p-2 text-zinc-400 hover:bg-zinc-800 hover:text-white transition-colors cursor-pointer"
              title="Close Camera"
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
                className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
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

        {/* Viewfinder Body — The video element is ALWAYS mounted to guarantee ref binding */}
        <div className="relative aspect-[4/3] w-full bg-black flex items-center justify-center overflow-hidden flex-1 min-h-[300px]">
          {/* Permanent Video Element */}
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className={`h-full w-full object-cover transition-opacity duration-300 ${
              facingMode === "user" ? "scale-x-[-1]" : ""
            } ${cameraState === "streaming" && !capturedImage ? "opacity-100" : "opacity-0 absolute pointer-events-none"}`}
          />

          {/* Viewfinder Target Framing Guidelines (visible only during active live stream) */}
          {cameraState === "streaming" && !capturedImage && (
            <>
              <div className="pointer-events-none absolute inset-6 sm:inset-10 border-2 border-dashed border-white/40 rounded-2xl flex flex-col justify-between p-4 z-10">
                <div className="flex justify-between">
                  <div className="w-4 h-4 border-t-2 border-l-2 border-primary" />
                  <div className="w-4 h-4 border-t-2 border-r-2 border-primary" />
                </div>
                <div className="text-center bg-black/60 backdrop-blur-md self-center px-3.5 py-1.5 rounded-full text-xs text-white font-medium border border-white/10">
                  Framing: {selectedAngle} ({facingMode === "environment" ? "Rear Camera" : "Front Camera"})
                </div>
                <div className="flex justify-between">
                  <div className="w-4 h-4 border-b-2 border-l-2 border-primary" />
                  <div className="w-4 h-4 border-b-2 border-r-2 border-primary" />
                </div>
              </div>

              {/* Flip Camera Button */}
              <button
                type="button"
                onClick={handleToggleCamera}
                className="absolute top-4 right-4 z-20 bg-black/70 backdrop-blur-md text-white text-xs px-3.5 py-2 rounded-full border border-white/20 hover:bg-black/90 active:scale-95 transition-all flex items-center gap-2 shadow-lg cursor-pointer"
                title="Switch between rear and front camera"
              >
                <FlipHorizontal className="h-4 w-4 text-primary" />
                <span>Switch to {facingMode === "environment" ? "Front" : "Rear"} Camera</span>
              </button>
            </>
          )}

          {/* Visual Camera Shutter Flash */}
          {isShuttering && (
            <div className="absolute inset-0 z-40 bg-white animate-in fade-in fade-out duration-150" />
          )}

          {/* STATE 1: Captured Photo Review */}
          {capturedImage && (
            <div className="absolute inset-0 z-20 h-full w-full bg-black">
              <img
                src={capturedImage}
                alt="Captured product snapshot"
                className="h-full w-full object-contain bg-black"
              />
              <div className="absolute top-3 left-3 bg-black/70 backdrop-blur-md text-white text-xs px-3.5 py-1.5 rounded-full border border-white/10 flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-emerald-400" />
                <span>{selectedAngle} Snapshot Captured</span>
              </div>
            </div>
          )}

          {/* STATE 2: Initializing / Requesting Camera Access */}
          {cameraState === "initializing" && !capturedImage && (
            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/90 p-6 text-center space-y-3">
              <div className="h-14 w-14 rounded-2xl bg-primary/20 text-primary flex items-center justify-center border border-primary/30 animate-pulse">
                <Camera className="h-7 w-7 animate-bounce" />
              </div>
              <h4 className="text-base font-bold text-white">Connecting Camera...</h4>
              <p className="text-xs text-zinc-400 max-w-sm leading-relaxed">
                Starting live camera stream. If prompted, please allow camera permission in your browser.
              </p>
              <div className="pt-2">
                <RefreshCw className="h-4 w-4 text-primary animate-spin mx-auto" />
              </div>
            </div>
          )}

          {/* STATE 3: Error / Fallback State */}
          {cameraState === "error" && !capturedImage && (
            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-zinc-950 p-6 text-center space-y-4 overflow-y-auto">
              <div className="h-14 w-14 rounded-2xl bg-destructive/15 text-destructive flex items-center justify-center border border-destructive/30 shadow-lg">
                <AlertCircle className="h-7 w-7" />
              </div>
              <div>
                <h4 className="text-base font-bold text-white">
                  Camera Access Required
                </h4>
                <p className="mt-1.5 text-xs text-zinc-300 max-w-md mx-auto leading-relaxed">
                  {errorMsg ||
                    "Direct camera access is currently unavailable. You can retry with permission or use your device's camera app."}
                </p>
              </div>

              <div className="flex flex-col gap-2.5 items-center w-full max-w-xs pt-1">
                <Button
                  onClick={() => startCamera()}
                  className="w-full bg-primary text-primary-foreground font-bold text-xs py-3 rounded-xl shadow-lg hover:bg-primary/90 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <RefreshCw className="h-4 w-4" />
                  Try Turning On Camera Again
                </Button>

                <Button
                  onClick={triggerNativeCamera}
                  variant="outline"
                  className="w-full border-primary/40 bg-primary/10 text-primary hover:bg-primary/20 text-xs font-semibold cursor-pointer"
                >
                  <Smartphone className="h-4 w-4 mr-2" />
                  Open Device Camera App
                </Button>

                <Button
                  variant="outline"
                  onClick={() => {
                    handleCloseModal();
                    onFallbackUpload();
                  }}
                  className="w-full border-zinc-700 text-zinc-300 hover:bg-zinc-800 text-xs cursor-pointer"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Photo From Files
                </Button>
              </div>
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
                disabled={isUploading}
                className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-white cursor-pointer"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Retake
              </Button>

              <div className="flex items-center gap-2">
                {!closeOnConfirm ? (
                  <>
                    <Button
                      onClick={() => handleConfirm(false)}
                      disabled={isUploading}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 font-medium text-xs disabled:opacity-50 cursor-pointer"
                    >
                      {isUploading ? (
                        <>
                          <RefreshCw className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                          Uploading...
                        </>
                      ) : (
                        <>
                          <Check className="h-4 w-4 mr-1.5" />
                          Add & Snap Next Angle
                        </>
                      )}
                    </Button>
                    <Button
                      onClick={() => handleConfirm(true)}
                      disabled={isUploading}
                      className="bg-primary hover:bg-primary/90 text-primary-foreground px-4 font-medium text-xs disabled:opacity-50 cursor-pointer"
                    >
                      Use & Done
                    </Button>
                  </>
                ) : (
                  <Button
                    onClick={() => handleConfirm(true)}
                    disabled={isUploading}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 font-medium disabled:opacity-50 cursor-pointer"
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
                  handleCloseModal();
                  onFallbackUpload();
                }}
                className="text-xs text-zinc-400 hover:text-white flex items-center gap-1.5 px-2 py-1 cursor-pointer"
              >
                <Upload className="h-3.5 w-3.5" />
                Or pick from gallery
              </button>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  disabled={cameraState !== "streaming" || isUploading}
                  onClick={handleTakeSnapshot}
                  className="relative group disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  title="Snap Photo"
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

export default CameraCaptureModal;
