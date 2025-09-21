#!/usr/bin/env node
// src/cli.mjs - Test CLI for citty-test-utils integration testing

import { defineCommand, runMain } from 'citty'

const testCli = defineCommand({
  meta: {
    name: 'test-cli',
    version: '1.0.0',
    description: 'Test CLI for citty-test-utils integration testing',
  },
  subCommands: {
    greet: defineCommand({
      meta: {
        name: 'greet',
        description: 'Greet someone',
      },
      args: {
        name: {
          type: 'positional',
          description: 'Name to greet',
          default: 'World',
        },
        verbose: {
          type: 'boolean',
          description: 'Enable verbose output',
          default: false,
        },
        count: {
          type: 'number',
          description: 'Number of times to repeat',
          default: 1,
        },
      },
      run: async (ctx) => {
        const { name, verbose, count } = ctx.args

        if (ctx.args.json) {
          console.log(
            JSON.stringify({
              message: `Hello, ${name}!`,
              count,
              verbose,
            })
          )
        } else {
          if (verbose) {
            console.log('Verbose mode enabled')
          }

          for (let i = 0; i < count; i++) {
            console.log(`Hello, ${name}! (${i + 1}/${count})`)
          }
        }
      },
    }),

    math: defineCommand({
      meta: {
        name: 'math',
        description: 'Perform mathematical operations',
      },
      subCommands: {
        add: defineCommand({
          meta: {
            name: 'add',
            description: 'Add two numbers',
          },
          args: {
            a: {
              type: 'positional',
              description: 'First number',
              required: true,
            },
            b: {
              type: 'positional',
              description: 'Second number',
              required: true,
            },
          },
          run: async (ctx) => {
            const { a, b } = ctx.args
            const result = Number(a) + Number(b)

            if (ctx.args.json) {
              console.log(
                JSON.stringify({
                  operation: 'add',
                  a: Number(a),
                  b: Number(b),
                  result,
                })
              )
            } else {
              console.log(`${a} + ${b} = ${result}`)
            }
          },
        }),

        multiply: defineCommand({
          meta: {
            name: 'multiply',
            description: 'Multiply two numbers',
          },
          args: {
            a: {
              type: 'positional',
              description: 'First number',
              required: true,
            },
            b: {
              type: 'positional',
              description: 'Second number',
              required: true,
            },
          },
          run: async (ctx) => {
            const { a, b } = ctx.args
            const result = Number(a) * Number(b)

            if (ctx.args.json) {
              console.log(
                JSON.stringify({
                  operation: 'multiply',
                  a: Number(a),
                  b: Number(b),
                  result,
                })
              )
            } else {
              console.log(`${a} × ${b} = ${result}`)
            }
          },
        }),
      },
    }),

    error: defineCommand({
      meta: {
        name: 'error',
        description: 'Simulate different types of errors',
      },
      args: {
        type: {
          type: 'positional',
          description: 'Type of error to simulate',
          default: 'generic',
        },
      },
      run: async (ctx) => {
        const { type } = ctx.args

        switch (type) {
          case 'generic':
            throw new Error('Generic error occurred')
          case 'validation':
            throw new Error('Validation error: Invalid input')
          case 'timeout':
            await new Promise((resolve) => setTimeout(resolve, 10000))
            break
          case 'exit':
            process.exit(1)
          default:
            console.log(`Unknown error type: ${type}`)
        }
      },
    }),

    info: defineCommand({
      meta: {
        name: 'info',
        description: 'Show test CLI information',
      },
      run: async (ctx) => {
        const info = {
          name: 'citty-test-utils-test-cli',
          version: '1.0.0',
          description: 'Test CLI for citty-test-utils integration testing',
          commands: ['greet', 'math', 'error', 'info'],
          features: [
            'Basic command execution',
            'Subcommands',
            'JSON output support',
            'Error simulation',
            'Argument parsing',
          ],
        }

        if (ctx.args.json) {
          console.log(JSON.stringify(info, null, 2))
        } else {
          console.log('Test CLI Information:')
          console.log(`Name: ${info.name}`)
          console.log(`Version: ${info.version}`)
          console.log(`Description: ${info.description}`)
          console.log(`Commands: ${info.commands.join(', ')}`)
          console.log('Features:')
          info.features.forEach((feature) => console.log(`  - ${feature}`))
        }
      },
    }),
  },
})

// Always run the CLI when this script is executed
runMain(testCli)
