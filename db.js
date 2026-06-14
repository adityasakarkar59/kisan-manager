const DB_NAME = "KisanManagerDB";
const DB_VERSION = 1;

let kisanDB = null;

function openKisanDB() {
  return new Promise(function(resolve, reject) {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = function(event) {
      const db = event.target.result;

      if (!db.objectStoreNames.contains("customers")) {
        db.createObjectStore("customers", { keyPath: "id" });
      }

      if (!db.objectStoreNames.contains("mirchiDays")) {
        db.createObjectStore("mirchiDays", { keyPath: "id" });
      }

      if (!db.objectStoreNames.contains("syncQueue")) {
        db.createObjectStore("syncQueue", { keyPath: "id" });
      }
    };

    request.onsuccess = function(event) {
      kisanDB = event.target.result;
      resolve(kisanDB);
    };

    request.onerror = function(event) {
      reject(event.target.error);
    };
  });
}

function getAllFromStore(storeName) {
  return new Promise(function(resolve, reject) {
    const tx = kisanDB.transaction(storeName, "readonly");
    const store = tx.objectStore(storeName);
    const request = store.getAll();

    request.onsuccess = function() {
      resolve(request.result || []);
    };

    request.onerror = function(event) {
      reject(event.target.error);
    };
  });
}

function saveArrayToStore(storeName, dataArray) {
  return new Promise(function(resolve, reject) {
    const tx = kisanDB.transaction(storeName, "readwrite");
    const store = tx.objectStore(storeName);

    store.clear();

    dataArray.forEach(function(item) {
      item.updatedAt = Date.now();
      store.put(item);
    });

    tx.oncomplete = function() {
      resolve();
    };

    tx.onerror = function(event) {
      reject(event.target.error);
    };
  });
}

function addSyncItem(type, data) {
  if (!kisanDB) return;

  const tx = kisanDB.transaction("syncQueue", "readwrite");
  const store = tx.objectStore("syncQueue");

  store.put({
    id: type,
    type: type,
    data: data,
    updatedAt: Date.now()
  });
}

function getSyncQueue() {
  return getAllFromStore("syncQueue");
}

function clearSyncItem(id) {
  return new Promise(function(resolve, reject) {
    const tx = kisanDB.transaction("syncQueue", "readwrite");
    const store = tx.objectStore("syncQueue");

    store.delete(id);

    tx.oncomplete = function() {
      resolve();
    };

    tx.onerror = function(event) {
      reject(event.target.error);
    };
  });
}

async function getAllCustomersDB() {
  return await getAllFromStore("customers");
}

async function saveCustomersDB(customers) {
  await saveArrayToStore("customers", customers);
  addSyncItem("customers", customers);
}

async function getAllMirchiDaysDB() {
  return await getAllFromStore("mirchiDays");
}

async function saveMirchiDaysDB(mirchiDays) {
  await saveArrayToStore("mirchiDays", mirchiDays);
  addSyncItem("mirchiDays", mirchiDays);
}

function clearStore(storeName) {
  return new Promise(function(resolve, reject) {
    const tx = kisanDB.transaction(storeName, "readwrite");
    const store = tx.objectStore(storeName);

    store.clear();

    tx.oncomplete = function() {
      resolve();
    };

    tx.onerror = function(event) {
      reject(event.target.error);
    };
  });
}

async function clearAllLocalDataDB() {
  await clearStore("customers");
  await clearStore("mirchiDays");
  await clearStore("syncQueue");
}
