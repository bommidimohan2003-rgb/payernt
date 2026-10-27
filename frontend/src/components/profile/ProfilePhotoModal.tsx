import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  Camera,
  Upload,
  RefreshCw,
  Check,
  X,
  Trash2,
  AlertCircle,
  Image as ImageIcon,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/common/Button";
import { ProfilePhoto } from "@/components/common/ProfilePhoto";

export interface ProfilePhotoModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentPhotoUrl?: string | null;
  onSave: (photoDataUrl: string) => Promise<void> | void;
  onRemove?: () => Promise<void> | void;
  canRemove?: boolean;
}

type ModalStep = "select" | "camera" | "preview";

export function ProfilePhotoModal({
  isOpen,
  onClose,
  currentPhotoUrl,
  onSave,
  onRemove,
  canRemove = true,
}: ProfilePhotoModalProps) {
  const [step, setStep] = useState<ModalStep>("select");
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isStartingCamera, setIsStartingCamera] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Clean up WebRTC tracks
  const stopCameraStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch {
          // ignore
        }
      });
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  // Reset state on close
  const handleClose = useCallback(() => {
    stopCameraStream();
    setSelectedPhoto(null);
    setCameraError(null);
    setStep("select");
    setIsSaving(false);
    setIsRemoving(false);
    onClose();
  }, [stopCameraStream, onClose]);

  // Handle starting camera stream
  const startCameraStream = useCallback(async () => {
    stopCameraStream();
    setCameraError(null);
    setIsStartingCamera(true);

    if (
      typeof window === "undefined" ||
      !navigator.mediaDevices ||
      !navigator.mediaDevices.getUserMedia
    ) {
      setCameraError(
        "Camera access is not supported by your current browser or device."
      );
      setIsStartingCamera(false);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 720 },
          height: { ideal: 720 },
          facingMode: "user",
        },
        audio: false,
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }
    } catch (err: unknown) {
      console.warn("[ProfilePhotoModal] Camera access notice:", err);
      const e = err as { name?: string; message?: string };
      if (e.name === "NotAllowedError" || e.name === "PermissionDeniedError") {
        setCameraError(
          "Camera permission was denied. Please allow camera access in your browser settings to take a selfie."
        );
      } else if (e.name === "NotFoundError" || e.name === "DevicesNotFoundError") {
        setCameraError("No front-facing camera device was found on this system.");
      } else {
        setCameraError(
          e.message || "Failed to initialize camera. Please try choosing from gallery instead."
        );
      }
    } finally {
      setIsStartingCamera(false);
    }
  }, [stopCameraStream]);

  // Cleanup on unmount or modal close
  useEffect(() => {
    if (!isOpen) {
      stopCameraStream();
    }
    return () => {
      stopCameraStream();
    };
  }, [isOpen, stopCameraStream]);

  if (!isOpen) return null;

  // Process and compress image file from Gallery
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("Please select a valid image file (JPEG, PNG, or WebP).");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      alert("Image exceeds 8MB limit. Please choose a smaller photo.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        // Compress and normalize to max 800x800 square
        const canvas = document.createElement("canvas");
        const maxDim = 800;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxDim) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          }
        } else {
          if (height > maxDim) {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressed = canvas.toDataURL("image/jpeg", 0.9);
          setSelectedPhoto(compressed);
          setStep("preview");
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  // Capture current video frame from selfie camera
  const handleCaptureSelfie = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const width = video.videoWidth || 640;
    const height = video.videoHeight || 640;

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Flip horizontally for intuitive selfie mirror effect
    ctx.translate(width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, width, height);

    const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
    stopCameraStream();
    setSelectedPhoto(dataUrl);
    setStep("preview");
  };

  // Save confirmed photo
  const handleConfirmSave = async () => {
    if (!selectedPhoto) return;
    setIsSaving(true);
    try {
      await onSave(selectedPhoto);
      handleClose();
    } catch (err) {
      console.error("[ProfilePhotoModal] Save error:", err);
    } finally {
      setIsSaving(false);
    }
  };

  // Remove photo
  const handleConfirmRemove = async () => {
    if (!onRemove) return;
    setIsRemoving(true);
    try {
      await onRemove();
      handleClose();
    } catch (err) {
      console.error("[ProfilePhotoModal] Remove error:", err);
    } finally {
      setIsRemoving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-md animate-in fade-in duration-200">
      {/* Hidden file input for device gallery */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleFileSelect}
      />

      <div className="w-full max-w-md p-6 rounded-3xl bg-card border border-border shadow-2xl space-y-5 relative overflow-hidden text-center">
        {/* Top Header */}
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div className="flex items-center gap-2 text-left">
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <Camera className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-foreground font-display">
                Profile Photo
              </h3>
              <p className="text-[11px] text-muted-foreground font-medium">
                Verified real photo for your Payent account
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleClose}
            className="h-8 w-8 rounded-full bg-secondary hover:bg-secondary/80 flex items-center justify-center text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* STEP 1: Select Mode (Selfie vs Gallery vs Remove) */}
        {step === "select" && (
          <div className="space-y-5 py-2">
            <div className="flex flex-col items-center justify-center gap-3">
              <ProfilePhoto
                src={currentPhotoUrl}
                size="xl"
                shape="circle"
                alt="Current profile photo"
                className="ring-4 ring-primary/20 shadow-lg"
              />
              <span className="text-xs text-muted-foreground font-medium">
                {currentPhotoUrl ? "Current Profile Picture" : "No Profile Photo Uploaded"}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setStep("camera");
                  startCameraStream();
                }}
                className="flex flex-col items-center justify-center gap-2 p-4 rounded-2xl border border-border bg-secondary/50 hover:bg-secondary hover:border-primary/50 text-foreground transition-all cursor-pointer group"
              >
                <div className="p-3 rounded-full bg-primary/10 text-primary group-hover:scale-110 transition-transform">
                  <Camera className="h-6 w-6" />
                </div>
                <div className="text-center">
                  <span className="text-xs font-bold block">Take Selfie</span>
                  <span className="text-[10px] text-muted-foreground">Use front camera</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex flex-col items-center justify-center gap-2 p-4 rounded-2xl border border-border bg-secondary/50 hover:bg-secondary hover:border-primary/50 text-foreground transition-all cursor-pointer group"
              >
                <div className="p-3 rounded-full bg-primary/10 text-primary group-hover:scale-110 transition-transform">
                  <Upload className="h-6 w-6" />
                </div>
                <div className="text-center">
                  <span className="text-xs font-bold block">Choose from Gallery</span>
                  <span className="text-[10px] text-muted-foreground">Upload from device</span>
                </div>
              </button>
            </div>

            {/* Remove photo option if user currently has one */}
            {Boolean(currentPhotoUrl) && canRemove && onRemove && (
              <div className="pt-2 border-t border-border/80">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleConfirmRemove}
                  loading={isRemoving}
                  disabled={isRemoving}
                  className="w-full text-xs font-bold text-destructive hover:bg-destructive/10 border-destructive/30 py-2.5 rounded-xl cursor-pointer flex items-center justify-center gap-2"
                >
                  <Trash2 className="h-4 w-4" />
                  <span>Remove Profile Photo</span>
                </Button>
              </div>
            )}
          </div>
        )}

        {/* STEP 2: Live Camera Viewport */}
        {step === "camera" && (
          <div className="space-y-4">
            <div className="relative aspect-square w-full max-w-xs mx-auto rounded-full bg-black overflow-hidden border-4 border-primary/30 shadow-inner grid place-items-center">
              {cameraError ? (
                <div className="p-4 text-center space-y-2 text-destructive">
                  <AlertCircle className="h-10 w-10 mx-auto opacity-80" />
                  <p className="text-xs font-semibold">{cameraError}</p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={startCameraStream}
                    className="mt-2 text-xs font-bold"
                  >
                    Retry Camera
                  </Button>
                </div>
              ) : (
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover -scale-x-100"
                />
              )}

              {/* Target Face Guide Oval */}
              {!cameraError && (
                <div className="absolute inset-4 border-2 border-dashed border-white/40 rounded-full pointer-events-none flex items-center justify-center">
                  <div className="h-28 w-28 rounded-full border border-white/20" />
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  stopCameraStream();
                  setStep("select");
                }}
                className="font-bold text-xs py-3 rounded-xl cursor-pointer"
              >
                <X className="h-4 w-4 mr-1.5" />
                <span>Cancel</span>
              </Button>

              <Button
                type="button"
                onClick={handleCaptureSelfie}
                disabled={isStartingCamera || !!cameraError}
                className="font-extrabold text-xs py-3 rounded-xl bg-primary text-primary-foreground cursor-pointer shadow-md flex items-center justify-center gap-1.5"
              >
                <Camera className="h-4 w-4" />
                <span>Capture Selfie</span>
              </Button>
            </div>
          </div>
        )}

        {/* STEP 3: Preview & Confirm Save */}
        {step === "preview" && selectedPhoto && (
          <div className="space-y-4">
            <div className="relative aspect-square w-full max-w-xs mx-auto rounded-full bg-secondary overflow-hidden border-4 border-emerald-500/40 shadow-xl grid place-items-center">
              <img
                src={selectedPhoto}
                alt="Selected profile photo preview"
                className="w-full h-full object-cover"
              />
            </div>

            <p className="text-xs text-muted-foreground font-medium">
              Review your photo preview before saving.
            </p>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setSelectedPhoto(null);
                  setStep("select");
                }}
                disabled={isSaving}
                className="font-bold text-xs py-3 rounded-xl cursor-pointer flex items-center justify-center gap-1.5"
              >
                <RefreshCw className="h-4 w-4" />
                <span>Choose Different</span>
              </Button>

              <Button
                type="button"
                onClick={handleConfirmSave}
                loading={isSaving}
                disabled={isSaving}
                className="font-extrabold text-xs py-3 rounded-xl bg-primary text-primary-foreground cursor-pointer shadow-lg flex items-center justify-center gap-1.5"
              >
                <Check className="h-4 w-4" />
                <span>Save Photo</span>
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default ProfilePhotoModal;
