import {
    ref
} from 'vue'
import {
    initDB
} from '../db/index.js'

export function useDatabase() {
    const db = ref(null)

    const ensureDB = async () => {
        if (!db.value) db.value = await initDB()
        return db.value
    }

    const getAll = async (store) => {
        const _db = await ensureDB()
        return await _db.getAll(store)
    }

    const putItem = async (store, item) => {
        const _db = await ensureDB()
        return await _db.put(store, JSON.parse(JSON.stringify(item)))
    }

    const deleteItem = async (store, id) => {
        const _db = await ensureDB()
        return await _db.delete(store, id)
    }

    return {
        getAll,
        putItem,
        deleteItem
    }
}