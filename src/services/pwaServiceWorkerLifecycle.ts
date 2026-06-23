export type PwaServiceWorkerLifecycleTone = "ok" | "warn" | "risk";

export type PwaServiceWorkerLifecycleStatus = {
  supported: boolean;
  registered: boolean;
  controlled: boolean;
  installing: boolean;
  waiting: boolean;
  active: boolean;
  updateAvailable: boolean;
  tone: PwaServiceWorkerLifecycleTone;
  titleKey: string;
  bodyKey: string;
};

export async function getPwaServiceWorkerLifecycleStatus(): Promise<PwaServiceWorkerLifecycleStatus> {
  const serviceWorker = typeof navigator === "undefined" ? undefined : navigator.serviceWorker;
  if (!serviceWorker) {
    return status("risk", "mobileDevice.swUnsupportedTitle", "mobileDevice.swUnsupportedBody", {
      supported: false,
    });
  }

  const registration = await serviceWorker.getRegistration?.().catch(() => undefined);
  const controlled = Boolean(serviceWorker.controller);
  if (!registration) {
    return status("warn", "mobileDevice.swNotRegisteredTitle", "mobileDevice.swNotRegisteredBody", {
      controlled,
    });
  }

  const waiting = Boolean(registration.waiting);
  const installing = Boolean(registration.installing);
  const active = Boolean(registration.active);
  if (waiting) {
    return status("warn", "mobileDevice.swUpdateReadyTitle", "mobileDevice.swUpdateReadyBody", {
      registered: true,
      controlled,
      waiting,
      active,
      updateAvailable: true,
    });
  }
  if (installing) {
    return status("warn", "mobileDevice.swInstallingTitle", "mobileDevice.swInstallingBody", {
      registered: true,
      controlled,
      installing,
      active,
      updateAvailable: controlled,
    });
  }
  if (!controlled) {
    return status("warn", "mobileDevice.swNeedsRefreshTitle", "mobileDevice.swNeedsRefreshBody", {
      registered: true,
      active,
    });
  }
  return status("ok", "mobileDevice.swReadyTitle", "mobileDevice.swReadyBody", {
    registered: true,
    controlled,
    active,
  });
}

export function subscribePwaServiceWorkerLifecycle(onChange: () => void) {
  const serviceWorker = typeof navigator === "undefined" ? undefined : navigator.serviceWorker;
  const cleanup: Array<() => void> = [];
  const addWindowListener = (type: string) => {
    window.addEventListener(type, onChange);
    cleanup.push(() => window.removeEventListener(type, onChange));
  };
  if (typeof window !== "undefined") {
    addWindowListener("lifeos-service-worker-update");
    addWindowListener("focus");
  }
  if (serviceWorker?.addEventListener) {
    serviceWorker.addEventListener("controllerchange", onChange);
    cleanup.push(() => serviceWorker.removeEventListener("controllerchange", onChange));
  }
  void serviceWorker?.getRegistration?.().then((registration) => {
    if (!registration?.addEventListener) return;
    const handleUpdateFound = () => {
      onChange();
      registration.installing?.addEventListener?.("statechange", onChange);
    };
    registration.addEventListener("updatefound", handleUpdateFound);
    cleanup.push(() => registration.removeEventListener("updatefound", handleUpdateFound));
  }).catch(() => null);
  return () => cleanup.splice(0).forEach((dispose) => dispose());
}

function status(
  tone: PwaServiceWorkerLifecycleTone,
  titleKey: string,
  bodyKey: string,
  overrides: Partial<PwaServiceWorkerLifecycleStatus> = {},
): PwaServiceWorkerLifecycleStatus {
  return {
    supported: true,
    registered: false,
    controlled: false,
    installing: false,
    waiting: false,
    active: false,
    updateAvailable: false,
    tone,
    titleKey,
    bodyKey,
    ...overrides,
  };
}
