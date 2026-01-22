// @ts-check
import { defineConfig } from 'astro/config';
import node from '@astrojs/node';
import tailwind from '@astrojs/tailwind';

// https://astro.build/config
export default defineConfig({
  output: 'server',
  adapter: node({
    mode: 'standalone'
  }),
  integrations: [tailwind({
    applyBaseStyles: false
  })],
  vite: {
    server: {
      allowedHosts: ['animein.nontonin.site', 'dramain.nontonin.site', 'nontonin.site']
    },
    preview: {
      allowedHosts: ['animein.nontonin.site', 'dramain.nontonin.site', 'nontonin.site']
    }
  }
});