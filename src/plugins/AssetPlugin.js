import { AssetRepository } from '../repositories/AssetRepository';
import { useAssetService } from '../composables/useAssetService';

export default {
  name: 'asset',
  dependencies: ['db'],

  install(container) {
    container.register('assetRepo', (c) => new AssetRepository(c.get('db')));
    container.register('assetService', (c) => useAssetService(c.get('assetRepo')));
  }
};
