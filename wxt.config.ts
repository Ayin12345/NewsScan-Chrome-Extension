import { defineConfig } from 'wxt';

export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  manifest: {
    name: "Fake News Reader",
    version: "1.0.0",
    description: "Chrome extension that analyzes web articles for credibility using multiple AI providers",
    permissions: [
      "storage",
      "scripting",
      "activeTab"
    ]
  }
}); 