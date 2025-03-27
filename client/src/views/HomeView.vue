<template>
  <div class="home">
    <h1>Home Page</h1>

    <div class="form-group">
      <label>Masukkan Parameter Rahasia:</label>
      <textarea v-model="secretParam" type="text" placeholder="Parameter rahasia" />
    </div>

    <div class="form-group">
      <label>Public Key Penerima:</label>
      <textarea v-model="recipientPublicKeyJwk" placeholder="Public key halaman About"></textarea>
      <button @click="getOwnPublicKey">Dapatkan Public Key Saya</button>
      <div v-if="recipientShortKey">
        <p>Short Key Anda:</p>
        <code>{{ recipientShortKey }}</code>
      </div>
      <div v-if="ownPublicKey" class="full-key">
        <details>
          <summary>Lihat Full Public Key</summary>
          <pre>{{ ownPublicKey }}</pre>
        </details>
      </div>
    </div>

    <button @click="navigateToAbout">Pergi ke About dengan Parameter Terenkripsi</button>

    <div v-if="encryptedPayloadAsString">
      <h3>Payload Terenkripsi:</h3>
      <pre>{{ encryptedPayloadAsString }}</pre>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  decryptData,
  encryptData,
  encryptLargeData,
  expandShortKey,
  generateKeyPair,
  getKeyPair,
  type EncryptedData,
} from '../utils/crypto2'
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const secretParam = ref('')
const recipientPublicKeyJwk = ref('')
const encryptedPayload = ref<EncryptedData | null>(null)
const encryptedPayloadAsString = ref<string | null>(null)
const ownPublicKey = ref('')
const recipientShortKey = ref('')

// Fungsi untuk memendekkan public key
const shortenPublicKey = (publicKey: JsonWebKey): string => {
  // Ambil beberapa karakter unik dari public key
  const keyStr = JSON.stringify(publicKey)
  // Gunakan hash atau ambil bagian tertentu
  return btoa(keyStr).substring(0, 16) // 16 karakter pertama dari base64
}

// Fungsi untuk mendapatkan short key pengirim
const getShortKey = async (): Promise<string> => {
  const keys = await getKeyPair()
  return generateShortKey(keys.publicKey)
}

// Fungsi generate short key (simpan di utils jika perlu digunakan di banyak tempat)
const generateShortKey = (publicKey: JsonWebKey): string => {
  return btoa(JSON.stringify(publicKey)).substr(0, 12)
}

const getOwnShortKey = async () => {
  try {
    const keys = await getKeyPair()
    recipientShortKey.value = generateShortKey(keys.publicKey)
  } catch (error) {
    console.error('Error getting key:', error)
  }
}

const navigateToAbout = async () => {
  if (!secretParam.value || !recipientPublicKeyJwk.value) {
    alert('Harap isi semua field!')
    return
  }

  try {
    // Parse recipient public key
    // 1. Dapatkan full public key dari short key
    const recipientPublicKey = await expandShortKey(recipientShortKey.value)

    // Enkripsi parameter
    const encrypted = await encryptLargeData(secretParam.value, recipientPublicKey)
    encryptedPayload.value = encrypted

    // Buat payload yang lebih ringkas
    const payload = {
      e: encrypted.encrypted,
      iv: encrypted.iv,
      ek: encrypted.encryptedKey,
      k: await getShortKey(),
    }

    // Konversi ke string untuk URL
    const encryptedString = encodeURIComponent(btoa(JSON.stringify(payload)))
    encryptedPayloadAsString.value = encryptedString

    // Navigasi ke About dengan parameter terenkripsi
    router.push({
      name: 'about',
      query: {
        _d: encryptedString, // Gunakan nama parameter yang lebih pendek
      },
    })
  } catch (error) {
    console.error('Encryption error:', error)
    alert('Gagal mengenkripsi parameter!')
  }
}

const getOwnPublicKey = async () => {
  try {
    const keys = await getKeyPair()
    ownPublicKey.value = JSON.stringify(keys.publicKey, null, 2)
    recipientShortKey.value = shortenPublicKey(keys.publicKey)
    recipientPublicKeyJwk.value = recipientShortKey.value
  } catch (error) {
    console.error('Error getting public key:', error)
    alert('Gagal mendapatkan public key!')
  }
}

async function keyPairExists(): Promise<boolean> {
  try {
    await getKeyPair()
    return true
  } catch {
    return false
  }
}
onMounted(async () => {
  try {
    // Initialize keys if not exists
    if (!(await keyPairExists())) {
      await generateKeyPair()
    }
  } catch (error) {
    console.error('Initialization error:', error)
  }
})
</script>

<style>
.home {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
  color: #fff;
}

.form-group {
  margin-bottom: 20px;
  padding: 15px;
  border: 1px solid #eee;
  border-radius: 5px;
}

label {
  display: block;
  margin-bottom: 5px;
  font-weight: bold;
}

input,
textarea {
  width: 100%;
  padding: 8px;
  margin-bottom: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
}

button {
  padding: 8px 12px;
  background-color: #42b983;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  margin-right: 10px;
}

button:hover {
  background-color: #369f6b;
}

pre {
  background: #f4f4f4;
  color: #000;
  padding: 10px;
  border-radius: 4px;
  overflow-x: auto;
  font-size: 0.9em;
}
</style>
