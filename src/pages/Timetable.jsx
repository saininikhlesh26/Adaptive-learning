import { useState, useEffect } from 'react'
import { 
  fetchTimetable, 
  fetchSubjects, 
  createTimetableItem, 
  deleteTimetableItem, 
  generateAiTimetable,
  fetchGoals,
  fetchTasks,
  updateTask,
  createTask
} from '../api'

export default function Timetable() {
  const [schedules, setSchedules] = useState([])
  const [subjects, setSubjects] = useState([])
  const [tasks, setTasks] = useState([])
  const [goals, setGoals] = useState([])
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

  // New task form state
  const [quickTaskTitle, setQuickTaskTitle] = useState('')

  const loadData = async (showLoader = false) => {
    try {
      if (showLoader) {
        setLoading(true)
      }
      const [schedData, subjData, tasksData, goalsData] = await Promise.all([
        fetchTimetable(),
        fetchSubjects(),
        fetchTasks().catch(() => []),
        fetchGoals().catch(() => ({ goals: [] }))
      ])
      setSchedules(schedData)
      setSubjects(subjData)
      setTasks(tasksData)
      setGoals(goalsData.goals || [])
      
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
    const timer = setTimeout(() => {
      loadData(false)
    }, 0)
    return () => clearTimeout(timer)
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

  const handleToggleTask = async (taskId, currentStatus) => {
    const newStatus = currentStatus === 'Completed' ? 'Pending' : 'Completed'
    try {
      await updateTask(taskId, { status: newStatus })
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t))
    } catch (err) {
      console.error(err)
    }
  }

  const handleQuickTaskSubmit = async (e) => {
    e.preventDefault()
    if (!quickTaskTitle.trim()) return
    try {
      const newTask = await createTask({ title: quickTaskTitle.trim(), priority: 'Medium' })
      setTasks(prev => [...prev, newTask])
      setQuickTaskTitle('')
    } catch (err) {
      console.error(err)
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
  const todayStr = new Date().toISOString().split('T')[0]

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

  const todaySlots = getSlotsForDate(todayStr)

  return (
    <div className="planner-page-container">
      {/* Page Header controls */}
      <div className="planner-controls-card card">
        <div className="planner-title-section">
          <h1>Calendar Timetable & Planner</h1>
          <p className="section-subtitle-description">
            Build schedules manually or trigger the AI generator to balance workloads based on subject gaps.
          </p>
        </div>
        
        <div className="planner-action-buttons">
          <button className="btn btn-secondary" onClick={() => setShowManualModal(true)}>
            ➕ Add Slot
          </button>
          <button className="btn btn-primary" onClick={() => setShowAiModal(true)}>
            ⚡ Generate AI Timetable
          </button>
        </div>
      </div>

      {/* Main Grid: Split into Left (Schedule) and Right (Tasks/Goals) */}
      <div className="planner-grid-layout">
        
        {/* LEFT COLUMN: Today's Plan & Weekly Schedule */}
        <div className="planner-left-column">
          
          {/* Section 1: Today's Plan */}
          <div className="planner-section-card card">
            <div className="section-card-header">
              <h2>Today's Plan</h2>
              <span className="section-card-desc">Scheduled revisions for today: {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</span>
            </div>

            <div className="today-slots-list">
              {todaySlots.length > 0 ? (
                todaySlots.map(slot => (
                  <div key={slot.id} className="today-slot-item-card">
                    <div className="slot-meta-top">
                      <span className="slot-time">⏱️ {slot.time_slot}</span>
                      <span className={`priority-badge priority-${slot.priority.toLowerCase()}`}>
                        {slot.priority}
                      </span>
                    </div>
                    <h4>{subjects.find(s => s.id === slot.subject_id)?.title || slot.subject_id.toUpperCase()}</h4>
                    <p>Topic: {slot.topic}</p>
                    {slot.is_ai_generated && <span className="ai-tag">AI Generated</span>}
                  </div>
                ))
              ) : (
                <div className="empty-slot-placeholder">
                  <p>No study slots scheduled for today. Take it easy or generate a weekly schedule!</p>
                </div>
              )}
            </div>
          </div>

          {/* Section 2: Weekly Schedule (Calendar columns) */}
          <div className="planner-section-card card">
            <div className="section-card-header">
              <h2>Weekly Schedule</h2>
              <span className="section-card-desc">Your revision plan for the next 7 days</span>
            </div>

            <div className="timetable-week-grid-premium">
              {weekDays.map(day => {
                const daySlots = getSlotsForDate(day.dateStr)
                return (
                  <div key={day.dateStr} className="timetable-day-column-premium">
                    <div className="day-column-header-premium">
                      <span className="day-name">{day.name}</span>
                      <span className="day-date">{day.displayDate}</span>
                    </div>
                    
                    <div className="day-slots-container">
                      {daySlots.length > 0 ? (
                        daySlots.map(slot => (
                          <div key={slot.id} className="study-slot-card-premium">
                            <span className="slot-time-text">{slot.time_slot}</span>
                            <h5 className="slot-subject-text">
                              {subjects.find(s => s.id === slot.subject_id)?.title || slot.subject_id.toUpperCase()}
                            </h5>
                            <p className="slot-topic-text" title={slot.topic}>{slot.topic}</p>
                            
                            <div className="slot-actions-row">
                              <span className={`priority-badge priority-${slot.priority.toLowerCase()}`}>
                                {slot.priority.charAt(0)}
                              </span>
                              {slot.is_ai_generated && <span className="ai-dot" title="AI optimized">🤖</span>}
                              <button className="btn-delete-slot-premium" onClick={() => handleDelete(slot.id)}>✕</button>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="empty-day-slot">Free</div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN: Study Goals & Task List */}
        <div className="planner-right-column">
          
          {/* Section 3: Study Goals */}
          <div className="planner-section-card card">
            <div className="section-card-header">
              <h2>Study Goals</h2>
              <span className="section-card-desc">Active target metrics for your dashboard</span>
            </div>

            <div className="goals-items-list-premium">
              {goals.length > 0 ? (
                goals.map(goal => {
                  const percent = Math.min(100, Math.round((goal.current_value / goal.target_value) * 100))
                  return (
                    <div key={goal.id} className="goal-meter-card-premium">
                      <div className="g-header">
                        <span className="g-title">{goal.title}</span>
                        <span className="g-percent">{percent}%</span>
                      </div>
                      <div className="g-track">
                        <div className="g-fill" style={{ width: `${percent}%` }}></div>
                      </div>
                      <span className="g-deadline">Deadline: {goal.deadline || 'No target date'}</span>
                    </div>
                  )
                })
              ) : (
                <p className="text-muted text-sm" style={{ padding: '1rem 0' }}>No active goals. Set goals in profile.</p>
              )}
            </div>
          </div>

          {/* Section 4: Task List */}
          <div className="planner-section-card card">
            <div className="section-card-header">
              <h2>Task List Checklist</h2>
              <span className="section-card-desc">Simple todo checklist for placement and revisions</span>
            </div>

            <div className="checklist-items-scrollable">
              {tasks.length > 0 ? (
                tasks.map(task => (
                  <div key={task.id} className={`checklist-row ${task.status === 'Completed' ? 'checked' : ''}`}>
                    <div className="check-block">
                      <input 
                        type="checkbox" 
                        checked={task.status === 'Completed'} 
                        onChange={() => handleToggleTask(task.id, task.status)}
                        className="check-input"
                      />
                      <div className="check-text">
                        <span className="check-title">{task.title}</span>
                        {task.due_date && <span className="check-due">Due: {task.due_date}</span>}
                      </div>
                    </div>
                    <span className={`priority-badge priority-${task.priority?.toLowerCase() || 'medium'}`}>
                      {task.priority || 'Medium'}
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-muted text-sm" style={{ padding: '1rem 0' }}>No checklist items. Create one below.</p>
              )}
            </div>

            <form onSubmit={handleQuickTaskSubmit} className="quick-task-form">
              <input 
                type="text" 
                placeholder="Create new checklist item..." 
                value={quickTaskTitle}
                onChange={e => setQuickTaskTitle(e.target.value)}
                className="quick-task-input"
              />
              <button type="submit" className="btn btn-secondary">Add</button>
            </form>
          </div>

        </div>

      </div>

      {/* AI Scheduler Modal */}
      {showAiModal && (
        <div className="ai-planner-dialog-overlay" onClick={() => setShowAiModal(false)}>
          <div className="ai-planner-dialog-card card" onClick={e => e.stopPropagation()}>
            <h2>⚡ AI Timetable Generator</h2>
            <p className="modal-desc">
              Specify the number of hours you have available for study this week. The recommendation engine allocates larger study blocks to weak/struggling subjects and leaves space for active competition revisions.
            </p>
            
            <form onSubmit={handleAiGenerate}>
              <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                <label>Available Study Hours (Weekly)</label>
                <input 
                  type="number" 
                  value={availableHours} 
                  onChange={e => setAvailableHours(parseInt(e.target.value) || 0)}
                  min="1" 
                  max="60"
                  required
                />
              </div>
              
              <div className="modal-actions-row">
                <button type="button" className="btn btn-secondary" onClick={() => setShowAiModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={generating}>
                  {generating ? 'Optimizing Schedule...' : 'Build AI Schedule'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Manual Slot Modal */}
      {showManualModal && (
        <div className="ai-planner-dialog-overlay" onClick={() => setShowManualModal(false)}>
          <div className="ai-planner-dialog-card card" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <h2>➕ Add Study Schedule Slot</h2>
            
            <form onSubmit={handleManualSubmit} className="profile-edit-form">
              <div className="form-group">
                <label>Subject</label>
                <select 
                  value={subjectId} 
                  onChange={e => setSubjectId(e.target.value)}
                >
                  {subjects.map(s => (
                    <option key={s.id} value={s.id}>{s.title}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Topic Description</label>
                <input 
                  type="text" 
                  value={topic} 
                  onChange={e => setTopic(e.target.value)} 
                  placeholder="e.g. Linked Lists, Integration by parts"
                  required
                />
              </div>

              <div className="form-row-2">
                <div className="form-group">
                  <label>Date</label>
                  <input 
                    type="date" 
                    value={date} 
                    onChange={e => setDate(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Time Slot</label>
                  <select 
                    value={timeSlot} 
                    onChange={e => setTimeSlot(e.target.value)}
                  >
                    <option value="08:00 - 09:30">08:00 - 09:30</option>
                    <option value="10:00 - 11:30">10:00 - 11:30</option>
                    <option value="12:00 - 13:30">12:00 - 13:30</option>
                    <option value="14:00 - 15:30">14:00 - 15:30</option>
                    <option value="16:00 - 17:30">16:00 - 17:30</option>
                    <option value="18:00 - 19:30">18:00 - 19:30</option>
                    <option value="20:00 - 21:30">20:00 - 21:30</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label>Priority</label>
                <select 
                  value={priority} 
                  onChange={e => setPriority(e.target.value)}
                >
                  <option value="High">High</option>
                  <option value="Medium">Medium</option>
                  <option value="Low">Low</option>
                </select>
              </div>

              <div className="modal-actions-row">
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
