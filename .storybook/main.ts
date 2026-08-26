import type { StorybookConfig } from 'storybook-solidjs-vite'

export default {
  framework: 'storybook-solidjs-vite',
  stories: ['../src/**/*.stories.tsx'],
  addons: ['@storybook/addon-docs'],
} satisfies StorybookConfig
