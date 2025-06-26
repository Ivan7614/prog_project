const taskForm = document.getElementById('taskForm')
const taskList = document.getElementById('taskList')
const stats = document.getElementById('stats')
const taskPriority = document.getElementById('taskPriority')
const themeToggle = document.getElementById('themeToggle')
const remindersBox = document.createElement('section')
remindersBox.id = 'remindersBox'
remindersBox.style = 'max-width:600px;margin:0 auto;padding:1rem;font-size:14px;color:#666;'
document.body.appendChild(remindersBox)

let tasks = JSON.parse(localStorage.getItem('tasks')) || []
let notified = new Set(JSON.parse(localStorage.getItem('notified')) || [])
let editId = null

// === ЗАВАНТАЖЕННЯ НАЛАШТУВАНЬ ===
const savedThemeColor = localStorage.getItem('themeColor') || "#2d89ef"
const savedThemeMode = localStorage.getItem('theme') || "light"

document.getElementById('themeColorPicker').value = savedThemeColor

if (savedThemeMode === 'dark') {
  document.body.classList.add('dark')
  document.documentElement.style.setProperty('--background', '#121212')
  document.documentElement.style.setProperty('--card-bg', '#1f1f1f')
  document.documentElement.style.setProperty('--text-color', '#f0f0f0')
  document.documentElement.style.setProperty('--shadow', '0 8px 24px rgba(0,0,0,0.4)')
} else {
  applyTheme(savedThemeColor)
}

if (Notification.permission !== 'granted') Notification.requestPermission()

const savedUserName = localStorage.getItem('userName')
if (savedUserName) {
  document.getElementById('userGreeting').textContent = `Привіт, ${savedUserName}!`
}
const savedUserAvatar = localStorage.getItem('userAvatar')
if (savedUserAvatar) {
  const avatar = document.getElementById('userAvatar')
  avatar.src = savedUserAvatar
  avatar.classList.remove('hidden')
}

// === ТЕМА КНОПКОЮ 🌙/☀️ ===
themeToggle.addEventListener('click', () => {
  const isDark = document.body.classList.toggle('dark')
  localStorage.setItem('theme', isDark ? 'dark' : 'light')

  if (isDark) {
    document.documentElement.style.setProperty('--background', '#121212')
    document.documentElement.style.setProperty('--card-bg', '#1f1f1f')
    document.documentElement.style.setProperty('--text-color', '#f0f0f0')
    document.documentElement.style.setProperty('--shadow', '0 8px 24px rgba(0, 0, 0, 0.4)')
  } else {
    applyTheme(localStorage.getItem('themeColor') || "#2d89ef")
  }
})

// === ПРИМІНЕННЯ КОЛЬОРУ ТЕМИ ===
function applyTheme(color) {
  const themeMap = {
    "#4f46e5": {
      "--main-color": "#4f46e5",
      "--background": "#f4f0ff",
      "--card-bg": "#ffffff",
      "--text-color": "#1f1f1f",
      "--shadow": "0 8px 24px rgba(79, 70, 229, 0.25)"
    },
    "#2d89ef": {
      "--main-color": "#2d89ef",
      "--background": "#eef5ff",
      "--card-bg": "#ffffff",
      "--text-color": "#1f2937",
      "--shadow": "0 8px 24px rgba(45, 137, 239, 0.2)"
    },
    "#27ae60": {
      "--main-color": "#27ae60",
      "--background": "#ecfdf5",
      "--card-bg": "#ffffff",
      "--text-color": "#1b4332",
      "--shadow": "0 8px 24px rgba(39, 174, 96, 0.2)"
    },
    "#e67e22": {
      "--main-color": "#e67e22",
      "--background": "#fff5e6",
      "--card-bg": "#ffffff",
      "--text-color": "#4a2c00",
      "--shadow": "0 8px 24px rgba(230, 126, 34, 0.2)"
    }
  }

  const themeVars = themeMap[color]
  for (const [key, value] of Object.entries(themeVars)) {
    document.documentElement.style.setProperty(key, value)
  }
}

// === ДОДАВАННЯ / РЕДАГУВАННЯ ===
taskForm.addEventListener('submit', e => {
  e.preventDefault()
  const title = document.getElementById('taskTitle').value
  const time = document.getElementById('taskTime').value
  const description = document.getElementById('taskDescription').value
  const priority = taskPriority.value

  if (editId) {
    tasks = tasks.map(t => t.id === editId ? { ...t, title, time, description, priority } : t)
    editId = null
  } else {
    tasks.push({
      id: Date.now(),
      title,
      time,
      description,
      completed: false,
      priority
    })
  }

  localStorage.setItem('tasks', JSON.stringify(tasks))
  taskForm.reset()
  renderAll()
})

// === РЕНДЕР ===
function renderAll() {
  renderTasks()
  renderReminders()
  renderStats()
}

function renderTasks() {
  taskList.innerHTML = ''
  const sorted = [...tasks].sort((a, b) => new Date(a.time) - new Date(b.time))
  sorted.forEach(task => {
    const el = document.createElement('div')
    el.className = 'task' + (task.completed ? ' done' : '')
    el.innerHTML = `
      <strong>${task.title}</strong> <span>[${task.priority}]</span><br>
      ${task.description}<br>
      <em>${task.time}</em><br>
      <input type="checkbox" ${task.completed ? 'checked' : ''} onchange="toggleDone(${task.id})"> Виконано
      <div class="actions">
        <button onclick="editTask(${task.id})">Редагувати</button>
        <button onclick="deleteTask(${task.id})">Видалити</button>
      </div>
    `
    taskList.appendChild(el)
  })
}

function renderReminders() {
  const now = new Date()
  const upcoming = tasks.filter(t => !t.completed && new Date(t.time) > now)
    .sort((a, b) => new Date(t.time) - new Date(b.time))

  if (!upcoming.length) {
    remindersBox.innerHTML = '<p><em>Немає запланованих нагадувань.</em></p>'
    return
  }

  remindersBox.innerHTML = '<h3>📅 Заплановані нагадування:</h3>'
  upcoming.forEach(t => {
    const diff = Math.floor((new Date(t.time) - now) / 1000)
    const min = Math.floor(diff / 60)
    const sec = diff % 60
    const timeLeft = min > 0 ? `${min} хв ${sec} сек` : `${sec} сек`
    const item = document.createElement('div')
    item.textContent = `${t.title} — через ${timeLeft}`
    remindersBox.appendChild(item)

    if (diff <= 60 && !notified.has(t.id)) {
      triggerNotification(t)
      notified.add(t.id)
      localStorage.setItem('notified', JSON.stringify(Array.from(notified)))
    }
  })
}

function renderStats() {
  const done = tasks.filter(t => t.completed).length
  const total = tasks.length
  stats.innerText = `✅ Виконано: ${done} | ❌ Невиконано: ${total - done}`
}

function toggleDone(id) {
  tasks = tasks.map(t => t.id === id ? { ...t, completed: !t.completed } : t)
  localStorage.setItem('tasks', JSON.stringify(tasks))
  renderAll()
}

function deleteTask(id) {
  tasks = tasks.filter(t => t.id !== id)
  notified.delete(id)
  localStorage.setItem('tasks', JSON.stringify(tasks))
  localStorage.setItem('notified', JSON.stringify(Array.from(notified)))
  renderAll()
}

function editTask(id) {
  const task = tasks.find(t => t.id === id)
  document.getElementById('taskTitle').value = task.title
  document.getElementById('taskTime').value = task.time
  document.getElementById('taskDescription').value = task.description
  document.getElementById('taskPriority').value = task.priority
  editId = id
}

function triggerNotification(task) {
  const audio = new Audio('notify.mp3')
  audio.play()
  if (Notification.permission === 'granted') {
    new Notification(`Нагадування: ${task.title}`, {
      body: task.description
    })
  }
}

// === КОРИСТУВАЧ ===
function openSettings() {
  document.getElementById('settingsPanel').classList.remove('hidden')
}
function closeSettings() {
  document.getElementById('settingsPanel').classList.add('hidden')
}
function saveSettings() {
  const name = document.getElementById('userNameInput').value.trim()
  const theme = document.getElementById('themeColorPicker').value
  const avatarInput = document.getElementById('avatarUpload')

  if (name) {
    localStorage.setItem('userName', name)
    document.getElementById('userGreeting').textContent = `Привіт, ${name}!`
  }

  if (theme) {
    localStorage.setItem('themeColor', theme)
    if (!document.body.classList.contains('dark')) {
      applyTheme(theme)
    }
  }

  if (avatarInput.files[0]) {
    const reader = new FileReader()
    reader.onload = () => {
      const url = reader.result
      document.getElementById('userAvatar').src = url
      document.getElementById('userAvatar').classList.remove('hidden')
      localStorage.setItem('userAvatar', url)
    }
    reader.readAsDataURL(avatarInput.files[0])
  }

  closeSettings()
}

function clearAll() {
  if (confirm('Очистити всі завдання?')) {
    tasks = []
    notified.clear()
    localStorage.removeItem('tasks')
    localStorage.removeItem('notified')
    renderAll()
  }
}

function filterTasks(type) {
  let filtered = []
  const today = new Date().toISOString().split('T')[0]
  if (type === 'all') filtered = tasks
  if (type === 'today') filtered = tasks.filter(t => t.time.startsWith(today))
  if (type === 'past') filtered = tasks.filter(t => new Date(t.time) < new Date())
  taskList.innerHTML = ''
  filtered.forEach(task => {
    const el = document.createElement('div')
    el.className = 'task' + (task.completed ? ' done' : '')
    el.innerHTML = `
      <strong>${task.title}</strong> <span>[${task.priority}]</span><br>
      ${task.description}<br>
      <em>${task.time}</em><br>
      <input type="checkbox" ${task.completed ? 'checked' : ''} onchange="toggleDone(${task.id})"> Виконано
      <div class="actions">
        <button onclick="editTask(${task.id})">Редагувати</button>
        <button onclick="deleteTask(${task.id})">Видалити</button>
      </div>
    `
    taskList.appendChild(el)
  })
}

setInterval(renderReminders, 10000)
renderAll()
document.getElementById('avatarUpload').addEventListener('change', function () {
  const fileName = this.files.length > 0 ? this.files[0].name : 'Файл не обрано';
  document.getElementById('fileName').textContent = fileName;
});
