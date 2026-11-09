import { useCallback, useEffect, useState } from "react";
import { STORAGE_KEYS, storage } from "@/utils/storage";
import { api } from "@/utils/api";

let _globalWishlistIds: string[] = [];
let _inFlightWishlistPromise: Promise<string[]> | null = null;
let _lastWishlistFetchTime = 0;
const _pendingToggleIds = new Set<string>();
const _wishlistListeners = new Set<(ids: string[]) => void>();

function normalizeWishlistIds(ids: unknown): string[] {
  if (!Array.isArray(ids)) return [];
  const unique: string[] = [];
  const seen = new Set<string>();
  for (const item of ids) {
    if (item === null || item === undefined) continue;
    const str = String(item).trim();
    if (!str || seen.has(str)) continue;
    seen.add(str);
    unique.push(str);
  }
  return unique;
}

function setGlobalWishlistIds(ids: string[]) {
  const normalized = normalizeWishlistIds(ids);
  _globalWishlistIds = normalized;
  _wishlistListeners.forEach((l) => l(normalized));
}

async function fetchWishlistDeduplicated(token: string, force = false): Promise<string[]> {
  const now = Date.now();
  if (_inFlightWishlistPromise && !force) {
    return _inFlightWishlistPromise;
  }
  if (!force && _globalWishlistIds.length > 0 && now - _lastWishlistFetchTime < 15000) {
    return _globalWishlistIds;
  }

  if (force) {
    api.invalidateCache("user_wishlist");
  }

  _inFlightWishlistPromise = (async () => {
    try {
      const serverIds = await api.getWishlist(token);
      const res = normalizeWishlistIds(serverIds);
      setGlobalWishlistIds(res);
      _lastWishlistFetchTime = Date.now();
      return res;
    } catch (err) {
      console.warn("Failed to load backend wishlist:", err);
      return _globalWishlistIds;
    } finally {
      _inFlightWishlistPromise = null;
    }
  })();

  return _inFlightWishlistPromise;
}

export function useWishlist() {
  const [token, setToken] = useState<string | null>(() =>
    storage.get<string | null>(STORAGE_KEYS.token, null)
  );
  const [ids, setIds] = useState<string[]>(() => _globalWishlistIds);

  useEffect(() => {
    setIds(_globalWishlistIds);
    _wishlistListeners.add(setIds);

    const syncAuthAndFetch = (forceFetch = false) => {
      const currentToken = storage.get<string | null>(STORAGE_KEYS.token, null);
      setToken(currentToken);

      if (!currentToken) {
        _lastWishlistFetchTime = 0;
        setGlobalWishlistIds([]);
        return;
      }

      const pathname = typeof window !== "undefined" ? window.location.pathname : "";
      const isGatewayOrAuth =
        pathname === "/" ||
        pathname === "/select" ||
        pathname === "/login" ||
        pathname === "/register" ||
        pathname === "/otp" ||
        pathname.startsWith("/account-pending") ||
        pathname.startsWith("/payernt") ||
        pathname.startsWith("/paye₹nt");

      if (!isGatewayOrAuth) {
        void fetchWishlistDeduplicated(currentToken, forceFetch);
      }
    };

    syncAuthAndFetch(false);

    const handleStorageUpdate = () => {
      syncAuthAndFetch(true);
    };

    if (typeof window !== "undefined") {
      window.addEventListener("storage", handleStorageUpdate);
      window.addEventListener("payent:storage_change", handleStorageUpdate);
    }

    return () => {
      _wishlistListeners.delete(setIds);
      if (typeof window !== "undefined") {
        window.removeEventListener("storage", handleStorageUpdate);
        window.removeEventListener("payent:storage_change", handleStorageUpdate);
      }
    };
  }, []);

  const toggle = useCallback(
    async (id: string): Promise<boolean> => {
      const targetId = typeof id === "string" ? id.trim() : String((id as unknown as { id?: string })?.id ?? "").trim();
      if (!targetId) return false;

      const activeToken = storage.get<string | null>(STORAGE_KEYS.token, null) || token;
      if (!activeToken) return false;

      if (_pendingToggleIds.has(targetId)) {
        return true;
      }

      const wasWishlisted = _globalWishlistIds.includes(targetId);
      const nextIds = wasWishlisted
        ? _globalWishlistIds.filter((x) => x !== targetId)
        : [..._globalWishlistIds, targetId];

      _pendingToggleIds.add(targetId);
      setGlobalWishlistIds(nextIds);
      _lastWishlistFetchTime = Date.now();

      try {
        const data = await api.toggleWishlist(activeToken, targetId);
        if (Array.isArray(data?.wishlist)) {
          setGlobalWishlistIds(data.wishlist);
        }
        return true;
      } catch (err) {
        console.error("Failed to toggle wishlist item on server:", err);
        const revertedIds = wasWishlisted
          ? [..._globalWishlistIds.filter((x) => x !== targetId), targetId]
          : _globalWishlistIds.filter((x) => x !== targetId);
        setGlobalWishlistIds(revertedIds);
        return false;
      } finally {
        _pendingToggleIds.delete(targetId);
      }
    },
    [token],
  );

  const has = useCallback(
    (id: string) => {
      const targetId = String(id ?? "").trim();
      return targetId ? ids.includes(targetId) : false;
    },
    [ids],
  );

  return { ids, wishlistCount: ids.length, toggle, has };
}

