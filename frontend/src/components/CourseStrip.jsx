import { useState, useRef, useEffect } from 'react';
import { MagnifyingGlassIcon, XMarkIcon } from '@heroicons/react/24/outline';

function CourseStrip({ courses, selectedCourseId, onSelect }) {
  const [searching, setSearching] = useState(false);
  const [query, setQuery] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    if (searching && inputRef.current) inputRef.current.focus();
  }, [searching]);

  const showSearch = courses.length > 5;
  const filtered = query.trim()
    ? courses.filter(c => c.name.toLowerCase().includes(query.toLowerCase()))
    : courses;

  return (
    <div className="cs-course-strip">
      <div className="cs-course-strip-scroll">
        {filtered.length === 0 ? (
          <span style={{ color: '#94a3b8', fontSize: 13, padding: '8px 0' }}>No courses match "{query}"</span>
        ) : filtered.map(course => {
          const active = selectedCourseId === course.id;
          const colour = course.colour || '#475569';
          return (
            <button
              key={course.id}
              type="button"
              className={`cs-course-pill ${active ? 'active' : ''}`}
              style={active ? { background: colour, borderColor: colour } : {}}
              onClick={() => onSelect(course)}
            >
              {!active && <span className="cs-course-pill-dot" style={{ background: colour }} />}
              <span>{course.name}</span>
              {typeof course.unit_count === 'number' && (
                <span className="cs-course-pill-count">· {course.unit_count}</span>
              )}
            </button>
          );
        })}
      </div>

      {showSearch && (
        <div className="cs-course-strip-search">
          {searching ? (
            <div style={{ display: 'flex', gap: 6 }}>
              <input
                ref={inputRef}
                type="text"
                className="cs-course-strip-search-input"
                placeholder="Search courses…"
                value={query}
                onChange={e => setQuery(e.target.value)}
                onBlur={() => { if (!query) setSearching(false); }}
              />
              <button
                type="button"
                className="cs-course-strip-search-btn"
                onClick={() => { setQuery(''); setSearching(false); }}
                aria-label="Close search"
              >
                <XMarkIcon width={18} height={18} />
              </button>
            </div>
          ) : (
            <button
              type="button"
              className={`cs-course-strip-search-btn ${query ? 'active' : ''}`}
              onClick={() => setSearching(true)}
              aria-label="Search courses"
            >
              <MagnifyingGlassIcon width={18} height={18} />
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default CourseStrip;
