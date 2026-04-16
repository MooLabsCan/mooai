<script setup>
import { computed } from 'vue'
import openaiLogoUrl from '../assets/openai.svg'
import { CHAT_MODELS, DEFAULT_CHAT_MODEL } from '../services/chatAI'

const props = defineProps({
  model: { type: String, default: DEFAULT_CHAT_MODEL },
  models: { type: Array, default: () => CHAT_MODELS },
  disabled: { type: Boolean, default: false }
})

const emit = defineEmits(['update:model'])

const value = computed({
  get: () => props.model,
  set: (val) => emit('update:model', val)
})

// Consider OpenAI models those starting with 'gpt-' or 'o' (e.g., o4-mini, o3-mini)
const isOpenAI = computed(() => /^(gpt-|o\d|o)/i.test(value.value))
</script>

<template>
  <label class="model-select">
    <span class="label">Model</span>
    <div class="select-wrap">
      <img v-if="isOpenAI" :src="openaiLogoUrl" alt="OpenAI" class="vendor-icon" />
      <select v-model="value" :disabled="disabled" aria-label="Select model">
        <optgroup label="OpenAI">
          <option v-for="m in props.models" :key="m" :value="m">{{ m }}</option>
        </optgroup>
        <optgroup label="Claude — Coming Soon" class="coming-soon">
          <option disabled value="">claude-opus-4</option>
          <option disabled value="">claude-sonnet-4</option>
          <option disabled value="">claude-haiku-4</option>
        </optgroup>
      </select>
    </div>
  </label>
</template>

<style scoped>
.model-select {
  display: inline-flex;
  align-items: center;
  gap: .5rem;
}
.label {
  font-size: .85rem;
  color: var(--muted-foreground);
}
.select-wrap { display: inline-flex; align-items: center; gap: .4rem; }
.vendor-icon { width: 18px; height: 18px; display: inline-block; }
select {
  appearance: none;
  -webkit-appearance: none;
  -moz-appearance: none;
  padding: .5rem .75rem;
  border-radius: .5rem;
  border: 1px solid var(--border);
  background: var(--muted);
  color: var(--foreground);
}
select:disabled {
  opacity: .6;
  cursor: not-allowed;
}
</style>
