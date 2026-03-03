import { ref } from 'vue';
import { StoryRepository } from '../repositories/StoryRepository';
import { PassageRepository } from '../repositories/PassageRepository';
import { useStoryManager } from '../composables/useStoryManager';

export default {
  name: 'story',
  dependencies: ['db'],

  install(container) {
    const stories = ref([]);
    const allPassages = ref([]);
    const currentStoryId = ref(null);
    const currentFileId = ref(null);

    container.register('stories', () => stories);
    container.register('allPassages', () => allPassages);
    container.register('currentStoryId', () => currentStoryId);
    container.register('currentFileId', () => currentFileId);
    container.register('storyRepo', (c) => new StoryRepository(c.get('db')));
    container.register('passageRepo', (c) => new PassageRepository(c.get('db')));
    container.register('storyManager', (c) => {
      const manager = useStoryManager(
        c.get('storyRepo'),
        c.get('passageRepo'),
        stories,
        allPassages,
        currentStoryId,
        currentFileId
      );
      return manager;
    });
  }
};
