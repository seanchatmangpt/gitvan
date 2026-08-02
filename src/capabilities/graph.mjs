function nodeId(id) {
  return `n_${Buffer.from(id).toString("hex")}`;
}

function quote(value) {
  return JSON.stringify(String(value));
}

export function capabilityGraph(registry) {
  const nodes = registry.list().map(capability => Object.freeze({
    id: capability.id,
    title: capability.title,
    state: capability.state,
    verifier: capability.verifier,
  }));
  const edges = [];
  for (const capability of registry.list()) {
    for (const dependency of capability.dependsOn) edges.push(Object.freeze({ from: dependency, to: capability.id, relation: "dependsOn" }));
  }
  return Object.freeze({ nodes: Object.freeze(nodes), edges: Object.freeze(edges) });
}

export function capabilityLayers(registry) {
  const remaining = new Map(registry.list().map(item => [item.id, new Set(item.dependsOn)]));
  const layers = [];
  const emitted = new Set();
  while (emitted.size < remaining.size) {
    const layer = [...remaining.entries()]
      .filter(([id, deps]) => !emitted.has(id) && [...deps].every(dep => emitted.has(dep)))
      .map(([id]) => id)
      .sort();
    if (!layer.length) throw new Error("Capability graph cannot be layered");
    layers.push(Object.freeze(layer));
    for (const id of layer) emitted.add(id);
  }
  return Object.freeze(layers);
}

export function toMermaid(registry) {
  const graph = capabilityGraph(registry);
  const lines = ["flowchart LR"];
  for (const node of graph.nodes) lines.push(`  ${nodeId(node.id)}[${quote(`${node.title}\\n${node.state}`)}]`);
  for (const edge of graph.edges) lines.push(`  ${nodeId(edge.from)} --> ${nodeId(edge.to)}`);
  return `${lines.join("\n")}\n`;
}

export function toDot(registry) {
  const graph = capabilityGraph(registry);
  const lines = ["digraph gitvan_capabilities {", "  rankdir=LR;"];
  for (const node of graph.nodes) lines.push(`  ${nodeId(node.id)} [label=${quote(`${node.title}\\n${node.state}`)}];`);
  for (const edge of graph.edges) lines.push(`  ${nodeId(edge.from)} -> ${nodeId(edge.to)} [label=${quote(edge.relation)}];`);
  lines.push("}");
  return `${lines.join("\n")}\n`;
}

export function toGraphJSON(registry) {
  return JSON.stringify({ ...capabilityGraph(registry), layers: capabilityLayers(registry) }, null, 2) + "\n";
}
