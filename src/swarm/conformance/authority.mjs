const ALLOWED=new Set(['NONE','OBSERVE','RECEIPT_APPEND']);
export function admitAuthority(authority='NONE'){return ALLOWED.has(authority)?{ok:true,authority}:{ok:false,reason:'authority_exceeds_receipt_gateway'};}
export const mayMutateWorkingTree=()=>false;
