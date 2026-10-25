import "./lib/error-capture";

import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";

type ServerEntry = {
  fetch: (
    request: Request,
    env: unknown,
    ctx: unknown,
  ) => Promise<Response> | Response;
};

let serverEntryPromise: Promise<ServerEntry> | undefined;

async function getServerEntry(): Promise<ServerEntry> {
  if (process.env.NODE_ENV === "production") {
    if (!serverEntryPromise) {
      serverEntryPromise = import("@tanstack/react-start/server-entry").then(
        (m) => (m.default ?? m) as ServerEntry,
      );
    }
    return serverEntryPromise;
  }
  try {
    const m = await import("@tanstack/react-start/server-entry");
    return (m.default ?? m) as ServerEntry;
  } catch (err) {
    console.error("Failed to load server-entry:", err);
    throw err;
  }
}

// h3 swallows in-handler throws into a normal 500 Response with body
// {"unhandled":true,"message":"HTTPError"} — try/catch alone never fires for those.
async function normalizeCatastrophicSsrResponse(
  response: Response,
): Promise<Response> {
  if (response.status < 500) return response;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;

  const body = await response.clone().text();
  if (!isH3SwallowedErrorBody(body)) return response;

  console.error(
    consumeLastCapturedError() ?? new Error(`h3 swallowed SSR error: ${body}`),
  );
  return new Response(renderErrorPage(), {
    status: 500,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

function isH3SwallowedErrorBody(body: string): boolean {
  try {
    const payload = JSON.parse(body) as {
      unhandled?: unknown;
      message?: unknown;
    };
    return payload.unhandled === true && payload.message === "HTTPError";
  } catch {
    return false;
  }
}

export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    const url = new URL(request.url);

    // Proxy /api/* requests directly to the Railway backend
    if (url.pathname.startsWith("/api/")) {
      const backendBase =
        (env as Record<string, string>)?.VITE_API_URL ||
        (env as Record<string, string>)?.BACKEND_URL ||
        "https://payernt-production.up.railway.app";

      const targetUrl = new URL(url.pathname + url.search, backendBase);

      // Handle CORS preflight
      if (request.method === "OPTIONS") {
        return new Response(null, {
          status: 204,
          headers: {
            "Access-Control-Allow-Origin": request.headers.get("Origin") || "*",
            "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
            "Access-Control-Allow-Headers": request.headers.get("Access-Control-Request-Headers") || "*",
            "Access-Control-Allow-Credentials": "true",
            "Access-Control-Max-Age": "86400",
          },
        });
      }

      const proxyHeaders = new Headers(request.headers);
      proxyHeaders.set("Host", targetUrl.host);
      const clientIp = request.headers.get("cf-connecting-ip") || request.headers.get("x-forwarded-for");
      if (clientIp) {
        proxyHeaders.set("X-Forwarded-For", clientIp);
      }
      proxyHeaders.set("X-Forwarded-Proto", url.protocol.replace(":", ""));

      try {
        const fetchInit: RequestInit & { duplex?: string } = {
          method: request.method,
          headers: proxyHeaders,
          redirect: "follow",
        };

        if (request.method !== "GET" && request.method !== "HEAD") {
          fetchInit.body = request.body;
          fetchInit.duplex = "half";
        }

        const backendResponse = await fetch(targetUrl.toString(), fetchInit);

        const resHeaders = new Headers(backendResponse.headers);
        const origin = request.headers.get("Origin");
        if (origin) {
          resHeaders.set("Access-Control-Allow-Origin", origin);
          resHeaders.set("Access-Control-Allow-Credentials", "true");
        }

        return new Response(backendResponse.body, {
          status: backendResponse.status,
          statusText: backendResponse.statusText,
          headers: resHeaders,
        });
      } catch (err: any) {
        console.error("Cloudflare Worker /api proxy error:", err);
        return new Response(
          JSON.stringify({
            error: "Gateway Proxy Error",
            detail: err?.message || String(err),
          }),
          {
            status: 502,
            headers: { "Content-Type": "application/json" },
          }
        );
      }
    }

    try {
      const handler = await getServerEntry();
      const response = await handler.fetch(request, env, ctx);
      return await normalizeCatastrophicSsrResponse(response);
    } catch (error) {
      console.error(error);
      return new Response(renderErrorPage(), {
        status: 500,
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }
  },
};
