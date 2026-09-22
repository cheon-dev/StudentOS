import { collection, doc, getDocs, writeBatch, type DocumentData, type DocumentReference } from 'firebase/firestore'
import { db } from '../firebase/config.ts'

const userCollections = ['subjects', 'tasks', 'events', 'notes', 'projects', 'studySessions', 'expenses', 'settings', 'files', 'inventory', 'reviewers', 'quizAttempts', 'notifications', 'vaultConfig', 'vaultEntries'] as const

async function collectUserDataReferences(uid: string) {
  const references: DocumentReference<DocumentData>[] = []
  for (const collectionName of userCollections) {
    const snapshot = await getDocs(collection(db, 'users', uid, collectionName))
    snapshot.docs.forEach((entry) => references.push(entry.ref))
    if (collectionName === 'reviewers') {
      for (const reviewer of snapshot.docs) {
        const questions = await getDocs(collection(db, 'users', uid, 'reviewers', reviewer.id, 'questions'))
        questions.docs.forEach((question) => references.push(question.ref))
      }
    }
  }
  references.push(doc(db, 'users', uid))
  return references
}

export async function deleteUserFirestoreData(uid: string) {
  const references = await collectUserDataReferences(uid)
  for (let index = 0; index < references.length; index += 450) {
    const batch = writeBatch(db)
    references.slice(index, index + 450).forEach((reference) => batch.delete(reference))
    await batch.commit()
  }
}
