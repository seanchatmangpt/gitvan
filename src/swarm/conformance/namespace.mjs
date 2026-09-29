export const CANONICAL_NOTES_REF='refs/notes/gitvan/ocel';
export function admitNotesRef(ref=CANONICAL_NOTES_REF){const ok=ref===CANONICAL_NOTES_REF||ref.startsWith(CANONICAL_NOTES_REF+'/');return ok?{ok:true,ref}:{ok:false,reason:'foreign_notes_namespace'};}
