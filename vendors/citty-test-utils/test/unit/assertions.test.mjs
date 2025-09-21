import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { wrapExpectation } from '../../src/assertions.js'

describe('Assertions Unit Tests', () => {
  let mockResult

  beforeEach(() => {
    mockResult = {
      exitCode: 0,
      stdout: 'Git-native development automation platform (gitvan v3.0.0)\n\nUSAGE gitvan',
      stderr: '',
      args: ['--help'],
      cwd: '/test',
      json: undefined,
    }
  })

  describe('expectExit', () => {
    it('should pass when exit code matches', () => {
      const expectation = wrapExpectation(mockResult)
      expect(() => expectation.expectExit(0)).not.toThrow()
    })

    it('should fail when exit code does not match', () => {
      const expectation = wrapExpectation(mockResult)
      expect(() => expectation.expectExit(1)).toThrow('Expected exit code 1, got 0')
    })

    it('should return this for chaining', () => {
      const expectation = wrapExpectation(mockResult)
      const result = expectation.expectExit(0)
      expect(result).toBe(expectation)
    })
  })

  describe('expectOutput', () => {
    it('should pass when string is found in stdout', () => {
      const expectation = wrapExpectation(mockResult)
      expect(() => expectation.expectOutput('USAGE')).not.toThrow()
    })

    it('should pass when regex matches stdout', () => {
      const expectation = wrapExpectation(mockResult)
      expect(() => expectation.expectOutput(/gitvan/)).not.toThrow()
    })

    it('should fail when string is not found', () => {
      const expectation = wrapExpectation(mockResult)
      expect(() => expectation.expectOutput('NOTFOUND')).toThrow(
        'Expected stdout to match NOTFOUND'
      )
    })

    it('should fail when regex does not match', () => {
      const expectation = wrapExpectation(mockResult)
      expect(() => expectation.expectOutput(/NOTFOUND/)).toThrow(
        'Expected stdout to match /NOTFOUND/'
      )
    })
  })

  describe('expectStderr', () => {
    it('should pass when stderr is empty', () => {
      const expectation = wrapExpectation(mockResult)
      expect(() => expectation.expectStderr('')).not.toThrow()
    })

    it('should fail when stderr does not match', () => {
      const expectation = wrapExpectation({
        ...mockResult,
        stderr: 'error message',
      })
      expect(() => expectation.expectStderr('')).toThrow('Expected stderr to match ')
    })
  })

  describe('expectJson', () => {
    it('should fail when no JSON output available', () => {
      const expectation = wrapExpectation(mockResult)
      expect(() => expectation.expectJson()).toThrow('No JSON output available')
    })

    it('should pass when JSON is available', () => {
      const resultWithJson = { ...mockResult, json: { version: '3.0.0' } }
      const expectation = wrapExpectation(resultWithJson)
      expect(() => expectation.expectJson()).not.toThrow()
    })

    it('should call matcher function when provided', () => {
      const resultWithJson = { ...mockResult, json: { version: '3.0.0' } }
      const expectation = wrapExpectation(resultWithJson)
      const matcher = vi.fn()

      expectation.expectJson(matcher)
      expect(matcher).toHaveBeenCalledWith({ version: '3.0.0' })
    })
  })

  describe('expectSuccess', () => {
    it('should pass when exit code is 0', () => {
      const expectation = wrapExpectation(mockResult)
      expect(() => expectation.expectSuccess()).not.toThrow()
    })

    it('should fail when exit code is not 0', () => {
      const expectation = wrapExpectation({ ...mockResult, exitCode: 1 })
      expect(() => expectation.expectSuccess()).toThrow('Expected exit code 0, got 1')
    })
  })

  describe('expectFailure', () => {
    it('should pass when exit code is not 0', () => {
      const expectation = wrapExpectation({ ...mockResult, exitCode: 1 })
      expect(() => expectation.expectFailure()).not.toThrow()
    })

    it('should fail when exit code is 0', () => {
      const expectation = wrapExpectation(mockResult)
      expect(() => expectation.expectFailure()).toThrow(
        'Expected command to fail, but it succeeded'
      )
    })
  })

  describe('expectNoOutput', () => {
    it('should fail when stdout is not empty', () => {
      const expectation = wrapExpectation(mockResult)
      expect(() => expectation.expectNoOutput()).toThrow('Expected no output')
    })

    it('should pass when stdout is empty', () => {
      const expectation = wrapExpectation({ ...mockResult, stdout: '' })
      expect(() => expectation.expectNoOutput()).not.toThrow()
    })
  })

  describe('expectNoStderr', () => {
    it('should pass when stderr is empty', () => {
      const expectation = wrapExpectation(mockResult)
      expect(() => expectation.expectNoStderr()).not.toThrow()
    })

    it('should fail when stderr is not empty', () => {
      const expectation = wrapExpectation({ ...mockResult, stderr: 'error' })
      expect(() => expectation.expectNoStderr()).toThrow('Expected no stderr')
    })
  })

  describe('expectOutputLength', () => {
    it('should pass when length is within range', () => {
      const expectation = wrapExpectation(mockResult)
      expect(() => expectation.expectOutputLength(50, 100)).not.toThrow()
    })

    it('should fail when length is below minimum', () => {
      const expectation = wrapExpectation(mockResult)
      expect(() => expectation.expectOutputLength(1000)).toThrow(
        'Expected output length between 1000 and unlimited, got'
      )
    })

    it('should fail when length is above maximum', () => {
      const expectation = wrapExpectation(mockResult)
      expect(() => expectation.expectOutputLength(10, 20)).toThrow(
        'Expected output length between 10 and 20, got'
      )
    })
  })

  describe('chaining', () => {
    it('should support method chaining', () => {
      const expectation = wrapExpectation(mockResult)
      expect(() => {
        expectation
          .expectSuccess()
          .expectOutput('USAGE')
          .expectNoStderr()
          .expectOutputLength(50, 100)
      }).not.toThrow()
    })
  })
})
