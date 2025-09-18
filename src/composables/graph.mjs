// useGraph(): RDF/Turtle + CSV→RDF + SHACL + SPARQL + Nunjucks + commit-scoped snapshots
import { readFile, writeFile, mkdir, stat } from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { join } from "node:path";
import matter from "gray-matter";
import nunjucks from "nunjucks";
import N3 from "n3";
import { QueryEngine } from "@comunica/query-sparql";
import SHACLValidator from "rdf-validate-shacl";
import rdf from "@zazuko/env-node";
import { csvToRDF } from "./universal-csv-rdf.js";

const { Parser, Store } = N3;
const sh = promisify(execFile);
const qEngine = new QueryEngine();

const ensureDir = (p) => mkdir(p, { recursive: true });
const fileExists = async (p) => !!(await stat(p).catch(() => null));
const stable = (v) =>
  Array.isArray(v)
    ? v.map(stable)
    : v && typeof v === "object"
    ? Object.fromEntries(
        Object.keys(v)
          .sort()
          .map((k) => [k, stable(v[k])])
      )
    : v;
const stableJSON = (x) => JSON.stringify(stable(x), null, 2) + "\n";

export async function useGraph(opts = {}) {
  const baseIRI = opts.baseIRI || "http://example.org/";
  const snapshotsDir = opts.snapshotsDir || "snapshots";
  const store = new Store();
  const parser = new Parser({ baseIRI });

  const ctx = {
    shapesTtl: null,
    sparql: null,
    templateMd: null,
    frontmatter: {},
    queryName: "results",
    entityType: "Record",
  };

  const inputs = new Set();
  const shapesUsed = new Set();
  const queriesUsed = new Set();

  const sha = async () =>
    (await sh("git", ["rev-parse", "HEAD"])).stdout ? (await sh("git", ["rev-parse", "HEAD"])).stdout.trim() : "";

  const addTurtle = async (ttl) => {
    store.addQuads(parser.parse(ttl));
    const outDir = join(snapshotsDir, "graph", await sha(), "data");
    await ensureDir(outDir);
    await writeFile(join(outDir, "data.ttl"), ttl);
  };

  const addFile = async (path) => {
    const txt = await readFile(path, "utf8");
    inputs.add(path);
    if (
      path.endsWith(".ttl") ||
      path.endsWith(".turtle") ||
      txt.trim().startsWith("@prefix") ||
      txt.trim().startsWith("@base")
    ) {
      await addTurtle(txt);
    } else {
      const ttl = csvToRDF(txt, baseIRI, ctx.entityType);
      await addTurtle(ttl);
    }
  };

  const addCSV = async (path) => {
    const csv = await readFile(path, "utf8");
    inputs.add(path);
    const ttl = csvToRDF(csv, baseIRI, ctx.entityType);
    await addTurtle(ttl);
  };

  const setShapes = async (pathOrText) => {
    ctx.shapesTtl = (await fileExists(pathOrText))
      ? await readFile(pathOrText, "utf8")
      : pathOrText;
  };

  const setQuery = async (pathOrText) => {
    ctx.sparql = (await fileExists(pathOrText))
      ? await readFile(pathOrText, "utf8")
      : pathOrText;
  };

  const setTemplate = async (pathOrText) => {
    const raw = (await fileExists(pathOrText))
      ? await readFile(pathOrText, "utf8")
      : pathOrText;
    const { data, content } = matter(raw);
    ctx.frontmatter = data || {};
    ctx.templateMd = content;
    if (data?.baseIRI) ctx.baseIRI = data.baseIRI;
    if (data?.queryName) ctx.queryName = data.queryName;
    if (data?.entityType) ctx.entityType = data.entityType;
    if (data?.query && !ctx.sparql) ctx.sparql = data.query;
  };

  const validate = async () => {
    shapesUsed.add("shapes");
    const dataDs = rdf.dataset(store.getQuads(null, null, null, null));
    const shapesDs = rdf.dataset(
      new Parser({ baseIRI }).parse(ctx.shapesTtl || "@prefix x: <x:> .")
    ); // empty harmless shape if none
    const v = new SHACLValidator(shapesDs, { factory: rdf });
    const report = await v.validate(dataDs);
    const outDir = join(snapshotsDir, "graph", await sha(), "shapes");
    await ensureDir(outDir);
    await writeFile(join(outDir, "shapes.ttl"), ctx.shapesTtl || "");
    return { conforms: report.conforms, results: report.results };
  };

  const termToJs = (t) => {
    if (!t) return null;
    if (t.termType === "Literal") {
      const dt = t.datatype?.value || "";
      if (/#(integer|decimal|double)$/.test(dt)) return Number(t.value);
      if (dt.endsWith("#boolean")) return t.value === "true";
      return t.value;
    }
    return t.value.includes("#")
      ? t.value.split("#").pop()
      : t.value.split("/").pop();
  };

  const select = async () => {
    queriesUsed.add("query");
    const stream = await qEngine.queryBindings(
      ctx.sparql || "SELECT ?x WHERE {}",
      { sources: [store], baseIRI }
    );
    const rows = [];
    for await (const b of stream) {
      const obj = {};
      for (const v of b.variables) obj[v.value] = termToJs(b.get(v));
      rows.push(obj);
    }
    rows.sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
    const outDir = join(snapshotsDir, "query", await sha());
    await ensureDir(outDir);
    await writeFile(join(outDir, "result.json"), stableJSON(rows));
    return rows;
  };

  const render = async (rowsByName = null) => {
    const env = new nunjucks.Environment(null, {
      autoescape: false,
      throwOnUndefined: false,
    });
    env.addFilter("sum", (arr, attr) =>
      (arr || []).reduce(
        (s, it) => s + (attr ? Number(it[attr] || 0) : Number(it || 0)),
        0
      )
    );
    env.addFilter("avg", (arr, attr) => {
      const a = arr || [];
      const s = env.getFilter("sum")(a, attr);
      return a.length ? s / a.length : 0;
    });
    env.addFilter("max", (arr, attr) =>
      Math.max(
        ...(arr || []).map((it) => Number(attr ? it[attr] || 0 : it || 0))
      )
    );
    env.addFilter("min", (arr, attr) =>
      Math.min(
        ...(arr || []).map((it) =>
          Number(attr ? it[attr] || Number.MAX_VALUE : it || Number.MAX_VALUE)
        )
      )
    );

    const rows =
      rowsByName || (ctx.sparql ? { [ctx.queryName]: await select() } : {});
    return env.renderString(ctx.templateMd || "", {
      ...ctx.frontmatter,
      queries: rows,
      results: rows[ctx.queryName] || [],
    });
  };

  const snapshotJSON = async (family, name, data) => {
    const dir = join(snapshotsDir, family, await sha());
    await ensureDir(dir);
    const p = join(dir, `${name}.json`);
    await writeFile(p, stableJSON(data));
    return { path: p };
  };

  const snapshotText = async (family, name, text, ext = "md") => {
    const dir = join(snapshotsDir, family, await sha());
    await ensureDir(dir);
    const p = join(dir, `${name}.${ext}`);
    await writeFile(p, text.endsWith("\n") ? text : text + "\n");
    return { path: p };
  };

  const latest = async (family) => {
    const dir = join(snapshotsDir, family);
    await ensureDir(dir);
    await writeFile(join(dir, "latest"), (await sha()) + "\n");
  };

  const receipt = async (job = "graph", artifacts = []) => {
    const dir = join(snapshotsDir, "receipts", await sha());
    await ensureDir(dir);
    const rec = {
      sha: await sha(),
      inputs: [...inputs],
      shapes: [...shapesUsed],
      queries: [...queriesUsed],
      artifacts,
      timestamp: new Date().toISOString(),
    };
    const p = join(dir, `${job}.json`);
    await writeFile(p, stableJSON(rec));
    return { path: p };
  };

  // Pipeline helper (template + shapes + query already set via setters)
  const run = async () => {
    if (ctx.shapesTtl) await validate();
    const rows = ctx.sparql ? await select() : [];
    const out = await render({ [ctx.queryName]: rows });
    const art = await snapshotText("reports", "report", out, "md");
    await latest("reports");
    await receipt("graph.report", [art]);
    return out;
  };

  return {
    sha,
    // inputs
    addTurtle,
    addFile,
    addCSV,
    setShapes,
    setQuery,
    setTemplate,
    // ops
    validate,
    select,
    render,
    run,
    // snapshots
    snapshotJSON,
    snapshotText,
    latest,
    receipt,
  };
}


