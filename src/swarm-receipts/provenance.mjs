import {sha256} from './digest.mjs';export function provenance({repo,commit,branch,task,producer='gitvan'}){const p={repo,commit,branch:branch??null,task,producer};return {...p,digest:sha256(p)};}
