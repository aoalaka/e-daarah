import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

/**
 * Visitor analytics panel powered by Cloudflare Web Analytics.
 *
 * Props:
 *   data    — payload from /superadmin/visitor-analytics
 *   loading — boolean
 *   error   — string or null
 *   days    — current range
 *   onDaysChange — fn(days:number)
 */
export default function VisitorAnalyticsPanel({ data, loading, error, days, onDaysChange }) {
  const totals = data ? {
    pageviews: data.dailyTotals.reduce((s, d) => s + d.pageviews, 0),
    visits: data.dailyTotals.reduce((s, d) => s + d.visits, 0),
  } : { pageviews: 0, visits: 0 };

  const lists = data ? [
    { title: 'Top pages', rows: data.topPages },
    { title: 'Top countries', rows: data.topCountries },
    { title: 'Top referrers', rows: data.topReferrers },
    { title: 'Devices', rows: data.topDevices },
    { title: 'Browsers', rows: data.topBrowsers },
    { title: 'Operating systems', rows: data.topOS },
  ] : [];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
        <h3 style={{ fontSize: 14, fontWeight: 600, color: '#111827', margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Website Visitors
        </h3>
        <select
          value={days}
          onChange={(e) => onDaysChange(parseInt(e.target.value))}
          style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid #d1d5db', fontSize: 13 }}
        >
          <option value={1}>Last 24 hours</option>
          <option value={7}>Last 7 days</option>
          <option value={14}>Last 14 days</option>
          <option value={30}>Last 30 days</option>
        </select>
      </div>

      {loading ? (
        <div style={{ padding: 24, textAlign: 'center', color: '#6b7280', fontSize: 13 }}>Loading…</div>
      ) : error ? (
        <div style={{ padding: 16, background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 6, fontSize: 13, color: '#991b1b' }}>
          {error}
          {error.includes('not configured') && (
            <div style={{ marginTop: 4, fontSize: 12, color: '#7f1d1d' }}>
              Set <code>CLOUDFLARE_ACCOUNT_ID</code> and <code>CLOUDFLARE_API_TOKEN</code> on the backend.
            </div>
          )}
        </div>
      ) : data ? (
        <>
          {/* Totals */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 12 }}>
            <div style={{ padding: 14, background: '#f8fafc', borderRadius: 8 }}>
              <div style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.4px' }}>Page Views</div>
              <div style={{ fontSize: 22, fontWeight: 700, marginTop: 4 }}>{totals.pageviews.toLocaleString()}</div>
              <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>Every page load</div>
            </div>
            <div
              style={{ padding: 14, background: '#f8fafc', borderRadius: 8 }}
              title="A visit is one browsing session. The same person returning later counts as a new visit. Closest in-app proxy for unique visitors."
            >
              <div style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.4px' }}>Visits ≈ Visitors</div>
              <div style={{ fontSize: 22, fontWeight: 700, marginTop: 4 }}>{totals.visits.toLocaleString()}</div>
              <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>One browsing session</div>
            </div>
          </div>
          <div style={{ marginBottom: 18, fontSize: 12, color: '#6b7280', lineHeight: 1.5 }}>
            <strong>Visits</strong> is the best free proxy for unique visitors — same person returning later counts as a new visit. Cloudflare's free tier doesn't expose true unique-visitor counts.
          </div>

          {totals.pageviews === 0 ? (
            <div style={{ padding: 16, background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 6, fontSize: 13, color: '#78350f' }}>
              No visits recorded yet for this range. Disable any ad-blockers when testing the live site.
            </div>
          ) : (
            <>
              {data.dailyTotals.length > 0 && (
                <div style={{ marginBottom: 24 }}>
                  <h4 style={{ fontSize: 13, fontWeight: 600, color: '#374151', margin: '0 0 12px' }}>Daily page views</h4>
                  <div style={{ width: '100%', height: 220 }}>
                    <ResponsiveContainer>
                      <BarChart data={data.dailyTotals.map(d => ({ date: d.date.slice(5), pageviews: d.pageviews, visits: d.visits }))}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                        <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                        <Tooltip contentStyle={{ fontSize: 12, borderRadius: 6 }} />
                        <Bar dataKey="pageviews" fill="#0d9488" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
                {lists.map(({ title, rows }) => (
                  <div key={title} style={{ padding: 14, border: '1px solid #e5e7eb', borderRadius: 8 }}>
                    <h4 style={{ fontSize: 12, fontWeight: 600, color: '#374151', margin: '0 0 10px', textTransform: 'uppercase', letterSpacing: '0.4px' }}>{title}</h4>
                    {rows.length === 0 ? (
                      <div style={{ fontSize: 12, color: '#9ca3af' }}>No data</div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {rows.slice(0, 8).map((r, i) => (
                          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13, gap: 8 }}>
                            <span style={{ color: '#1f2937', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }}>{r.name || '(unknown)'}</span>
                            <span style={{ color: '#6b7280', fontWeight: 600, flexShrink: 0 }}>{r.count.toLocaleString()}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      ) : null}

      <div style={{ marginTop: 12, fontSize: 11, color: '#9ca3af' }}>
        Powered by Cloudflare Web Analytics · privacy-friendly, no cookies
      </div>
    </div>
  );
}
