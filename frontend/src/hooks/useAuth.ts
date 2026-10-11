import { useCallback, useEffect, useState } from "react";
import { STORAGE_KEYS, storage } from "@/utils/storage";
import { api } from "@/utils/api";
import type { User } from "@/types";

let _inFlightAuthPromise: Promise<User | null> | null = null;
let _lastAuthFetchTime = 0;
const AUTH_TTL_MS = 15000;

async function fetchAuthProfile(token: string, cachedUser: User | null): Promise<User | null> {
  const now = Date.now();
  if (_inFlightAuthPromise) {
    return _inFlightAuthPromise;
  }
  if (cachedUser && now - _lastAuthFetchTime < AUTH_TTL_MS) {
    return cachedUser;
  }

  _inFlightAuthPromise = (async () => {
    try {
      const profile = await api.getMe(token);
      if (!profile) return cachedUser;
      const loggedUser: User = {
        id: profile.email || profile.id || cachedUser?.id || token,
        fullName:
          profile.fullName ||
          cachedUser?.fullName ||
          profile.email?.split("@")[0] ||
          "User",
        email: profile.email || cachedUser?.email || "",
        phone: profile.phone || cachedUser?.phone || "",
        address: profile.address || cachedUser?.address || "",
        city: profile.city || cachedUser?.city || "",
        state: profile.state || cachedUser?.state || "",
        country: profile.country || cachedUser?.country || "India",
        pincode: profile.pincode || cachedUser?.pincode || "",
        latitude: profile.latitude ?? cachedUser?.latitude ?? null,
        longitude: profile.longitude ?? cachedUser?.longitude ?? null,
        locationUpdatedAt: profile.locationUpdatedAt || cachedUser?.locationUpdatedAt || "",
        occupation: profile.occupation || cachedUser?.occupation || "",
        bio: profile.bio || cachedUser?.bio || "",
        avatar: profile.avatar || profile.profilePhotoUrl || profile.profile_photo_url || cachedUser?.avatar,
        profilePhotoUrl: profile.profilePhotoUrl || profile.profile_photo_url || cachedUser?.profilePhotoUrl || "",
        role: profile.role || cachedUser?.role || "customer",
        status: profile.status || cachedUser?.status || "active",
        panNumber: profile.panNumber || (profile as any)?.pan_number || cachedUser?.panNumber || "",
        panMasked: profile.panMasked || (profile as any)?.pan_masked || cachedUser?.panMasked || "",
        aadhaarMasked: profile.aadhaarMasked || profile.aadhaar_masked || cachedUser?.aadhaarMasked || "",
        website: profile.website || cachedUser?.website || "",
        upiId: profile.upiId || cachedUser?.upiId || "",
      };
      storage.set(STORAGE_KEYS.currentUser, loggedUser);
      _lastAuthFetchTime = Date.now();
      return loggedUser;
    } catch (err: unknown) {
      console.warn("[Auth] Session validation notice:", err);
      const errorObj = err as { status?: number; message?: string };
      const is401 =
        errorObj?.status === 401 ||
        (errorObj?.message &&
          (errorObj.message.includes("401") ||
            errorObj.message.includes("Invalid token") ||
            errorObj.message.includes("expired")));
      if (is401) {
        storage.remove(STORAGE_KEYS.token);
        storage.remove(STORAGE_KEYS.refreshToken);
        storage.remove(STORAGE_KEYS.currentUser);
        return null;
      }
      return cachedUser;
    } finally {
      _inFlightAuthPromise = null;
    }
  })();

  return _inFlightAuthPromise;
}

const ACTIVE_USER: User = {
  id: "user_active_current",
  fullName: "Mohan Bommidi",
  email: "mohan@payent.in",
  phone: "+91 9876543210",
  address: "HiTech City, Madhapur",
  city: "Hyderabad",
  state: "Telangana",
  country: "India",
  pincode: "500081",
  role: "customer",
  status: "active",
};

export function useAuth() {
  // Use null initial state so server render and first client render match identically
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const initAuth = async () => {
      const cachedUser = storage.get<User | null>(
        STORAGE_KEYS.currentUser,
        null,
      );
      const token = storage.get<string | null>(STORAGE_KEYS.token, null);

      if (isMounted) {
        setUser(cachedUser);
        setReady(true);
      }

      if (token && token !== "payent-active-session-token" && cachedUser) {
        const synced = await fetchAuthProfile(token, cachedUser);
        if (isMounted) {
          setUser(synced);
        }
      }
    };

    initAuth();

    const onStorage = () => {
      setUser(storage.get<User | null>(STORAGE_KEYS.currentUser, null));
    };

    const onSessionExpired = () => {
      setUser(null);
    };

    window.addEventListener("storage", onStorage);
    window.addEventListener("payent:storage_change", onStorage);
    window.addEventListener("payent-session-expired", onSessionExpired);
    return () => {
      isMounted = false;
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("payent:storage_change", onStorage);
      window.removeEventListener("payent-session-expired", onSessionExpired);
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    try {
      if (typeof window !== "undefined") {
        localStorage.removeItem("payent:signed_out");
      }
      const res = await api.login(email, password);
      if (res.success && res.token) {
        storage.set(STORAGE_KEYS.token, res.token);
        if (res.refreshToken) {
          storage.set(STORAGE_KEYS.refreshToken, res.refreshToken);
        }

        let loggedUser: User;
        if (res.user) {
          loggedUser = {
            id: res.user.email || res.user.id || email,
            accountId: res.user.accountId || `PAYRENT_USER_${Date.now()}`,
            accountType: "pay₹ent",
            fullName:
              res.user.fullName ||
              res.user.name ||
              email.split("@")[0],
            email: res.user.email || email,
            phone: res.user.phone || "",
            address: res.user.address || "",
            city: res.user.city || "",
            state: res.user.state || "",
            country: res.user.country || "India",
            pincode: res.user.pincode || "",
            panNumber: res.user.panNumber || "",
            panMasked: res.user.panMasked || (res.user.panNumber ? `XXXXX${res.user.panNumber.slice(5)}` : ""),
            avatar: res.user.avatar || res.user.profilePhotoUrl || res.user.profile_photo_url,
            profilePhotoUrl: res.user.profilePhotoUrl || res.user.profile_photo_url || "",
            role: res.user.role || res.role || "customer",
            status: res.user.status || "active",
            aadhaarMasked: res.user.aadhaarMasked || res.user.aadhaar_masked || "",
            website: res.user.website || "",
            upiId: res.user.upiId || "",
          };
        } else {
          try {
            const profile = await api.getMe(res.token);
            loggedUser = {
              id: profile?.email || email,
              accountId: (profile as any)?.accountId || `PAYRENT_USER_${Date.now()}`,
              accountType: "pay₹ent",
              fullName:
                profile?.fullName ||
                (profile as any)?.name ||
                email.split("@")[0],
              email: profile?.email || email,
              phone: profile?.phone || "",
              address: profile?.address || "",
              city: profile?.city || "",
              state: profile?.state || "",
              country: profile?.country || "India",
              pincode: profile?.pincode || "",
              panNumber: (profile as any)?.panNumber || "",
              panMasked: (profile as any)?.panMasked || "",
              avatar: profile?.avatar || profile?.profilePhotoUrl || profile?.profile_photo_url,
              profilePhotoUrl: profile?.profilePhotoUrl || profile?.profile_photo_url || "",
              role: profile?.role || res.role || "customer",
              status: profile?.status || "active",
              aadhaarMasked: profile?.aadhaarMasked || profile?.aadhaar_masked || "",
              website: profile?.website || "",
              upiId: profile?.upiId || "",
            };
          } catch {
            loggedUser = {
              id: email,
              accountId: `PAYRENT_USER_${Date.now()}`,
              accountType: "pay₹ent",
              fullName: email.split("@")[0],
              email: email,
              role: res.role || "customer",
              status: "active",
            };
          }
        }

        // 1. Enforce single active user-side session: Invalidate Payernt state on client
        if (typeof window !== "undefined") {
          localStorage.removeItem("paye₹nt_token");
          localStorage.removeItem("payernt_token");
          localStorage.removeItem("paye₹nt_account");
          localStorage.removeItem("payernt_account");
          localStorage.removeItem("paye₹nt_session");
          localStorage.removeItem("payernt_session");
          localStorage.removeItem("paye₹nt_active_user");
          localStorage.removeItem("payernt_active_user");
          window.dispatchEvent(new CustomEvent("paye₹nt_auth_change", { detail: null }));
        }

        storage.set(STORAGE_KEYS.currentUser, loggedUser);
        if (typeof window !== "undefined") {
          localStorage.setItem(
            "pay₹ent_session",
            JSON.stringify({
              accountId: loggedUser.accountId,
              accountType: "pay₹ent",
              email: loggedUser.email,
              name: loggedUser.fullName,
              loggedInAt: new Date().toISOString(),
            })
          );
          localStorage.setItem("pay₹ent_account", JSON.stringify(loggedUser));
        }
        if ((loggedUser.role === "admin" || (loggedUser as any).role === "superadmin") && typeof window !== "undefined") {
          localStorage.setItem("payent:admin:token", res.token);
          localStorage.setItem("payent:admin:current_user", JSON.stringify(loggedUser));
          window.dispatchEvent(new Event("payent:admin:profile-updated"));
        }
        setUser(loggedUser);
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("payent:storage_change"));
        }
        return { ok: true };
      }
      return { ok: false, error: "Invalid credentials from server." };
    } catch (e) {
      const err = e as { name?: string; message?: string };
      if (
        err?.name === "AbortError" ||
        err?.message?.includes("aborted") ||
        err?.message?.includes("signal is aborted")
      ) {
        return { ok: false, error: "Connection timed out. Please try logging in again." };
      }
      return { ok: false, error: err.message || "Invalid email or password." };
    }
  }, []);

  const register = useCallback(async (email: string, phone: string) => {
    try {
      await api.registerRequest(email, phone);
      return { ok: true };
    } catch (e) {
      const err = e as { message?: string };
      return {
        ok: false,
        error: err.message || "Failed to initiate registration.",
      };
    }
  }, []);

  const logout = useCallback(async () => {
    const token = storage.get<string | null>(STORAGE_KEYS.token, null);
    if (token) {
      await api.logout(token).catch(() => {});
    }
    _lastAuthFetchTime = 0;
    _inFlightAuthPromise = null;
    storage.remove(STORAGE_KEYS.currentUser);
    storage.remove(STORAGE_KEYS.token);
    storage.remove(STORAGE_KEYS.refreshToken);
    setUser(null);
    if (typeof window !== "undefined") {
      localStorage.setItem("payent:signed_out", "true");
      localStorage.removeItem("pay₹ent_session");
      localStorage.removeItem("pay₹ent_account");
      window.dispatchEvent(new CustomEvent("payent:storage_change"));
      window.location.href = "/";
    }
  }, []);

  const logoutAll = useCallback(async () => {
    const token = storage.get<string | null>(STORAGE_KEYS.token, null);
    if (token) {
      await api.logoutAll(token).catch(() => {});
    }
    _lastAuthFetchTime = 0;
    _inFlightAuthPromise = null;
    storage.remove(STORAGE_KEYS.currentUser);
    storage.remove(STORAGE_KEYS.token);
    storage.remove(STORAGE_KEYS.refreshToken);
    setUser(null);
    if (typeof window !== "undefined") {
      localStorage.setItem("payent:signed_out", "true");
      localStorage.removeItem("pay₹ent_session");
      localStorage.removeItem("pay₹ent_account");
      localStorage.removeItem("payent:admin:token");
      localStorage.removeItem("payent:admin:current_user");
      window.dispatchEvent(new Event("payent:admin:profile-updated"));
      window.dispatchEvent(new CustomEvent("payent:storage_change"));
      window.location.href = "/";
    }
  }, []);

  const getSessions = useCallback(async () => {
    const token = storage.get<string | null>(STORAGE_KEYS.token, null);
    if (!token) return [];
    return await api.getSessions(token);
  }, []);

  const revokeSession = useCallback(async (sessionId: string) => {
    const token = storage.get<string | null>(STORAGE_KEYS.token, null);
    if (!token) return;
    await api.revokeSession(token, sessionId);
  }, []);

  const updateUser = useCallback((patch: Partial<User>) => {
    setUser((prev) => {
      if (!prev) return prev;
      const merged = { ...prev, ...patch };
      storage.set(STORAGE_KEYS.currentUser, merged);
      return merged;
    });
  }, []);

  return { user, ready, login, register, logout, logoutAll, getSessions, revokeSession, updateUser };
}
