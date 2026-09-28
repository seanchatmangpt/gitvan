export const policy=Object.freeze({id:"gitvan:swarm:tool-identity",authority:"receipt-only"});
export const admit=(v)=>v?{admitted:true,policy:policy.id}:{admitted:false,code:"REFUSED_MISSING"};
