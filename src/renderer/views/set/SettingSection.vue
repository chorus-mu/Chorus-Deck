<template>
  <div :id="id" :ref="setRef" class="mb-10 w-full flex flex-col">
    <div v-if="title || $slots.title" class="flex items-center gap-3 mb-5 px-1">
      <h2 class="text-xl font-bold tracking-tight text-neutral-900 dark:text-white">
        <slot name="title">{{ title }}</slot>
      </h2>
      <div class="h-1.5 w-1.5 rounded-full bg-primary" />
    </div>

    <div class="flex flex-col gap-2 w-full">
      <slot></slot>
    </div>
  </div>
</template>

<script setup lang="ts">
import { type ComponentPublicInstance } from 'vue';

defineOptions({
  name: 'SettingSection'
});

interface Props {
  id?: string;
  title?: string;
}

withDefaults(defineProps<Props>(), {
  id: '',
  title: ''
});

const emit = defineEmits<{
  ref: [el: Element | null];
}>();

const setRef = (el: Element | ComponentPublicInstance | null) => {
  emit('ref', el as Element | null);
};
</script>
