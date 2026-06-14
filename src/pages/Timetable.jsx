import { useState, useEffect } from 'react'
import { 
  fetchTimetable, 
  fetchSubjects, 
  createTimetableItem, 
  deleteTimetableItem, 
  generateAiTimetable 
} from '../api'

export default function Timetable() {
  const [schedules, setSchedules] = useState([])
  const [subjects, setSubjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAiModal, setShowAiModal] = useState(false)
  const [showManualModal, setShowManualModal] = useState(false)
  
  // AI Form states
  const [availableHours, setAvailableHours] = useState(10)
  const [generating, setGenerating] = useState(false)
  
  // Manual Slot states
  const [subjectId, setSubjectId] = useState('')
  const [topic, setTopic] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [timeSlot, setTimeSlot] = useState('10:00 - 11:30')
  const [priority, setPriority] = useState('Medium')
  const [submitting, setSubmitting] = useState(false)

  const loadData = async (showLoader = false) => {
    try {
      if (showLoader) {
        setLoading(true)
      }
      const [schedData, subjData] = await Promise.all([
        fetchTimetable(),
        fetchSubjects()
      ])
      setSchedules(schedData)
      setSubjects(subjData)
      if (subjData.length > 0) {
        setSubjectId(subjData[0].id)
      }
    } catch (err) {
      console.error('Error loading planner data:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadData(false)
  }, [])


  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to remove this study slot?')) {
      try {
        await deleteTimetableItem(id)
        setSchedules(prev => prev.filter(s => s.id !== id))
      } catch (err) {
        console.error(err)
        alert('Failed to delete slot.')
      }
    }
  }

  const handleManualSubmit = async (e) => {
    e.preventDefault()
    if (!topic.trim()) {
      alert('Please fill in the topic.')
      return
    }
    
    try {
      setSubmitting(true)
      const newItem = await createTimetableItem({
        subject_id: subjectId,
        topic: topic.trim(),
        date,
        time_slot: timeSlot,
        priority
      })
      setSchedules(prev => [...prev, newItem])
      setTopic('')
      setShowManualModal(false)
    } catch (err) {
      console.error(err)
      alert('Failed to add study slot.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleAiGenerate = async (e) => {
    e.preventDefault()
    if (availableHours <= 0 || availableHours > 60) {
      alert('Please input a valid number of study hours (1 - 60).')
      return
    }
    
    try {
      setGenerating(true)
      const response = await generateAiTimetable(availableHours)
      if (response.status === 'success') {
        // Reload timetable schedules
        const updatedSched = await fetchTimetable()
        setSchedules(updatedSched)
        setShowAiModal(false)
      }
    } catch (err) {
      console.error(err)
      alert('AI scheduler failed: ' + err.message)
    } finally {
      setGenerating(false)
    }
  }

  // Generate date columns for next 7 days starting today
  const getNext7Days = () => {
    const dates = []
    const daysName = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    for (let i = 0; i < 7; i++) {
      const d = new Date()
      d.setDate(d.getDate() + i)
      dates.push({
        name: daysName[d.getDay()],
        dateStr: d.toISOString().split('T')[0],
        displayDate: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      })
    }
    return dates
  }

  const weekDays = getNext7Days()

  // Filter slots for a specific date
  const getSlotsForDate = (dateStr) => {
    return schedules.filter(s => s.date === dateStr).sort((a, b) => a.time_slot.localeCompare(b.time_slot))
  }

  if (loading) {
    return (
      <div className="skeleton-container" style={{ padding: '2rem', textAlign: 'left' }}>
        <div className="skeleton-bar skeleton-animated skeleton-title" style={{ marginBottom: '1.5rem' }}></div>
        <div className="skeleton-bar skeleton-animated skeleton-subtitle" style={{ marginBottom: '3rem' }}></div>
        <div className="timetable-week-grid">
          {[1, 2, 3, 4, 5, 6, 7].map(n => (
            <div key={n} className="skeleton-card skeleton-animated" style={{ height: '300px' }}></div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="planner-page-container">
      {/* 1. Header controls */}
      <div className="planner-controls-card glass-card">
        <div className="planner-title-section">
          <h1>Dynamic Study Planner</h1>
          <p className="sidebar-user-role" style={{ fontSize: '0.9rem', background: 'none', padding: 0 }}>
            Allocate available hours and let the AI balance your study schedule
          </p>
        </div>
        
        <div className="planner-action-buttons">
          <button className="btn btn-secondary" onClick={() => setShowManualModal(true)}>
            ➕ Add Slot
          </button>
          <button className="btn btn-ai-planner" onClick={() => setShowAiModal(true)}>
            ⚡ Generate AI Timetable
          </button>
        </div>
      </div>

      {/* 2. Timetable Grid */}
      <div className="timetable-week-grid">
        {weekDays.map(day => {
          const daySlots = getSlotsForDate(day.dateStr)
          return (
            <div key={day.dateStr} className="timetable-day-column">
              <div className="day-column-header">
                <span className="day-name">{day.name}</span>
                <span className="day-date">{day.displayDate}</span>
              </div>
              
              {daySlots.length > 0 ? (
                daySlots.map(slot => (
                  <div key={slot.id} className="study-slot-card">
                    <div className="study-slot-time">{slot.time_slot}</div>
                    <div className="study-slot-subject">
                      {subjects.find(s => s.id === slot.subject_id)?.title || slot.subject_id.toUpperCase()}
                    </div>
                    <div className="study-slot-topic" title={slot.topic}>{slot.topic}</div>
                    
                    <div className="study-slot-footer">
                      <span className={`slot-priority-badge priority-${slot.priority.toLowerCase()}`}>
                        {slot.priority}
                      </span>
                      {slot.is_ai_generated && (
                        <span className="slot-ai-indicator" title="AI optimized study plan based on engagement stats">
                          AI
                        </span>
                      )}
                      <button className="btn-delete-slot" onClick={() => handleDelete(slot.id)} title="Delete slot">
                        🗑️
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div style={{ padding: '2rem 1rem', border: '1px dashed rgba(255,255,255,0.05)', borderRadius: '10px', fontSize: '0.8rem', color: 'rgba(255,255,255,0.2)', textAlign: 'center' }}>
                  No slots scheduled
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* 3. AI Scheduler Modal */}
      {showAiModal && (
        <div className="ai-planner-dialog-overlay" onClick={() => setShowAiModal(false)}>
          <div className="ai-planner-dialog-card glass-card" onClick={e => e.stopPropagation()}>
            <h2 style={{ marginBottom: '0.5rem', color: 'white' }}>⚡ AI Timetable Generator</h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.5rem', lineHeight: '1.4' }}>
              Specify the number of hours you have available for study this week. The recommendation engine allocates larger study blocks to weak/struggling subjects and leaves space for active competition revisions.
            </p>
            
            <form onSubmit={handleAiGenerate}>
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ fontSize: '0.9rem', color: 'white', display: 'block', marginBottom: '0.5rem' }}>
                  Available Study Hours (Weekly)
                </label>
                <input 
                  type="number" 
                  value={availableHours} 
                  onChange={e => setAvailableHours(parseInt(e.target.value) || 0)}
                  min="1" 
                  max="60"
                  style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: 'white', padding: '0.75rem', width: '100%' }}
                />
              </div>
              
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowAiModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-ai-planner" disabled={generating}>
                  {generating ? 'Optimizing Schedule...' : 'Build AI Schedule'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. Manual Slot Modal */}
      {showManualModal && (
        <div className="ai-planner-dialog-overlay" onClick={() => setShowManualModal(false)}>
          <div className="ai-planner-dialog-card glass-card" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <h2 style={{ marginBottom: '1rem', color: 'white' }}>➕ Add Study Schedule Slot</h2>
            
            <form onSubmit={handleManualSubmit} className="profile-edit-form">
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem' }}>
                  Subject
                </label>
                <select 
                  value={subjectId} 
                  onChange={e => setSubjectId(e.target.value)}
                  style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: 'white' }}
                >
                  {subjects.map(s => (
                    <option key={s.id} value={s.id} style={{ background: '#1c1917' }}>{s.title}</option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem' }}>
                  Topic Description
                </label>
                <input 
                  type="text" 
                  value={topic} 
                  onChange={e => setTopic(e.target.value)} 
                  placeholder="e.g. Linked Lists, Integration by parts"
                  style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: 'white' }}
                />
              </div>

              <div className="form-row-2" style={{ marginBottom: '1rem' }}>
                <div>
                  <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem' }}>
                    Date
                  </label>
                  <input 
                    type="date" 
                    value={date} 
                    onChange={e => setDate(e.target.value)}
                    style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: 'white' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem' }}>
                    Time Slot
                  </label>
                  <select 
                    value={timeSlot} 
                    onChange={e => setTimeSlot(e.target.value)}
                    style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: 'white' }}
                  >
                    <option style={{ background: '#1c1917' }} value="08:00 - 09:30">08:00 - 09:30</option>
                    <option style={{ background: '#1c1917' }} value="10:00 - 11:30">10:00 - 11:30</option>
                    <option style={{ background: '#1c1917' }} value="12:00 - 13:30">12:00 - 13:30</option>
                    <option style={{ background: '#1c1917' }} value="14:00 - 15:30">14:00 - 15:30</option>
                    <option style={{ background: '#1c1917' }} value="16:00 - 17:30">16:00 - 17:30</option>
                    <option style={{ background: '#1c1917' }} value="18:00 - 19:30">18:00 - 19:30</option>
                    <option style={{ background: '#1c1917' }} value="20:00 - 21:30">20:00 - 21:30</option>
                  </select>
                </div>
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem' }}>
                  Priority
                </label>
                <select 
                  value={priority} 
                  onChange={e => setPriority(e.target.value)}
                  style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: 'white' }}
                >
                  <option style={{ background: '#1c1917' }} value="High">High</option>
                  <option style={{ background: '#1c1917' }} value="Medium">Medium</option>
                  <option style={{ background: '#1c1917' }} value="Low">Low</option>
                </select>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowManualModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Adding...' : 'Add Slot'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
