<template>
  <div class="about">
    <h1>About Page</h1>

    <div v-if="decryptedParam">
      <h3>Parameter yang Didekripsi:</h3>
      <p style="overflow-wrap: anywhere">{{ decryptedParam }}</p>
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
    const decoded = JSON.parse(atob(decodeURIComponent(encryptedParam)))

    const encryptedData = {
      encrypted: decoded.e,
      iv: decoded.iv,
      senderPublicKey: decoded.k,
      encryptedKey: decoded.ek,
    }
    // 3. Dekripsi
    decryptedParam.value = await decryptLargeData(encryptedData, (await getKeyPair()).privateKey)
  } catch (error) {
    console.error('Full decryption error:', error)
    errorMessage.value = 'Gagal mendekripsi. Pastikan URL tidak dimodifikasi.'
  }
})
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
