from pathlib import Path

path = Path("src/hooks/HookOrchestrator.mjs")
text = path.read_text()
old = '''              await contextManager.initialize({
                workflowId: hook.id,
                inputs: evaluation.context || {},
                startTime: Date.now(),
              });
'''
new = '''              const executionTimestamp = new Date(
                executionStartedAt
              ).toISOString();
              await contextManager.initialize({
                workflowId: hook.id,
                inputs: {
                  ...(evaluation.context || {}),
                  timestamp: executionTimestamp,
                },
                startTime: executionStartedAt,
              });
'''
count = text.count(old)
if count != 1:
    raise SystemExit(
        f"HookOrchestrator execution-context boundary drifted: expected 1 match, got {count}"
    )
path.write_text(text.replace(old, new, 1))
print("EXECUTION_CONTEXT_REPAIR_APPLIED")
