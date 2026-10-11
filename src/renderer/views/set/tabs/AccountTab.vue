<template>
  <div class="flex flex-col gap-6">
    <!-- Account Settings -->
    <setting-section title="Settings">
      <setting-item
        icon="ri-login-circle-line"
        title="Login"
        description="Sign in to your account"
        @click="handleLoginClick"
        :clickable="true"
        class="cursor-pointer"
      />
    </setting-section>

  </div>
</template>

<script setup lang="ts">
import SettingSection from '../SettingSection.vue';
import SettingItem from '../SettingItem.vue';

const emit = defineEmits(['navigate']);

const handleLoginClick = () => {
  // Logic for login
};
</script>

