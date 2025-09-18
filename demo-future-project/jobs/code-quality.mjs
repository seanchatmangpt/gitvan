// code-quality.mjs
// Automated linting and formatting

import { defineJob } from 'gitvan';

export default defineJob({
  name: 'code-quality',
  description: 'Automated linting and formatting',
  schedule: 'on-push',
  steps: [
  {
    "type": "cli",
    "command": "npm run lint"
  },
  {
    "type": "cli",
    "command": "npm run format"
  }
]
});
