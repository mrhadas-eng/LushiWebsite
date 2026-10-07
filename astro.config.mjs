import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://www.hagarlushi.com',
  trailingSlash: 'never',
  build: { format: 'directory' },
});
