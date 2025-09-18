import { defineCommand } from 'citty';
import consola from 'consola';
import { backgroundSetup } from './background-setup.mjs';

export const setupCommand = defineCommand({
  meta: {
    name: 'setup',
    description: 'Complete autonomic setup: start daemon, install hooks, and auto-install packs (non-blocking)'
  },
  args: {
    cwd: {
      type: 'string',
      description: 'Working directory',
      default: process.cwd()
    }
  },
  async run({ args }) {
    const cwd = args.cwd || process.cwd();
    
    console.log("🚀 Starting GitVan autonomic setup (non-blocking)...");
    
    try {
      // Run all setup operations in parallel, non-blocking
      const results = await backgroundSetup(cwd);
      
      console.log("\n🎉 Autonomic setup complete!");
      console.log("\nYour GitVan project is now fully autonomous:");
      
      if (results.daemon) {
        console.log("   ✅ Daemon is running");
      } else {
        console.log("   ⚠️  Daemon startup failed");
      }
      
      if (results.hooks?.success) {
        console.log("   ✅ Git hooks are installed");
      } else {
        console.log("   ⚠️  Hook installation had issues");
      }
      
      if (results.packs?.success) {
        console.log("   ✅ Pack registry is ready");
      } else {
        console.log("   ⚠️  Pack loading had issues");
      }
      
      console.log("   • Jobs will run automatically on commits");
      console.log("\nNext: gitvan save");
      
    } catch (error) {
      console.log("\n⚠️  Setup completed with some issues:");
      console.log("   Error:", error.message);
      console.log("\nYou can continue with: gitvan save");
    }
  }
});
