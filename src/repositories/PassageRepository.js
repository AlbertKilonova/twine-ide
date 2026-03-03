import { BaseRepository } from './BaseRepository'

export class PassageRepository extends BaseRepository {
  constructor(db) {
    super(db, 'passages')
  }

  async getByStoryId(storyId) {
    const all = await this.getAll()
    return all.filter(p => p.storyId === storyId)
  }

  async saveMany(items) {
    const db = this.getDB()
    if (!db) return
    const tx = db.transaction(this.storeName, 'readwrite')
    for (const item of items) {
      await tx.store.put(JSON.parse(JSON.stringify(item)))
    }
    await tx.done
  }
}
