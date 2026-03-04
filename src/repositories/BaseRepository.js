export class BaseRepository {
  constructor(db, storeName) {
    this.db = db
    this.storeName = storeName
  }

  getDB() {
    // 兼容 ref 和直接对象
    return this.db.value !== undefined ? this.db.value : this.db
  }

  async getAll() {
    const db = this.getDB()
    if (!db) return []
    return await db.getAll(this.storeName)
  }

  async getById(id) {
    const db = this.getDB()
    if (!db) return null
    return await db.get(this.storeName, id)
  }

  async save(item) {
    const db = this.getDB()
    if (!db) throw new Error('数据库未初始化喵')
    
    // 手动克隆，保留 Blob/File 等不可序列化对象
    const plain = {}
    for (const key in item) {
      if (!item.hasOwnProperty(key)) continue
      const val = item[key]
      
      // 保留 Blob/File 对象
      if (val instanceof Blob || val instanceof File) {
        plain[key] = val
      } else if (val !== undefined && val !== null) {
        // 其他值尝试深拷贝
        try {
          plain[key] = JSON.parse(JSON.stringify(val))
        } catch {
          plain[key] = val
        }
      } else {
        plain[key] = val
      }
    }
    
    await db.put(this.storeName, plain)
    return plain
  }

  async delete(id) {
    const db = this.getDB()
    if (!db) return
    await db.delete(this.storeName, id)
  }
}
