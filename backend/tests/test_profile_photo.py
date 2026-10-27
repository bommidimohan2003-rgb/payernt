import os
import unittest
import json
import base64
import io
from PIL import Image
from fastapi.testclient import TestClient

os.environ["FASTAPI_ENV"] = "testing"
os.environ["PAYENT_ENABLE_TESTING_ENDPOINTS"] = "true"
os.environ["JWT_SECRET_KEY"] = "test-jwt-secret-key-1234567890"

from main import app
from auth import create_access_token
from database import init_db, execute_query, MOCK_USERS

def create_test_image_data_uri(format_name: str = "JPEG", size=(100, 100), color=(50, 120, 200)) -> str:
    img = Image.new("RGB", size, color=color)
    buf = io.BytesIO()
    img.save(buf, format=format_name)
    raw_bytes = buf.getvalue()
    b64 = base64.b64encode(raw_bytes).decode("utf-8")
    mime = "image/jpeg" if format_name.upper() == "JPEG" else ("image/png" if format_name.upper() == "PNG" else "image/webp")
    return f"data:{mime};base64,{b64}"

class TestProfilePhotoSystem(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        try:
            init_db()
        except Exception as e:
            print(f"init_db notice: {e}")

    def setUp(self):
        self.client = TestClient(app)
        self.test_email = "photo_test_user@payent.com"
        self.token = create_access_token({"sub": self.test_email, "email": self.test_email, "role": "customer"})
        self.headers = {"Authorization": f"Bearer {self.token}"}

        # Seed mock user record
        MOCK_USERS[self.test_email] = {
            "email": self.test_email,
            "full_name": "Photo Test User",
            "role": "customer",
            "status": "active",
            "verified": True,
            "profile_photo_url": None,
            "avatar": None,
            "profile_photo_public_id": None
        }

    def test_01_upload_valid_jpeg_profile_photo(self):
        jpeg_uri = create_test_image_data_uri("JPEG")
        res = self.client.post("/api/users/profile/photo", json={"profilePhotoUrl": jpeg_uri}, headers=self.headers)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertTrue(data.get("success"))
        # Verify Cloudinary URL returned instead of base64
        photo_url = data["user"]["profilePhotoUrl"]
        self.assertTrue(photo_url.startswith("http://") or photo_url.startswith("https://"))
        self.assertFalse(photo_url.startswith("data:image/"))
        self.assertEqual(data["user"]["avatar"], photo_url)
        self.assertTrue(data.get("public_id"))

    def test_02_upload_valid_png_profile_photo(self):
        png_uri = create_test_image_data_uri("PNG")
        res = self.client.post("/api/profile/photo", json={"profile_photo_url": png_uri}, headers=self.headers)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertTrue(data.get("success"))
        photo_url = data["user"]["profilePhotoUrl"]
        self.assertTrue(photo_url.startswith("http://") or photo_url.startswith("https://"))

    def test_03_upload_valid_webp_profile_photo(self):
        webp_uri = create_test_image_data_uri("WEBP")
        res = self.client.patch("/api/profile/photo", json={"avatar": webp_uri}, headers=self.headers)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertTrue(data.get("success"))
        photo_url = data["user"]["profilePhotoUrl"]
        self.assertTrue(photo_url.startswith("http://") or photo_url.startswith("https://"))

    def test_04_reject_generated_avatar_services(self):
        fake_urls = [
            "https://ui-avatars.com/api/?name=John+Doe&background=0D151D&color=fff",
            "https://api.dicebear.com/7.x/avataaars/svg?seed=Felix",
            "https://i.pravatar.cc/300"
        ]
        for url in fake_urls:
            res = self.client.post("/api/users/profile/photo", json={"profilePhotoUrl": url}, headers=self.headers)
            self.assertEqual(res.status_code, 400)
            self.assertIn("Generated avatars are not allowed", res.json().get("detail", ""))

    def test_05_reject_corrupt_or_unsupported_image(self):
        # 1. Invalid mime type
        invalid_mime = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7"
        res = self.client.post("/api/users/profile/photo", json={"profilePhotoUrl": invalid_mime}, headers=self.headers)
        self.assertEqual(res.status_code, 400)

        # 2. Corrupt base64 payload
        corrupt_uri = "data:image/jpeg;base64,not_a_valid_base64_image_content!!!"
        res = self.client.post("/api/users/profile/photo", json={"profilePhotoUrl": corrupt_uri}, headers=self.headers)
        self.assertEqual(res.status_code, 400)

    def test_06_delete_profile_photo_resets_to_neutral(self):
        # First upload a valid photo
        jpeg_uri = create_test_image_data_uri("JPEG")
        self.client.post("/api/users/profile/photo", json={"profilePhotoUrl": jpeg_uri}, headers=self.headers)

        # Now remove photo via DELETE /api/users/profile/photo
        res = self.client.delete("/api/users/profile/photo", headers=self.headers)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertTrue(data.get("success"))
        self.assertIsNone(data["user"]["profilePhotoUrl"])
        self.assertIsNone(data["user"]["avatar"])

        # Also verify DELETE /api/profile/photo works symmetrically
        res2 = self.client.delete("/api/profile/photo", headers=self.headers)
        self.assertEqual(res2.status_code, 200)

    def test_07_unauthenticated_request_rejected(self):
        jpeg_uri = create_test_image_data_uri("JPEG")
        res_post = self.client.post("/api/users/profile/photo", json={"profilePhotoUrl": jpeg_uri})
        self.assertEqual(res_post.status_code, 401)

        res_del = self.client.delete("/api/users/profile/photo")
        self.assertEqual(res_del.status_code, 401)

    def test_08_cross_user_photo_isolation(self):
        # User A uploads a photo
        user_a_email = "user_a@payent.com"
        user_b_email = "user_b@payent.com"
        token_a = create_access_token({"sub": user_a_email, "email": user_a_email, "role": "customer"})
        token_b = create_access_token({"sub": user_b_email, "email": user_b_email, "role": "customer"})

        MOCK_USERS[user_a_email] = {"email": user_a_email, "full_name": "User A", "avatar": None, "profile_photo_url": None, "profile_photo_public_id": None}
        MOCK_USERS[user_b_email] = {"email": user_b_email, "full_name": "User B", "avatar": None, "profile_photo_url": None, "profile_photo_public_id": None}

        photo_a = create_test_image_data_uri("JPEG", color=(10, 20, 30))
        res_a = self.client.post("/api/users/profile/photo", json={"profilePhotoUrl": photo_a}, headers={"Authorization": f"Bearer {token_a}"})
        self.assertEqual(res_a.status_code, 200)
        url_a = res_a.json()["user"]["profilePhotoUrl"]

        # Verify User B has NOT been affected
        self.assertIsNone(MOCK_USERS[user_b_email].get("profile_photo_url"))
        self.assertIsNone(MOCK_USERS[user_b_email].get("avatar"))

        # User B removing photo does not remove User A's photo
        res_del_b = self.client.delete("/api/users/profile/photo", headers={"Authorization": f"Bearer {token_b}"})
        self.assertEqual(res_del_b.status_code, 200)
        self.assertEqual(MOCK_USERS[user_a_email]["profile_photo_url"], url_a)

    def test_09_google_user_sync_photo_mapping(self):
        from database import save_google_user
        google_pic = "https://lh3.googleusercontent.com/a/ACg8ocL_real_google_user_photo_123=s96-c"
        sync_res = save_google_user(
            email="google_user@gmail.com",
            full_name="Google Verified User",
            avatar=google_pic
        )
        self.assertEqual(sync_res["profile_photo_url"], google_pic)
        self.assertEqual(sync_res["avatar"], google_pic)
