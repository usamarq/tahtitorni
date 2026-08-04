import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

/* Work entries. Copy rules apply to every field: understated register,
   numbers verbatim from the master CV, no em dashes. */
const work = defineCollection({
  loader: glob({ pattern: '**/*.mdx', base: './src/content/work' }),
  schema: z.object({
    title: z.string(),
    kind: z.string(),
    group: z.enum(['rag-llm', 'research', 'coursework', 'systems', 'bsc']),
    org: z.string(),
    dates: z.string(),
    order: z.number(),
    blurb: z.string(),
    metrics: z.string().optional(),
    links: z.array(z.object({ label: z.string(), href: z.string() })).default([]),
    /* optional pointer to a playground toy that shares the entry's subject */
    toy: z.enum(['optimizer', 'digits', 'circle', 'flow']).optional(),
  }),
});

export const collections = { work };
