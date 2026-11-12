<template>
  <CardContent />
</template>

<script setup>
import { provide } from 'vue';
import CardContent from '../components/card/CardContent.vue';
import { useCardView } from '../composables/card/UseCardView.js';

const props = defineProps({
  category: {
    type: String,
    required: true,
  },
  region: {
    type: String,
    required: true,
  },
});

const emit = defineEmits(['home']);

provide('cardView', useCardView(props, emit));
</script>