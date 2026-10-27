"""
Payent Backend Cloudinary Service
Reusable server-side image upload and asset lifecycle management for user profile photos.
Supports both authenticated Cloudinary SDK and unsigned server-side preset fallbacks.
"""

import os
import time
import logging
from typing import Dict, Any, Optional
import httpx

from config import (
    CLOUDINARY_CLOUD_NAME,
    CLOUDINARY_API_KEY,
    CLOUDINARY_API_SECRET,
    CLOUDINARY_URL,
    CLOUDINARY_UPLOAD_PRESET,
)

logger = logging.getLogger("payent.cloudinary")

# Configure cloudinary SDK if credentials exist
_has_sdk_credentials = False
try:
    import cloudinary
    import cloudinary.uploader
    if CLOUDINARY_URL:
        cloudinary.config(cloudinary_url=CLOUDINARY_URL)
        _has_sdk_credentials = True
    elif CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET and CLOUDINARY_CLOUD_NAME:
        cloudinary.config(
            cloud_name=CLOUDINARY_CLOUD_NAME,
            api_key=CLOUDINARY_API_KEY,
            api_secret=CLOUDINARY_API_SECRET,
            secure=True,
        )
        _has_sdk_credentials = True
except Exception as e:
    logger.warning("Cloudinary SDK configuration notice: %s", e)
    _has_sdk_credentials = False


def upload_profile_photo_to_cloudinary(
    data_uri: str,
    user_id_or_hash: str,
    folder: str = "payent/profile_photos",
    timeout_seconds: float = 12.0
) -> Dict[str, Any]:
    """
    Uploads a verified base64 profile photo to Cloudinary CDN using server-side credentials.
    Falls back gracefully to the verified server-side preset ('payernt_uploads.') if API secrets are unset.

    Returns dict containing:
      - secure_url: The permanent HTTPS CDN URL
      - public_id: The Cloudinary public ID for future lifecycle operations
      - format: Image format (jpg, png, webp)
      - upload_duration_ms: Float milliseconds spent in WAN upload
    """
    start_time = time.perf_counter()
    cloud_name = CLOUDINARY_CLOUD_NAME or "dvyendk6j"
    preset = CLOUDINARY_UPLOAD_PRESET or "payernt_uploads."

    # Strategy 1: Cloudinary Python SDK with API Key/Secret if available
    if _has_sdk_credentials:
        try:
            resp = cloudinary.uploader.upload(
                data_uri,
                folder=folder,
                resource_type="image",
                overwrite=True,
                transformation=[
                    {"width": 800, "height": 800, "crop": "limit"},
                    {"quality": "auto:good"},
                    {"fetch_format": "auto"}
                ]
            )
            duration_ms = (time.perf_counter() - start_time) * 1000.0
            return {
                "secure_url": resp.get("secure_url") or resp.get("url"),
                "public_id": resp.get("public_id"),
                "format": resp.get("format"),
                "bytes": resp.get("bytes", 0),
                "upload_duration_ms": round(duration_ms, 2)
            }
        except Exception as sdk_err:
            logger.warning("Cloudinary SDK upload failed, attempting preset fallback: %s", sdk_err)

    # Strategy 2: Server-side REST API with verified preset
    endpoint = f"https://api.cloudinary.com/v1_1/{cloud_name}/image/upload"
    payload = {
        "file": data_uri,
        "upload_preset": preset,
        "folder": folder,
    }

    try:
        with httpx.Client(timeout=timeout_seconds) as client:
            res = client.post(endpoint, data=payload)
        
        if res.status_code >= 200 and res.status_code < 300:
            data = res.json()
            duration_ms = (time.perf_counter() - start_time) * 1000.0
            secure_url = data.get("secure_url") or data.get("url")
            public_id = data.get("public_id")
            if not secure_url:
                raise RuntimeError("Cloudinary response missing secure_url.")
            return {
                "secure_url": secure_url,
                "public_id": public_id,
                "format": data.get("format"),
                "bytes": data.get("bytes", 0),
                "upload_duration_ms": round(duration_ms, 2)
            }
        else:
            err_json = res.json() if res.headers.get("content-type", "").startswith("application/json") else {}
            err_msg = err_json.get("error", {}).get("message") or f"Cloudinary HTTP {res.status_code}"
            raise RuntimeError(f"Cloudinary upload rejected: {err_msg}")
    except httpx.TimeoutException:
        raise TimeoutError("Cloudinary upload timed out.")
    except Exception as e:
        logger.error("Cloudinary upload failed: %s", e)
        raise


def delete_profile_photo_from_cloudinary(public_id: str, timeout_seconds: float = 6.0) -> bool:
    """
    Deletes an existing profile photo asset from Cloudinary by public ID.
    Returns True if deleted or successfully acknowledged.
    """
    if not public_id or not public_id.strip():
        return False

    clean_public_id = public_id.strip()

    # 1. Use SDK if server-side API Key/Secret is available
    if _has_sdk_credentials:
        try:
            resp = cloudinary.uploader.destroy(clean_public_id, resource_type="image")
            result = resp.get("result")
            logger.info("Cloudinary destroy for '%s': result=%s", clean_public_id, result)
            return result in ("ok", "not found")
        except Exception as e:
            logger.warning("Cloudinary SDK destroy notice for '%s': %s", clean_public_id, e)

    return False
