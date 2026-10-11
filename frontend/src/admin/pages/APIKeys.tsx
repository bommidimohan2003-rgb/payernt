import { useEffect, useState, useMemo, useCallback } from "react";
import {
  KeyRound,
  Plus,
  Search,
  Copy,
  Check,
  Trash2,
  Power,
  RefreshCw,
  ShieldCheck,
  AlertTriangle,
  Clock,
  Activity,
  Layers,
  X,
  Lock,
} from "lucide-react";
import { apiKeysService, AdminAPIKey, APIKeyCreateResult } from "../services/apiKeys";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const AVAILABLE_SCOPES = [
  { id: "read", label: "Read Access", desc: "Read catalog, categories, availability" },
  { id: "write", label: "Write Access", desc: "Create listings, update metadata" },
  { id: "bookings", label: "Bookings", desc: "Create, view and process rental reservations" },
  { id: "payments", label: "Payments", desc: "View transaction status and receipts" },
  { id: "webhooks", label: "Webhooks", desc: "Receive real-time event notifications" },
];

export default function APIKeys() {
  const [keys, setKeys] = useState<AdminAPIKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  // Create Key Modal
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [selectedScopes, setSelectedScopes] = useState<string[]>(["read", "bookings"]);
  const [rateLimit, setRateLimit] = useState(100);
  const [expiryOption, setExpiryOption] = useState<"never" | "30" | "90" | "365">("never");

  // Created Key Reveal Modal
  const [createdResult, setCreatedResult] = useState<APIKeyCreateResult | null>(null);
  const [copiedKey, setCopiedKey] = useState(false);
  const [copiedPrefixId, setCopiedPrefixId] = useState<string | null>(null);

  const fetchKeys = useCallback(async () => {
    try {
      setLoading(true);
      const res = await apiKeysService.getApiKeys(1, 100, search || undefined);
      setKeys(res.items || []);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load API keys.");
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    fetchKeys();
  }, [fetchKeys]);

  const filteredKeys = useMemo(() => {
    if (!search.trim()) return keys;
    const q = search.toLowerCase();
    return keys.filter(
      (k) =>
        k.name.toLowerCase().includes(q) ||
        k.key_prefix.toLowerCase().includes(q) ||
        k.user_email.toLowerCase().includes(q) ||
        k.scopes.toLowerCase().includes(q)
    );
  }, [keys, search]);

  const activeCount = useMemo(() => keys.filter((k) => k.is_active).length, [keys]);

  const handleToggleStatus = async (keyItem: AdminAPIKey) => {
    try {
      setActionLoading(true);
      const nextStatus = !keyItem.is_active;
      await apiKeysService.updateApiKey(keyItem.id, { is_active: nextStatus });
      setKeys((prev) =>
        prev.map((k) => (k.id === keyItem.id ? { ...k, is_active: nextStatus } : k))
      );
      toast.success(`API Key "${keyItem.name}" is now ${nextStatus ? "Active" : "Disabled"}.`);
    } catch {
      toast.error("Failed to update API key status.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async (keyItem: AdminAPIKey) => {
    if (!confirm(`Are you sure you want to permanently revoke API Key "${keyItem.name}"? Applications using this key will immediately lose access.`)) {
      return;
    }
    try {
      setActionLoading(true);
      await apiKeysService.deleteApiKey(keyItem.id);
      setKeys((prev) => prev.filter((k) => k.id !== keyItem.id));
      toast.success(`API Key "${keyItem.name}" has been revoked.`);
    } catch {
      toast.error("Failed to revoke API key.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeyName.trim()) {
      toast.error("Please enter a name for the API key.");
      return;
    }

    let expiresAt: string | undefined = undefined;
    if (expiryOption !== "never") {
      const days = parseInt(expiryOption, 10);
      const exp = new Date();
      exp.setDate(exp.getDate() + days);
      expiresAt = exp.toISOString();
    }

    try {
      setActionLoading(true);
      const res = await apiKeysService.createApiKey({
        name: newKeyName.trim(),
        scopes: selectedScopes,
        rate_limit: rateLimit,
        expires_at: expiresAt,
      });

      if (res && res.apiKey) {
        setCreatedResult(res);
        setCreateModalOpen(false);
        setNewKeyName("");
        setSelectedScopes(["read", "bookings"]);
        setRateLimit(100);
        setExpiryOption("never");
        fetchKeys();
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to generate API key.");
    } finally {
      setActionLoading(false);
    }
  };

  const copyToClipboard = (text: string, isFullSecret = false, prefixId?: string) => {
    navigator.clipboard.writeText(text);
    if (isFullSecret) {
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 2500);
    } else if (prefixId) {
      setCopiedPrefixId(prefixId);
      setTimeout(() => setCopiedPrefixId(null), 2000);
    }
    toast.success("Copied to clipboard!");
  };

  const toggleScope = (scopeId: string) => {
    setSelectedScopes((prev) =>
      prev.includes(scopeId) ? prev.filter((s) => s !== scopeId) : [...prev, scopeId]
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground font-display flex items-center gap-2">
            <KeyRound className="h-6 w-6 text-foreground" />
            API Keys & Integrations
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Generate and manage API credentials for mobile apps, server integrations, and developer SDKs
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => fetchKeys()}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl bg-secondary/80 hover:bg-secondary text-foreground border border-border/80 transition-colors cursor-pointer"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
            Refresh
          </button>
          <button
            onClick={() => setCreateModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl bg-foreground text-background hover:opacity-90 shadow-sm transition-opacity cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            Generate New Key
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-card border border-border/80 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-muted-foreground">Total API Keys</p>
            <p className="text-2xl font-bold text-foreground mt-1">{keys.length}</p>
          </div>
          <div className="h-10 w-10 rounded-xl bg-secondary/80 flex items-center justify-center text-foreground">
            <KeyRound className="h-5 w-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-card border border-border/80 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-muted-foreground">Active Keys</p>
            <p className="text-2xl font-bold text-foreground mt-1">{activeCount}</p>
          </div>
          <div className="h-10 w-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
            <ShieldCheck className="h-5 w-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-card border border-border/80 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-muted-foreground">Rate Limits</p>
            <p className="text-2xl font-bold text-foreground mt-1">100–500 <span className="text-xs text-muted-foreground font-normal">req/m</span></p>
          </div>
          <div className="h-10 w-10 rounded-xl bg-secondary/80 flex items-center justify-center text-foreground">
            <Activity className="h-5 w-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-card border border-border/80 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-muted-foreground">Auth Standard</p>
            <p className="text-2xl font-bold text-foreground mt-1">Bearer <span className="text-xs text-muted-foreground font-normal">Token</span></p>
          </div>
          <div className="h-10 w-10 rounded-xl bg-secondary/80 flex items-center justify-center text-foreground">
            <Lock className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 rounded-2xl bg-card border border-border/80">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search keys by name, prefix, email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs bg-secondary/60 rounded-xl border border-border/60 text-foreground placeholder:text-muted-foreground/70 focus:outline-none focus:ring-1 focus:ring-foreground/50 transition-all"
          />
        </div>
        <div className="text-[11px] text-muted-foreground self-end sm:self-center">
          Showing <span className="font-semibold text-foreground">{filteredKeys.length}</span> of {keys.length} keys
        </div>
      </div>

      {/* API Keys Table */}
      <div className="rounded-2xl border border-border/80 bg-card overflow-hidden">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center text-muted-foreground">
            <RefreshCw className="h-8 w-8 animate-spin mb-3 text-muted-foreground" />
            <p className="text-xs font-semibold">Loading API credentials...</p>
          </div>
        ) : filteredKeys.length === 0 ? (
          <div className="py-20 flex flex-col items-center justify-center text-center p-6">
            <div className="h-12 w-12 rounded-2xl bg-secondary/80 flex items-center justify-center mb-3 text-muted-foreground">
              <KeyRound className="h-6 w-6" />
            </div>
            <h3 className="text-sm font-bold text-foreground">No API keys found</h3>
            <p className="text-xs text-muted-foreground mt-1 max-w-sm">
              {search ? "No keys match your search criteria." : "Create your first API key to enable secure programmatic integrations."}
            </p>
            {!search && (
              <button
                onClick={() => setCreateModalOpen(true)}
                className="mt-4 px-4 py-2 text-xs font-bold rounded-xl bg-foreground text-background hover:opacity-90 transition-opacity cursor-pointer"
              >
                Generate First Key
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-secondary/40 text-[11px] uppercase tracking-wider text-muted-foreground border-b border-border/80">
                <tr>
                  <th className="py-3 px-4 font-semibold">Name & Key Prefix</th>
                  <th className="py-3 px-4 font-semibold">Scopes</th>
                  <th className="py-3 px-4 font-semibold">Rate Limit</th>
                  <th className="py-3 px-4 font-semibold">Status</th>
                  <th className="py-3 px-4 font-semibold">Created / Last Used</th>
                  <th className="py-3 px-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {filteredKeys.map((k) => (
                  <tr key={k.id} className="hover:bg-secondary/20 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-foreground text-sm">{k.name}</div>
                      <div className="flex items-center gap-2 mt-1">
                        <code className="px-2 py-0.5 rounded-md bg-secondary/80 text-[11px] font-mono text-foreground border border-border/60">
                          {k.key_prefix}...
                        </code>
                        <button
                          onClick={() => copyToClipboard(k.key_prefix, false, k.id)}
                          title="Copy Prefix"
                          className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                        >
                          {copiedPrefixId === k.id ? (
                            <Check className="h-3.5 w-3.5 text-emerald-500" />
                          ) : (
                            <Copy className="h-3.5 w-3.5" />
                          )}
                        </button>
                      </div>
                      <div className="text-[10px] text-muted-foreground mt-0.5">{k.user_email}</div>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="flex flex-wrap gap-1 max-w-xs">
                        {k.scopes.split(",").map((s) => (
                          <span
                            key={s}
                            className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-secondary text-muted-foreground border border-border/60"
                          >
                            {s.trim()}
                          </span>
                        ))}
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="font-mono font-semibold text-foreground">
                        {k.rate_limit}
                      </span>{" "}
                      <span className="text-[10px] text-muted-foreground">req/min</span>
                    </td>

                    <td className="py-3.5 px-4">
                      <span
                        className={cn(
                          "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold border",
                          k.is_active
                            ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                            : "bg-zinc-500/10 text-zinc-400 border-zinc-500/20"
                        )}
                      >
                        <span
                          className={cn(
                            "h-1.5 w-1.5 rounded-full",
                            k.is_active ? "bg-emerald-500" : "bg-zinc-400"
                          )}
                        />
                        {k.is_active ? "Active" : "Disabled"}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-muted-foreground">
                      <div className="text-[11px] text-foreground font-medium">
                        {new Date(k.created_at).toLocaleDateString()}
                      </div>
                      <div className="text-[10px] text-muted-foreground mt-0.5">
                        {k.last_used_at ? `Used ${new Date(k.last_used_at).toLocaleDateString()}` : "Never used"}
                      </div>
                      {k.expires_at && (
                        <div className="text-[10px] text-amber-500 flex items-center gap-1 mt-0.5">
                          <Clock className="h-3 w-3" />
                          Exp: {new Date(k.expires_at).toLocaleDateString()}
                        </div>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleToggleStatus(k)}
                          disabled={actionLoading}
                          title={k.is_active ? "Disable Key" : "Enable Key"}
                          className="p-1.5 rounded-lg bg-secondary/80 hover:bg-secondary text-foreground transition-colors cursor-pointer disabled:opacity-50"
                        >
                          <Power className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(k)}
                          disabled={actionLoading}
                          title="Revoke / Delete Key"
                          className="p-1.5 rounded-lg bg-destructive/10 hover:bg-destructive/20 text-destructive transition-colors cursor-pointer disabled:opacity-50"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL: Generate Key */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-lg rounded-2xl bg-card border border-border shadow-2xl overflow-hidden p-6 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-border/60">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-xl bg-secondary flex items-center justify-center text-foreground">
                  <KeyRound className="h-4 w-4" />
                </div>
                <h2 className="text-base font-bold text-foreground font-display">Generate New API Key</h2>
              </div>
              <button
                onClick={() => setCreateModalOpen(false)}
                className="text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground">Key Name / Description *</label>
                <input
                  type="text"
                  placeholder="e.g. Mobile iOS App, Zapier Webhook, Staging Integration"
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs bg-secondary/60 rounded-xl border border-border/80 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-foreground transition-all"
                  required
                />
              </div>

              {/* Scopes */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-foreground">Access Permissions & Scopes</label>
                <div className="space-y-1.5">
                  {AVAILABLE_SCOPES.map((sc) => {
                    const checked = selectedScopes.includes(sc.id);
                    return (
                      <div
                        key={sc.id}
                        onClick={() => toggleScope(sc.id)}
                        className={cn(
                          "flex items-center justify-between p-2.5 rounded-xl border text-xs cursor-pointer transition-colors",
                          checked
                            ? "bg-secondary/80 border-foreground/40 text-foreground"
                            : "bg-secondary/30 border-border/60 text-muted-foreground hover:bg-secondary/50"
                        )}
                      >
                        <div>
                          <p className="font-semibold text-foreground">{sc.label}</p>
                          <p className="text-[10px] text-muted-foreground">{sc.desc}</p>
                        </div>
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => {}}
                          className="h-4 w-4 rounded accent-foreground cursor-pointer"
                        />
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Rate Limit & Expiration */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground">Rate Limit</label>
                  <select
                    value={rateLimit}
                    onChange={(e) => setRateLimit(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs bg-secondary/60 rounded-xl border border-border/80 text-foreground focus:outline-none cursor-pointer"
                  >
                    <option value={60}>60 requests / min</option>
                    <option value={100}>100 requests / min</option>
                    <option value={300}>300 requests / min</option>
                    <option value={500}>500 requests / min</option>
                    <option value={1000}>1,000 requests / min</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground">Expiration</label>
                  <select
                    value={expiryOption}
                    onChange={(e) => setExpiryOption(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs bg-secondary/60 rounded-xl border border-border/80 text-foreground focus:outline-none cursor-pointer"
                  >
                    <option value="never">Never expires</option>
                    <option value="30">30 days</option>
                    <option value="90">90 days</option>
                    <option value="365">1 year</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border/60">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold rounded-xl bg-secondary hover:bg-secondary/80 text-foreground transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 text-xs font-bold rounded-xl bg-foreground text-background hover:opacity-90 shadow-sm transition-opacity cursor-pointer disabled:opacity-50"
                >
                  {actionLoading ? "Generating..." : "Generate Key"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Newly Created Key Reveal */}
      {createdResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-lg rounded-2xl bg-card border border-border shadow-2xl p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                <Check className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-foreground font-display">
                  API Key Created Successfully
                </h3>
                <p className="text-xs text-muted-foreground">
                  {createdResult.apiKey.name}
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-500 text-xs flex items-start gap-2.5">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Save this secret key immediately.</p>
                <p className="text-[11px] opacity-90 mt-0.5">
                  For your platform security, we never store plain-text secret keys. You will not be able to view it again.
                </p>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-muted-foreground">Secret Token</label>
              <div className="flex items-center gap-2 p-3 rounded-xl bg-secondary/80 border border-border font-mono text-xs text-foreground break-all select-all">
                <span className="flex-1">{createdResult.secretKey}</span>
                <button
                  onClick={() => copyToClipboard(createdResult.secretKey, true)}
                  className="px-3 py-1.5 rounded-lg bg-foreground text-background text-xs font-bold hover:opacity-90 flex items-center gap-1.5 cursor-pointer shrink-0"
                >
                  {copiedKey ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  {copiedKey ? "Copied" : "Copy"}
                </button>
              </div>
            </div>

            <div className="pt-3 border-t border-border/60 flex justify-end">
              <button
                onClick={() => setCreatedResult(null)}
                className="px-4 py-2 text-xs font-bold rounded-xl bg-foreground text-background hover:opacity-90 cursor-pointer"
              >
                I have safely stored this key
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
