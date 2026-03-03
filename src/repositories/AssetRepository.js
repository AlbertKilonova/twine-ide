import { BaseRepository } from './BaseRepository'

export class AssetRepository extends BaseRepository {
  constructor(db) {
    super(db, 'assets')
  }

  async getByStoryId(storyId) {
    const all = await this.getAll()
    return all.filter(a => a.storyId === storyId)
  }
}
