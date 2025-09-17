#!/usr/bin/env node

import yaml from "js-yaml";

const testYaml = `to: "test.txt"
force: [invalid: syntax]`;

try {
  const result = yaml.load(testYaml);
  console.log("YAML parsed successfully:", result);
} catch (error) {
  console.log("YAML parsing failed:", error.message);
}
