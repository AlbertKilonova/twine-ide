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
    const plain = JSON.parse(JSON.stringify(item))
    await db.put(this.storeName, plain)
    return plain
  }

  async delete(id) {
    const db = this.getDB()
    if (!db) return
    await db.delete(this.storeName, id)
  }
}
