import { defineConfig } from 'wxt';

export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  srcDir: 'src',
  manifest: {
    name: "NewsScan",
    permissions: [
      "storage",
      "scripting",
      "activeTab",
      "tabs"
    ],
    host_permissions: ["<all_urls>"],
    icons: {
      "16": "logo.png",
      "48": "logo.png",
      "128": "logo.png"
    },
    action: {
      default_title: "Open NewsScan",
      default_icon: {
        "16": "logo.png",
        "48": "logo.png",
        "128": "logo.png"
      }
    },
    web_accessible_resources: [
      {
        resources: [
          "sidebar.html",
          "chunks/*",
          "assets/*",
          "logo.png"
        ],
        matches: ["<all_urls>"]
      }
    ]
  }
}); 