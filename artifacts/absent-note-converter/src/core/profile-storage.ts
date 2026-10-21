import type { CalibrationProfile } from "./calibration";

const DATABASE_NAME = "absent-note-converter";
const STORE_NAME = "calibration-profiles";
const DATABASE_VERSION = 1;

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB is not available in this browser."));
      return;
    }
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(request.error ?? new Error("Could not open local profile storage."));
  });
}

export async function listCalibrationProfiles(): Promise<CalibrationProfile[]> {
  const database = await openDatabase();
  try {
    return await new Promise((resolve, reject) => {
      const request = database
        .transaction(STORE_NAME, "readonly")
        .objectStore(STORE_NAME)
        .getAll();
      request.onsuccess = () => resolve(request.result as CalibrationProfile[]);
      request.onerror = () =>
        reject(request.error ?? new Error("Could not read calibration profiles."));
    });
  } finally {
    database.close();
  }
}

export async function saveCalibrationProfile(profile: CalibrationProfile) {
  if (!profile.name.trim()) throw new Error("Give the calibration profile a name.");
  const database = await openDatabase();
  try {
    await new Promise<void>((resolve, reject) => {
      const request = database
        .transaction(STORE_NAME, "readwrite")
        .objectStore(STORE_NAME)
        .put(profile);
      request.onsuccess = () => resolve();
      request.onerror = () =>
        reject(request.error ?? new Error("Could not save calibration profile."));
    });
  } finally {
    database.close();
  }
}

export async function deleteCalibrationProfile(id: string) {
  const database = await openDatabase();
  try {
    await new Promise<void>((resolve, reject) => {
      const request = database
        .transaction(STORE_NAME, "readwrite")
        .objectStore(STORE_NAME)
        .delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () =>
        reject(request.error ?? new Error("Could not delete calibration profile."));
    });
  } finally {
    database.close();
  }
}

export function exportCalibrationProfile(profile: CalibrationProfile) {
  return JSON.stringify(profile, null, 2);
}

export function importCalibrationProfile(json: string): CalibrationProfile {
  const parsed: unknown = JSON.parse(json);
  if (
    typeof parsed !== "object" ||
    parsed === null ||
    !("id" in parsed) ||
    !("name" in parsed) ||
    !("measurements" in parsed) ||
    typeof parsed.id !== "string" ||
    typeof parsed.name !== "string" ||
    !Array.isArray(parsed.measurements)
  ) {
    throw new Error("This file is not a valid calibration profile.");
  }
  return parsed as CalibrationProfile;
}
