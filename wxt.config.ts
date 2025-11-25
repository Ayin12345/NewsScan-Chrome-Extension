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
    host_permissions: ["<all_urls>"],
    action: {
      default_title: "Open NewsScan"
    },
    side_panel: {
      default_path: "sidepanel.html"
    },
    web_accessible_resources: [
      {
        resources: [
          "sidepanel.html",
          "chunks/*",
          "assets/*",
          "logo.png"
        ],
        matches: ["<all_urls>"]
      }
    ]
  }
}); 