export type NetworkStatus = {
  online: boolean;
  effectiveType?: string;
  downlink?: number;
  rtt?: number;
  saveData?: boolean;
  quality: "offline" | "poor" | "ok" | "unknown";
  label: string;
};

type NavigatorLike = {
  onLine?: boolean;
  connection?: {
    effectiveType?: string;
    downlink?: number;
    rtt?: number;
    saveData?: boolean;
  };
};

export function getNetworkStatus(nav: NavigatorLike = typeof navigator === "undefined" ? {} : navigator as NavigatorLike): NetworkStatus {
  const online = nav.onLine !== false;
  const connection = nav.connection;
  const effectiveType = connection?.effectiveType;
  const downlink = connection?.downlink;
  const rtt = connection?.rtt;
  const saveData = connection?.saveData;

  if (!online) {
    return { online, effectiveType, downlink, rtt, saveData, quality: "offline", label: "当前离线，消息会先保存在本机。" };
  }

  const slowEffectiveType = effectiveType === "slow-2g" || effectiveType === "2g";
  const slowDownlink = Number.isFinite(downlink) && Number(downlink) > 0 && Number(downlink) < 0.6;
  const slowRtt = Number.isFinite(rtt) && Number(rtt) > 900;
  if (saveData || slowEffectiveType || slowDownlink || slowRtt) {
    return { online, effectiveType, downlink, rtt, saveData, quality: "poor", label: "当前网络较弱，发送失败时会进入离线队列。" };
  }

  if (effectiveType || Number.isFinite(downlink) || Number.isFinite(rtt)) {
    return { online, effectiveType, downlink, rtt, saveData, quality: "ok", label: "网络可用。" };
  }

  return { online, effectiveType, downlink, rtt, saveData, quality: "unknown", label: "网络状态未知。" };
}

