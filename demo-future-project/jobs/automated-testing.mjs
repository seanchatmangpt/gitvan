// automated-testing.mjs
// Run tests on every commit

import { defineJob } from 'gitvan';

export default defineJob({
  name: 'automated-testing',
  description: 'Run tests on every commit',
  schedule: 'on-commit',
  steps: [
  {
    "type": "cli",
    "command": "npm test"
  },
  {
    "type": "js",
    "module": "./test-analysis.mjs"
  }
]
});
