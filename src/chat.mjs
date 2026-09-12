// Compatibility entry point for the legacy LLM command.
// Keep the canonical chat implementation under src/cli/chat.mjs.
export { chatCommand } from "./cli/chat.mjs";
export { default } from "./cli/chat.mjs";
