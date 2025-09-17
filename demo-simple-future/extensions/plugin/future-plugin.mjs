// future-plugin.mjs
// Custom plugin extension

export default {
  name: 'future-plugin',
  description: 'A plugin for future capabilities',
  version: '1.0.0',
  
  hooks: {
    'before-job': async (...args) => {
        console.log('Future plugin: before job')
      },
    'after-job': async (...args) => {
        console.log('Future plugin: after job')
      }
  },
  
  async initialize() {
    // Plugin initialization logic
    console.log('Initializing plugin:', this.name);
  },
  
  async destroy() {
    // Plugin cleanup logic
    console.log('Destroying plugin:', this.name);
  }
};
