import { useState, useEffect } from "react";
import { mockApi } from "../services/mockApi";

const DB_NAME = "ner_landslide_ews_offline_db";
const STORE_NAME = "reports_queue";
const DB_VERSION = 1;

export interface OfflineReport {
  id?: number;
  reporter_name?: string;
  phone?: string;
  latitude: number;
  longitude: number;
  description?: string;
  severity: string;
  category: string;
  crack_length: number;
  crack_depth: number;
  settlement_proximity: string;
  photo_base64?: string;
  photo_name?: string;
  photo_type?: string;
  timestamp: string;
}

export function useOfflineSync(apiBaseUrl: string) {
  const [db, setDb] = useState<IDBDatabase | null>(null);
  const [queuedCount, setQueuedCount] = useState<number>(0);
  const [syncing, setSyncing] = useState<boolean>(false);
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);

  // Initialize IndexedDB
  useEffect(() => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const dbInstance = (event.target as IDBOpenDBRequest).result;
      if (!dbInstance.objectStoreNames.contains(STORE_NAME)) {
        dbInstance.createObjectStore(STORE_NAME, { keyPath: "id", autoIncrement: true });
      }
    };

    request.onsuccess = (event) => {
      const dbInstance = (event.target as IDBOpenDBRequest).result;
      setDb(dbInstance);
      updateQueuedCount(dbInstance);
    };

    request.onerror = (event) => {
      console.error("IndexedDB initialization failed:", event);
    };

    // Track online/offline status
    const handleOnline = () => {
      setIsOnline(true);
      if (db) triggerSync(db);
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [db]);

  // Sync when DB becomes available
  useEffect(() => {
    if (db && isOnline) {
      triggerSync(db);
    }
  }, [db, isOnline]);

  const updateQueuedCount = (database: IDBDatabase) => {
    try {
      const transaction = database.transaction(STORE_NAME, "readonly");
      const store = transaction.objectStore(STORE_NAME);
      const countRequest = store.count();

      countRequest.onsuccess = () => {
        setQueuedCount(countRequest.result);
      };
    } catch (e) {
      console.error("Failed to read IndexedDB count", e);
    }
  };

  const queueReportOffline = (report: Omit<OfflineReport, "id" | "timestamp"> & { photo?: File }): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (!db) {
        reject(new Error("IndexedDB is not ready"));
        return;
      }

      const timestamp = new Date().toISOString();
      const item: OfflineReport = {
        reporter_name: report.reporter_name,
        phone: report.phone,
        latitude: report.latitude,
        longitude: report.longitude,
        description: report.description,
        severity: report.severity,
        category: report.category,
        crack_length: report.crack_length,
        crack_depth: report.crack_depth,
        settlement_proximity: report.settlement_proximity,
        timestamp
      };

      if (report.photo) {
        item.photo_name = report.photo.name;
        item.photo_type = report.photo.type;
        
        // Convert File to base64 string for IDB storage
        const reader = new FileReader();
        reader.readAsDataURL(report.photo);
        reader.onloadend = () => {
          item.photo_base64 = reader.result as string;
          saveToStore(item, resolve, reject);
        };
      } else {
        saveToStore(item, resolve, reject);
      }
    });
  };

  const saveToStore = (item: OfflineReport, resolve: () => void, reject: (err: any) => void) => {
    if (!db) return;
    const transaction = db.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.add(item);

    request.onsuccess = () => {
      updateQueuedCount(db);
      resolve();
    };

    request.onerror = (e) => {
      reject(e);
    };
  };

  const triggerSync = async (database: IDBDatabase) => {
    if (syncing) return;
    
    // Read all records
    const transaction = database.transaction(STORE_NAME, "readonly");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();

    request.onsuccess = async () => {
      const items: OfflineReport[] = request.result;
      if (items.length === 0) return;

      console.info(`Found ${items.length} offline report(s) to sync.`);
      setSyncing(true);

      for (const item of items) {
        try {
          const formData = new FormData();
          if (item.reporter_name) formData.append("reporter_name", item.reporter_name);
          if (item.phone) formData.append("phone", item.phone);
          formData.append("latitude", item.latitude.toString());
          formData.append("longitude", item.longitude.toString());
          if (item.description) formData.append("description", item.description);
          formData.append("severity", item.severity);
          formData.append("category", item.category);
          formData.append("crack_length", item.crack_length.toString());
          formData.append("crack_depth", item.crack_depth.toString());
          formData.append("settlement_proximity", item.settlement_proximity);

          // Convert base64 back to file if photo exists
          if (item.photo_base64 && item.photo_name) {
            const res = await fetch(item.photo_base64);
            const blob = await res.blob();
            const file = new File([blob], item.photo_name, { type: item.photo_type });
            formData.append("file", file);
          }

          // Submit to live API or fallback local Mock database
          try {
            const response = await fetch(`${apiBaseUrl}/api/v1/reports/submit`, {
              method: "POST",
              body: formData,
            });

            if (response.ok) {
              const deleteTx = database.transaction(STORE_NAME, "readwrite");
              const deleteStore = deleteTx.objectStore(STORE_NAME);
              deleteStore.delete(item.id!);
            } else {
              throw new Error("API rejection");
            }
          } catch (apiError) {
            // Live server is down/unreachable. Sync to Mock DB instead!
            mockApi.submitReport(formData);
            
            // Delete from IndexedDB queue since we successfully synced to Mock local storage
            const deleteTx = database.transaction(STORE_NAME, "readwrite");
            const deleteStore = deleteTx.objectStore(STORE_NAME);
            deleteStore.delete(item.id!);
          }
        } catch (error) {
          console.error(`Error syncing report ID ${item.id}:`, error);
          break; // Stop syncing remaining items to prevent looping errors
        }
      }

      setSyncing(false);
      updateQueuedCount(database);
    };
  };

  return {
    isOnline,
    queuedCount,
    syncing,
    queueReportOffline,
    forceSync: () => db && triggerSync(db)
  };
}
