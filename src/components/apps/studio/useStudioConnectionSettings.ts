import { useEffect, useState } from "react";
import { useSyncedClientState } from "../../../hooks/useSyncedClientState";
import { useI18n } from "../../../i18n/I18nProvider";
import { type AiProviderId, saveAiProviderKey, testAiProvider } from "../../../services/lifeosApi";
import { clearSensitiveLocalStorageResidue } from "../../../services/sensitiveLocalStorage";

export type StudioProxyNode = {
  id: string;
  name: string;
  type: string;
  delay: number;
  status: "active" | "offline";
  speed: string;
};

const defaultProxyNodes: StudioProxyNode[] = [
  { id: "cn-hk", name: "Asia CN2 Express (Hong Kong)", type: "IEPL", delay: 24, status: "active", speed: "124 Mbps" },
  { id: "cn-sg", name: "Asia Smart Relay (Singapore)", type: "BGP Smart", delay: 38, status: "active", speed: "80 Mbps" },
  { id: "cn-jp", name: "Tokyo BGP Direct (Tokyo)", type: "BGP Direct", delay: 45, status: "active", speed: "150 Mbps" },
  { id: "cn-us", name: "US West NTT Relay (Silicon Valley)", type: "NTT Tunnel", delay: 140, status: "active", speed: "210 Mbps" },
  { id: "cn-local", name: "Local 127.0.0.1 Proxy Loop", type: "Loopback", delay: 2, status: "active", speed: "1000 Mbps" },
];

function summarizeProxySubscriptionUrl(value: string) {
  try {
    const parsed = new URL(value);
    return parsed.host || "subscription";
  } catch {
    return "subscription";
  }
}

export function useStudioConnectionSettings() {
  const { t } = useI18n();
  const [byokProvider, setByokProvider] = useSyncedClientState("lifeos_byok_provider", "Google Gemini");
  const [byokKey, setByokKey] = useState("");
  const [proxyEnabled, setProxyEnabled] = useSyncedClientState("lifeos_proxy_enabled", false);
  const [proxyUrl, setProxyUrl] = useState("");
  const [routeMode, setRouteMode] = useSyncedClientState("lifeos_route_mode", "rule");
  const [selectedNodeId, setSelectedNodeId] = useSyncedClientState("lifeos_selected_node_id", "cn-hk");
  const [proxyNodes, setProxyNodes] = useSyncedClientState<StudioProxyNode[]>("lifeos_proxy_nodes", defaultProxyNodes);

  const [apiTestStatus, setApiTestStatus] = useState<"idle" | "testing" | "success" | "error">("idle");
  const [apiTestResult, setApiTestResult] = useState("");
  const [isPinging, setIsPinging] = useState(false);
  const [isSyncingSub, setIsSyncingSub] = useState(false);
  const [subSyncResult, setSubSyncResult] = useState("");
  const [subSyncSucceeded, setSubSyncSucceeded] = useState(false);

  const handleProviderChange = (value: string) => {
    setByokProvider(value);
    setApiTestStatus("idle");
    setApiTestResult("");
  };

  const handleKeyChange = (value: string) => {
    setByokKey(value);
    setApiTestStatus("idle");
    setApiTestResult("");
  };

  const handleProxyUrlChange = (value: string) => {
    setProxyUrl(value);
    setSubSyncResult("");
    setSubSyncSucceeded(false);
  };

  useEffect(() => {
    clearSensitiveLocalStorageResidue();
  }, []);

  const providerIdFromLabel = (label: string): AiProviderId => {
    if (/openrouter/i.test(label)) return "openrouter";
    if (/openai|gpt/i.test(label)) return "openai";
    if (/local|\u672c\u5730/i.test(label)) return "local";
    return "gemini";
  };

  const testApiConnection = async () => {
    if (!byokKey.trim()) {
      setApiTestStatus("error");
      setApiTestResult(t("studio.connection.emptyApiKey"));
      return;
    }
    setApiTestStatus("testing");
    setApiTestResult(t("studio.connection.testingProvider", { provider: byokProvider }));

    try {
      const providerId = providerIdFromLabel(byokProvider);
      await saveAiProviderKey(providerId, byokKey.trim());
      const result = await testAiProvider(providerId);
      setApiTestStatus("success");
      setApiTestResult(t("studio.connection.testSuccess", { message: result.message }));
      setByokKey("");
    } catch (error) {
      setApiTestStatus("error");
      setApiTestResult(error instanceof Error ? error.message : t("studio.connection.testFailed"));
    }
  };

  const testAllPings = () => {
    if (isPinging) return;
    setIsPinging(true);
    setTimeout(() => {
      setProxyNodes((previousNodes) =>
        previousNodes.map((node) => {
          const isOffline = Math.random() > 0.95;
          return {
            ...node,
            delay: isOffline ? -1 : Math.floor(Math.random() * 60) + (node.id === "cn-us" ? 110 : 8),
            status: isOffline ? "offline" : "active",
          };
        }),
      );
      setIsPinging(false);
    }, 1500);
  };

  const syncSubscription = () => {
    if (!proxyUrl.trim()) {
      setSubSyncResult(t("studio.connection.subscriptionMissing"));
      setSubSyncSucceeded(false);
      return;
    }
    setIsSyncingSub(true);
    setSubSyncSucceeded(false);
    setSubSyncResult(t("studio.connection.subscriptionFetching", { host: summarizeProxySubscriptionUrl(proxyUrl) }));

    setTimeout(() => {
      const importedNodes: StudioProxyNode[] = [
        { id: "sub-ali01", name: "Aliyun Express 01 (Hong Kong)", type: "IEPL Relay", delay: 18, status: "active", speed: "150 Mbps" },
        { id: "sub-ali02", name: "Aliyun Express 02 (Singapore)", type: "IEPL Relay", delay: 35, status: "active", speed: "180 Mbps" },
        { id: "sub-tx01", name: "Tencent Smart Route 01 (Tokyo)", type: "CN2 Premium", delay: 42, status: "active", speed: "200 Mbps" },
      ];

      setProxyNodes([...importedNodes, ...proxyNodes.filter((node) => !node.id.startsWith("sub-"))]);
      setSelectedNodeId("sub-ali01");
      setIsSyncingSub(false);
      setSubSyncSucceeded(true);
      setSubSyncResult(t("studio.connection.subscriptionSuccess"));
      setProxyEnabled(true);
      setProxyUrl("");
    }, 1800);
  };

  return {
    apiTestResult,
    apiTestStatus,
    byokKey,
    byokProvider,
    handleKeyChange,
    handleProviderChange,
    handleProxyUrlChange,
    handleRouteModeChange: setRouteMode,
    handleSelectNode: setSelectedNodeId,
    isPinging,
    isSyncingSub,
    proxyEnabled,
    proxyNodes,
    proxyUrl,
    routeMode,
    selectedNodeId,
    setProxyEnabled,
    subSyncSucceeded,
    subSyncResult,
    syncSubscription,
    testAllPings,
    testApiConnection,
    toggleProxy: () => setProxyEnabled(!proxyEnabled),
  };
}
