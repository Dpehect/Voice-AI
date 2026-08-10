export type StoredVoice = {
  id: string;
  name: string;
  file: File;
};

const DATABASE_NAME = "voice-ai-library";
const STORE_NAME = "voices";
const DATABASE_VERSION = 1;

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !("indexedDB" in window) || !window.indexedDB) {
      reject(new Error("IndexedDB is not supported in this environment"));
      return;
    }
    try {
      const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
      request.onupgradeneeded = () => {
        const database = request.result;
        if (!database.objectStoreNames.contains(STORE_NAME)) {
          database.createObjectStore(STORE_NAME, { keyPath: "id" });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error("Failed to open database"));
    } catch (error) {
      reject(error);
    }
  });
}

export async function loadStoredVoices(): Promise<StoredVoice[]> {
  const database = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, "readonly");
    const request = transaction.objectStore(STORE_NAME).getAll();
    request.onsuccess = () => {
      const rawList = (request.result as StoredVoice[]) || [];
      const sanitized = rawList.map((item) => {
        if (item.file && !(item.file instanceof File)) {
          const blob = item.file as unknown as Blob;
          const file = new File([blob], item.name || "voice.wav", { type: blob.type || "audio/wav" });
          return { ...item, file };
        }
        return item;
      });
      resolve(sanitized);
    };
    request.onerror = () => reject(request.error);
    transaction.oncomplete = () => database.close();
  });
}

export async function saveStoredVoices(voices: StoredVoice[]): Promise<void> {
  const database = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    store.clear();
    voices.forEach((voice) => store.put(voice));
    transaction.oncomplete = () => {
      database.close();
      resolve();
    };
    transaction.onerror = () => reject(transaction.error);
  });
}
