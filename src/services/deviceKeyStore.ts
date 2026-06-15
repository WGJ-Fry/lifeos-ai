const DB_NAME = "lifeos-device-keys";
const STORE_NAME = "keys";
const DEVICE_KEY_ID = "primary";

function base64Url(bytes: ArrayBuffer) {
  const binary = String.fromCharCode(...new Uint8Array(bytes));
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function openKeyDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 2);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) {
        request.result.createObjectStore(STORE_NAME);
      }
      if (!request.result.objectStoreNames.contains("credentials")) {
        request.result.createObjectStore("credentials");
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function putPrivateKey(privateKey: CryptoKey) {
  const db = await openKeyDb();
  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readwrite");
    transaction.objectStore(STORE_NAME).put(privateKey, DEVICE_KEY_ID);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
  db.close();
}

export async function getDevicePrivateKey(): Promise<CryptoKey | null> {
  const db = await openKeyDb();
  const key = await new Promise<CryptoKey | null>((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readonly");
    const request = transaction.objectStore(STORE_NAME).get(DEVICE_KEY_ID);
    request.onsuccess = () => resolve((request.result as CryptoKey | undefined) || null);
    request.onerror = () => reject(request.error);
  });
  db.close();
  return key;
}

export async function createDeviceKeyPair() {
  if (!isDeviceSignatureAvailable()) {
    throw new Error("WebCrypto signature authentication requires HTTPS or another secure browser context.");
  }
  const keyPair = await crypto.subtle.generateKey(
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign", "verify"],
  );
  await putPrivateKey(keyPair.privateKey);
  const publicKey = base64Url(await crypto.subtle.exportKey("spki", keyPair.publicKey));
  return { publicKey };
}

export function isDeviceSignatureAvailable() {
  return typeof crypto !== "undefined"
    && Boolean(crypto.subtle?.generateKey)
    && Boolean(crypto.subtle?.exportKey)
    && Boolean(crypto.subtle?.sign)
    && Boolean(crypto.subtle?.digest);
}

export async function clearDevicePrivateKey() {
  const db = await openKeyDb();
  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readwrite");
    transaction.objectStore(STORE_NAME).delete(DEVICE_KEY_ID);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
  db.close();
}

export async function sha256Base64Url(value: string) {
  return base64Url(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)));
}

export async function signDevicePayload(payload: string) {
  const privateKey = await getDevicePrivateKey();
  if (!privateKey) return null;
  const signature = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    privateKey,
    new TextEncoder().encode(payload),
  );
  return base64Url(signature);
}
