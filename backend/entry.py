"""
Cloudflare Python Workers ASGI Bridge for Payent FastAPI Application.
Exposes on_fetch handler for workerd / Cloudflare Python Workers runtime.
"""
import os
import sys
from urllib.parse import urlparse

# Ensure backend root and vendor dependencies are on Python path
base_dir = os.path.dirname(os.path.abspath(__file__))
vendor_dir = os.path.join(base_dir, "vendor")
if vendor_dir not in sys.path:
    sys.path.insert(0, vendor_dir)
if base_dir not in sys.path:
    sys.path.insert(0, base_dir)

from main import app

try:
    from workers import Response
except ImportError:
    # Local fallback dummy Response
    class Response:
        def __init__(self, body=None, status=200, headers=None):
            self.body = body
            self.status = status
            self.headers = headers or {}

async def on_fetch(request, env=None):
    """
    Standard Cloudflare Python Worker fetch handler.
    Converts Cloudflare Worker FetchEvent / Request into ASGI 3.0 scope and executes FastAPI.
    """
    # 1. Sync Cloudflare environment variables / secrets into os.environ
    if env is not None:
        try:
            for key in dir(env):
                if not key.startswith("_"):
                    val = getattr(env, key, None)
                    if isinstance(val, (str, int, float, bool)):
                        os.environ[str(key)] = str(val)
        except Exception:
            pass

    # 2. Extract request URL components
    url_str = str(request.url) if hasattr(request, "url") else "http://localhost/"
    parsed = urlparse(url_str)
    path = parsed.path or "/"
    query = parsed.query or ""

    # 3. Build ASGI 3.0 HTTP Scope
    headers = []
    if hasattr(request, "headers") and request.headers:
        try:
            for k, v in request.headers.items():
                headers.append((k.lower().encode("latin-1"), str(v).encode("latin-1")))
        except Exception:
            pass

    scope = {
        "type": "http",
        "asgi": {"version": "3.0", "spec_version": "2.3"},
        "http_version": "1.1",
        "method": getattr(request, "method", "GET").upper(),
        "scheme": parsed.scheme or "https",
        "path": path,
        "raw_path": path.encode("ascii", "ignore"),
        "query_string": query.encode("ascii", "ignore"),
        "headers": headers,
        "client": ("127.0.0.1", 0),
        "server": (parsed.hostname or "cloudflare.worker", parsed.port or 443),
    }

    # 4. Extract request body stream
    req_body = b""
    if hasattr(request, "bytes"):
        try:
            req_body = await request.bytes()
        except Exception:
            req_body = b""
    elif hasattr(request, "text"):
        try:
            text_val = await request.text()
            req_body = text_val.encode("utf-8")
        except Exception:
            req_body = b""

    body_sent = False

    async def receive():
        nonlocal body_sent
        if not body_sent:
            body_sent = True
            return {"type": "http.request", "body": req_body, "more_body": False}
        return {"type": "http.request", "body": b"", "more_body": False}

    response_status = 200
    response_headers = []
    response_body = []

    async def send(message):
        nonlocal response_status, response_headers, response_body
        if message["type"] == "http.response.start":
            response_status = message["status"]
            response_headers = message.get("headers", [])
        elif message["type"] == "http.response.body":
            response_body.append(message.get("body", b""))

    # 5. Execute FastAPI ASGI Application
    await app(scope, receive, send)

    # 6. Assemble Cloudflare Worker Response
    headers_dict = {}
    for k, v in response_headers:
        k_str = k.decode("latin-1") if isinstance(k, bytes) else str(k)
        v_str = v.decode("latin-1") if isinstance(v, bytes) else str(v)
        headers_dict[k_str] = v_str

    full_body = b"".join(response_body)
    return Response(full_body, status=response_status, headers=headers_dict)
