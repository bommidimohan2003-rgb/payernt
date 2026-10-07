/**
 * Cloudinary Media Upload Utility
 * Handles direct, secure client-side uploads of inspection videos and product photos
 * using Unsigned Upload Presets to Cloudinary CDN.
 */

const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || "dvyendk6j";
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || "payernt_uploads";

export interface CloudinaryUploadResponse {
  url: string;
  secure_url: string;
  public_id: string;
  format?: string;
  resource_type?: string;
  duration?: number;
  bytes?: number;
  width?: number;
  height?: number;
  thumbnail_url?: string;
}

/**
 * Uploads a file (File, Blob, or Data URI) to Cloudinary.
 * 
 * @param file File object, Blob, or base64 Data URL
 * @param resourceType "video" | "image" | "auto" (default: "auto")
 * @param onProgress Optional progress callback (0 - 100)
 */
export async function uploadToCloudinary(
  file: File | Blob | string,
  resourceType: "video" | "image" | "auto" = "auto",
  onProgress?: (percent: number) => void
): Promise<CloudinaryUploadResponse> {
  const endpoint = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/${resourceType}/upload`;

  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", UPLOAD_PRESET);

  if (onProgress) {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("POST", endpoint);

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const percent = Math.round((event.loaded / event.total) * 100);
          onProgress(percent);
        }
      };

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const data: CloudinaryUploadResponse = JSON.parse(xhr.responseText);
            resolve(data);
          } catch (e) {
            reject(new Error("Failed to parse Cloudinary response."));
          }
        } else {
          try {
            const errData = JSON.parse(xhr.responseText);
            reject(new Error(errData.error?.message || `Upload failed with status ${xhr.status}`));
          } catch {
            reject(new Error(`Upload failed with status ${xhr.status}`));
          }
        }
      };

      xhr.onerror = () => reject(new Error("Network error while uploading media to Cloudinary."));
      xhr.send(formData);
    });
  }

  const response = await fetch(endpoint, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    let errorMsg = `Upload failed with status ${response.status}`;
    try {
      const errJson = await response.json();
      if (errJson.error?.message) {
        errorMsg = errJson.error.message;
      }
    } catch {
      // ignore
    }
    throw new Error(errorMsg);
  }

  return response.json();
}

/**
 * Uploads a video clip and returns the permanent CDN URL.
 */
export async function uploadVideoToCloudinary(
  file: File | Blob,
  onProgress?: (percent: number) => void
): Promise<string> {
  const result = await uploadToCloudinary(file, "video", onProgress);
  return result.secure_url;
}

/**
 * Uploads an image and returns the permanent CDN URL.
 */
export async function uploadImageToCloudinary(
  file: File | Blob | string,
  onProgress?: (percent: number) => void
): Promise<string> {
  const result = await uploadToCloudinary(file, "image", onProgress);
  return result.secure_url;
}
