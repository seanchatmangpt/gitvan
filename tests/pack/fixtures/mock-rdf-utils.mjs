// Mock RDF utilities for testing
// Provides simplified implementations for testing without full UnRDF

export function createKnowledgeSubstrateCore(options = {}) {
  const store = new Map();
  const quads = [];

  return {
    async add(quadArray) {
      quads.push(...quadArray);
      for (const quad of quadArray) {
        const key = `${quad.subject}|${quad.predicate}|${quad.object}`;
        store.set(key, quad);
      }
    },

    async delete(quadArray) {
      for (const quad of quadArray) {
        const key = `${quad.subject}|${quad.predicate}|${quad.object}`;
        store.delete(key);
      }
    },

    async query(sparql) {
      // Simple mock query implementation
      // Returns array of results
      const results = [];

      // Mock pattern matching
      if (sparql.includes("ASK")) {
        return [{ value: true }];
      }

      if (sparql.includes("SELECT")) {
        // Return mock results based on store contents
        for (const quad of quads) {
          results.push({
            subject: quad.subject,
            predicate: quad.predicate,
            object: quad.object,
          });
        }
      }

      return results;
    },

    getStore() {
      return store;
    },

    getQuads() {
      return quads;
    },
  };
}

export async function parseTurtle(turtleString) {
  // Simple Turtle parser mock
  const quads = [];
  const lines = turtleString.split("\n").filter((l) => l.trim() && !l.startsWith("#") && !l.startsWith("@prefix"));

  // Very basic parsing - just extract triples
  for (const line of lines) {
    // Match patterns like: :subject predicate:value "literal" .
    const tripleMatch = line.match(/(\S+)\s+(\S+)\s+(.+?)\s*[;.]/);
    if (tripleMatch) {
      const [, subject, predicate, object] = tripleMatch;
      quads.push({
        subject: { value: subject.replace(":", "") },
        predicate: { value: predicate },
        object: { value: object.replace(/[";]/g, "").trim() },
      });
    }
  }

  return quads;
}

export function namedNode(uri) {
  return { termType: "NamedNode", value: uri };
}

export function literal(value, languageOrDatatype) {
  return {
    termType: "Literal",
    value: String(value),
    language: typeof languageOrDatatype === "string" ? languageOrDatatype : "",
    datatype: typeof languageOrDatatype === "object" ? languageOrDatatype : null,
  };
}

export function quad(subject, predicate, object, graph) {
  return {
    termType: "Quad",
    subject,
    predicate,
    object,
    graph: graph || { termType: "DefaultGraph" },
  };
}

export function blankNode(id) {
  return { termType: "BlankNode", value: id || `_:b${Math.random()}` };
}

export function defaultGraph() {
  return { termType: "DefaultGraph" };
}

export function variable(name) {
  return { termType: "Variable", value: name };
}
