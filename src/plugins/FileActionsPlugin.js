import { useFileActions } from '../composables/useFileActions';

export default {
  name: 'fileActions',
  dependencies: ['storyManager', 'assetService', 'packageManager'],

  install(container) {
    container.register('fileActions', (c) => {
      return useFileActions(
        c.get('db'),
        c.get('stories'),
        c.get('allPassages'),
        c.get('currentStoryId'),
        c.get('assetService').assets,
        c.get('packageManager').packages
      );
    });
  }
};
