import { defineCommand } from 'citty';
import consola from 'consola';
import { backgroundSetup } from './background-setup.mjs';
import { createLogger } from "../utils/logger.mjs";
const logger = createLogger("cli:setup");

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
    
    logger.info("🚀 Starting GitVan autonomic setup (non-blocking)...");
    
    try {
      // Run all setup operations in parallel, non-blocking
      const results = await backgroundSetup(cwd);
      
      logger.info("\n🎉 Autonomic setup complete!");
      logger.info("\nYour GitVan project is now fully autonomous:");
      
      if (results.daemon) {
        logger.info("   ✅ Daemon is running");
      } else {
        logger.info("   ⚠️  Daemon startup failed");
      }
      
      if (results.hooks?.success) {
        logger.info("   ✅ Git hooks are installed");
      } else {
        logger.info("   ⚠️  Hook installation had issues");
      }
      
      if (results.packs?.success) {
        logger.info("   ✅ Pack registry is ready");
      } else {
        logger.info("   ⚠️  Pack loading had issues");
      }
      
      logger.info("   • Jobs will run automatically on commits");
      logger.info("\nNext: gitvan save");
      
    } catch (error) {
      logger.info("\n⚠️  Setup completed with some issues:");
      logger.info("   Error:", error.message);
      logger.info("\nYou can continue with: gitvan save");
    }
  }
});
