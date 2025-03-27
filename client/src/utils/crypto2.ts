// utils/crypto.ts
// utils/crypto.ts
interface KeyPair {
  publicKey: JsonWebKey;
  privateKey: JsonWebKey;
}

export interface EncryptedData {
  encrypted: string;
  iv: string;
  nonce?: string
  encryptedKey?: string;
  senderPublicKey: JsonWebKey;
}

export const expandShortKey = async (shortKey: string): Promise<JsonWebKey> => {
  // Di aplikasi nyata, ini akan query ke database/server
  // Untuk demo, kita akan return hardcoded key atau gunakan key lokal
  const keys = await getKeyPair();
  return keys.publicKey;

  // Atau jika Anda punya sistem mapping shortKey-fullKey:
  // return fetchFullKeyFromBackend(shortKey);
};

// Helper function to get object store
const getObjectStore = (db: IDBDatabase, storeName: string, mode: IDBTransactionMode) => {
  const tx = db.transaction(storeName, mode);
  return tx.objectStore(storeName);
};

// Inisialisasi database IndexedDB
const initDB = () => {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open('CryptoDB', 1);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains('keys')) {
        db.createObjectStore('keys', { keyPath: 'id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

// Generate dan simpan key pair
export const generateKeyPair = async (): Promise<KeyPair> => {
  try {
    // Generate RSA-OAEP key pair
    const keyPair = await crypto.subtle.generateKey(
      {
        name: 'RSA-OAEP',
        modulusLength: 2048,
        publicExponent: new Uint8Array([1, 0, 1]),
        hash: 'SHA-256',
      },
      true,
      ['encrypt', 'decrypt']
    );

    // Ekspor keys ke format JWK
    const publicKey = await crypto.subtle.exportKey('jwk', keyPair.publicKey);
    const privateKey = await crypto.subtle.exportKey('jwk', keyPair.privateKey);

    // Simpan ke IndexedDB
    const db = await initDB();
    const store = getObjectStore(db, 'keys', 'readwrite');
    const request = store.put({ id: 'userKeyPair', publicKey, privateKey });

    return new Promise<KeyPair>((resolve, reject) => {
      request.onsuccess = () => resolve({ publicKey, privateKey });
      request.onerror = (event) => {
        reject((event.target as IDBRequest).error);
      };
    });
  } catch (error) {
    console.error('Key generation error:', error);
    throw error;
  }
};

// Ambil key pair dari IndexedDB
export const getKeyPair = async (): Promise<KeyPair> => {
  try {
    const db = await initDB();
    const store = getObjectStore(db, 'keys', 'readonly');
    const request = store.get('userKeyPair');

    return new Promise<KeyPair>((resolve, reject) => {
      request.onsuccess = () => {
        const result = request.result;
        if (!result) {
          reject(new Error('Key pair not found in database'));
          return;
        }
        resolve({
          publicKey: result.publicKey,
          privateKey: result.privateKey,
        });
      };
      request.onerror = (event) => {
        reject((event.target as IDBRequest).error);
      };
    });
  } catch (error) {
    console.error('Error retrieving keys:', error);
    throw error;
  }
};

// Helper functions
const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
  return btoa(String.fromCharCode(...new Uint8Array(buffer)));
};

const base64ToArrayBuffer = (base64: string): ArrayBuffer => {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
};

// Enkripsi data
export const encryptData = async (
  data: string,
  recipientPublicKey: JsonWebKey
): Promise<EncryptedData> => {
  try {
    // Import recipient public key
    const publicKey = await crypto.subtle.importKey(
      'jwk',
      recipientPublicKey,
      { name: 'RSA-OAEP', hash: 'SHA-256' },
      false,
      ['encrypt']
    );

    // Generate IV (Initialization Vector)
    const iv = crypto.getRandomValues(new Uint8Array(12));

    // Enkripsi data
    const encrypted = await crypto.subtle.encrypt(
      {
        name: 'RSA-OAEP',
      },
      publicKey,
      new TextEncoder().encode(data)
    );

    // Dapatkan public key pengirim
    const keyPair = await getKeyPair();

    return {
      encrypted: arrayBufferToBase64(encrypted),
      iv: arrayBufferToBase64(iv),
      senderPublicKey: keyPair.publicKey,
    };
  } catch (error) {
    console.error('Encryption error:', error);
    throw error;
  }
};

// Dekripsi data
export const decryptData = async (
  encryptedData: EncryptedData
): Promise<string> => {
  try {
    // Import private key
    const keyPair = await getKeyPair();
    const privateKey = await crypto.subtle.importKey(
      'jwk',
      keyPair.privateKey,
      { name: 'RSA-OAEP', hash: 'SHA-256' },
      false,
      ['decrypt']
    );

    // Dekripsi data
    const decrypted = await crypto.subtle.decrypt(
      {
        name: 'RSA-OAEP',
      },
      privateKey,
      base64ToArrayBuffer(encryptedData.encrypted)
    );

    return new TextDecoder().decode(decrypted);
  } catch (error) {
    console.error('Decryption error:', error);
    throw error;
  }
};

// Fungsi enkripsi hybrid
export const encryptLargeData = async (data: any, publicKeyJwk: JsonWebKey): Promise<EncryptedData> => {
  try {
    // 1. Generate random AES key
    const aesKey = await crypto.subtle.generateKey(
      { name: "AES-GCM", length: 256 },
      true,
      ["encrypt", "decrypt"]
    );

    // 2. Enkripsi data dengan AES
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encodedData = new TextEncoder().encode(JSON.stringify(data));
    const encrypted = await crypto.subtle.encrypt(
      { name: "AES-GCM", iv },
      aesKey,
      encodedData
    );

    // 3. Enkripsi AES key dengan RSA
    const publicKey = await crypto.subtle.importKey(
      "jwk",
      publicKeyJwk,
      { name: "RSA-OAEP", hash: "SHA-256" },
      false,
      ["encrypt"]
    );
    const encryptedAesKey = await crypto.subtle.encrypt(
      { name: "RSA-OAEP" },
      publicKey,
      await crypto.subtle.exportKey("raw", aesKey)
    );

    return {
      encrypted: arrayBufferToBase64(encrypted),
      iv: arrayBufferToBase64(iv),
      encryptedKey: arrayBufferToBase64(encryptedAesKey),
      senderPublicKey: publicKeyJwk // opsional
    };
  } catch (error) {
    console.error("Encryption error:", error);
    throw error;
  }
};

// Fungsi dekripsi hybrid
export const decryptLargeData = async (encryptedData: EncryptedData, privateKeyJwk: JsonWebKey): Promise<any> => {
  try {
    // 1. Dekripsi AES key dengan RSA
    const privateKey = await crypto.subtle.importKey(
      "jwk",
      privateKeyJwk,
      { name: "RSA-OAEP", hash: "SHA-256" },
      false,
      ["decrypt"]
    );
    const aesKey = await crypto.subtle.decrypt(
      { name: "RSA-OAEP" },
      privateKey,
      base64ToArrayBuffer(encryptedData.encryptedKey as string)
    );

    // 2. Import AES key
    const key = await crypto.subtle.importKey(
      "raw",
      aesKey,
      { name: "AES-GCM" },
      false,
      ["decrypt"]
    );

    // 3. Dekripsi data dengan AES
    const decrypted = await crypto.subtle.decrypt(
      {
        name: "AES-GCM",
        iv: base64ToArrayBuffer(encryptedData.iv)
      },
      key,
      base64ToArrayBuffer(encryptedData.encrypted)
    );

    return JSON.parse(new TextDecoder().decode(decrypted));
  } catch (error) {
    console.error("Decryption error:", error);
    throw error;
  }
};
