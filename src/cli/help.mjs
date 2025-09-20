// GitVan v3.0.0 - Help Command
// Shows help information

export async function handleHelp(args) {
  console.log(`
🚀 GitVan v3.0.0 - Git-native development automation

USAGE:
  gitvan <command> [options]

COMMANDS:
  init          Initialize GitVan in current directory
  daemon        Start/stop GitVan daemon
  run           Run a job or workflow
  list          List available jobs, events, or schedules
  event         Manage events
  schedule      Manage schedules
  worktree      Manage Git worktrees
  job           Manage jobs
  pack          Manage packs
  scaffold      Scaffold new projects
  marketplace   Browse pack marketplace
  chat          AI-powered chat interface
  hooks         Manage Git hooks
  workflow      Manage workflows
  setup         Setup GitVan environment
  help          Show this help message

EXAMPLES:
  gitvan init
  gitvan run my-job
  gitvan pack install react-pack
  gitvan chat "help me with my workflow"

For more information, visit: https://github.com/seanchatmangpt/gitvan
  `);
}