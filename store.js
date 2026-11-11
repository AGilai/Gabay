// The one State object, kept in memory and saved as a single JSON record in IndexedDB
// ('gabay' / 'kv' / 'state'). Demo mode keeps example data in memory and never saves.
import { emptyState, upgradeState } from './core/backup.js';
                                                       
import { demoState } from './demo.js';

                        
               
                                             
               
                                                          
                         
 

const DB = 'gabay', KV = 'kv', KEY = 'state';

function openDb()                       {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(KV);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function tx   (db             , mode                    , op                                      )             {
  return new Promise((resolve, reject) => {
    const req = op(db.transaction(KV, mode).objectStore(KV));
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function openStore(today         , demo         )                 {
  let db                     = null;
  let state       ;
  if (demo || typeof indexedDB === 'undefined') {
    state = demo ? demoState(today) : emptyState(today);
  } else {
    db = await openDb();
    const saved = await tx                   (db, 'readonly', (s) => s.get(KEY));
    state = saved ? upgradeState(saved) : emptyState(today);
  }
  let prev               = null;
  const listeners = new Set                          ();

  const commit = (next       , label         ) => {
    state = next;
    if (db) tx(db, 'readwrite', (s) => s.put(next, KEY)).catch((e) => console.error('save failed', e));
    for (const fn of listeners) fn(label);
  };

  return {
    demo,
    get: () => state,
    set(next, undoLabel) {
      prev = undoLabel ? state : null;
      commit(next, undoLabel);
    },
    undo() {
      if (!prev) return;
      const back = prev;
      prev = null;
      commit(back);
    },
    subscribe(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
  };
}

export async function requestPersist()                   {
  try {
    return (await navigator.storage?.persist?.()) ?? false;
  } catch {
    return false;
  }
}
