import { ref } from 'vue'

export function useAssetService(assetRepo) {
  const assets = ref([])

  const loadAssets = async (storyId) => {
    if (!storyId) {
      assets.value = []
      return
    }

    // 清理旧 Blob URLs
    assets.value.forEach(a => {
      if (a.url) URL.revokeObjectURL(a.url)
    })

    const list = await assetRepo.getByStoryId(storyId)
    assets.value = list.map(a => ({
      ...a,
      url: URL.createObjectURL(a.data)
    }))
  }

  const uploadAsset = async (file, storyId) => {
    if (!storyId) throw new Error('请先选择故事喵')

    const duplicate = assets.value.find(a => a.name === file.name)
    if (duplicate) throw new Error(`已存在同名资源"${file.name}"喵`)

    const id = `asset_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`
    const assetData = {
      id, storyId,
      name: file.name,
      type: file.type,
      size: file.size,
      data: file,
      createdAt: Date.now()
    }

    await assetRepo.save(assetData)
    const assetForUI = { ...assetData, url: URL.createObjectURL(file) }
    assets.value.push(assetForUI)
    return assetForUI
  }

  const removeAsset = async (id) => {
    const asset = assets.value.find(a => a.id === id)
    if (!asset) return

    await assetRepo.delete(id)
    const idx = assets.value.findIndex(a => a.id === id)
    if (idx !== -1) {
      if (assets.value[idx].url) URL.revokeObjectURL(assets.value[idx].url)
      assets.value.splice(idx, 1)
    }
  }

  const renameAsset = async (id, newName) => {
    const duplicate = assets.value.find(a => a.id !== id && a.name === newName)
    if (duplicate) throw new Error(`已存在同名资源"${newName}"喵`)

    const assetData = await assetRepo.getById(id)
    if (assetData) {
      assetData.name = newName
      await assetRepo.save(assetData)
    }

    const idx = assets.value.findIndex(a => a.id === id)
    if (idx !== -1) assets.value[idx].name = newName
  }

  return { assets, loadAssets, uploadAsset, removeAsset, renameAsset }
}
