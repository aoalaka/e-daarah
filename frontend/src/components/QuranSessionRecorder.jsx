import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { SURAHS, getJuz, getJuzRange } from '../data/surahs';
import { addToSyncQueue, cacheData, getCachedData } from '../utils/offlineStore';
import SurahPickerModal from './SurahPickerModal';
import './QuranSessionRecorder.css';

const SESSION_TYPES = [
  { value: 'tilawah', label: 'Tilawah', sub: 'Recitation' },
  { value: 'hifz', label: 'Hifdh', sub: 'Memorization' },
  { value: 'revision', label: "Muraja'ah", sub: 'Revision' }
];

const GRADES = [
  { value: 'Excellent', color: 'excellent' },
  { value: 'Good', color: 'good' },
  { value: 'Fair', color: 'fair' },
  { value: 'Needs Improvement', color: 'needs' }
];

const getLocalDate = (date = new Date()) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const fmtDate = (d) => {
  if (!d) return '';
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
};

function QuranSessionRecorder({
  students,
  api,
  selectedClass,
  activeSemester,
  isFreePlan,
  onSessionSaved,
  routePrefix = '/solo'
}) {
  // Flow step: 'type' -> 'student' -> 'record'
  const [step, setStep] = useState('type');
  const [subTab, setSubTab] = useState('record');

  // Selections
  const [sessionType, setSessionType] = useState(null);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [studentSearch, setStudentSearch] = useState('');

  // Position & history
  const [position, setPosition] = useState(null);
  const [recentHistory, setRecentHistory] = useState([]);

  // Form fields
  const [surah, setSurah] = useState('');
  const [surahName, setSurahName] = useState('');
  const [ayahFrom, setAyahFrom] = useState('');
  const [ayahTo, setAyahTo] = useState('');
  const [grade, setGrade] = useState('Good');
  const [passed, setPassed] = useState(true);
  const [notes, setNotes] = useState('');
  const [date, setDate] = useState(getLocalDate());
  const [saving, setSaving] = useState(false);
  const [surahPickerOpen, setSurahPickerOpen] = useState(false);
  const [rangeMode, setRangeMode] = useState('ayah'); // 'ayah' | 'surah' | 'juz'
  const [toSurah, setToSurah] = useState('');
  const [toSurahName, setToSurahName] = useState('');
  const [toSurahPickerOpen, setToSurahPickerOpen] = useState(false);
  const [fromJuz, setFromJuz] = useState('');
  const [toJuz, setToJuz] = useState('');

  // Overview / History
  const [allPositions, setAllPositions] = useState([]);
  const [allRecords, setAllRecords] = useState([]);

  // Filter students
  const filteredStudents = studentSearch.trim()
    ? students.filter(s =>
        `${s.first_name} ${s.last_name}`.toLowerCase().includes(studentSearch.toLowerCase())
      )
    : students;

  // Fetch position when student is selected
  useEffect(() => {
    if (selectedStudent && sessionType) {
      fetchPosition(selectedStudent.id);
      fetchHistory(selectedStudent.id);
    }
  }, [selectedStudent, sessionType]);

  const fetchPosition = async (studentId) => {
    const cacheKey = `quran-pos-${studentId}`;
    try {
      const res = await api.get(`${routePrefix}/quran/student/${studentId}/position`);
      setPosition(res.data);
      fillFromPosition(res.data);
      cacheData(cacheKey, res.data);
    } catch (error) {
      if (!error.response) {
        const cached = await getCachedData(cacheKey);
        if (cached) { setPosition(cached.data); fillFromPosition(cached.data); return; }
      }
      setPosition(null);
      resetFormFields();
    }
  };

  const fillFromPosition = (posData) => {
    const pos = sessionType === 'hifz' ? posData?.hifz
      : sessionType === 'tilawah' ? posData?.tilawah
      : posData?.revision;
    if (pos) {
      setSurah(String(pos.surah_number));
      setSurahName(pos.surah_name);
      setAyahFrom(pos.ayah ? String(pos.ayah + 1) : '1');
      setAyahTo('');
    } else {
      resetFormFields();
    }
  };

  const resetFormFields = () => {
    setSurah('');
    setSurahName('');
    setAyahFrom('');
    setAyahTo('');
  };

  const fetchHistory = async (studentId) => {
    const cacheKey = `quran-history-${studentId}`;
    try {
      const res = await api.get(`${routePrefix}/quran/student/${studentId}/history`);
      setRecentHistory(res.data || []);
      cacheData(cacheKey, res.data || []);
    } catch (error) {
      if (!error.response) {
        const cached = await getCachedData(cacheKey);
        if (cached) { setRecentHistory(cached.data); return; }
      }
      setRecentHistory([]);
    }
  };

  const fetchAllPositions = async () => {
    if (!selectedClass && !isFreePlan) return;
    const cacheKey = isFreePlan ? 'quran-positions-free' : `quran-positions-class-${selectedClass.id}`;
    try {
      if (isFreePlan) {
        const allPos = [];
        for (const s of students.slice(0, 50)) {
          try {
            const res = await api.get(`${routePrefix}/quran/student/${s.id}/position`);
            allPos.push({ id: s.id, first_name: s.first_name, last_name: s.last_name, ...res.data });
          } catch { /* skip */ }
        }
        setAllPositions(allPos);
        cacheData(cacheKey, allPos);
      } else {
        const res = await api.get(`${routePrefix}/classes/${selectedClass.id}/quran-positions`);
        setAllPositions(res.data || []);
        cacheData(cacheKey, res.data || []);
      }
    } catch (error) {
      if (!error.response) {
        const cached = await getCachedData(cacheKey);
        if (cached) { setAllPositions(cached.data); return; }
      }
      setAllPositions([]);
    }
  };

  const fetchAllRecords = async () => {
    if (!selectedClass && !isFreePlan) return;
    const cacheKey = `quran-records-class-${selectedClass?.id}`;
    try {
      if (isFreePlan) {
        setAllRecords([]);
      } else {
        const semId = activeSemester?.id;
        let url = `/solo/classes/${selectedClass.id}/quran-progress`;
        if (semId) url += `?semester_id=${semId}`;
        const res = await api.get(url);
        setAllRecords(res.data || []);
        cacheData(cacheKey, res.data || []);
      }
    } catch (error) {
      if (!error.response) {
        const cached = await getCachedData(cacheKey);
        if (cached) { setAllRecords(cached.data); return; }
      }
      setAllRecords([]);
    }
  };

  // Step handlers
  const handleSelectType = (type) => {
    setSessionType(type);
    setSelectedStudent(null);
    setPosition(null);
    setRecentHistory([]);
    resetFormFields();
    setGrade('Good');
    setPassed(true);
    setNotes('');
    setRangeMode('ayah');
    setToSurah('');
    setToSurahName('');
    setFromJuz('');
    setToJuz('');
    setStep('student');
  };

  const handleSelectStudent = (student) => {
    setSelectedStudent(student);
    setGrade('Good');
    setPassed(true);
    setNotes('');
    setStep('record');
  };

  const handleBack = () => {
    if (step === 'record') {
      setSelectedStudent(null);
      setPosition(null);
      setRecentHistory([]);
      resetFormFields();
      setStep('student');
    } else if (step === 'student') {
      setSessionType(null);
      setStep('type');
    }
  };

  const handleSurahSelect = (s) => {
    setSurah(String(s.n));
    setSurahName(s.name);
    setAyahFrom('');
    setAyahTo('');
  };

  const handleToSurahSelect = (s) => {
    setToSurah(String(s.n));
    setToSurahName(s.name);
    setAyahTo('');
  };

  // Build payload depending on range mode
  const buildPayload = () => {
    const base = {
      student_id: selectedStudent.id,
      class_id: selectedClass?.id || null,
      semester_id: activeSemester?.id || null,
      date,
      type: sessionType,
      grade,
      passed,
      notes
    };

    if (rangeMode === 'juz') {
      if (!fromJuz || !toJuz) return null;
      const fromJ = parseInt(fromJuz);
      const toJ = parseInt(toJuz);
      const startRange = getJuzRange(fromJ);
      const endRange = getJuzRange(toJ);
      const startSurah = SURAHS.find(s => s.n === startRange.startSurah);
      const endSurah = SURAHS.find(s => s.n === endRange.endSurah);
      if (!startSurah || !endSurah) return null;
      return {
        ...base,
        surah_number: startSurah.n,
        surah_name: startSurah.name,
        to_surah_number: endSurah.n,
        to_surah_name: endSurah.name,
        juz: fromJ,
        ayah_from: startRange.startAyah,
        ayah_to: endRange.endAyah
      };
    }

    const surahData = SURAHS.find(s => String(s.n) === String(surah));
    if (!surahData) return null;
    if (!ayahFrom || !ayahTo) return null;

    if (rangeMode === 'surah' && toSurah) {
      return {
        ...base,
        surah_number: surahData.n,
        surah_name: surahData.name,
        to_surah_number: parseInt(toSurah),
        to_surah_name: toSurahName,
        juz: surahData.juz,
        ayah_from: parseInt(ayahFrom),
        ayah_to: parseInt(ayahTo)
      };
    }

    return {
      ...base,
      surah_number: surahData.n,
      surah_name: surahData.name,
      juz: surahData.juz,
      ayah_from: parseInt(ayahFrom),
      ayah_to: parseInt(ayahTo)
    };
  };

  const handleSave = async () => {
    if (!selectedStudent) { toast.error('Please select a student'); return; }

    if (rangeMode === 'juz' && (!fromJuz || !toJuz)) {
      toast.error('Please enter juz range'); return;
    }
    if (rangeMode === 'ayah' && (!surah || !ayahFrom || !ayahTo)) {
      toast.error('Please select surah and ayah range'); return;
    }
    if (rangeMode === 'surah' && (!surah || !toSurah || !ayahFrom || !ayahTo)) {
      toast.error('Please select both surahs and ayah range'); return;
    }

    const payload = buildPayload();
    if (!payload) { toast.error('Invalid range'); return; }

    setSaving(true);
    try {
      await api.post(`${routePrefix}/quran/record`, payload);
      toast.success(passed ? 'Passed — position updated' : 'Repeat — recorded');
      fetchPosition(selectedStudent.id);
      fetchHistory(selectedStudent.id);
      setNotes('');
      if (onSessionSaved) onSessionSaved();
    } catch (error) {
      if (!error.response) {
        await addToSyncQueue(
          'quran-record',
          `${routePrefix}/quran/record`,
          'post',
          payload,
          { studentName: `${selectedStudent.first_name} ${selectedStudent.last_name}`, type: sessionType, date }
        );
        toast.success('Saved offline — will sync when connected');
        setNotes('');
        if (onSessionSaved) onSessionSaved();
      } else {
        toast.error(error.response?.data?.error || 'Failed to record progress');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteRecord = async (id) => {
    try {
      await api.delete(`${routePrefix}/quran-progress/${id}`);
      toast.success('Record deleted');
      if (selectedStudent) fetchHistory(selectedStudent.id);
      fetchAllRecords();
    } catch {
      toast.error('Failed to delete record');
    }
  };

  const currentPos = position
    ? (sessionType === 'hifz' ? position.hifz
      : sessionType === 'tilawah' ? position.tilawah
      : position.revision)
    : null;

  const selectedSurahData = surah ? SURAHS.find(s => String(s.n) === String(surah)) : null;

  const typeLabel = sessionType === 'hifz' ? 'Hifdh'
    : sessionType === 'tilawah' ? 'Tilawah' : "Muraja'ah";

  return (
    <div className="qr-recorder">
      {/* Sub-tabs */}
      <div className="qr-sub-tabs">
        <button
          className={`qr-sub-tab${subTab === 'record' ? ' active' : ''}`}
          onClick={() => { setSubTab('record'); setStep('type'); setSessionType(null); setSelectedStudent(null); }}
        >
          Record
        </button>
        <button
          className={`qr-sub-tab${subTab === 'overview' ? ' active' : ''}`}
          onClick={() => { setSubTab('overview'); fetchAllPositions(); }}
        >
          Overview
        </button>
        {!isFreePlan && (
          <button
            className={`qr-sub-tab${subTab === 'history' ? ' active' : ''}`}
            onClick={() => { setSubTab('history'); fetchAllRecords(); }}
          >
            History
          </button>
        )}
      </div>

      {/* ─── Record Sub-tab ─── */}
      {subTab === 'record' && (
        <>
          {/* Progress bar */}
          <div className="qr-steps">
            <div className={`qr-step-dot${step === 'type' ? ' active' : sessionType ? ' done' : ''}`}>1</div>
            <div className={`qr-step-line${sessionType ? ' done' : ''}`} />
            <div className={`qr-step-dot${step === 'student' ? ' active' : selectedStudent ? ' done' : ''}`}>2</div>
            <div className={`qr-step-line${selectedStudent ? ' done' : ''}`} />
            <div className={`qr-step-dot${step === 'record' ? ' active' : ''}`}>3</div>
          </div>

          {/* ── Step 1: Session Type ── */}
          {step === 'type' && (
            <div className="qr-step-content">
              <h3 className="qr-step-title">What are you recording?</h3>
              <div className="qr-type-cards">
                {SESSION_TYPES.map(t => (
                  <button
                    key={t.value}
                    className="qr-type-card"
                    onClick={() => handleSelectType(t.value)}
                  >
                    <span className="qr-type-card-label">{t.label}</span>
                    <span className="qr-type-card-sub">{t.sub}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── Step 2: Student ── */}
          {step === 'student' && (
            <div className="qr-step-content">
              <button className="qr-back-btn" onClick={handleBack}>
                &larr; {typeLabel}
              </button>
              <h3 className="qr-step-title">Select student</h3>

              {students.length > 8 && (
                <input
                  type="text"
                  className="qr-student-search"
                  placeholder="Search students..."
                  value={studentSearch}
                  onChange={e => setStudentSearch(e.target.value)}
                />
              )}

              <div className="qr-student-list">
                {filteredStudents.map(s => (
                  <button
                    key={s.id}
                    className="qr-student-row"
                    onClick={() => handleSelectStudent(s)}
                  >
                    <span className="qr-student-avatar">
                      {s.first_name?.[0]}{s.last_name?.[0]}
                    </span>
                    <span className="qr-student-row-name">
                      {s.first_name} {s.last_name}
                    </span>
                    <span className="qr-student-row-arrow">&rsaquo;</span>
                  </button>
                ))}
                {filteredStudents.length === 0 && (
                  <p className="qr-empty-text">No students found</p>
                )}
              </div>
            </div>
          )}

          {/* ── Step 3: Record ── */}
          {step === 'record' && selectedStudent && (
            <div className="qr-step-content">
              <button className="qr-back-btn" onClick={handleBack}>
                &larr; Pick student
              </button>

              {/* Header: student name + type badge */}
              <div className="qr-record-header">
                <div className="qr-record-student">
                  <span className="qr-student-avatar">
                    {selectedStudent.first_name?.[0]}{selectedStudent.last_name?.[0]}
                  </span>
                  <span className="qr-record-student-name">
                    {selectedStudent.first_name} {selectedStudent.last_name}
                  </span>
                </div>
                <span className={`qr-badge ${sessionType}`}>{typeLabel}</span>
              </div>

              {/* Position banner */}
              <div className={`qr-position${!currentPos ? ' new' : ''}`}>
                {currentPos ? (
                  <>
                    <div className="qr-pos-label">Current position</div>
                    <div className="qr-pos-value">
                      {currentPos.surah_number}. {currentPos.surah_name}
                      {currentPos.ayah && ` — Ayah ${currentPos.ayah}`}
                    </div>
                    <div className="qr-pos-juz">Juz {currentPos.ayah ? getJuz(currentPos.surah_number, currentPos.ayah) : currentPos.juz}</div>
                  </>
                ) : (
                  <div className="qr-pos-new">
                    First {typeLabel.toLowerCase()} session for {selectedStudent.first_name}
                  </div>
                )}
              </div>

              <div className="qr-form">
                {/* Date */}
                <div className="qr-field">
                  <label>Date</label>
                  <input
                    type="date"
                    value={date}
                    max={getLocalDate()}
                    onChange={e => setDate(e.target.value)}
                  />
                </div>

                {/* Range mode pills */}
                <div className="qr-field">
                  <label>Range</label>
                  <div className="qr-range-modes">
                    {[
                      { value: 'ayah', label: 'Ayah' },
                      { value: 'surah', label: 'Surah' },
                      { value: 'juz', label: 'Juz' }
                    ].map(m => (
                      <button
                        key={m.value}
                        className={`qr-range-mode${rangeMode === m.value ? ' active' : ''}`}
                        onClick={() => {
                          setRangeMode(m.value);
                          setToSurah(''); setToSurahName('');
                          setFromJuz(''); setToJuz('');
                          if (m.value === 'juz') { setSurah(''); setSurahName(''); setAyahFrom(''); setAyahTo(''); }
                          if (m.value === 'ayah') { setAyahTo(''); }
                        }}
                      >
                        {m.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* ── Ayah mode: single surah + ayah range ── */}
                {rangeMode === 'ayah' && (
                  <>
                    <div className="qr-field">
                      <label>Surah</label>
                      <button className="qr-surah-trigger" onClick={() => setSurahPickerOpen(true)}>
                        {surah ? `${surah}. ${surahName}` : 'Select surah...'}
                        <span className="qr-surah-arrow">&#9662;</span>
                      </button>
                    </div>
                    <div className="qr-ayah-row">
                      <div className="qr-field">
                        <label>Ayah From</label>
                        <input type="number" min="1" max={selectedSurahData?.ayahs} value={ayahFrom}
                          onChange={e => setAyahFrom(e.target.value)} placeholder="1" />
                      </div>
                      <div className="qr-field">
                        <label>Ayah To</label>
                        <input type="number" min="1" max={selectedSurahData?.ayahs} value={ayahTo}
                          onChange={e => setAyahTo(e.target.value)}
                          placeholder={selectedSurahData ? `max ${selectedSurahData.ayahs}` : ''} />
                      </div>
                    </div>
                  </>
                )}

                {/* ── Surah mode: from surah+ayah → to surah+ayah ── */}
                {rangeMode === 'surah' && (
                  <>
                    <div className="qr-field">
                      <label>From Surah</label>
                      <button className="qr-surah-trigger" onClick={() => setSurahPickerOpen(true)}>
                        {surah ? `${surah}. ${surahName}` : 'Select starting surah...'}
                        <span className="qr-surah-arrow">&#9662;</span>
                      </button>
                    </div>
                    <div className="qr-field">
                      <label>Ayah From</label>
                      <input type="number" min="1" max={selectedSurahData?.ayahs} value={ayahFrom}
                        onChange={e => setAyahFrom(e.target.value)} placeholder="1" />
                    </div>
                    <div className="qr-field">
                      <label>To Surah</label>
                      <button className="qr-surah-trigger" onClick={() => setToSurahPickerOpen(true)}>
                        {toSurah ? `${toSurah}. ${toSurahName}` : 'Select ending surah...'}
                        <span className="qr-surah-arrow">&#9662;</span>
                      </button>
                    </div>
                    <div className="qr-field">
                      <label>Ayah To</label>
                      <input type="number" min="1"
                        max={toSurah ? SURAHS.find(s => String(s.n) === String(toSurah))?.ayahs : undefined}
                        value={ayahTo} onChange={e => setAyahTo(e.target.value)}
                        placeholder={toSurah ? `max ${SURAHS.find(s => String(s.n) === String(toSurah))?.ayahs || ''}` : 'Select to-surah first'} />
                    </div>
                  </>
                )}

                {/* ── Juz mode: from juz → to juz ── */}
                {rangeMode === 'juz' && (
                  <div className="qr-ayah-row">
                    <div className="qr-field">
                      <label>From Juz</label>
                      <input type="number" min="1" max="30" value={fromJuz}
                        onChange={e => { setFromJuz(e.target.value); if (!toJuz) setToJuz(e.target.value); }}
                        placeholder="1" />
                    </div>
                    <div className="qr-field">
                      <label>To Juz</label>
                      <input type="number" min={fromJuz || '1'} max="30" value={toJuz}
                        onChange={e => setToJuz(e.target.value)}
                        placeholder={fromJuz || '1'} />
                    </div>
                  </div>
                )}

                {/* Grade buttons */}
                <div className="qr-field">
                  <label>Grade</label>
                  <div className="qr-grade-grid">
                    {GRADES.map(g => (
                      <button
                        key={g.value}
                        className={`qr-grade-btn ${g.color}${grade === g.value ? ' active' : ''}`}
                        onClick={() => setGrade(g.value)}
                      >
                        {g.value}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Outcome toggle */}
                <div className="qr-field">
                  <label>Outcome</label>
                  <div className="qr-outcome">
                    <button
                      className={`qr-outcome-btn pass${passed ? ' active' : ''}`}
                      onClick={() => setPassed(true)}
                    >
                      Pass
                    </button>
                    <button
                      className={`qr-outcome-btn repeat${!passed ? ' active' : ''}`}
                      onClick={() => setPassed(false)}
                    >
                      Repeat
                    </button>
                  </div>
                </div>

                {/* Info banner */}
                <div className={`qr-info ${passed ? 'pass' : 'repeat'}`}>
                  {passed
                    ? (sessionType === 'revision'
                        ? 'Student passed — revision recorded.'
                        : 'Student passed — position will advance.')
                    : 'Repeat — position stays the same.'
                  }
                </div>

                {/* Notes */}
                <div className="qr-field">
                  <input
                    type="text"
                    placeholder="Notes (optional)"
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                  />
                </div>

                {/* Save button */}
                <button
                  className="qr-save-btn"
                  onClick={handleSave}
                  disabled={saving || (rangeMode === 'juz' ? (!fromJuz || !toJuz) : rangeMode === 'surah' ? (!surah || !toSurah || !ayahFrom || !ayahTo) : (!surah || !ayahFrom || !ayahTo))}
                >
                  {saving ? 'Saving...' : passed ? 'Save & Advance' : 'Save as Repeat'}
                </button>
              </div>

              {/* Recent history for this student + type */}
              {recentHistory.filter(r => r.type === sessionType).length > 0 && (
                <div className="qr-recent">
                  <h4>Recent Sessions</h4>
                  {recentHistory.filter(r => r.type === sessionType).slice(0, 5).map(r => (
                    <div key={r.id} className="qr-recent-item">
                      <div className="qr-recent-main">
                        <div className="qr-recent-top-row">
                          <span className="qr-recent-date">{fmtDate(r.date)}</span>
                          <div className="qr-recent-badges">
                            <span className={`qr-badge ${r.grade === 'Excellent' ? 'excellent' : r.grade === 'Good' ? 'good' : r.grade === 'Fair' ? 'fair' : 'needs'}`}>
                              {r.grade}
                            </span>
                            <span className={`qr-badge ${r.passed ? 'pass' : 'fail'}`}>
                              {r.passed ? 'Pass' : 'Repeat'}
                            </span>
                          </div>
                        </div>
                        <span className="qr-recent-surah">
                          {r.to_surah_name
                            ? `${r.surah_name} ${r.ayah_from || ''} → ${r.to_surah_name} ${r.ayah_to || ''}`
                            : `${r.surah_name}${r.ayah_from && r.ayah_to ? `, Ayah ${r.ayah_from}–${r.ayah_to}` : ''}`
                          }
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* ─── Overview Sub-tab ─── */}
      {subTab === 'overview' && (
        <div className="qr-overview">
          <h3 className="qr-section-title">Student Positions</h3>
          {allPositions.length === 0 ? (
            <p className="qr-empty-text">No position data yet</p>
          ) : (
            <div className="qr-positions-list">
              {allPositions.map(s => {
                const hifzPos = s.hifz || (s.current_surah_name ? { surah_number: s.current_surah_number, surah_name: s.current_surah_name, juz: s.current_juz, ayah: s.current_ayah } : null);
                const tilawahPos = s.tilawah || (s.tilawah_surah_name ? { surah_number: s.tilawah_surah_number, surah_name: s.tilawah_surah_name, juz: s.tilawah_juz, ayah: s.tilawah_ayah } : null);
                const revisionPos = s.revision || (s.revision_surah_name ? { surah_number: s.revision_surah_number, surah_name: s.revision_surah_name, juz: s.revision_juz, ayah: s.revision_ayah } : null);
                const fmtPos = (pos) => {
                  if (!pos) return null;
                  const juz = pos.ayah ? getJuz(pos.surah_number, pos.ayah) : pos.juz;
                  return `${pos.surah_name}${pos.ayah ? `, Ayah ${pos.ayah}` : ''} — Juz ${juz}`;
                };
                const updated = s.last_updated || s.hifz?.last_updated;
                return (
                  <div key={s.id} className="qr-pos-card">
                    <div className="qr-pos-card-header">
                      <div className="qr-pos-student">{s.first_name} {s.last_name}</div>
                      {updated && <span className="qr-pos-updated">{fmtDate(updated)}</span>}
                    </div>
                    <div className="qr-pos-tracks">
                      <div className="qr-pos-track">
                        <span className="qr-pos-track-label">Hifdh</span>
                        <span className="qr-pos-track-value">{fmtPos(hifzPos) || 'Not started'}</span>
                      </div>
                      <div className="qr-pos-track">
                        <span className="qr-pos-track-label">Tilawah</span>
                        <span className="qr-pos-track-value">{fmtPos(tilawahPos) || 'Not started'}</span>
                      </div>
                      <div className="qr-pos-track">
                        <span className="qr-pos-track-label">Revision</span>
                        <span className="qr-pos-track-value">{fmtPos(revisionPos) || 'Not started'}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ─── History Sub-tab ─── */}
      {subTab === 'history' && !isFreePlan && (
        <div className="qr-history">
          <h3 className="qr-section-title">Progress History</h3>
          {allRecords.length === 0 ? (
            <p className="qr-empty-text">No records yet</p>
          ) : (
            <div className="qr-history-list">
              {allRecords.map(r => (
                <div key={r.id} className="qr-history-item">
                  <div className="qr-history-main">
                    <div className="qr-history-top">
                      <span className="qr-recent-date">{fmtDate(r.date)}</span>
                      <span className="qr-history-student">{r.first_name} {r.last_name}</span>
                    </div>
                    <div className="qr-recent-surah">
                      {r.to_surah_name
                        ? `${r.surah_name} ${r.ayah_from || ''} → ${r.to_surah_name} ${r.ayah_to || ''}`
                        : `${r.surah_number}. ${r.surah_name}${r.ayah_from && r.ayah_to ? ` (${r.ayah_from}–${r.ayah_to})` : ''}`
                      }
                    </div>
                    <div className="qr-recent-badges">
                      <span className={`qr-badge ${r.type === 'hifz' ? 'hifz' : r.type === 'revision' ? 'revision' : 'tilawah'}`}>
                        {r.type === 'hifz' ? 'Hifdh' : r.type === 'revision' ? 'Revision' : 'Tilawah'}
                      </span>
                      <span className={`qr-badge ${r.grade === 'Excellent' ? 'excellent' : r.grade === 'Good' ? 'good' : r.grade === 'Fair' ? 'fair' : 'needs'}`}>
                        {r.grade}
                      </span>
                      <span className={`qr-badge ${r.passed ? 'pass' : 'fail'}`}>
                        {r.passed ? 'Pass' : 'Repeat'}
                      </span>
                    </div>
                  </div>
                  <button className="qr-delete-btn" onClick={() => handleDeleteRecord(r.id)}>&times;</button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Surah picker modal */}
      <SurahPickerModal
        isOpen={surahPickerOpen}
        onClose={() => setSurahPickerOpen(false)}
        onSelect={handleSurahSelect}
        currentSurahNumber={surah ? parseInt(surah) : null}
      />

      {/* To-Surah picker modal (cross-surah) */}
      <SurahPickerModal
        isOpen={toSurahPickerOpen}
        onClose={() => setToSurahPickerOpen(false)}
        onSelect={handleToSurahSelect}
        currentSurahNumber={toSurah ? parseInt(toSurah) : null}
      />
    </div>
  );
}

export default QuranSessionRecorder;
