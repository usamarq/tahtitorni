/* The assistant's knowledge, assembled from the same sources as the pages
   at build time so it can never drift from what the site says. Served as a
   static text file; fetched by src/scripts/assistant.ts when the panel
   opens. Only published content goes in here: no phone, no street address. */
import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { site, socials } from '../data/site';
import { workGroups } from '../data/work';
import {
  cvSummary,
  cvEducation,
  cvRoles,
  cvSkills,
  cvSoftSkills,
  cvLanguages,
  cvCertifications,
  cvHonors,
  cvVolunteering,
  cvPublication,
  cvGrants,
  cvInterests,
  toys,
} from '../data/cv';

export const GET: APIRoute = async () => {
  const work = (await getCollection('work')).sort((a, b) => a.data.order - b.data.order);

  const lines: string[] = [];
  const push = (s: string) => lines.push(s);

  push(`# ${site.name} — site knowledge`);
  push('');
  push(`${site.name} is an ${site.title} in ${site.location} (${site.latitude}).`);
  push(site.positioning);
  push('');
  push('## Contact and profiles');
  push(`Email (the preferred contact route): ${site.email}`);
  for (const s of socials) if (s.href && s.label !== 'Email') push(`${s.label}: ${s.href}`);
  push('No phone number or street address is published; email is the way to reach him.');
  push('');
  push('## Summary');
  push(cvSummary);
  push('');
  push('## Experience');
  for (const r of cvRoles) {
    push(`### ${r.role} — ${r.org} (${r.dates})`);
    for (const b of r.bullets) push(`- ${b}`);
  }
  push('');
  push('## Education');
  for (const e of cvEducation) {
    push(`### ${e.degree} — ${e.school} (${e.dates})`);
    for (const n of e.notes) push(`- ${n}`);
    if (e.link) push(`- ${e.link.label}: ${e.link.href}`);
  }
  push('');
  push('## Skills');
  for (const s of cvSkills) push(`${s.title}: ${s.items}`);
  push(`Soft skills: ${cvSoftSkills.join(', ')}`);
  push('');
  push('## Languages');
  for (const l of cvLanguages) push(`${l.lang}: ${l.level}`);
  push('');
  push('## Publication');
  push(`${cvPublication.title} — ${cvPublication.venue} (${cvPublication.date})`);
  for (const b of cvPublication.bullets) push(`- ${b}`);
  push(`Link: ${cvPublication.href}`);
  push('');
  push('## Grants and funding');
  for (const g of cvGrants) {
    push(`### ${g.title} — ${g.org} (${g.date})`);
    for (const b of g.bullets) push(`- ${b}`);
  }
  push('');
  push('## Certifications');
  for (const c of cvCertifications) push(`- ${c.title} — ${c.org} (${c.date})${c.note ? ` · ${c.note}` : ''}`);
  push('');
  push('## Honors and awards');
  for (const h of cvHonors) push(`- ${h.title} — ${h.org} (${h.date})`);
  push('');
  push('## Volunteering');
  for (const v of cvVolunteering) push(`- ${v.title} — ${v.org} (${v.date})`);
  push('');
  push('## Interests outside work');
  push(cvInterests.join(', '));
  push('');
  push('## Work (all 16 entries, each with its own page)');
  for (const e of work) {
    const group = workGroups.find((g) => g.id === e.data.group)?.label ?? e.data.group;
    push(`### ${e.data.title}`);
    push(`Page: /work/${e.id}/`);
    push(`${e.data.kind} · ${e.data.org} · ${e.data.dates} · group: ${group}`);
    push(e.data.blurb);
    if (e.data.metrics) push(`Key numbers: ${e.data.metrics}`);
    for (const l of e.data.links) push(`${l.label}: ${l.href}`);
    if (e.body) push(e.body.trim());
    push('');
  }
  push('## The site itself');
  push('Pages: Home (/), Work index (/work/), CV (/cv/, printable), Playground (/playground/), About (/about/).');
  push('The playground has four live browser toys, no servers involved:');
  for (const t of toys) push(`- ${t.title} (${t.href}): ${t.desc}`);
  push('The CV page has a "Print / save PDF" button that produces a clean printed copy.');
  push('Pressing Ctrl+K (or Cmd+K) anywhere opens a command palette for jumping to any page or work entry.');
  push('The 404 page hides a star-charting game: light all seven stars to complete the chart.');
  push('The hero sky on the home page is interactive; constellations follow the cursor.');
  push('This assistant runs directly in the browser against a free-tier language model; questions are not stored by the site.');

  return new Response(lines.join('\n'), {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
};
