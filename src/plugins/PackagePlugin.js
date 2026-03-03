import { PackageRepository } from '../repositories/PackageRepository';
import { usePackageManager } from '../composables/usePackageManager';

export default {
  name: 'package',
  dependencies: ['db'],

  install(container) {
    container.register('packageRepo', (c) => new PackageRepository(c.get('db')));
    container.register('packageManager', (c) => usePackageManager(c.get('packageRepo')));
  }
};
