import { admitAuthority } from './authority.mjs';import { admitNotesRef } from './namespace.mjs';import { admitOcelShape } from './ocel.mjs';
export function evaluateReceipt(input={}){const checks=[admitNotesRef(input.ref),admitAuthority(input.authority),admitOcelShape(input.document)];return checks.find(x=>!x.ok)||{ok:true,checks};}
