import { z } from 'zod';
export const SwarmReceiptCase=z.object({schema:z.literal('https://gitvan.dev/swarm-receipt-conformance/v1'),id:z.string().regex(/^GSR-\d{3}$/),category:z.enum(['identity','namespace','ocel-shape','authority','provenance','replay','recovery']),name:z.string().min(1),expected:z.enum(['ADMITTED','REFUSED']),mutation:z.string().min(1),invariants:z.array(z.enum(['exact-subject','least-authority','append-only-receipt','deterministic-replay'])).min(1),notesRef:z.literal('refs/notes/gitvan/ocel')}).strict();
export const parseConformanceCase=v=>SwarmReceiptCase.parse(v);
