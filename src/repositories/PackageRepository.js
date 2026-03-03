import { BaseRepository } from './BaseRepository'

export class PackageRepository extends BaseRepository {
  constructor(db) {
    super(db, 'packages')
  }

  async getByStoryId(storyId) {
    const all = await this.getAll()
    return all.filter(p => p.storyId === storyId).sort((a, b) => {
      const orderA = a.order !== undefined ? a.order : a.createdAt
      const orderB = b.order !== undefined ? b.order : b.createdAt
      return orderA - orderB
    })
  }
}
