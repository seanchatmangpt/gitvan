export const policy=Object.freeze({id:"gitvan:swarm:commit-type",authority:"receipt-only"});
export function admit(value){return value===undefined||value===null?{admitted:false,code:"REFUSED_MISSING",policy:policy.id}:{admitted:true,policy:policy.id};}
