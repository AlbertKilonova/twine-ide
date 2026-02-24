import { openDB } from 'idb';

export const initDB = async () => {
  return openDB('story_editor', 1, {
    upgrade(db, oldVersion, newVersion) {
      console.log(`检测到数据库升级：${oldVersion} -> ${newVersion}`);
      
      if (!db.objectStoreNames.contains('stories')) {
        db.createObjectStore('stories', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('passages')) {
        db.createObjectStore('passages', { keyPath: 'id' });
      }
    },
  });
};
