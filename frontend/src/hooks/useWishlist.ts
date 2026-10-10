import { useCallback, useEffect, useState } from "react";
import { STORAGE_KEYS, storage } from "@/utils/storage";
import { api } from "@/utils/api";

let _globalWishlistIds: string[] = [];
let _inFlightWishlistPromise: Promise<string[]> | null = null;
let _lastWishlistFetchTime = 0;
const _wishlistListeners = new Set<(ids: string[]) => void>();

function setGlobalWishlistIds(ids: string[]) {
  _globalWishlistIds = ids;
  _wishlistListeners.forEach((l) => l(ids));
}

async function fetchWishlistDeduplicated(token: string): Promise<string[]> {
  const now = Date.now();
  if (_inFlightWishlistPromise) {
    return _inFlightWishlistPromise;
  }
  if (_globalWishlistIds.length > 0 && now - _lastWishlistFetchTime < 15000) {
    return _globalWishlistIds;
  }

  _inFlightWishlistPromise = (async () => {
    try {
      const serverIds = await api.getWishlist(token);
      const res = Array.isArray(serverIds) ? serverIds : [];
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
  const [token, setToken] = useState<string | null>(null);
  const [ids, setIds] = useState<string[]>([]);

  useEffect(() => {
    const currentToken = storage.get<string | null>(STORAGE_KEYS.token, null);
    setToken(currentToken);
    setIds(_globalWishlistIds);
    _wishlistListeners.add(setIds);

    if (!currentToken) {
      setGlobalWishlistIds([]);
      return () => {
        _wishlistListeners.delete(setIds);
      };
    }

    fetchWishlistDeduplicated(currentToken);

    return () => {
      _wishlistListeners.delete(setIds);
    };
  }, []);

  const toggle = useCallback(
    (id: string) => {
      if (!token) return;
      // Optimistic state update
      const updated = ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id];
      setGlobalWishlistIds(updated);

      api
        .toggleWishlist(token, id)
        .then((data) => {
          if (Array.isArray(data?.wishlist)) {
            setGlobalWishlistIds(data.wishlist);
          }
        })
        .catch((err) => {
          console.error("Failed to toggle wishlist item on server:", err);
          fetchWishlistDeduplicated(token);
        });
    },
    [token, ids],
  );

  const has = useCallback((id: string) => ids.includes(id), [ids]);

  return { ids, wishlistCount: ids.length, toggle, has };
}

