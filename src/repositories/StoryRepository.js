import { BaseRepository } from './BaseRepository'

export class StoryRepository extends BaseRepository {
  constructor(db) {
    super(db, 'stories')
  }
}
