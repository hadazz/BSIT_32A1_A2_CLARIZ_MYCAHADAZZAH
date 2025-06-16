class EnhancedTodoApp {
    constructor() {
        this.tasks = [];
        this.editingTaskId = null;
        this.init();
    }

    init() {
        this.bindEvents();
        this.loadTasks();
        this.updateStats();
        this.updateEmptyState();
    }

    bindEvents() {
        // Form submission
        document.getElementById('taskForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.addTask();
        });

        // Task list events (event delegation)
        document.getElementById('taskList').addEventListener('click', (e) => {
            const taskId = e.target.closest('.list-group-item')?.dataset.taskId;
            if (!taskId) return;

            if (e.target.classList.contains('task-checkbox')) {
                this.toggleTask(taskId);
            } else if (e.target.classList.contains('edit-button') || e.target.closest('.edit-button')) {
                this.editTask(taskId);
            } else if (e.target.classList.contains('delete-button') || e.target.closest('.delete-button')) {
                this.deleteTask(taskId);
            }
        });

        // Filter and sort
        document.getElementById('filterSelect').addEventListener('change', () => this.filterTasks());
        document.getElementById('sortSelect').addEventListener('change', () => this.sortTasks());

        // Clear all tasks
        document.getElementById('clearAllButton').addEventListener('click', () => this.clearAllTasks());

        // Edit modal events
        document.getElementById('saveEditButton').addEventListener('click', () => this.saveEdit());

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey || e.metaKey) {
                switch(e.key) {
                    case 'Enter':
                        e.preventDefault();
                        this.addTask();
                        break;
                    case 'Backspace':
                        if (e.shiftKey) {
                            e.preventDefault();
                            this.clearAllTasks();
                        }
                        break;
                }
            }
        });

        // Auto-save on window unload
        window.addEventListener('beforeunload', () => this.saveTasks());
    }

    addTask() {
        const taskInput = document.getElementById('taskInput');
        const prioritySelect = document.getElementById('prioritySelect');
        const dueDateInput = document.getElementById('dueDateInput');

        const taskText = taskInput.value.trim();
        
        // Enhanced validation
        if (!taskText) {
            this.showError('Please enter a task description');
            taskInput.focus();
            return;
        }

        if (taskText.length > 200) {
            this.showError('Task description must be less than 200 characters');
            return;
        }

        // Check for duplicate tasks
        if (this.tasks.some(task => task.text.toLowerCase() === taskText.toLowerCase())) {
            this.showError('This task already exists');
            return;
        }

        const task = {
            id: this.generateId(),
            text: taskText,
            completed: false,
            priority: prioritySelect.value,
            dueDate: dueDateInput.value || null,
            createdAt: new Date().toISOString(),
            completedAt: null
        };

        this.tasks.push(task);
        this.renderTasks();
        this.updateStats();
        this.updateEmptyState();
        this.saveTasks();

        // Reset form
        taskInput.value = '';
        dueDateInput.value = '';
        prioritySelect.value = 'medium';
        taskInput.focus();

        this.showSuccess('Task added successfully!');
    }

    toggleTask(taskId) {
        const task = this.tasks.find(t => t.id === taskId);
        if (!task) return;

        task.completed = !task.completed;
        task.completedAt = task.completed ? new Date().toISOString() : null;

        this.renderTasks();
        this.updateStats();
        this.saveTasks();

        const message = task.completed ? 'Task completed!' : 'Task marked as pending';
        this.showSuccess(message);
    }

    editTask(taskId) {
        const task = this.tasks.find(t => t.id === taskId);
        if (!task) return;

        this.editingTaskId = taskId;
        
        // Populate modal
        document.getElementById('editTaskText').value = task.text;
        document.getElementById('editPriority').value = task.priority;
        document.getElementById('editDueDate').value = task.dueDate || '';

        // Show modal
        const modal = new bootstrap.Modal(document.getElementById('editTaskModal'));
        modal.show();
    }

    saveEdit() {
        if (!this.editingTaskId) return;

        const task = this.tasks.find(t => t.id === this.editingTaskId);
        if (!task) return;

        const newText = document.getElementById('editTaskText').value.trim();
        
        // Validation
        if (!newText) {
            this.showError('Please enter a task description');
            return;
        }

        if (newText.length > 200) {
            this.showError('Task description must be less than 200 characters');
            return;
        }

        // Check for duplicates (excluding current task)
        if (this.tasks.some(t => t.id !== this.editingTaskId && t.text.toLowerCase() === newText.toLowerCase())) {
            this.showError('This task already exists');
            return;
        }

        // Update task
        task.text = newText;
        task.priority = document.getElementById('editPriority').value;
        task.dueDate = document.getElementById('editDueDate').value || null;
        task.updatedAt = new Date().toISOString();

        this.renderTasks();
        this.saveTasks();
        this.editingTaskId = null;

        // Hide modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('editTaskModal'));
        modal.hide();

        this.showSuccess('Task updated successfully!');
    }

    deleteTask(taskId) {
        const task = this.tasks.find(t => t.id === taskId);
        if (!task) return;

        if (confirm(`Are you sure you want to delete "${task.text}"?`)) {
            // Add slide-out animation
            const taskElement = document.querySelector(`[data-task-id="${taskId}"]`);
            if (taskElement) {
                taskElement.classList.add('slide-out');
                setTimeout(() => {
                    this.tasks = this.tasks.filter(t => t.id !== taskId);
                    this.renderTasks();
                    this.updateStats();
                    this.updateEmptyState();
                    this.saveTasks();
                    this.showSuccess('Task deleted successfully!');
                }, 300);
            }
        }
    }

    clearAllTasks() {
        if (this.tasks.length === 0) return;

        if (confirm(`Are you sure you want to delete all ${this.tasks.length} tasks? This action cannot be undone.`)) {
            this.tasks = [];
            this.renderTasks();
            this.updateStats();
            this.updateEmptyState();
            this.saveTasks();
            this.showSuccess('All tasks cleared!');
        }
    }

    filterTasks() {
        const filter = document.getElementById('filterSelect').value;
        this.renderTasks(filter);
    }

    sortTasks() {
        const sortBy = document.getElementById('sortSelect').value;
        
        switch(sortBy) {
            case 'priority':
                this.tasks.sort((a, b) => {
                    const priorityOrder = { high: 3, medium: 2, low: 1 };
                    return priorityOrder[b.priority] - priorityOrder[a.priority];
                });
                break;
            case 'dueDate':
                this.tasks.sort((a, b) => {
                    if (!a.dueDate && !b.dueDate) return 0;
                    if (!a.dueDate) return 1;
                    if (!b.dueDate) return -1;
                    return new Date(a.dueDate) - new Date(b.dueDate);
                });
                break;
            case 'alphabetical':
                this.tasks.sort((a, b) => a.text.localeCompare(b.text));
                break;
            case 'date':
            default:
                this.tasks.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
                break;
        }
        
        this.renderTasks();
        this.saveTasks();
    }

    renderTasks(filter = 'all') {
        const taskList = document.getElementById('taskList');
        let filteredTasks = this.tasks;

        // Apply filter
        switch(filter) {
            case 'pending':
                filteredTasks = this.tasks.filter(task => !task.completed);
                break;
            case 'completed':
                filteredTasks = this.tasks.filter(task => task.completed);
                break;
            case 'overdue':
                filteredTasks = this.tasks.filter(task => 
                    !task.completed && task.dueDate && new Date(task.dueDate) < new Date()
                );
                break;
        }

        if (filteredTasks.length === 0 && filter !== 'all') {
            taskList.innerHTML = `
                <li class="empty-state text-center py-5">
                    <i class="fas fa-filter fa-3x text-muted mb-3"></i>
                    <p class="text-muted">No tasks match the current filter.</p>
                </li>
            `;
            return;
        }

        taskList.innerHTML = filteredTasks.map(task => this.createTaskHTML(task)).join('');
    }

    createTaskHTML(task) {
        const isOverdue = task.dueDate && !task.completed && new Date(task.dueDate) < new Date();
        const dueDate = task.dueDate ? new Date(task.dueDate).toLocaleDateString() : null;
        
        return `
            <li class="list-group-item fade-in" data-task-id="${task.id}">
                <div class="task-item">
                    <div class="task-content">
                        <input type="checkbox" class="task-checkbox" ${task.completed ? 'checked' : ''}>
                        <div class="task-info">
                            <div class="task-text ${task.completed ? 'completed' : ''}">${this.escapeHtml(task.text)}</div>
                            <div class="task-meta">
                                <span class="priority-badge priority-${task.priority}">
                                    ${task.priority} priority
                                </span>
                                ${dueDate ? `<span class="due-date ${isOverdue ? 'overdue' : ''}">
                                    <i class="fas fa-calendar-alt me-1"></i>
                                    ${isOverdue ? 'Overdue: ' : 'Due: '}${dueDate}
                                </span>` : ''}
                            </div>
                        </div>
                    </div>
                    <div class="task-actions">
                        <button class="btn btn-sm btn-outline-primary edit-button" title="Edit task">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-sm btn-outline-danger delete-button" title="Delete task">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            </li>
        `;
    }

    updateStats() {
        const total = this.tasks.length;
        const completed = this.tasks.filter(task => task.completed).length;
        const pending = total - completed;

        document.getElementById('totalTasks').textContent = total;
        document.getElementById('completedTasks').textContent = completed;
        document.getElementById('pendingTasks').textContent = pending;
    }

    updateEmptyState() {
        const clearAllButton = document.getElementById('clearAllButton');
        const taskList = document.getElementById('taskList');
        
        if (this.tasks.length === 0) {
            clearAllButton.style.display = 'none';
            if (!taskList.querySelector('.empty-state')) {
                taskList.innerHTML = `
                    <li class="empty-state text-center py-5">
                        <i class="fas fa-clipboard-list fa-3x text-muted mb-3"></i>
                        <p class="text-muted">No tasks yet. Add your first task above!</p>
                    </li>
                `;
            }
        } else {
            clearAllButton.style.display = 'block';
        }
    }

    saveTasks() {
        try {
            localStorage.setItem('enhancedTodoTasks', JSON.stringify(this.tasks));
        } catch (error) {
            this.showError('Failed to save tasks to local storage');
            console.error('Error saving tasks:', error);
        }
    }

    loadTasks() {
        try {
            const saved = localStorage.getItem('enhancedTodoTasks');
            if (saved) {
                this.tasks = JSON.parse(saved);
                // Validate and clean up tasks
                this.tasks = this.tasks.filter(task => 
                    task && task.id && task.text && typeof task.completed === 'boolean'
                );
                this.renderTasks();
            }
        } catch (error) {
            this.showError('Failed to load tasks from local storage');
            console.error('Error loading tasks:', error);
            this.tasks = [];
        }
    }

    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    showSuccess(message) {
        this.showToast(message, 'success');
    }

    showError(message) {
        this.showToast(message, 'error');
    }

    showToast(message, type = 'info') {
        // Create toast element
        const toast = document.createElement('div');
        toast.className = `alert alert-${type === 'error' ? 'danger' : 'success'} alert-dismissible fade show position-fixed`;
        toast.style.cssText = `
            top: 20px;
            right: 20px;
            z-index: 9999;
            min-width: 300px;
            animation: slideInRight 0.3s ease-out;
        `;
        
        toast.innerHTML = `
            <i class="fas fa-${type === 'error' ? 'exclamation-circle' : 'check-circle'} me-2"></i>
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;

        document.body.appendChild(toast);

        // Auto-remove after 3 seconds
        setTimeout(() => {
            if (toast.parentNode) {
                toast.classList.remove('show');
                setTimeout(() => toast.remove(), 150);
            }
        }, 3000);
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new EnhancedTodoApp();
});

// Add CSS for toast animation
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
`;
document.head.appendChild(style);