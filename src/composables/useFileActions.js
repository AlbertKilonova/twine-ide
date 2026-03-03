import { useImport } from './useImport';
import { useExport } from './useExport';
import { useBuild } from './useBuild';

export function useFileActions(db, stories, allPassages, currentStoryId, assets, packages) {

  const importer = useImport(db, stories, allPassages, assets);
  const exporter = useExport(assets, packages, currentStoryId);
  const builder = useBuild(assets, packages);

  return {
    handleExport: exporter.exportStory,
    handleImportFile: importer.importFile,
    handlePreview: builder.preview,
    handleBuild: builder.build,
    handleBuildSingleFile: builder.buildSingleFile
  };
}
