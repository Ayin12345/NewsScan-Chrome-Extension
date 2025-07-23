import { defineConfig } from 'wxt';

export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  srcDir: 'src',
  manifest: {
    permissions: [
      "storage",
      "scripting",
      "activeTab",
      "tabs",
      "sidePanel"
    ],
    action: {
      default_title: "Open Fake News Reader"
    },
    side_panel: {
      default_path: "sidepanel.html"
    }
  }
}); 