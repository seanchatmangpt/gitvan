import { createHash } from 'node:crypto';
function stable(v){if(Array.isArray(v))return v.map(stable);if(v&&typeof v==='object')return Object.fromEntries(Object.keys(v).sort().map(k=>[k,stable(v[k])]));return v;}
export const digestReceipt=v=>createHash('sha256').update(JSON.stringify(stable(v))).digest('hex');
export const replayEqual=(a,b)=>digestReceipt(a)===digestReceipt(b);
