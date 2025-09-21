import { describe, it, expect, beforeEach } from "vitest";
import { wrapExpectation } from "../../../vendors/citty-test-utils/assertions.js";

describe("Citty Test Utils - Unit Tests", () => {
  describe("Assertions API", () => {
    let mockResult;

    beforeEach(() => {
      mockResult = {
        exitCode: 0,
        stdout: "Hello World\nUsage: gitvan --help",
        stderr: "",
        args: ["--help"],
        cwd: "/app",
        duration: 150,
      };
    });

    describe("Basic Assertions", () => {
      it("should wrap result and provide fluent API", () => {
        const wrapped = wrapExpectation(mockResult);

        expect(wrapped.result).toBe(mockResult);
        expect(typeof wrapped.expectExit).toBe("function");
        expect(typeof wrapped.expectOutput).toBe("function");
        expect(typeof wrapped.expectStderr).toBe("function");
        expect(typeof wrapped.expectJson).toBe("function");
      });

      it("should chain assertions correctly", () => {
        const wrapped = wrapExpectation(mockResult);

        const result = wrapped
          .expectExit(0)
          .expectOutput("Hello")
          .expectStderr("");

        expect(result).toBe(wrapped);
      });

      it("should throw on wrong exit code", () => {
        const wrapped = wrapExpectation(mockResult);

        expect(() => wrapped.expectExit(1)).toThrow(
          "Expected exit code 1, got 0"
        );
      });

      it("should match string output", () => {
        const wrapped = wrapExpectation(mockResult);

        expect(() => wrapped.expectOutput("Hello")).not.toThrow();
        expect(() => wrapped.expectOutput("Goodbye")).toThrow(
          "Expected stdout to match Goodbye"
        );
      });

      it("should match regex output", () => {
        const wrapped = wrapExpectation(mockResult);

        expect(() => wrapped.expectOutput(/Hello/)).not.toThrow();
        expect(() => wrapped.expectOutput(/Goodbye/)).toThrow(
          "Expected stdout to match /Goodbye/"
        );
      });

      it("should match stderr", () => {
        const wrapped = wrapExpectation(mockResult);

        expect(() => wrapped.expectStderr("")).not.toThrow();

        const errorResult = { ...mockResult, stderr: "Error occurred" };
        const errorWrapped = wrapExpectation(errorResult);

        expect(() => errorWrapped.expectStderr("Error")).not.toThrow();
        expect(() => errorWrapped.expectStderr("Success")).toThrow(
          "Expected stderr to match Success"
        );
      });
    });

    describe("JSON Assertions", () => {
      it("should handle JSON output", () => {
        const jsonResult = {
          ...mockResult,
          stdout: '{"message": "success", "code": 200}',
          json: { message: "success", code: 200 },
        };

        const wrapped = wrapExpectation(jsonResult);

        expect(() => wrapped.expectJson()).not.toThrow();

        let jsonCalled = false;
        wrapped.expectJson((json) => {
          expect(json.message).toBe("success");
          expect(json.code).toBe(200);
          jsonCalled = true;
        });
        expect(jsonCalled).toBe(true);
      });

      it("should throw when JSON not available", () => {
        const wrapped = wrapExpectation(mockResult);

        expect(() => wrapped.expectJson()).toThrow("No JSON output available");
      });
    });

    describe("Success/Failure Assertions", () => {
      it("should expect success", () => {
        const wrapped = wrapExpectation(mockResult);

        expect(() => wrapped.expectSuccess()).not.toThrow();

        const failureResult = { ...mockResult, exitCode: 1 };
        const failureWrapped = wrapExpectation(failureResult);

        expect(() => failureWrapped.expectSuccess()).toThrow(
          "Expected exit code 0, got 1"
        );
      });

      it("should expect failure", () => {
        const failureResult = { ...mockResult, exitCode: 1 };
        const wrapped = wrapExpectation(failureResult);

        expect(() => wrapped.expectFailure()).not.toThrow();

        expect(() => wrapExpectation(mockResult).expectFailure()).toThrow(
          "Expected command to fail, but it succeeded"
        );
      });
    });

    describe("Output Length Assertions", () => {
      it("should check output length", () => {
        const wrapped = wrapExpectation(mockResult);

        expect(() => wrapped.expectOutputLength(10, 50)).not.toThrow();
        expect(() => wrapped.expectOutputLength(100)).toThrow(
          "Expected output length between 100 and unlimited, got"
        );
        expect(() => wrapped.expectOutputLength(5, 10)).toThrow(
          "Expected output length between 5 and 10, got"
        );
      });

      it("should check stderr length", () => {
        const errorResult = { ...mockResult, stderr: "Error message" };
        const wrapped = wrapExpectation(errorResult);

        expect(() => wrapped.expectStderrLength(5, 20)).not.toThrow();
        expect(() => wrapped.expectStderrLength(50)).toThrow(
          "Expected stderr length between 50 and unlimited, got"
        );
      });
    });

    describe("No Output Assertions", () => {
      it("should expect no output", () => {
        const emptyResult = { ...mockResult, stdout: "" };
        const wrapped = wrapExpectation(emptyResult);

        expect(() => wrapped.expectNoOutput()).not.toThrow();
        expect(() => wrapExpectation(mockResult).expectNoOutput()).toThrow(
          "Expected no output, got:"
        );
      });

      it("should expect no stderr", () => {
        const wrapped = wrapExpectation(mockResult);

        expect(() => wrapped.expectNoStderr()).not.toThrow();

        const errorResult = { ...mockResult, stderr: "Error" };
        const errorWrapped = wrapExpectation(errorResult);

        expect(() => errorWrapped.expectNoStderr()).toThrow(
          "Expected no stderr, got: Error"
        );
      });
    });

    describe("Exit Code Range Assertions", () => {
      it("should check exit code in range", () => {
        const wrapped = wrapExpectation(mockResult);

        expect(() => wrapped.expectExitCodeIn([0, 1])).not.toThrow();
        expect(() => wrapped.expectExitCodeIn([1, 2])).toThrow(
          "Expected exit code to be one of [1, 2], got 0"
        );
      });

      it("should validate codes array", () => {
        const wrapped = wrapExpectation(mockResult);

        expect(() => wrapped.expectExitCodeIn("not-array")).toThrow(
          "Expected codes to be an array"
        );
      });
    });

    describe("Contains Assertions", () => {
      it("should check output contains text", () => {
        const wrapped = wrapExpectation(mockResult);

        expect(() => wrapped.expectOutputContains("Hello")).not.toThrow();
        expect(() => wrapped.expectOutputContains("Goodbye")).toThrow(
          'Expected stdout to contain "Goodbye"'
        );
      });

      it("should check stderr contains text", () => {
        const errorResult = { ...mockResult, stderr: "Error occurred" };
        const wrapped = wrapExpectation(errorResult);

        expect(() => wrapped.expectStderrContains("Error")).not.toThrow();
        expect(() => wrapped.expectStderrContains("Success")).toThrow(
          'Expected stderr to contain "Success"'
        );
      });

      it("should check output not contains text", () => {
        const wrapped = wrapExpectation(mockResult);

        expect(() => wrapped.expectOutputNotContains("Goodbye")).not.toThrow();
        expect(() => wrapped.expectOutputNotContains("Hello")).toThrow(
          'Expected stdout to not contain "Hello"'
        );
      });

      it("should check stderr not contains text", () => {
        const wrapped = wrapExpectation(mockResult);

        expect(() => wrapped.expectStderrNotContains("Error")).not.toThrow();

        const errorResult = { ...mockResult, stderr: "Error occurred" };
        const errorWrapped = wrapExpectation(errorResult);

        expect(() => errorWrapped.expectStderrNotContains("Error")).toThrow(
          'Expected stderr to not contain "Error"'
        );
      });
    });

    describe("Duration Assertions", () => {
      it("should check command duration", () => {
        const wrapped = wrapExpectation(mockResult);

        expect(() => wrapped.expectDuration(200)).not.toThrow();
        expect(() => wrapped.expectDuration(100)).toThrow(
          "Expected command to complete within 100ms, took 150ms"
        );
      });

      it("should handle missing duration", () => {
        const noDurationResult = { ...mockResult };
        delete noDurationResult.duration;
        const wrapped = wrapExpectation(noDurationResult);

        expect(() => wrapped.expectDuration(100)).not.toThrow();
      });
    });
  });
});
