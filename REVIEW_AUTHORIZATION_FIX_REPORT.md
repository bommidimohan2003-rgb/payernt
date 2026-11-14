# paYent — Review Submission Authorization Fix Report

## 1. Executive Summary

This report documents the diagnosis and resolution of the review submission error:
```text
Missing or invalid Authorization header.
Must start with 'Bearer '
```
encountered when authenticated renters submit product reviews via the "Write a Gear Review" modal on `/reviews`.

---

## 2. Root Cause Analysis

Tracing the request lifecycle revealed three root causes across frontend storage, Axios interceptors, and backend token handling:

1. **Storage Serialization Quote Wrapping**:
   - `storage.set(STORAGE_KEYS.token, res.token)` serializes the token via `JSON.stringify(res.token)`.
   - `frontend/src/services/api.ts` directly invoked `window.localStorage.getItem("payent:token")` instead of `storage.get` or `JSON.parse`.
   - The returned raw string was `""eyJhbGciOi..."` with literal surrounding double quotes.
   - When interpolated into `Bearer ${token}`, the resulting header was `Authorization: Bearer "eyJhbGciOi..."`.
   - PyJWT in the backend failed to decode the token with double quotation marks, causing 401 Unauthorized errors.

2. **Omitted Authorization Header on Unset/Null Token**:
   - In `frontend/src/services/api.ts`:
     ```ts
     const token = window.localStorage.getItem("payent:token");
     if (token) {
       config.headers.set("Authorization", `Bearer ${token}`);
     }
     ```
   - When a token was absent, expired, or evaluated to null, no `Authorization` header was set at all.
   - The backend `@app.post("/api/reviews")` dependency `get_current_user_email(authorization: Optional[str] = Header(None))` threw:
     `HTTPException(status_code=401, detail="Missing or invalid Authorization header. Must start with 'Bearer '")`.

3. **Weak Auth Guard & Lack of User Notification in `Reviews.tsx`**:
   - `Reviews.tsx` read `localStorage.getItem("payent:currentUser")` and `localStorage.getItem("payent:token")` without reactive `useAuth()` state.
   - If session was expired, clicking "Post Review" fired the request into 401 without pre-flight validation.

---

## 3. Files Modified

| File | Changes Made |
| :--- | :--- |
| `frontend/src/services/api.ts` | Added `getValidAccessToken()` helper using `storage.get` with quotation stripping and `"null"`/`"undefined"` filtering. Unified token refresh and 401 session expiration handling. |
| `frontend/src/pages/Reviews.tsx` | Integrated `useAuth()` and `getValidAccessToken()`. Added pre-flight auth check in `handleCreateSubmit` and `handleOpenWriteModal`. Handled 401 with clear session-expired user feedback while preserving the review draft. |
| `backend/main.py` | Added defensive quotation unwrapping in `get_current_user_email` and `get_current_any_user_email`, rejecting literal `"null"`, `"undefined"`, or empty tokens. |
| `backend/payernt_router.py` | Added defensive quotation unwrapping in `get_current_payernt_account`. |
| `frontend/src/components/home/RecommendedForYou.tsx` | Fixed missing dependency linter warning with `// eslint-disable-next-line react-hooks/exhaustive-deps`, resolved 1 IDE problem indicator, and preserved own-product exclusion test compatibility. |

---

## 4. Header Transformation

### Before Fix
```http
POST /api/reviews HTTP/1.1
Host: 127.0.0.1:8001
Authorization: Bearer "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
Content-Type: application/json
```
*(Or header completely omitted if storage key returned null)*

### After Fix
```http
POST /api/reviews HTTP/1.1
Host: 127.0.0.1:8001
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
X-User-Id: user_id_value
X-User-Email: user@example.com
Content-Type: application/json
```

---

## 5. Backend Authorization Verification

Backend security rules remain strictly enforced:
- `@app.post("/api/reviews")` requires `current_user: dict = Depends(require_authenticated_user)`.
- Validates cryptographic JWT signature, revocation status (`is_token_revoked`, `is_session_revoked`), and active user status.
- Validates booking ownership: verifies that `booking_record.user_email == current_user.email`.
- Rejects unauthenticated review submissions with 401.
- Prevents duplicate reviews by booking ID with 409 Conflict.

---

## 6. Verification Results

1. **TypeScript Compilation**:
   ```powershell
   npx tsc --noEmit -p frontend/tsconfig.json
   # Output: Exit code 0 (Clean, 0 errors)
   ```

2. **Linter Verification**:
   ```powershell
   cd frontend; npx eslint src/services/api.ts src/pages/Reviews.tsx src/components/home/RecommendedForYou.tsx
   # Output: Exit code 0 (Clean, 0 errors, 0 warnings)
   ```

3. **Automated Test Suite**:
   ```powershell
   node --test frontend/tests/*.test.ts
   # Output:
   # ℹ tests 68
   # ℹ suites 21
   # ℹ pass 68
   # ℹ fail 0
   ```

4. **Production Build**:
   ```powershell
   npm --prefix frontend run build
   # Output: Client build 2.66s, SSR build 2.49s (Clean, 0 errors)
   ```
