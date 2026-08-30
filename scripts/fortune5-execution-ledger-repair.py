from pathlib import Path


def replace_once(path: str, old: str, new: str) -> None:
    target = Path(path)
    text = target.read_text()
    count = text.count(old)
    if count != 1:
        raise SystemExit(
            f"{path}: expected exactly one match, got {count}: {old!r}"
        )
    target.write_text(text.replace(old, new, 1))


# Runs after fortune5-closure-repair.py, which has already introduced
# executionStartedAt and workflowSucceeded.
replace_once(
    "src/hooks/HookOrchestrator.mjs",
    '''              await this.gitNativeIO.writeReceipt(hook.id, executionResult, {
                executionId,
                timestamp: Date.now(),
                duration: Date.now() - executionStartedAt,
              });

              // Write execution metrics
''',
    '''              await this.gitNativeIO.writeReceipt(hook.id, executionResult, {
                executionId,
                timestamp: Date.now(),
                duration: Date.now() - executionStartedAt,
              });

              // The execution ledger is a distinct durable identity stream from
              // generic hook receipts. Zero-unreceipted-actuation requires both.
              await this.gitNativeIO.writeExecution(executionId, {
                ...executionResult,
                startedAt: new Date(executionStartedAt).toISOString(),
                completedAt: new Date().toISOString(),
                duration: Date.now() - executionStartedAt,
              });

              // Write execution metrics
''',
)

replace_once(
    "src/hooks/HookOrchestrator.mjs",
    '''            await this.gitNativeIO.writeReceipt(hook.id, errorResult, {
              executionId,
              timestamp: Date.now(),
              error: error.message,
            });

            // Write error metrics
''',
    '''            await this.gitNativeIO.writeReceipt(hook.id, errorResult, {
              executionId,
              timestamp: Date.now(),
              error: error.message,
            });

            await this.gitNativeIO.writeExecution(executionId, {
              ...errorResult,
              completedAt: new Date().toISOString(),
            });

            // Write error metrics
''',
)

print("EXECUTION_LEDGER_REPAIR_APPLIED")
