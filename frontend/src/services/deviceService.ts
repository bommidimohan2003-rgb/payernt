import { api } from "./api";

export interface RegisteredDevice {
  id: string;
  accountId: string;
  deviceId: string;
  deviceType: string;
  deviceName: string;
  brand: string;
  model: string;
  serialNumber: string;
  securityId: string;
  qrStatus: "ACTIVE" | "PENDING_VERIFICATION" | "SUSPENDED" | "TRANSFER_PENDING" | "TRANSFERRED" | "DEACTIVATED";
  deviceStatus: "ACTIVE" | "REPORTED_LOST" | "REPORTED_STOLEN" | "SUSPENDED" | "TRANSFER_PENDING" | "TRANSFERRED" | "DEACTIVATED";
  registeredAt: string;
  updatedAt?: string;
  lastVerifiedAt?: string | null;
  notes?: string;
  qrToken?: string;
  qrUrl?: string;
}

export interface SecurityHistoryItem {
  id: string;
  device_id: string;
  event_type: string;
  description: string;
  actor_email: string;
  ip_address: string;
  created_at: string;
}

export interface DeviceTransferItem {
  id: string;
  device_id: string;
  current_owner_email: string;
  target_owner_email: string;
  status: "PENDING" | "ACCEPTED" | "REJECTED" | "CANCELLED";
  created_at: string;
  completed_at?: string | null;
  device_name?: string;
  security_id?: string;
  brand?: string;
  model?: string;
}

export interface PublicDeviceVerification {
  verified: boolean;
  status?: string;
  message?: string;
  deviceId?: string;
  securityId?: string;
  deviceName?: string;
  brand?: string;
  model?: string;
  deviceType?: string;
  deviceStatus?: "ACTIVE" | "REPORTED_LOST" | "REPORTED_STOLEN" | "SUSPENDED" | "TRANSFER_PENDING" | "TRANSFERRED" | "DEACTIVATED";
  qrStatus?: string;
  registeredAt?: string;
  lastVerifiedAt?: string | null;
  notes?: string;
}

export const deviceService = {
  // Fetch user's registered devices (sanitized without raw QR token)
  getDevices: async (): Promise<{ success: boolean; devices: RegisteredDevice[] }> => {
    const res = await api.get<{ success: boolean; devices: RegisteredDevice[] }>("/devices");
    return res.data;
  },

  // Register a new laptop device
  registerDevice: async (data: {
    deviceName: string;
    brand?: string;
    model?: string;
    serialNumber?: string;
    deviceType?: string;
    notes?: string;
  }): Promise<{ success: boolean; message: string; device: RegisteredDevice }> => {
    const res = await api.post<{ success: boolean; message: string; device: RegisteredDevice }>("/devices", data);
    return res.data;
  },

  // Verify account password server-side and reveal the Security QR
  verifyPasswordAndRevealQR: async (
    deviceId: string,
    password: string
  ): Promise<{
    success: boolean;
    qrToken: string;
    qrUrl: string;
    securityId: string;
    device: RegisteredDevice;
  }> => {
    const res = await api.post(`/devices/${encodeURIComponent(deviceId)}/verify-password`, { password });
    return res.data;
  },

  // Regenerate Security QR with password verification
  regenerateQR: async (
    deviceId: string,
    password: string
  ): Promise<{
    success: boolean;
    message: string;
    qrToken: string;
    qrUrl: string;
    securityId: string;
    device: RegisteredDevice;
  }> => {
    const res = await api.post(`/devices/${encodeURIComponent(deviceId)}/regenerate-qr`, { password });
    return res.data;
  },

  // Report device lost
  reportLost: async (
    deviceId: string,
    password: string,
    notes?: string
  ): Promise<{ success: boolean; message: string }> => {
    const res = await api.post(`/devices/${encodeURIComponent(deviceId)}/report-lost`, { password, notes });
    return res.data;
  },

  // Report device stolen
  reportStolen: async (
    deviceId: string,
    password: string,
    notes?: string
  ): Promise<{ success: boolean; message: string }> => {
    const res = await api.post(`/devices/${encodeURIComponent(deviceId)}/report-stolen`, { password, notes });
    return res.data;
  },

  // Restore device to ACTIVE
  restoreDevice: async (
    deviceId: string,
    password: string
  ): Promise<{ success: boolean; message: string }> => {
    const res = await api.post(`/devices/${encodeURIComponent(deviceId)}/restore`, { password });
    return res.data;
  },

  // Fetch security audit history for a single device
  getDeviceHistory: async (deviceId: string): Promise<{ success: boolean; history: SecurityHistoryItem[] }> => {
    const res = await api.get<{ success: boolean; history: SecurityHistoryItem[] }>(
      `/devices/${encodeURIComponent(deviceId)}/security-history`
    );
    return res.data;
  },

  // Fetch security audit history across all user devices
  getAllHistory: async (): Promise<{ success: boolean; history: SecurityHistoryItem[] }> => {
    const res = await api.get<{ success: boolean; history: SecurityHistoryItem[] }>("/devices-security-history");
    return res.data;
  },

  // Initiate ownership transfer
  initiateTransfer: async (
    deviceId: string,
    targetEmail: string,
    password: string
  ): Promise<{ success: boolean; message: string; transfer: DeviceTransferItem }> => {
    const res = await api.post(`/devices/${encodeURIComponent(deviceId)}/transfer`, {
      targetEmail,
      password,
    });
    return res.data;
  },

  // Get pending transfers
  getPendingTransfers: async (): Promise<{
    success: boolean;
    transfers: { outgoing: DeviceTransferItem[]; incoming: DeviceTransferItem[] };
  }> => {
    const res = await api.get<{
      success: boolean;
      transfers: { outgoing: DeviceTransferItem[]; incoming: DeviceTransferItem[] };
    }>("/device-transfers/pending");
    return res.data;
  },

  // Accept pending transfer
  acceptTransfer: async (transferId: string): Promise<{ success: boolean; message: string }> => {
    const res = await api.post(`/device-transfers/${encodeURIComponent(transferId)}/accept`);
    return res.data;
  },

  // Cancel pending transfer
  cancelTransfer: async (transferId: string): Promise<{ success: boolean; message: string }> => {
    const res = await api.post(`/device-transfers/${encodeURIComponent(transferId)}/cancel`);
    return res.data;
  },

  // Public verification scan (NO AUTH REQUIRED)
  verifyPublicDevice: async (token: string): Promise<PublicDeviceVerification> => {
    const res = await api.get<PublicDeviceVerification>(`/verify/device/${encodeURIComponent(token)}`);
    return res.data;
  },
};
