import { describe, expect, it } from "vitest";
import { DAGPlanner } from "../../src/workflow/dag-planner.mjs";

const logger = { info() {}, warn() {}, error() {} };

describe("workflow DAG admission and execution capability", () => {
  it("produces a dependency-valid execution order", async () => {
    const planner = new DAGPlanner({ logger });
    const plan = await planner.createPlan([
      { id: "observe", type: "source", dependsOn: [] },
      { id: "admit", type: "validation", dependsOn: ["observe"] },
      { id: "construct", type: "template", dependsOn: ["admit"] },
      { id: "receipt", type: "evidence", dependsOn: ["construct"] },
    ], null);
    expect(plan.map(item => item.id)).toEqual(["observe", "admit", "construct", "receipt"]);
    expect(plan.map(item => item.executionOrder)).toEqual([0, 1, 2, 3]);
    expect(plan.every(item => typeof item.estimatedDuration === "number")).toBe(true);
  });

  it("admits independent branches without duplicating nodes", async () => {
    const planner = new DAGPlanner({ logger });
    const plan = await planner.createPlan([
      { id: "root", dependsOn: [] },
      { id: "left", dependsOn: ["root"] },
      { id: "right", dependsOn: ["root"] },
      { id: "join", dependsOn: ["left", "right"] },
    ], null);
    expect(plan[0].id).toBe("root");
    expect(plan.at(-1).id).toBe("join");
    expect(new Set(plan.map(item => item.id)).size).toBe(4);
  });

  it("refuses cycles", async () => {
    const planner = new DAGPlanner({ logger });
    await expect(planner.createPlan([
      { id: "a", dependsOn: ["c"] },
      { id: "b", dependsOn: ["a"] },
      { id: "c", dependsOn: ["b"] },
    ], null)).rejects.toThrow(/Circular dependency detected/);
  });

  it("refuses missing dependencies during order validation", async () => {
    const planner = new DAGPlanner({ logger });
    await expect(planner.createPlan([
      { id: "a", dependsOn: ["missing"] },
    ], null)).rejects.toThrow(/Dependency not found|Circular dependency detected/);
  });
});
