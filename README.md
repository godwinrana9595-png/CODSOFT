# ZenTodo - Premium Task Manager PWA

ZenTodo is a visually elegant, high-performance, and offline-first Progressive Web App (PWA) designed to organize your daily activities. With sleek animations, a responsive interface, and support for Android device installation, ZenTodo represents the pinnacle of modern web utility design.

## ✨ Features

- **🎯 Task Customization**: Create tasks with titles, detailed descriptions, priority settings (Low, Medium, High), and due dates.
- **🌗 Full Dark Mode Support**: Sleek, eye-friendly slate theme that respects system preference or toggles manually with smooth CSS transitions.
- **🔍 Filter & Sort Controls**: Find tasks quickly via a search box, filter tabs (All, Active, Completed), and sort menus (Newest First, Oldest First, Due Date, Priority).
- **💾 Local Storage Persistence**: Keep your tasks securely stored on your local device. Data persists across browser refreshes.
- **↩️ Undo Task Deletion**: Satisfying card slide-out animation on delete, coupled with an interactive toast notification allowing you to instantly restore a deleted task.
- **📱 PWA Installable (Android/Chrome)**: Includes a custom PWA registration engine, manifest configurations, and a service worker to facilitate installation directly onto Android devices, removing browser URL bars and running offline.

## 📁 File Structure

```text
todolist/
├── index.html     # Semantic markup layout and theme wrappers
├── style.css      # Core Design system, theme modes, and micro-animations
├── app.js         # State controller, filters, DOM updates, and PWA setup
├── manifest.json  # PWA manifest detailing app parameters for launchers
├── sw.js          # Service worker defining caching and offline fallback rules
└── icon.svg       # Premium vector launcher icon
```

