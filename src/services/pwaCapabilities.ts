export type PwaCapabilityStatus = {
  standalone: boolean;
  serviceWorkerSupported: boolean;
  serviceWorkerControlled: boolean;
  backgroundSyncSupported: boolean;
  indexedDbSupported: boolean;
  online: boolean;
  recommendations: string[];
};

function standaloneDisplayMode() {
  if (typeof window === "undefined") return false;
  return window.matchMedia?.("(display-mode: standalone)")?.matches || Boolean((navigator as any).standalone);
}

function serviceWorkerSupported() {
  return typeof navigator !== "undefined" && "serviceWorker" in navigator;
}

function serviceWorkerControlled() {
  return serviceWorkerSupported() && Boolean(navigator.serviceWorker?.controller);
}

function backgroundSyncSupported() {
  return serviceWorkerSupported() && typeof window !== "undefined" && "SyncManager" in window;
}

function indexedDbSupported() {
  return typeof window !== "undefined" && "indexedDB" in window;
}

function onlineStatus() {
  if (typeof navigator === "undefined") return true;
  return navigator.onLine !== false;
}

export function getPwaCapabilityStatus(): PwaCapabilityStatus {
  const status: PwaCapabilityStatus = {
    standalone: standaloneDisplayMode(),
    serviceWorkerSupported: serviceWorkerSupported(),
    serviceWorkerControlled: serviceWorkerControlled(),
    backgroundSyncSupported: backgroundSyncSupported(),
    indexedDbSupported: indexedDbSupported(),
    online: onlineStatus(),
    recommendations: [],
  };

  if (!status.standalone) {
    status.recommendations.push("绑定成功后添加到主屏幕，之后可像普通 App 一样打开。");
  }
  if (!status.serviceWorkerSupported) {
    status.recommendations.push("当前浏览器不支持离线 shell，建议换用 Safari、Chrome 或 Edge。");
  } else if (!status.serviceWorkerControlled) {
    status.recommendations.push("离线 shell 正在接管，刷新一次后离线启动会更稳定。");
  }
  if (!status.backgroundSyncSupported) {
    status.recommendations.push("后台同步不可用时，重新打开聊天页会继续补写离线消息。");
  }
  if (!status.indexedDbSupported) {
    status.recommendations.push("IndexedDB 不可用会影响设备凭证和长期离线状态，请检查浏览器隐私模式。");
  }
  if (!status.online) {
    status.recommendations.push("当前离线，消息会进入本机队列，网络恢复后再同步。");
  }

  return status;
}
