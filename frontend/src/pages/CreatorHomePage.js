import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import AppLayout from '../components/AppLayout';
import styles from './CreatorHomePage.module.css';

function getTodayStr() {
  return new Date().toISOString().slice(0, 10);
}

function loadTodos(userId) {
  try {
    return JSON.parse(localStorage.getItem(`todos_${userId}`)) || [];
  } catch {
    return [];
  }
}

function saveTodos(userId, todos) {
  localStorage.setItem(`todos_${userId}`, JSON.stringify(todos));
}

const CheckIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
);

const TrashIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6"/>
    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
    <path d="M10 11v6"/>
    <path d="M14 11v6"/>
    <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
  </svg>
);

const PlusIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19"/>
    <line x1="5" y1="12" x2="19" y2="12"/>
  </svg>
);

export default function CreatorHomePage() {
  const { user } = useAuth();
  const userId = user?.sub;

  const [todos, setTodos] = useState(() => loadTodos(userId));
  const [newTitle, setNewTitle] = useState('');
  const [newDate, setNewDate] = useState(getTodayStr());
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    saveTodos(userId, todos);
  }, [todos, userId]);

  const today = getTodayStr();

  const todayTasks = todos.filter((t) => t.dueDate === today);
  const upcomingTasks = todos
    .filter((t) => t.dueDate > today)
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  const overdueTasks = todos
    .filter((t) => t.dueDate < today && !t.completed)
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate));

  function addTodo() {
    if (!newTitle.trim()) return;
    setTodos((prev) => [
      ...prev,
      { id: Date.now().toString(), title: newTitle.trim(), dueDate: newDate, completed: false },
    ]);
    setNewTitle('');
    setNewDate(getTodayStr());
    setShowForm(false);
  }

  function toggleTodo(id) {
    setTodos((prev) => prev.map((t) => t.id === id ? { ...t, completed: !t.completed } : t));
  }

  function deleteTodo(id) {
    setTodos((prev) => prev.filter((t) => t.id !== id));
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter') addTodo();
    if (e.key === 'Escape') setShowForm(false);
  }

  function formatDate(dateStr) {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  }

  const TodoItem = ({ todo, showDate }) => (
    <div className={`${styles.todoItem} ${todo.completed ? styles.todoCompleted : ''}`}>
      <button
        className={`${styles.checkBtn} ${todo.completed ? styles.checkBtnDone : ''}`}
        onClick={() => toggleTodo(todo.id)}
        title={todo.completed ? 'Mark incomplete' : 'Mark complete'}
      >
        {todo.completed && <CheckIcon />}
      </button>
      <div className={styles.todoContent}>
        <span className={styles.todoTitle}>{todo.title}</span>
        {showDate && <span className={styles.todoDate}>{formatDate(todo.dueDate)}</span>}
      </div>
      <button className={styles.deleteBtn} onClick={() => deleteTodo(todo.id)} title="Delete">
        <TrashIcon />
      </button>
    </div>
  );

  const Section = ({ title, tasks, emptyMsg, showDate = false, accent }) => (
    <div className={styles.section}>
      <div className={styles.sectionHeader}>
        <h2 className={`${styles.sectionTitle} ${accent ? styles[accent] : ''}`}>{title}</h2>
        <span className={styles.sectionCount}>{tasks.filter(t => !t.completed).length} remaining</span>
      </div>
      {tasks.length === 0
        ? <p className={styles.emptyMsg}>{emptyMsg}</p>
        : tasks.map((t) => <TodoItem key={t.id} todo={t} showDate={showDate} />)
      }
    </div>
  );

  return (
    <AppLayout>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Home</h1>
          <p className={styles.pageSubtitle}>{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
        </div>
        <button className={styles.addBtn} onClick={() => setShowForm((v) => !v)}>
          <PlusIcon /> Add Task
        </button>
      </div>

      {showForm && (
        <div className={styles.formCard}>
          <input
            className={styles.titleInput}
            placeholder="Task title..."
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={handleKeyDown}
            autoFocus
          />
          <div className={styles.formRow}>
            <input
              type="date"
              className={styles.dateInput}
              value={newDate}
              min={today}
              onChange={(e) => setNewDate(e.target.value)}
            />
            <button className={styles.saveBtn} onClick={addTodo} disabled={!newTitle.trim()}>
              Add
            </button>
            <button className={styles.cancelBtn} onClick={() => setShowForm(false)}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {overdueTasks.length > 0 && (
        <Section
          title="Overdue"
          tasks={overdueTasks}
          emptyMsg=""
          showDate={true}
          accent="accentRed"
        />
      )}

      <Section
        title="Today"
        tasks={todayTasks}
        emptyMsg="No tasks for today."
        showDate={false}
      />

      <Section
        title="Upcoming"
        tasks={upcomingTasks}
        emptyMsg="No upcoming tasks."
        showDate={true}
      />
    </AppLayout>
  );
}
