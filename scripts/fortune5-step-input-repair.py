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


replace_once(
    "src/workflow/step-runner.mjs",
    '''  async _getStepInputs(step, contextManager) {
    if (!step.inputMapping) return {};

    const inputs = {};
    for (const [inputKey, contextKey] of Object.entries(step.inputMapping)) {
      try {
        inputs[inputKey] = await contextManager.get(contextKey);
      } catch (error) {
        this.logger.warn(
          `⚠️ Could not get input '${inputKey}' from context key '${contextKey}': ${error.message}`
        );
        inputs[inputKey] = null;
      }
    }
    return inputs;
  }
''',
    '''  async _getStepInputs(step, contextManager) {
    if (!step.inputMapping) {
      return contextManager.getInputs();
    }

    const inputs = {};
    for (const [inputKey, contextKey] of Object.entries(step.inputMapping)) {
      try {
        inputs[inputKey] = await contextManager.getOutput(contextKey);
      } catch (error) {
        this.logger.warn(
          `⚠️ Could not get input '${inputKey}' from context key '${contextKey}': ${error.message}`
        );
        inputs[inputKey] = null;
      }
    }
    return inputs;
  }
''',
)

# The main closure repair strengthens this test before this capsule runs.
replace_once(
    "tests/knowledge-hooks-simple-verification.test.mjs",
    '      "git notes --ref=refs/gitvan/notes show HEAD",\n',
    '      "git notes --ref=refs/gitvan/executions show HEAD",\n',
)

print("STEP_INPUT_REPAIR_APPLIED")
