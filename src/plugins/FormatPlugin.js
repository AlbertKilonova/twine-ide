import { useFormatManager } from '../composables/useFormatManager';

export default {
  name: 'format',
  dependencies: ['db'],

  install(container) {
    container.register('formatManager', (c) => useFormatManager(c.get('db')));
  }
};
