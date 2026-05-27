import fs from 'fs'
import path from 'path'
import formidable from 'formidable'
import { Octokit } from '@octokit/rest'

export const config = {
  api: { bodyParser: false },
  maxDuration: 60,
}

const PAGES_DIR = path.join(process.cwd(), 'src', 'pages')
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions'
const MODEL = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile'
const REPO_OWNER = 'ianpilon'
const REPO_NAME = 'information-foraging-theory-site'
const BASE_BRANCH = 'main'

function listExistingPages() {
  const out = []
  function walk(dir) {
    let entries
    try { entries = fs.readdirSync(dir, { withFileTypes: true }) } catch { return }
    for (const e of entries) {
      if (e.name === 'api' || e.name.startsWith('_')) continue
      const full = path.join(dir, e.name)
      if (e.isDirectory()) walk(full)
      else if (e.name.endsWith('.mdx') || e.name.endsWith('.md')) {
        const slug = path.relative(PAGES_DIR, full).replace(/\.(mdx|md)$/, '')
        out.push(slug)
      }
    }
  }
  walk(PAGES_DIR)
  return out
}

function readIndex() {
  try {
    return fs.readFileSync(path.join(PAGES_DIR, 'index.mdx'), 'utf-8')
  } catch {
    return ''
  }
}

function safeSlug(name) {
  return name
    .toLowerCase()
    .replace(/\.(pdf|md|markdown|txt)$/i, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
}

async function extractText(filepath, originalName) {
  const ext = (originalName.split('.').pop() || '').toLowerCase()
  if (ext === 'md' || ext === 'markdown' || ext === 'txt') {
    return fs.readFileSync(filepath, 'utf-8')
  }
  if (ext === 'pdf') {
    const pdfParse = require('pdf-parse/lib/pdf-parse.js')
    const buf = fs.readFileSync(filepath)
    const data = await pdfParse(buf)
    return data.text || ''
  }
  throw new Error(`Unsupported file type: .${ext}. Use .md, .txt, or .pdf.`)
}

function buildPrompt(sourceText, sourceName, existingPages, currentIndex) {
  const today = new Date().toISOString().slice(0, 10)
  return `You are ingesting a new source into a Karpathy-style LLM wiki on information foraging theory.

# Rules
- Output ONLY valid JSON. No prose around it.
- Page slugs are lowercase kebab-case. ASCII letters, numbers, hyphens only.
- Page links use markdown: [page-slug](/page-slug). Never use [[wiki-links]] (Obsidian style).
- Every page MUST start with this exact frontmatter style (not YAML, plain markdown):

# Page Title

**Summary**: One to two sentences.

**Sources**: ${sourceName}

**Last updated**: ${today}

---

(body content)

## Related pages

- [other-slug](/other-slug)

# Today's date
${today}

# Existing page slugs (do NOT create duplicates; reuse these as links)
${existingPages.join(', ')}

# Current index page (you will propose additions to it)
\`\`\`
${currentIndex.slice(0, 3000)}
\`\`\`

# New source to ingest
File name: ${sourceName}

Source text (may be truncated):
\`\`\`
${sourceText.slice(0, 18000)}
\`\`\`

# What to produce
Return a single JSON object with this shape:

{
  "sourceSlug": "kebab-slug-naming-this-source",
  "summaryPage": {
    "slug": "source-<short-name>",
    "title": "Human Title for the Summary Page",
    "content": "Full markdown content of the source summary page following the page format above."
  },
  "conceptPages": [
    {
      "slug": "concept-name",
      "title": "Concept Name",
      "content": "Full markdown content of a concept page following the page format above.",
      "isNew": true
    }
  ],
  "indexAdditions": [
    {
      "section": "Foundational frame",
      "line": "- [concept-name](/concept-name): one-line description."
    }
  ],
  "logEntry": "YYYY-MM-DD: ingested <source>. Added <N> pages: <list>.",
  "prTitle": "Ingest: <short source descriptor>",
  "prSummary": "Markdown bullet list of what was added and why."
}

Guidance:
- Create 1 summary page named source-... and 3 to 8 concept pages for the major distinct ideas.
- If a concept matches an existing slug, link to it via the existing slug instead of creating a duplicate. Mark isNew=false for those.
- In conceptPages content, freely reference both new and existing slugs via [slug](/slug).
- indexAdditions section names must match existing sections in the current index when possible (Foundational frame, Foraging mechanisms, Modeling stack, Sense-making, Behavior change, Applied UX, Forward-looking, Sources). Use Sources section for the summary page.
- Keep page bodies focused and factual. No em-dashes. Plain language.

Output the JSON now.`
}

async function callGroq(prompt, apiKey) {
  const r = await fetch(GROQ_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: MODEL,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.2,
      max_tokens: 6000,
      response_format: { type: 'json_object' },
    }),
  })
  const raw = await r.text()
  if (!r.ok) {
    throw new Error(`Groq ${r.status}: ${raw.slice(0, 300)}`)
  }
  const data = JSON.parse(raw)
  const txt = data.choices?.[0]?.message?.content || ''
  try {
    return JSON.parse(txt)
  } catch (e) {
    throw new Error('Groq returned non-JSON: ' + txt.slice(0, 300))
  }
}

function applyIndexAdditions(currentIndex, additions) {
  let out = currentIndex
  for (const add of additions) {
    const header = `## ${add.section}`
    const i = out.indexOf(header)
    if (i === -1) {
      out = out.trimEnd() + `\n\n## ${add.section}\n\n${add.line}\n`
      continue
    }
    const nextHeaderRel = out.slice(i + header.length).search(/\n## /)
    const insertAt = nextHeaderRel === -1 ? out.length : i + header.length + nextHeaderRel
    const before = out.slice(0, insertAt).trimEnd()
    const after = out.slice(insertAt)
    out = before + '\n' + add.line + '\n' + after
  }
  return out
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }
  const groqKey = process.env.GROQ_API_KEY
  const ghToken = process.env.GITHUB_TOKEN
  if (!groqKey) return res.status(500).json({ error: 'GROQ_API_KEY not set in env.' })
  if (!ghToken) return res.status(500).json({ error: 'GITHUB_TOKEN not set in env. Add a fine-grained PAT with Contents+PullRequests write on this repo.' })

  let file, sourceText
  try {
    const form = formidable({ maxFileSize: 10 * 1024 * 1024 })
    const [, files] = await form.parse(req)
    file = files.file?.[0]
    if (!file) return res.status(400).json({ error: 'No file uploaded (expected field "file").' })
    sourceText = await extractText(file.filepath, file.originalFilename || 'source')
    if (!sourceText || sourceText.trim().length < 100) {
      return res.status(400).json({ error: 'Extracted text is empty or too short (less than 100 chars). The file may be a scanned PDF without selectable text.' })
    }
  } catch (e) {
    return res.status(400).json({ error: 'File parsing failed: ' + String(e.message || e) })
  }

  let plan
  try {
    const existing = listExistingPages()
    const currentIndex = readIndex()
    const prompt = buildPrompt(sourceText, file.originalFilename || 'source', existing, currentIndex)
    plan = await callGroq(prompt, groqKey)
  } catch (e) {
    return res.status(502).json({ error: 'LLM step failed: ' + String(e.message || e) })
  }

  if (!plan?.summaryPage?.slug || !plan?.summaryPage?.content) {
    return res.status(502).json({ error: 'LLM returned invalid plan (missing summaryPage).', plan })
  }

  // Apply index additions in memory
  const currentIndex = readIndex()
  const newIndex = applyIndexAdditions(currentIndex, Array.isArray(plan.indexAdditions) ? plan.indexAdditions : [])
  const logEntry = (plan.logEntry || '').trim()

  // Files to commit
  const filesToWrite = []
  const summarySlug = safeSlug(plan.summaryPage.slug)
  filesToWrite.push({ path: `src/pages/${summarySlug}.mdx`, content: plan.summaryPage.content })
  for (const cp of plan.conceptPages || []) {
    if (cp.isNew === false) continue
    const slug = safeSlug(cp.slug)
    filesToWrite.push({ path: `src/pages/${slug}.mdx`, content: cp.content })
  }
  filesToWrite.push({ path: 'src/pages/index.mdx', content: newIndex })

  // GitHub: branch + commit + PR
  const octokit = new Octokit({ auth: ghToken })
  const branchName = `ingest/${summarySlug}-${Date.now()}`
  try {
    const { data: ref } = await octokit.git.getRef({ owner: REPO_OWNER, repo: REPO_NAME, ref: `heads/${BASE_BRANCH}` })
    const baseSha = ref.object.sha
    await octokit.git.createRef({ owner: REPO_OWNER, repo: REPO_NAME, ref: `refs/heads/${branchName}`, sha: baseSha })

    // Write each file via Contents API
    for (const f of filesToWrite) {
      // Check if file exists on this branch (it inherits from main initially)
      let existingSha
      try {
        const { data } = await octokit.repos.getContent({ owner: REPO_OWNER, repo: REPO_NAME, path: f.path, ref: branchName })
        if (!Array.isArray(data)) existingSha = data.sha
      } catch (e) {
        if (e.status !== 404) throw e
      }
      await octokit.repos.createOrUpdateFileContents({
        owner: REPO_OWNER,
        repo: REPO_NAME,
        path: f.path,
        message: `Ingest ${file.originalFilename}: ${f.path}`,
        content: Buffer.from(f.content, 'utf-8').toString('base64'),
        branch: branchName,
        sha: existingSha,
      })
    }

    const prBody = [
      plan.prSummary || `Ingested ${file.originalFilename}.`,
      '',
      logEntry ? `**Log entry:**\n${logEntry}` : '',
      '',
      'Generated by /api/ingest. Review the diff before merging.',
    ].filter(Boolean).join('\n')

    const { data: pr } = await octokit.pulls.create({
      owner: REPO_OWNER,
      repo: REPO_NAME,
      title: plan.prTitle || `Ingest: ${file.originalFilename}`,
      head: branchName,
      base: BASE_BRANCH,
      body: prBody,
    })

    return res.status(200).json({
      ok: true,
      prUrl: pr.html_url,
      prNumber: pr.number,
      filesAdded: filesToWrite.length,
      branch: branchName,
    })
  } catch (e) {
    return res.status(500).json({ error: 'GitHub step failed: ' + String(e.message || e) })
  }
}
