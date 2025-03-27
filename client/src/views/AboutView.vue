<template>
  <div class="about">
    <h1>About Page</h1>

    <div v-if="decryptedParam">
      <h3>Parameter yang Didekripsi:</h3>
      <p>{{ decryptedParam }}</p>
    </div>

    <div v-else-if="errorMessage">
      <p class="error">{{ errorMessage }}</p>
    </div>

    <div v-else>
      <p>Tidak ada parameter terenkripsi yang ditemukan.</p>
    </div>

    <router-link to="/">Kembali ke Home</router-link>
  </div>
</template>

<script setup lang="ts">
import { decryptData, decryptLargeData, getKeyPair } from '../utils/crypto2'
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()
const decryptedParam = ref('')
const errorMessage = ref('')

const safeAtob = (str: string): string | null => {
  try {
    // Decode URL component terlebih dahulu
    const decoded = decodeURIComponent(str)
    // Hapus whitespace dan karakter tambahan
    const clean = decoded.replace(/\s/g, '')
    return atob(clean)
  } catch (error) {
    console.error('Base64 decode error:', error)
    return null
  }
}

onMounted(async () => {
  const encryptedParam = route.query._d as string
  if (!encryptedParam) return

  try {
    // 1. Decode base64 dengan error handling
    // const decodedString = safeAtob(encryptedParam)
    // if (!decodedString) {
    //   throw new Error('Format data tidak valid (base64 error)')
    // }

    // 2. Parse JSON
    // const encryptedData = JSON.parse(decodedString) as {
    //   e: string // encrypted data
    //   n: string // nonce
    //   k: string // sender's short key
    // }
    const decoded = JSON.parse(atob(decodeURIComponent(encryptedParam)))

    // 2. Siapkan encrypted data
    const encryptedData = {
      encrypted: decoded.e,
      iv: decoded.iv,
      senderPublicKey: decoded.k,
      encryptedKey: decoded.ek,
    }
    // 3. Dekripsi
    decryptedParam.value = await decryptLargeData(encryptedData, (await getKeyPair()).privateKey)

    // 3. Dapatkan full public key dari short key
    // (Di aplikasi nyata, ini akan query ke backend)
    // const senderPublicKey = await getFullKeyFromShort(encryptedData.k)

    // // 4. Siapkan payload untuk dekripsi
    // const decryptionPayload = {
    //   encrypted: encryptedData.e,
    //   nonce: encryptedData.n,
    //   iv: encryptedData.n,
    //   senderPublicKey,
    // }

    // // 5. Dekripsi data
    // decryptedParam.value = await decryptData(decryptionPayload)
  } catch (error) {
    console.error('Full decryption error:', error)
    errorMessage.value = 'Gagal mendekripsi. Pastikan URL tidak dimodifikasi.'
  }
})

// Fungsi untuk mendapatkan full key dari short key
// (Implementasi nyata akan query ke backend/database)
const getFullKeyFromShort = async (shortKey: string): Promise<JsonWebKey> => {
  // Di aplikasi nyata:
  // return await fetch(`/api/keys/${shortKey}`).then(res => res.json())

  // Untuk demo, gunakan key lokal
  const keys = await getKeyPair()
  return keys.publicKey
}
</script>

<style>
.about {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
  text-align: center;
}

.error {
  color: #ff6b6b;
  background: rgba(255, 107, 107, 0.1);
  padding: 10px;
  border-radius: 4px;
}

a {
  color: #42b983;
  text-decoration: none;
  margin-top: 20px;
  display: inline-block;
}
</style>
