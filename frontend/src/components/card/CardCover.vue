<template>
  <img v-if="isUrl" :src="cover" alt="">
  <component :is="cover" v-else aria-hidden="true" />
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  cover: { type: [String, Object, Function], required: true },
});

const isUrl = computed(() => typeof props.cover === 'string');
</script>