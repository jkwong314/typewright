import { openDB, IDBPDatabase } from 'idb'

const DB_NAME = 'typproject-db'
const DB_VERSION = 1
const STORE_NAME = 'fonts'

let dbPromise: Promise<IDBPDatabase> | null = null

function getDB(): Promise<IDBPDatabase> {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME)
        }
      },
    })
  }
  return dbPromise
}

export async function saveFontBinary(id: string, buffer: ArrayBuffer): Promise<void> {
  const db = await getDB()
  await db.put(STORE_NAME, buffer, id)
}

export async function getFontBinary(id: string): Promise<ArrayBuffer | undefined> {
  const db = await getDB()
  return db.get(STORE_NAME, id)
}

export async function deleteFontBinary(id: string): Promise<void> {
  const db = await getDB()
  await db.delete(STORE_NAME, id)
}

export async function getAllFontIds(): Promise<string[]> {
  const db = await getDB()
  const keys = await db.getAllKeys(STORE_NAME)
  return keys as string[]
}
