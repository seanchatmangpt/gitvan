# Citty Test Utils

A minimal testing utility for Citty CLI applications with cleanroom Docker support and fluent assertions.

## Features

- **Cleanroom Runner**: Run commands in isolated Docker containers
- **Local Runner**: Run commands locally for faster development
- **Fluent Assertions**: Chainable expectation API
- **TypeScript Support**: Full type definitions included

## Quick Start

```javascript
import { describe, it, beforeAll, afterAll } from "vitest"
import { setupCleanroom, runCitty, teardownCleanroom } from "./vendors/citty-test-utils/index.js"

describe("CLI Tests", () => {
  beforeAll(async () => {
    await setupCleanroom({ rootDir: "." })
  })

  afterAll(async () => {
    await teardownCleanroom()
  })

  it("shows help", async () => {
    const result = await runCitty(["--help"])
    result
      .expectExit(0)
      .expectOutput(/Usage:/)
      .expectOutput(/gitvan/)
  })

  it("handles invalid commands", async () => {
    const result = await runCitty(["invalid-command"])
    result
      .expectExit(1)
      .expectStderr(/Unknown command/)
  })
})
```

## API Reference

### Cleanroom Runner

```javascript
// Setup cleanroom environment
await setupCleanroom({ 
  rootDir: ".",           // Directory to copy into container
  nodeImage: "node:20-alpine"  // Docker image to use
})

// Run command in cleanroom
const result = await runCitty(["command", "args"], {
  json: false,    // Parse stdout as JSON
  cwd: "/app"     // Working directory in container
})

// Cleanup
await teardownCleanroom()
```

### Local Runner

```javascript
import { runLocalCitty } from "./vendors/citty-test-utils/index.js"

const result = await runLocalCitty(["command", "args"], {
  cwd: process.cwd(),  // Working directory
  json: false          // Parse stdout as JSON
})
```

### Assertions

```javascript
const result = await runCitty(["--help"])

result
  .expectExit(0)                    // Check exit code
  .expectOutput("Usage:")           // String match
  .expectOutput(/gitvan/)           // Regex match
  .expectStderr("")                 // Check stderr
  .expectJson(data => {             // JSON validation
    expect(data.version).toBeDefined()
  })
```

## File Structure

```
vendors/citty-test-utils/
├── package.json          # Package configuration
├── index.js             # Main exports
├── cleanroom-runner.js  # Docker container runner
├── local-runner.js      # Local process runner
├── assertions.js        # Fluent assertion API
└── types.d.ts          # TypeScript definitions
```

## Dependencies

- `testcontainers`: Docker container management
- Node.js 18+ with ES modules support