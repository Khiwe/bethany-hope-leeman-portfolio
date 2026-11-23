/* Data layer for the ONE central portfolio app (index.html).
   Mirrors the Bethany Snail Mail (Terra Club) architecture:
   - Local Studio Mode (default) -> 3-layer browser persistence (localStorage + IndexedDB + window.name)
     plus direct HTML file auto-save via FileSystemFileHandle.
   - Live Mode (optional) -> Firebase Auth + Firestore when firebase-config.js is filled in. */
(function () {
  const cfg = window.FIREBASE_CONFIG || {};
  const live = !!(cfg.apiKey && cfg.projectId);
  const V = '10.12.2', BASE = 'https://www.gstatic.com/firebasejs/' + V + '/';
  const ADMINS = (window.ADMIN_EMAILS || (window.ADMIN_EMAIL ? [window.ADMIN_EMAIL] : [])).map(e => e.trim().toLowerCase());
  const DEMO_ADMIN = 'studio@bethanyleeman.com';
  if (!live && !ADMINS.includes(DEMO_ADMIN)) ADMINS.push(DEMO_ADMIN);
  let fb = null;

  async function loadFirebase() {
    if (!live) return null;
    if (fb) return fb;
    try {
      const [app, auth, fs] = await Promise.all([
        import(BASE + 'firebase-app.js'),
        import(BASE + 'firebase-auth.js'),
        import(BASE + 'firebase-firestore.js')
      ]);
      const a = app.initializeApp(cfg);
      fb = { auth, fs, A: auth.getAuth(a), db: fs.getFirestore(a) };
      return fb;
    } catch (e) {
      console.warn('Firebase load skipped, using local studio storage:', e);
      return null;
    }
  }

  const PORTFOLIO_IMAGES = [
    "img_01.png", "img_02.png", "img_03.jpeg", "img_04.png", "img_05.png",
    "img_06.png", "img_07.png", "img_08.png", "img_09.png", "img_10.png",
    "img_11.png", "img_12.png", "img_13.png", "img_14.png", "img_15.png",
    "img_16.png", "img_17.jpeg", "img_18.jpeg", "img_19.jpeg", "img_20.jpeg",
    "img_21.png", "img_22.jpeg", "img_23.png", "img_24.png", "img_25.png",
    "img_26.png", "img_27.png", "img_28.jpeg", "img_29.png", "img_30.png",
    "img_31.png", "img_32.png", "img_33.png", "img_34.png", "img_35.png",
    "img_36.png", "img_37.png", "img_38.png", "img_39.png", "img_40.png",
    "img_41.jpeg", "img_42.jpeg", "img_43.jpeg", "img_44.jpeg", "img_45.jpeg",
    "img_46.jpeg", "img_47.jpeg", "img_48.jpeg", "img_49.jpeg", "img_50.jpeg",
    "img_51.jpeg"
  ];

  // Primary image folder path (works inside Bethany Portfolio 2026/, parent Websites/ folder, and live Workers/Pages)
  const isRemoteHost = location.protocol.startsWith('http') && !/^(localhost|127\.0\.0\.1)$/.test(location.hostname);
  const IMAGE_FOLDER = isRemoteHost ? "./images/" : "../Bethany Hope Leeman — Portfolio 2026_files/images/";
  const FALLBACK_IMAGE_FOLDERS = isRemoteHost
    ? [
        "./images/",
        "./Bethany Hope Leeman — Portfolio 2026_files/images/",
        "../Bethany Hope Leeman — Portfolio 2026_files/images/"
      ]
    : [
        "../Bethany Hope Leeman — Portfolio 2026_files/images/",
        "./Bethany Hope Leeman — Portfolio 2026_files/images/",
        "./images/"
      ];

  const LS_STORAGE_KEY = "BethanyPortfolioStudio2026_LS_v2";
  const WIN_NAME_PREFIX = "__BETHANY_PORTFOLIO_2026_V2__:";
  let linkedFileHandle = null;
  let inMemoryStatesCache = null;

  function openStudioDB() {
    return new Promise((resolve, reject) => {
      try {
        const req = indexedDB.open('BethanyPortfolioStudio2026', 2);
        req.onupgradeneeded = () => {
          const db = req.result;
          if (!db.objectStoreNames.contains('slots')) db.createObjectStore('slots');
          if (!db.objectStoreNames.contains('handles')) db.createObjectStore('handles');
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      } catch (err) {
        reject(err);
      }
    });
  }

  function readSyncBackupStates() {
    let merged = {};
    try {
      if (window.name && window.name.indexOf(WIN_NAME_PREFIX) === 0) {
        const parsed = JSON.parse(window.name.slice(WIN_NAME_PREFIX.length));
        if (parsed && typeof parsed === 'object') merged = Object.assign(merged, parsed);
      }
    } catch (e) {}
    try {
      const rawLS = localStorage.getItem(LS_STORAGE_KEY);
      if (rawLS) {
        const parsedLS = JSON.parse(rawLS);
        if (parsedLS && typeof parsedLS === 'object') {
          Object.keys(parsedLS).forEach((k) => {
            const incoming = parsedLS[k];
            const existing = merged[k];
            if (!existing || !existing.updatedAt || (incoming && incoming.updatedAt >= existing.updatedAt)) {
              merged[k] = incoming;
            }
          });
        }
      }
    } catch (e) {}
    return merged;
  }

  function writeSyncBackupStates(allStates) {
    const serialized = JSON.stringify(allStates);
    try {
      localStorage.setItem(LS_STORAGE_KEY, serialized);
    } catch (e) {}
    try {
      window.name = WIN_NAME_PREFIX + serialized;
    } catch (e) {}
  }

  async function saveSlotState(slotId, data) {
    const payload = (data && typeof data === 'object' && !Array.isArray(data))
      ? Object.assign({}, data, { updatedAt: Date.now() })
      : data;

    // 1. Synchronous instant save to in-memory cache + localStorage + window.name
    if (!inMemoryStatesCache) {
      inMemoryStatesCache = readSyncBackupStates();
    }
    inMemoryStatesCache[slotId] = payload;
    writeSyncBackupStates(inMemoryStatesCache);

    // 2. High-capacity asynchronous save to IndexedDB
    try {
      const db = await openStudioDB();
      await new Promise((resolve) => {
        const tx = db.transaction('slots', 'readwrite');
        tx.objectStore('slots').put(payload, slotId);
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      });
    } catch (e) {}

    // 3. Optional Firebase Firestore sync if configured in firebase-config.js
    if (live) {
      try {
        const f = await loadFirebase();
        if (f) {
          await f.fs.setDoc(f.fs.doc(f.db, 'portfolio_slots', String(slotId)), { value: payload }, { merge: true });
        }
      } catch (e) {}
    }
  }

  async function loadAllSlotStates() {
    const syncStates = readSyncBackupStates();
    let dbStates = {};
    try {
      const db = await openStudioDB();
      dbStates = await new Promise((resolve) => {
        const tx = db.transaction('slots', 'readonly');
        const store = tx.objectStore('slots');
        const result = {};
        const cursorReq = store.openCursor();
        cursorReq.onsuccess = (e) => {
          const cursor = e.target.result;
          if (cursor) {
            result[cursor.key] = cursor.value;
            cursor.continue();
          } else {
            resolve(result);
          }
        };
        cursorReq.onerror = () => resolve({});
      });
    } catch (e) {
      dbStates = {};
    }

    const merged = Object.assign({}, dbStates);
    Object.keys(syncStates).forEach((k) => {
      const sVal = syncStates[k];
      const dVal = merged[k];
      if (!dVal) {
        merged[k] = sVal;
      } else if (Array.isArray(sVal) && Array.isArray(dVal)) {
        merged[k] = sVal.length >= dVal.length ? sVal : dVal;
      } else if (sVal && sVal.updatedAt && (!dVal.updatedAt || sVal.updatedAt >= dVal.updatedAt)) {
        merged[k] = sVal;
      }
    });

    if (live) {
      try {
        const f = await loadFirebase();
        if (f) {
          const snap = await f.fs.getDocs(f.fs.collection(f.db, 'portfolio_slots'));
          snap.docs.forEach(d => {
            const remoteVal = d.data() && d.data().value;
            if (remoteVal) merged[d.id] = remoteVal;
          });
        }
      } catch (e) {}
    }

    inMemoryStatesCache = merged;
    writeSyncBackupStates(merged);
    return merged;
  }

  async function saveLinkedFileHandleToDB(handle) {
    linkedFileHandle = handle;
    try {
      const db = await openStudioDB();
      await new Promise((resolve) => {
        const tx = db.transaction('handles', 'readwrite');
        tx.objectStore('handles').put(handle, 'portfolio_html_handle');
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      });
    } catch (e) {}
  }

  async function loadLinkedFileHandleFromDB() {
    if (linkedFileHandle) return linkedFileHandle;
    try {
      const db = await openStudioDB();
      return await new Promise((resolve) => {
        const tx = db.transaction('handles', 'readonly');
        const req = tx.objectStore('handles').get('portfolio_html_handle');
        req.onsuccess = () => {
          linkedFileHandle = req.result || null;
          resolve(linkedFileHandle);
        };
        req.onerror = () => resolve(null);
      });
    } catch (e) {
      return null;
    }
  }

  async function registerCustomSlotInDB(slotId, gridName) {
    const states = await loadAllSlotStates();
    const list = Array.isArray(states.__custom_slots__) ? states.__custom_slots__ : [];
    if (!list.some(item => item.slotId === slotId)) {
      list.push({ slotId, gridName });
      await saveSlotState('__custom_slots__', list);
    }
  }

  async function clearAllSavedStates() {
    try { localStorage.removeItem(LS_STORAGE_KEY); } catch (e) {}
    try { if (window.name && window.name.indexOf(WIN_NAME_PREFIX) === 0) window.name = ''; } catch (e) {}
    inMemoryStatesCache = {};
    try {
      const db = await openStudioDB();
      const tx = db.transaction('slots', 'readwrite');
      tx.objectStore('slots').clear();
    } catch (e) {}
  }

  const DB = {
    live,
    DEMO_ADMIN,
    PORTFOLIO_IMAGES,
    IMAGE_FOLDER,
    FALLBACK_IMAGE_FOLDERS,
    LS_STORAGE_KEY,
    WIN_NAME_PREFIX,
    openStudioDB,
    saveSlotState,
    loadAllSlotStates,
    saveLinkedFileHandleToDB,
    loadLinkedFileHandleFromDB,
    registerCustomSlotInDB,
    clearAllSavedStates
  };

  window.DB = DB;
  // Also expose top-level helpers so inline handlers and existing scripts work seamlessly
  window.PORTFOLIO_IMAGES = PORTFOLIO_IMAGES;
  window.IMAGE_FOLDER = IMAGE_FOLDER;
  window.openStudioDB = openStudioDB;
  window.saveSlotState = saveSlotState;
  window.loadAllSlotStates = loadAllSlotStates;
  window.saveLinkedFileHandleToDB = saveLinkedFileHandleToDB;
  window.loadLinkedFileHandleFromDB = loadLinkedFileHandleFromDB;
  window.registerCustomSlotInDB = registerCustomSlotInDB;
})();
