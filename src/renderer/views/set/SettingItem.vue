<template>
  <div
    class="setting-item flex items-center justify-between px-4 py-4 transition-all duration-200 text-neutral-900 dark:text-white rounded-xl bg-neutral-50/50 dark:bg-neutral-900/30 hover:bg-neutral-50 dark:hover:bg-neutral-900/60"
    :class="[
      { 'max-md:flex-col max-md:items-start max-md:gap-3': !inline },
      { 'cursor-pointer active:scale-[0.99]': clickable },
      customClass
    ]"
    @click="handleClick"
  >
    <div class="flex-1 min-w-0 mr-4 flex items-center gap-4">
      <div
        v-if="icon"
        class="w-11 h-11 flex-shrink-0 flex items-center justify-center rounded-xl bg-primary/10 text-primary"
      >
        <i :class="[icon, 'text-xl']"></i>
      </div>
      <div
        v-if="$slots.icon"
        class="w-11 h-11 flex-shrink-0 flex items-center justify-center rounded-xl bg-primary/10 text-primary"
      >
        <slot name="icon"></slot>
      </div>

      <div class="flex-1 min-w-0">
        <div class="text-sm font-semibold mb-0.5 group-hover:text-primary transition-colors">
          <slot name="title">{{ title }}</slot>
        </div>
        <div
          v-if="description || $slots.description"
          class="text-xs text-neutral-500 dark:text-neutral-400 leading-snug"
        >
          <slot name="description">{{ description }}</slot>
        </div>

        <div v-if="$slots.extra" class="mt-2">
          <slot name="extra"></slot>
        </div>
      </div>
    </div>

    <div
      v-if="$slots.action || $slots.default"
      class="flex items-center gap-2 flex-shrink-0"
      :class="{ 'max-md:w-full max-md:justify-end': !inline }"
    >
      <slot name="action">
        <slot></slot>
      </slot>
    </div>
  </div>
</template>

<script setup lang="ts">
defineOptions({
  name: 'SettingItem'
});

interface Props {
  title?: string;
  description?: string;
  icon?: string;
  clickable?: boolean;
  inline?: boolean;
  customClass?: string;
}

const props = withDefaults(defineProps<Props>(), {
  title: '',
  description: '',
  icon: '',
  clickable: false,
  inline: false,
  customClass: ''
});

const emit = defineEmits<{
  click: [event: MouseEvent];
}>();

const handleClick = (event: MouseEvent) => {
  if (props.clickable) {
    emit('click', event);
  }
};
</script>
