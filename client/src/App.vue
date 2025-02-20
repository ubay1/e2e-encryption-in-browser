<script lang="ts">
import { ref } from 'vue'
import { generateKey, encryptData, decryptData } from './utils/crypto'

export default {
  setup() {
    const message = ref('')
    const encryptedMessage = ref<BufferSource | undefined>()
    const decryptedMessage = ref('')
    let key: CryptoKey
    let jwk: string

    const encryptMessage = async () => {
      key = await generateKey()
      const { key: exportedKey, data, dataBase64 } = await encryptData(key, message.value)
      console.log('encrypted Data = ', data)
      console.log('encrypted Data Base64 = ', dataBase64)
      console.log('exportedKey = ', exportedKey)
      jwk = exportedKey as string
      encryptedMessage.value = data

      // encrypt with content-type application/octet-stream
      // try {
      //   const res = await fetch(`http://localhost:5000/test-enkrip?key=${jwk}`, {
      //     method: 'POST',
      //     headers: {
      //       'Content-Type': 'application/octet-stream',
      //     },
      //     body: data,
      //   })
      //   const getHeaderKey = res.headers.get('key')

      //   const resBuffer = await res.arrayBuffer()
      //   console.log('resBuffer = ', resBuffer)

      //   const decryptedFromApi = await decryptData(getHeaderKey as string, resBuffer)
      //   // console.log('decryptedFromApi = ', decryptedFromApi)
      //   decryptedMessage.value = decryptedFromApi
      // } catch (error) {}

      // encrypt with content-type application/json
      try {
        const res = await fetch(`http://localhost:5000/test-enkripsi?key=${jwk}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ data: dataBase64 }),
        })
        const getHeaderKey = res.headers.get('key')

        const resBuffer = await res.arrayBuffer()

        const decryptedFromApi = await decryptData(getHeaderKey as string, resBuffer)
        decryptedMessage.value = decryptedFromApi
      } catch (error) {}
    }

    const decryptMessage = async () => {
      if (encryptedMessage.value) {
        const decrypted = await decryptData(jwk, encryptedMessage.value)
        console.log('decrypted = ', decrypted)
        decryptedMessage.value = decrypted
      }
    }

    return {
      message,
      encryptedMessage,
      decryptedMessage,
      encryptMessage,
      decryptMessage,
    }
  },
}
</script>

<template>
  <div>
    <h1>End-to-End Encryption Example</h1>
    <input v-model="message" placeholder="Enter message" />
    <button @click="encryptMessage">Encrypt</button>
    <button @click="decryptMessage">Decrypt</button>
    <p>Encrypted: {{ encryptedMessage }}</p>
    <p>Decrypted: {{ decryptedMessage }}</p>
  </div>
</template>

<style scoped>
/* Add your styles here */
</style>
