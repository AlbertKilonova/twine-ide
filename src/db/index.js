import { openDB } from 'idb';

export const initDB = async () => {
  return openDB('story_editor', 6, {
    upgrade(db, oldVersion, newVersion) {
      console.log(`检测到数据库版本更新：${oldVersion} -> ${newVersion}`);
      
      if (!db.objectStoreNames.contains('stories')) {
        db.createObjectStore('stories', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('passages')) {
        db.createObjectStore('passages', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('custom_formats')) {
        db.createObjectStore('custom_formats', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('assets')) {
        db.createObjectStore('assets', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('packages')) {
        db.createObjectStore('packages', { keyPath: 'id' });
      }
    },
  });
};
