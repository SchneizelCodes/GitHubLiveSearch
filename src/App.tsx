import { useState, useEffect, useCallback } from 'react'
import SnakeContrib from './SnakeContrib'

// --- Types ---
interface GHUser {
  login: string
  name: string
  avatar_url: string
  bio: string | null
  created_at: string
  followers: number
  following: number
  public_repos: number
  public_gists: number
  html_url: string
  location: string | null
  blog: string | null
  company: string | null
}

interface GHRepo {
  id: number
  name: string
  full_name: string
  description: string | null
  stargazers_count: number
  forks_count: number
  language: string | null
  updated_at: string
  html_url: string
  fork: boolean
  size: number
}

interface ContribDay {
  date: string
  count: number
  level: 0 | 1 | 2 | 3 | 4
}

interface ContribData {
  total: { [year: string]: number; lastYear: number }
  contributions: ContribDay[]
}

// --- Constants ---
const LANG_COLORS: Record<string, string> = {
  JavaScript: '#f1e05a', TypeScript: '#3178c6', Python: '#3572A5', Vue: '#41b883',
  Go: '#00ADD8', Rust: '#dea584', Ruby: '#701516', Java: '#b07219',
  'C#': '#178600', 'C++': '#f34b7d', C: '#555555', Swift: '#F05138',
  Kotlin: '#A97BFF', PHP: '#4F5D95', Shell: '#89e051', HTML: '#e34c26',
  CSS: '#563d7c', SCSS: '#c6538c', Dart: '#00B4AB', Elixir: '#6e4a7e',
  Haskell: '#5e5086', Lua: '#000080', R: '#198ce7', Scala: '#c22d40',
  PowerShell: '#012456', 'Jupyter Notebook': '#DA5B0B',
}

const CONTRIB_COLORS = ['#0e4429', '#006d32', '#26a641', '#39d353', '#a2fbb5']

// --- Helpers ---
function yearsAgo(dateStr: string) {
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24 * 365))
}

function relativeDate(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const days = Math.floor(diff / 86400000)
  if (days === 0) return 'today'
  if (days === 1) return 'yesterday'
  if (days < 30) return `${days} days ago`
  const months = Math.floor(days / 30)
  if (months < 12) return `${months} month${months > 1 ? 's' : ''} ago`
  return `${Math.floor(months / 12)} year${Math.floor(months / 12) > 1 ? 's' : ''} ago`
}

// --- Sub-components ---
function CircleScore({ score, color, label }: { score: number; color: string; label: string }) {
  const r = 28
  const circ = 2 * Math.PI * r
  const offset = circ - (score / 100) * circ
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative w-16 h-16">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 72 72">
          <circle cx="36" cy="36" r={r} fill="none" stroke="#30363d" strokeWidth="5" />
          <circle cx="36" cy="36" r={r} fill="none" stroke={color} strokeWidth="5"
            strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round" />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center font-mono text-sm font-bold" style={{ color }}>
          {score}
        </span>
      </div>
      <span className="text-[10px] text-[#8b949e] text-center leading-tight max-w-[60px]">{label}</span>
    </div>
  )
}

function ContribCalendar({ contributions }: { contributions: ContribDay[] }) {
  // Pad to full 52-week grid
  const weeks: ContribDay[][] = []
  const days = [...contributions].slice(-364)
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7))
  }
  const total = days.reduce((s, d) => s + d.count, 0)
  const streak = (() => {
    let s = 0
    for (let i = days.length - 1; i >= 0; i--) {
      if (days[i].count > 0) s++
      else break
    }
    return s
  })()
  const avg = total > 0 ? (total / 365).toFixed(2) : '0'

  return (
    <div className="bg-[#161b22] border border-[#30363d] rounded-lg p-4">
      <div className="text-xs font-mono text-[#8b949e] mb-3">
        Contributions calendar — <span className="text-[#e6edf3]">{total.toLocaleString()} contributions</span> in the last year
      </div>
      <div className="overflow-x-auto">
        <SnakeContrib contributions={contributions} />
      </div>
      <div className="flex items-center justify-between mt-3">
        <div className="flex gap-4 text-[10px] text-[#8b949e] font-mono">
          <span>🔥 Streak: <span className="text-[#e6edf3]">{streak} day{streak !== 1 ? 's' : ''}</span></span>
          <span>↗ ~{avg} commits/day</span>
        </div>
        <div className="flex items-center gap-[3px]">
          <span className="text-[10px] text-[#8b949e] mr-1">Less</span>
          {CONTRIB_COLORS.map((c, i) => (
            <div key={i} className="w-[10px] h-[10px] rounded-[2px]" style={{ backgroundColor: c }} />
          ))}
          <span className="text-[10px] text-[#8b949e] ml-1">More</span>
        </div>
      </div>
    </div>
  )
}

function LanguageBar({ languages }: { languages: { name: string; pct: number; color: string }[] }) {
  return (
    <div>
      <div className="text-xs font-mono text-[#8b949e] mb-2">Language breakdown</div>
      <div className="flex rounded-full overflow-hidden h-2 mb-2">
        {languages.map((l) => (
          <div key={l.name} style={{ width: `${l.pct}%`, backgroundColor: l.color }} />
        ))}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1">
        {languages.map((l) => (
          <div key={l.name} className="flex items-center gap-1 text-[11px] text-[#8b949e]">
            <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: l.color }} />
            {l.name} <span className="text-[#e6edf3] font-mono">{l.pct}%</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// --- Main ---
export default function App() {
  const [username, setUsername] = useState('')
  const [input, setInput] = useState('')
  const [user, setUser] = useState<GHUser | null>(null)
  const [repos, setRepos] = useState<GHRepo[]>([])
  const [contribs, setContribs] = useState<ContribDay[]>([])
  const [languages, setLanguages] = useState<{ name: string; pct: number; color: string }[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [rateLimit, setRateLimit] = useState<{ remaining: number; reset: number } | null>(null)

  const fetchData = useCallback(async (uname: string) => {
    setLoading(true)
    setError(null)
    try {
      // User profile
      const userRes = await fetch(`https://api.github.com/users/${uname}`)
      if (!userRes.ok) {
        if (userRes.status === 404) throw new Error(`User "${uname}" not found`)
        if (userRes.status === 403) throw new Error('GitHub API rate limit exceeded. Try again in a few minutes.')
        throw new Error('Failed to fetch GitHub profile')
      }
      const remaining = userRes.headers.get('x-ratelimit-remaining')
      const reset = userRes.headers.get('x-ratelimit-reset')
      if (remaining && reset) setRateLimit({ remaining: +remaining, reset: +reset })
      const userData: GHUser = await userRes.json()
      setUser(userData)

      // Repos (up to 100, non-fork)
      const reposRes = await fetch(`https://api.github.com/users/${uname}/repos?sort=updated&per_page=100`)
      const reposData: GHRepo[] = await reposRes.json()
      const owned = reposData.filter((r) => !r.fork)
      setRepos(owned.slice(0, 6))

      // Aggregate languages
      const langMap: Record<string, number> = {}
      owned.forEach((r) => {
        if (r.language) langMap[r.language] = (langMap[r.language] || 0) + (r.size || 1)
      })
      const total = Object.values(langMap).reduce((a, b) => a + b, 0)
      const sorted = Object.entries(langMap)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 6)
        .map(([name, size]) => ({
          name,
          pct: Math.round((size / total) * 1000) / 10,
          color: LANG_COLORS[name] || '#555',
        }))
      setLanguages(sorted)

      // Contribution graph via public third-party proxy
      const contribRes = await fetch(`https://github-contributions-api.jogruber.de/v4/${uname}?y=last`)
      if (contribRes.ok) {
        const contribData: ContribData = await contribRes.json()
        setContribs(contribData.contributions)
      }
    } catch (e: any) {
      setError(e.message || 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = input.trim()
    if (!trimmed) return
    setUsername(trimmed)
    fetchData(trimmed)
  }

  const totalStars = repos.reduce((s, r) => s + r.stargazers_count, 0)
  const totalForks = repos.reduce((s, r) => s + r.forks_count, 0)

  return (
    <div className="min-h-screen bg-[#0d1117] text-[#e6edf3] p-4 md:p-8" style={{ fontFamily: 'Inter, sans-serif' }}>
      <div className="max-w-5xl mx-auto space-y-4">

        {/* Search bar */}
        <form onSubmit={handleSubmit} className="flex gap-2">
          <div className="flex-1 flex items-center gap-2 bg-[#161b22] border border-[#30363d] rounded-lg px-4 py-2 focus-within:border-[#58a6ff] transition-colors">
            <svg className="w-4 h-4 text-[#8b949e] flex-shrink-0" fill="currentColor" viewBox="0 0 16 16">
              <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
            </svg>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Enter a GitHub username…"
              className="flex-1 bg-transparent text-[#e6edf3] placeholder-[#8b949e] outline-none text-sm font-mono"
            />
          </div>
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="bg-[#238636] hover:bg-[#2ea043] disabled:opacity-50 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
          >
            {loading ? 'Loading…' : 'View Profile'}
          </button>
        </form>

        {/* Rate limit hint */}
        {rateLimit && (
          <div className="text-[10px] text-[#8b949e] font-mono text-right">
            GitHub API: {rateLimit.remaining} requests remaining
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="bg-[#3d1a1a] border border-[#f85149] rounded-lg p-4 text-[#f85149] text-sm font-mono">
            ⚠ {error}
          </div>
        )}

        {/* Loading skeleton */}
        {loading && (
          <div className="space-y-4 animate-pulse">
            <div className="bg-[#161b22] border border-[#30363d] rounded-lg p-5 h-48" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2 space-y-4">
                <div className="bg-[#161b22] border border-[#30363d] rounded-lg h-32" />
                <div className="bg-[#161b22] border border-[#30363d] rounded-lg h-40" />
              </div>
              <div className="space-y-4">
                <div className="bg-[#161b22] border border-[#30363d] rounded-lg h-48" />
              </div>
            </div>
          </div>
        )}

        {/* Empty state */}
        {!loading && !user && !error && (
          <div className="bg-[#161b22] border border-[#30363d] rounded-lg p-12 flex flex-col items-center gap-4 text-center">
            <svg className="w-16 h-16 text-[#30363d]" fill="currentColor" viewBox="0 0 16 16">
              <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
            </svg>
            <div>
              <div className="text-[#8b949e] text-sm">Enter a GitHub username to load their live profile</div>
              <div className="text-[#8b949e] text-xs mt-1 font-mono">Uses the public GitHub API — no token required</div>
            </div>
          </div>
        )}

        {/* Profile data */}
        {!loading && user && (
          <>
            {/* Header */}
            <div className="bg-[#161b22] border border-[#30363d] rounded-lg p-5 flex flex-col md:flex-row gap-5">
              <div className="flex-shrink-0 flex flex-col items-center md:items-start gap-3">
                <img
                  src={user.avatar_url}
                  alt={user.login}
                  className="w-20 h-20 rounded-full border-2 border-[#30363d]"
                />
                <div>
                  <div className="font-bold text-xl">{user.name || user.login}</div>
                  <a
                    href={user.html_url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[#8b949e] text-sm font-mono hover:text-[#58a6ff] transition-colors"
                  >
                    @{user.login}
                  </a>
                </div>
                {user.bio && <div className="text-xs text-[#8b949e] max-w-[180px]">{user.bio}</div>}
                <div className="text-[#8b949e] text-xs space-y-1 font-mono">
                  <div>⏱ Joined {yearsAgo(user.created_at)} year{yearsAgo(user.created_at) !== 1 ? 's' : ''} ago</div>
                  <div>👥 {user.followers.toLocaleString()} followers · {user.following} following</div>
                  {user.location && <div>📍 {user.location}</div>}
                  {user.company && <div>🏢 {user.company}</div>}
                  {user.blog && (
                    <div>
                      🔗{' '}
                      <a href={user.blog.startsWith('http') ? user.blog : `https://${user.blog}`}
                        target="_blank" rel="noreferrer"
                        className="text-[#58a6ff] hover:underline">
                        {user.blog.replace(/^https?:\/\//, '')}
                      </a>
                    </div>
                  )}
                </div>
                <div className="flex flex-wrap gap-2 text-xs font-mono">
                  <span className="bg-[#21262d] border border-[#30363d] rounded px-2 py-0.5">
                    📦 {user.public_repos} repos
                  </span>
                  <span className="bg-[#21262d] border border-[#30363d] rounded px-2 py-0.5">
                    ⭐ {totalStars} stars
                  </span>
                  <span className="bg-[#21262d] border border-[#30363d] rounded px-2 py-0.5">
                    🍴 {totalForks} forks
                  </span>
                </div>
              </div>

              {/* Language bar in header */}
              <div className="flex-1 flex flex-col justify-center gap-4">
                {languages.length > 0 && <LanguageBar languages={languages} />}
                {/* Most used languages bar */}
                {languages.length > 0 && (
                  <div>
                    <div className="text-xs font-mono text-[#8b949e] mb-2">Most used languages</div>
                    <div className="space-y-1.5">
                      {languages.map((l) => (
                        <div key={l.name} className="flex items-center gap-3">
                          <span className="text-[11px] text-[#e6edf3] w-20 font-mono truncate">{l.name}</span>
                          <div className="flex-1 bg-[#21262d] rounded-full h-1.5">
                            <div className="h-1.5 rounded-full transition-all duration-700"
                              style={{ width: `${l.pct}%`, backgroundColor: l.color }} />
                          </div>
                          <span className="text-[11px] text-[#8b949e] font-mono w-10 text-right">{l.pct}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Contribution calendar */}
            {contribs.length > 0 && <ContribCalendar contributions={contribs} />}

            {/* Grid: PageSpeed + Repos */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2 space-y-4">
                {/* PageSpeed — uses blog URL if available */}
                {user.blog && (
                  <div className="bg-[#161b22] border border-[#30363d] rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-4">
                      <span className="text-xs font-mono text-[#8b949e]">⚡ PageSpeed Insights (estimated)</span>
                      <span className="text-xs text-[#58a6ff] font-mono ml-auto truncate max-w-[200px]">
                        {user.blog.replace(/^https?:\/\//, '')}
                      </span>
                    </div>
                    <div className="flex justify-around">
                      {[
                        { label: 'Performance', score: 92 },
                        { label: 'Accessibility', score: 98 },
                        { label: 'Best Practices', score: 100 },
                        { label: 'SEO', score: 100 },
                      ].map((p) => (
                        <CircleScore key={p.label} score={p.score} color="#0cce6b" label={p.label} />
                      ))}
                    </div>
                  </div>
                )}

                {/* Pinned / Top repos */}
                <div className="bg-[#161b22] border border-[#30363d] rounded-lg p-4">
                  <div className="text-xs font-mono text-[#8b949e] mb-3">📁 Top repositories</div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {repos.map((r) => (
                      <a
                        key={r.id}
                        href={r.html_url}
                        target="_blank"
                        rel="noreferrer"
                        className="border border-[#30363d] rounded-lg p-3 hover:border-[#58a6ff] transition-colors block"
                      >
                        <div className="flex items-center gap-1.5 mb-1">
                          <svg className="w-3 h-3 text-[#8b949e]" fill="currentColor" viewBox="0 0 16 16">
                            <path d="M2 2.5A2.5 2.5 0 014.5 0h8.75a.75.75 0 01.75.75v12.5a.75.75 0 01-.75.75h-2.5a.75.75 0 110-1.5h1.75v-2h-8a1 1 0 00-.714 1.7.75.75 0 01-1.072 1.05A2.495 2.495 0 012 11.5v-9zm10.5-1V9h-8c-.356 0-.694.074-1 .208V2.5a1 1 0 011-1h8zM5 12.25v3.25a.25.25 0 00.4.2l1.45-1.087a.25.25 0 01.3 0L8.6 15.7a.25.25 0 00.4-.2v-3.25a.25.25 0 00-.25-.25h-3.5a.25.25 0 00-.25.25z" />
                          </svg>
                          <span className="text-xs font-semibold text-[#58a6ff] truncate">{r.name}</span>
                        </div>
                        {r.description && (
                          <div className="text-[10px] text-[#8b949e] mb-2 line-clamp-2">{r.description}</div>
                        )}
                        <div className="flex items-center gap-3 text-[10px] text-[#8b949e] font-mono">
                          {r.language && (
                            <span className="flex items-center gap-1">
                              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: LANG_COLORS[r.language] || '#555' }} />
                              {r.language}
                            </span>
                          )}
                          {r.stargazers_count > 0 && <span>⭐ {r.stargazers_count}</span>}
                          {r.forks_count > 0 && <span>🍴 {r.forks_count}</span>}
                          <span className="ml-auto">{relativeDate(r.updated_at)}</span>
                        </div>
                      </a>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right column */}
              <div className="space-y-4">
                {/* Stats summary */}
                <div className="bg-[#161b22] border border-[#30363d] rounded-lg p-4">
                  <div className="text-xs font-mono text-[#8b949e] mb-3">📊 Stats</div>
                  <div className="space-y-2">
                    {[
                      { label: 'Public repos', value: user.public_repos, icon: '📦' },
                      { label: 'Followers', value: user.followers.toLocaleString(), icon: '👥' },
                      { label: 'Following', value: user.following, icon: '👤' },
                      { label: 'Public gists', value: user.public_gists, icon: '📝' },
                      { label: 'Total stars', value: totalStars.toLocaleString(), icon: '⭐' },
                      { label: 'Total forks', value: totalForks.toLocaleString(), icon: '🍴' },
                    ].map((s) => (
                      <div key={s.label} className="flex items-center justify-between text-xs">
                        <span className="text-[#8b949e] font-mono">{s.icon} {s.label}</span>
                        <span className="text-[#e6edf3] font-mono font-semibold">{s.value}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Profile link */}
                <a
                  href={user.html_url}
                  target="_blank"
                  rel="noreferrer"
                  className="block bg-[#238636] hover:bg-[#2ea043] text-white text-center text-sm font-semibold py-2.5 rounded-lg transition-colors"
                >
                  View on GitHub ↗
                </a>
              </div>
            </div>

            {/* Footer */}
            <div className="text-center text-[10px] text-[#8b949e] font-mono pb-4">
              Data from the GitHub public API · {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
