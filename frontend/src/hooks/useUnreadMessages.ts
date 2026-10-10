import { useCallback, useEffect, useState } from "react";
import { STORAGE_KEYS, storage } from "@/utils/storage";
import { api } from "@/utils/api";

let _globalUnreadCount = 0;
let _lastUnreadFetchTime = 0;
let _inFlightUnreadPromise: Promise<number> | null = null;
let _activeInterval: ReturnType<typeof setInterval> | null = null;
const _unreadListeners = new Set<(count: number) => void>();

function setGlobalUnreadCount(count: number) {
  _globalUnreadCount = count;
  _unreadListeners.forEach((l) => l(count));
}

async function triggerUnreadFetch(token: string | null): Promise<number> {
  if (!token) {
    setGlobalUnreadCount(0);
    return 0;
  }
  const now = Date.now();
  if (_inFlightUnreadPromise) {
    return _inFlightUnreadPromise;
  }
  if (now - _lastUnreadFetchTime < 15000) {
    return _globalUnreadCount;
  }

  _inFlightUnreadPromise = (async () => {
    try {
      const res = await api.getUnreadMessagesCount(token);
      const count = typeof res?.unreadCount === "number" ? res.unreadCount : (typeof res === "number" ? res : 0);
      setGlobalUnreadCount(count);
      _lastUnreadFetchTime = Date.now();
      return count;
    } catch {
      return _globalUnreadCount;
    } finally {
      _inFlightUnreadPromise = null;
    }
  })();

  return _inFlightUnreadPromise;
}

function ensureGlobalPolling(token: string | null) {
  if (_unreadListeners.size > 0 && !_activeInterval && token) {
    _activeInterval = setInterval(() => {
      const currentToken = storage.get<string | null>(STORAGE_KEYS.token, null);
      if (document.visibilityState === "visible") {
        triggerUnreadFetch(currentToken);
      }
    }, 60000);
  } else if ((_unreadListeners.size === 0 || !token) && _activeInterval) {
    clearInterval(_activeInterval);
    _activeInterval = null;
  }
}

export function useUnreadMessages() {
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [token, setToken] = useState<string | null>(null);

  const fetchUnread = useCallback(() => {
    return triggerUnreadFetch(token);
  }, [token]);

  useEffect(() => {
    const currentToken = storage.get<string | null>(STORAGE_KEYS.token, null);
    setToken(currentToken);
    setUnreadCount(_globalUnreadCount);
    _unreadListeners.add(setUnreadCount);
    triggerUnreadFetch(currentToken);
    ensureGlobalPolling(currentToken);

    const handleCustomUpdate = () => {
      _lastUnreadFetchTime = 0; // force fresh fetch
      triggerUnreadFetch(storage.get<string | null>(STORAGE_KEYS.token, null));
    };

    const handleFocus = () => {
      if (Date.now() - _lastUnreadFetchTime > 15000) {
        triggerUnreadFetch(storage.get<string | null>(STORAGE_KEYS.token, null));
      }
    };

    window.addEventListener("payent:unread-messages-updated", handleCustomUpdate);
    window.addEventListener("focus", handleFocus);

    return () => {
      _unreadListeners.delete(setUnreadCount);
      ensureGlobalPolling(currentToken);
      window.removeEventListener("payent:unread-messages-updated", handleCustomUpdate);
      window.removeEventListener("focus", handleFocus);
    };
  }, []);

  return { unreadCount, refreshUnreadCount: fetchUnread };
}
