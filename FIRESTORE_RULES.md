# StudentOS Firestore Rules

Copy the complete block below into the Firebase Console Firestore Rules editor.

```firestore
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {

    function isOwner(userId) {
      return request.auth != null
        && request.auth.uid == userId;
    }

    match /users/{userId} {
      allow read, write: if isOwner(userId);
    }

    match /users/{userId}/subjects/{subjectId} {
      allow read, write: if isOwner(userId);
    }

    match /users/{userId}/tasks/{taskId} {
      allow read, write: if isOwner(userId);
    }

    match /users/{userId}/events/{eventId} {
      allow read, write: if isOwner(userId);
    }

    match /users/{userId}/notes/{noteId} {
      allow read, write: if isOwner(userId);
    }

    match /users/{userId}/projects/{projectId} {
      allow read, write: if isOwner(userId);
    }

    match /users/{userId}/studySessions/{sessionId} {
      allow read, write: if isOwner(userId);
    }

    match /users/{userId}/expenses/{expenseId} {
      allow read, write: if isOwner(userId);
    }

    match /users/{userId}/settings/{settingId} {
      allow read, write: if isOwner(userId);
    }

    match /users/{userId}/files/{fileId} {
      allow read, write: if isOwner(userId);
    }

    match /users/{userId}/inventory/{itemId} {
      allow read, write: if isOwner(userId);
    }

    match /users/{userId}/reviewers/{reviewerId} {
      allow read, write: if isOwner(userId);
    }

    match /users/{userId}/reviewers/{reviewerId}/questions/{questionId} {
      allow read, write: if isOwner(userId);
    }

    match /users/{userId}/quizAttempts/{attemptId} {
      allow read, write: if isOwner(userId);
    }

    match /users/{userId}/notifications/{notificationId} {
      allow read, write: if isOwner(userId);
    }

    match /users/{userId}/vaultConfig/{configId} {
      allow read, delete: if isOwner(userId) && configId == 'config';
      allow create, update: if isOwner(userId)
        && configId == 'config'
        && request.resource.data.keys().hasAll(['salt', 'verificationCiphertext', 'verificationIv', 'kdf', 'iterations', 'algorithm', 'version', 'entrySetId'])
        && !request.resource.data.keys().hasAny(['masterPassword', 'password']);
    }

    match /users/{userId}/vaultEntries/{entryId} {
      allow read, delete: if isOwner(userId);
      allow create, update: if isOwner(userId)
        && request.resource.data.keys().hasAll(['ciphertext', 'iv', 'version', 'entrySetId', 'createdAt', 'updatedAt'])
        && !request.resource.data.keys().hasAny(['name', 'username', 'password', 'website', 'notes', 'masterPassword']);
    }
  }
}
```
