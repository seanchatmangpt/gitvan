/** GitVan swarm receipt closure: migration. Pure bounded policy/data boundary. */
export const capability="migration";
export function admit(input={}){if(!input||typeof input!=='object')return{ok:false,refusal:'invalid-input',capability};const subject=input.subject??input.commit??null;if(!subject)return{ok:false,refusal:'missing-exact-subject',capability};return{ok:true,capability,subject,value:input};}
export function falsify(input={}){return !admit(input).ok;}
