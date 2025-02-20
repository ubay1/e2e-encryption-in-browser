export async function generateKey() {
  return await window.crypto.subtle.generateKey(
    {
      name: 'AES-GCM',
      length: 128,
    },
    true, // apakah kunci dapat diekspor
    ['encrypt', 'decrypt'],
  )
}

async function importKey(jwk: string) {
  return await window.crypto.subtle.importKey(
    'jwk',
    {
      alg: 'A128GCM',
      ext: true,
      k: jwk,
      key_ops: ['encrypt', 'decrypt'],
      kty: 'oct',
    },
    {
      name: 'AES-GCM',
      length: 128,
    },
    false, // extractable
    ['decrypt'],
  )
}

async function exportKey(key: CryptoKey) {
  return await window.crypto.subtle.exportKey('jwk', key)
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const byteArray = new Uint8Array(buffer)
  let binaryString = ''
  byteArray.forEach((byte) => {
    binaryString += String.fromCharCode(byte)
  })
  return btoa(binaryString) // Convert binary string to Base64
}

export async function encryptData(key: CryptoKey, data: string | undefined) {
  const encodedData = new TextEncoder().encode(data)
  const encryptedData = await window.crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: new Uint8Array(12),
    },
    key,
    encodedData,
  )

  const exportedKey = await exportKey(key)
  return { key: exportedKey.k, data: encryptedData, dataBase64: arrayBufferToBase64(encryptedData) }
}

export async function decryptData(jwk: string, encryptedData: BufferSource) {
  const jwkey = await importKey(jwk)
  const decryptedData = await window.crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: new Uint8Array(12),
    },
    jwkey,
    encryptedData,
  )

  return new TextDecoder().decode(new Uint8Array(decryptedData))
}
