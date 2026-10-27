import React from "react";
import { ProfilePhotoModal, ProfilePhotoModalProps } from "./ProfilePhotoModal";

export interface CameraPhotoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (photoDataUrl: string) => Promise<void> | void;
  currentPhotoUrl?: string | null;
  onRemove?: () => Promise<void> | void;
}

export function CameraPhotoModal({
  isOpen,
  onClose,
  onCapture,
  currentPhotoUrl,
  onRemove,
}: CameraPhotoModalProps) {
  return (
    <ProfilePhotoModal
      isOpen={isOpen}
      onClose={onClose}
      onSave={onCapture}
      currentPhotoUrl={currentPhotoUrl}
      onRemove={onRemove}
      canRemove={Boolean(currentPhotoUrl && onRemove)}
    />
  );
}

export { ProfilePhotoModal };
export default CameraPhotoModal;
