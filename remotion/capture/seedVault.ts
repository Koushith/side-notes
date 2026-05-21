// Builds a believable demo vault inside a temp directory: streak of daily notes
// for the carry-forward + streak chip, virtual year/month grouping by seeding
// past months, todo files with realistic open/done mixes, attachments, tags.
//
// Re-runnable: nukes and recreates each call.

import fs from 'node:fs/promises';
import path from 'node:path';

export interface SeededVault {
  vaultPath: string;
  userDataPath: string;
  todayIso: string;
}

const MONTH_LONG = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function ymd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function dailyBody(
  d: Date,
  opts: {
    openTasks?: string[];
    doneTasks?: string[];
    mood?: string;
    note?: string;
    /** Wikilinks to other notes — drives the graph view. */
    links?: string[];
    /** #tags — drives tag clustering and the tag panel. */
    tags?: string[];
  }
) {
  const human = d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  const sections: string[] = [];
  sections.push(`# ${ymd(d)}`);
  sections.push('');
  sections.push(`*${human}*`);
  sections.push('');
  if (opts.note) {
    sections.push(opts.note);
    sections.push('');
  }
  sections.push('## Focus');
  for (const t of opts.openTasks ?? []) sections.push(`- [ ] ${t}`);
  for (const t of opts.doneTasks ?? []) sections.push(`- [x] ${t}`);
  sections.push('');
  if (opts.links && opts.links.length > 0) {
    sections.push('## Threads');
    for (const l of opts.links) sections.push(`- Continuing [[${l}]]`);
    sections.push('');
  }
  if (opts.tags && opts.tags.length > 0) {
    sections.push(opts.tags.map((t) => `#${t}`).join(' '));
    sections.push('');
  }
  sections.push('## Notes');
  sections.push('');
  return sections.join('\n');
}

export async function seedDemoVault(root: string): Promise<SeededVault> {
  // Wipe + recreate
  await fs.rm(root, { recursive: true, force: true });
  const vaultPath = path.join(root, 'demo-vault');
  const userDataPath = path.join(root, 'userData');
  await fs.mkdir(vaultPath, { recursive: true });
  await fs.mkdir(userDataPath, { recursive: true });

  // Today reference — pin to 2026-05-22 to match the app's current "now".
  const today = new Date(2026, 4, 22);

  // ---- Daily Notes ----
  const dailyDir = path.join(vaultPath, 'Daily Notes');
  await fs.mkdir(dailyDir, { recursive: true });

  // 12-day streak ending today. Each entry links to a neighbor day plus a hub note
  // so the graph view has real structure to render.
  type StreakItem = {
    d: Date;
    open?: string[];
    done?: string[];
    note?: string;
    links?: string[];
    tags?: string[];
  };
  const streakItems: StreakItem[] = [
    {
      d: new Date(2026, 4, 11),
      done: ['Wrote design doc for the editor'],
      open: ['Reach out to early testers'],
      links: ['launch-plan', 'v030-changes'],
      tags: ['release', 'product'],
    },
    {
      d: new Date(2026, 4, 12),
      done: ['Reach out to early testers'],
      note: 'Heard back from 3 testers already.',
      links: ['2026-05-11', 'launch-plan'],
      tags: ['release'],
    },
    {
      d: new Date(2026, 4, 13),
      done: ['Mermaid spike'],
      open: ['Custom checkbox styling'],
      links: ['2026-05-12', 'v030-changes'],
      tags: ['engineering'],
    },
    {
      d: new Date(2026, 4, 14),
      done: ['Custom checkbox styling'],
      note: 'Replaced native input with a themed square.',
      links: ['2026-05-13', 'v030-changes'],
      tags: ['engineering', 'design'],
    },
    {
      d: new Date(2026, 4, 15),
      done: ['Image viewer prototype'],
      open: ['PDF embed in Electron'],
      links: ['2026-05-14', 'v030-changes'],
      tags: ['engineering'],
    },
    {
      d: new Date(2026, 4, 16),
      done: ['PDF embed in Electron'],
      note: 'Chromium plugins flag did the trick.',
      links: ['2026-05-15', 'v030-changes'],
      tags: ['engineering'],
    },
    {
      d: new Date(2026, 4, 17),
      done: ['Todo header chrome'],
      open: ['Virtual year/month grouping'],
      links: ['2026-05-16', 'launch-plan'],
      tags: ['design', 'product'],
    },
    {
      d: new Date(2026, 4, 18),
      done: ['Virtual year/month grouping'],
      open: ['Watcher-safe writes'],
      links: ['2026-05-17', 'v030-changes'],
      tags: ['design'],
    },
    {
      d: new Date(2026, 4, 19),
      done: ['Watcher-safe writes'],
      note: 'Closed the data-loss loop — relief.',
      links: ['2026-05-18', 'launch-plan'],
      tags: ['engineering', 'reliability'],
    },
    {
      d: new Date(2026, 4, 20),
      done: ['Themed dialogs'],
      open: ['Image path fallback'],
      links: ['2026-05-19', 'v030-changes'],
      tags: ['design'],
    },
    {
      d: new Date(2026, 4, 21),
      done: ['Image path fallback'],
      open: [
        'Cut v0.3.0 release video',
        'Write blog post',
        'Schedule launch tweet',
        'Update changelog on the site',
      ],
      links: ['2026-05-20', 'launch-plan', 'v030-changes'],
      tags: ['release', 'marketing'],
    },
    // today: carry forward yesterday's open items
    {
      d: today,
      open: [
        'Cut v0.3.0 release video',
        'Write blog post',
        'Schedule launch tweet',
        'Update changelog on the site',
      ],
      note: 'Big launch day. Energy: good.',
      links: ['2026-05-21', 'launch-plan', 'v030-changes', 'Welcome'],
      tags: ['release', 'launch'],
    },
  ];

  for (const s of streakItems) {
    await fs.writeFile(
      path.join(dailyDir, `${ymd(s.d)}.md`),
      dailyBody(s.d, {
        openTasks: s.open,
        doneTasks: s.done,
        note: s.note,
        links: s.links,
        tags: s.tags,
      })
    );
  }

  // Older months (sparse fills) — drives the virtual Year/Month grouping.
  const sparseFills: Date[] = [];
  for (let day = 1; day <= 28; day += 2) sparseFills.push(new Date(2026, 3, day)); // April
  for (let day = 1; day <= 28; day += 3) sparseFills.push(new Date(2026, 2, day)); // March
  for (let day = 1; day <= 28; day += 4) sparseFills.push(new Date(2026, 1, day)); // February
  for (let day = 1; day <= 28; day += 5) sparseFills.push(new Date(2026, 0, day)); // January
  for (let day = 1; day <= 28; day += 6) sparseFills.push(new Date(2025, 10, day)); // Nov 2025
  for (let day = 1; day <= 28; day += 7) sparseFills.push(new Date(2025, 9, day));  // Oct 2025

  for (const d of sparseFills) {
    await fs.writeFile(
      path.join(dailyDir, `${ymd(d)}.md`),
      dailyBody(d, {
        openTasks: [],
        doneTasks: [`Reviewed ${MONTH_LONG[d.getMonth()].toLowerCase()} progress`],
        note: 'Short day, deep work.',
      })
    );
  }

  // ---- Todos folder (dated + project) ----
  const todosDir = path.join(dailyDir, 'Todos');
  await fs.mkdir(todosDir, { recursive: true });
  await fs.writeFile(
    path.join(todosDir, '2026-05-22.md'),
    [
      `> What's on my plate today.`,
      ``,
      `## Focus`,
      `_The 1–3 things that matter most._`,
      ``,
      `- [ ] Ship v0.3.0 release video`,
      `- [x] Update website changelog`,
      `- [x] Push remotion pipeline`,
      ``,
      `## Quick wins`,
      `- [x] Reply to launch tweets`,
      `- [x] Star a friend's repo`,
      `- [ ] File one new bug from the demo run`,
      ``,
      `## Rolled over`,
      `- [ ] Sketch the v0.4 plugin API`,
      ``,
      `## Done`,
      `- [x] Morning pages`,
    ].join('\n')
  );

  // Project todos
  const workTodosDir = path.join(vaultPath, 'work', 'todos');
  await fs.mkdir(workTodosDir, { recursive: true });
  await fs.writeFile(
    path.join(workTodosDir, '2026-05-22.md'),
    [
      `> Sprint goals — week 21`,
      ``,
      `## Focus`,
      `- [ ] Onboarding flow polish`,
      `- [ ] Stripe webhooks idempotency`,
      ``,
      `## Quick wins`,
      `- [x] Bump Tailwind to v4`,
      `- [x] Drop unused dependency`,
      `- [x] Type-correct the export helper`,
      ``,
      `## Rolled over`,
      `- [ ] Spike on AI summaries`,
      ``,
      `## Done`,
      `- [x] Ship feature flag SDK`,
      `- [x] Wire up plausible analytics`,
    ].join('\n')
  );

  // Side projects todo
  const sideTodosDir = path.join(vaultPath, 'sideprojects', 'todos');
  await fs.mkdir(sideTodosDir, { recursive: true });
  await fs.writeFile(
    path.join(sideTodosDir, 'launch-plan.md'),
    [
      `# Launch Plan`,
      ``,
      `> Driving force behind [[v030-changes]]. Updated on [[2026-05-22]].`,
      ``,
      `## Now`,
      `_What I'm actively working on._`,
      ``,
      `- [x] Land Mermaid diagrams — see [[2026-05-13]]`,
      `- [x] Land PDF viewer — see [[2026-05-15]] and [[2026-05-16]]`,
      `- [ ] Cut release video — see [[2026-05-22]]`,
      ``,
      `## Next`,
      `- [ ] Submit to Mac App Store`,
      `- [ ] Reach out to 5 power users for beta of plugin API`,
      ``,
      `## Later`,
      `- [ ] Mobile companion read-only viewer`,
      ``,
      `## Done`,
      `- [x] Domain + landing page`,
      `- [x] Pricing decision (free forever, paid sync later)`,
      ``,
      `Tags: #release #launch #product`,
    ].join('\n')
  );

  // ---- Pinned-worthy notes ----
  await fs.writeFile(
    path.join(vaultPath, 'Welcome.md'),
    [
      `# Welcome to SideNotes`,
      ``,
      `Your plain-markdown second brain. Everything here lives as a normal file on disk —`,
      `you can grep it, sync it with iCloud or Dropbox, edit it in any other editor.`,
      ``,
      `## This week's threads`,
      ``,
      `- [[2026-05-22]] — today`,
      `- [[2026-05-21]] — pre-launch checklist`,
      `- [[2026-05-19]] — closed the data-loss loop`,
      `- [[2026-05-16]] — PDF embed working`,
      `- [[2026-05-13]] — Mermaid spike`,
      ``,
      `## Plans`,
      ``,
      `- [[launch-plan]] — v0.3.0 launch plan`,
      `- [[v030-changes]] — what shipped`,
      ``,
      `## Tags`,
      ``,
      `#release · #engineering · #design · #product · #reliability · #marketing`,
      ``,
      `Press \`⌘K\` to jump anywhere.`,
    ].join('\n')
  );

  // Blog-style note with a tag set
  const blogDir = path.join(vaultPath, 'blogs', 'drafts');
  await fs.mkdir(blogDir, { recursive: true });
  await fs.writeFile(
    path.join(blogDir, 'v030-changes.md'),
    [
      `---`,
      `title: 'What changed in v0.3.0'`,
      `tags: ['release', 'changelog']`,
      `---`,
      ``,
      `# What changed in v0.3.0`,
      ``,
      `> Living doc — backed by [[launch-plan]] and the day-by-day in [[2026-05-22]].`,
      ``,
      `## Diagrams that render`,
      ``,
      `Built on the [[2026-05-13]] spike.`,
      ``,
      '```mermaid',
      'graph TD',
      '  Idea --> Worth{Worth shipping?}',
      '  Worth -->|Yes| Build',
      '  Worth -->|No| Park[Park it]',
      '```',
      ``,
      `## Viewers — see [[2026-05-15]], [[2026-05-16]]`,
      ``,
      `Image + PDF, opens any attachment in a tab.`,
      ``,
      `## Reliability — see [[2026-05-19]]`,
      ``,
      `Watcher-safe writes. External edits never get clobbered.`,
      ``,
      `## The rest`,
      ``,
      `- Todo notes with progress`,
      `- Virtual year/month grouping`,
      `- Themed dialogs (no more native crashes)`,
      ``,
      `Tags: #release #engineering #design`,
    ].join('\n')
  );

  // ---- Pre-write app settings.json so the app opens our vault on launch ----
  const settings = {
    vaultPath,
    recentVaults: [vaultPath],
  };
  await fs.writeFile(path.join(userDataPath, 'settings.json'), JSON.stringify(settings, null, 2));

  return { vaultPath, userDataPath, todayIso: ymd(today) };
}

// Allow standalone run for inspection: `tsx remotion/capture/seedVault.ts /tmp/sn-demo`
if (process.argv[1] && process.argv[1].endsWith('seedVault.ts')) {
  const target = process.argv[2] ?? path.join(process.cwd(), '.demo-vault');
  seedDemoVault(target).then((r) => {
    console.log('seeded', r);
  });
}
