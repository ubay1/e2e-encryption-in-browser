<template>
  <router-view />
</template>

<script>
import { onMounted } from 'vue'
import sodium from 'libsodium-wrappers'

export default {
  name: 'App',
  setup() {
    onMounted(async () => {
      await sodium.ready
      console.log('Sodium is ready')
    })
  },
}
</script>

<style>
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  color: #2c3e50;
}
</style>
