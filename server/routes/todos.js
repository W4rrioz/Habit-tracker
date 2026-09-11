import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { query } from '../lib/db.js';
import { GetLeftovers, formatDate, getCurrentPeriodStart } from '../lib/leftovers.js';

const router = express.Router();
router.use(requireAuth);

/**
 * GET /api/todos
 * Returns todos categorized (today, upcoming, completed, leftovers).
 * Supports optional ?refDate=YYYY-MM-DD for date simulation/testing.
 */
router.get('/', async (req, res) => {
  try {
    const refDate = req.query.refDate ? new Date(req.query.refDate) : new Date();
    const todayStr = formatDate(refDate);

    // 1. Get leftovers for active recurring todos
    const leftovers = await GetLeftovers(req.user.id, refDate);

    // 2. Fetch all user todos
    const todosRes = await query(
      `SELECT * FROM todos 
       WHERE user_id = $1 
       ORDER BY 
         CASE priority 
           WHEN 'high' THEN 1 
           WHEN 'medium' THEN 2 
           WHEN 'low' THEN 3 
           ELSE 4 
         END,
         created_at ASC`,
      [req.user.id]
    );

    // 3. Fetch recurring completions for current periods
    const dailyCur = getCurrentPeriodStart('daily', refDate);
    const weeklyCur = getCurrentPeriodStart('weekly', refDate);
    const monthlyCur = getCurrentPeriodStart('monthly', refDate);

    const compRes = await query(
      `SELECT tc.todo_id, tc.period_start 
       FROM todo_completions tc
       JOIN todos t ON t.id = tc.todo_id
       WHERE t.user_id = $1
         AND tc.period_start IN ($2::date, $3::date, $4::date)`,
      [req.user.id, dailyCur, weeklyCur, monthlyCur]
    );

    const compSet = new Set(
      compRes.rows.map(r => `${r.todo_id}_${formatDate(r.period_start)}`)
    );

    const today = [];
    const upcoming = [];
    const completed = [];

    for (const raw of todosRes.rows) {
      const formattedDueDate = raw.due_date ? formatDate(raw.due_date) : null;
      const todo = {
        ...raw,
        due_date: formattedDueDate
      };

      if (todo.recurrence === 'one_time') {
        if (todo.is_completed) {
          completed.push(todo);
        } else if (formattedDueDate && formattedDueDate > todayStr) {
          upcoming.push(todo);
        } else {
          today.push(todo);
        }
      } else {
        // Recurring todo
        const curPeriod = getCurrentPeriodStart(todo.recurrence, refDate);
        const isDone = compSet.has(`${todo.id}_${curPeriod}`);
        const recurringTodo = {
          ...todo,
          current_period_start: curPeriod,
          is_completed: isDone
        };

        if (isDone) {
          completed.push(recurringTodo);
          today.push(recurringTodo);
        } else {
          today.push(recurringTodo);
        }
      }
    }

    res.json({
      today,
      upcoming,
      completed,
      leftovers
    });
  } catch (err) {
    console.error('Error fetching todos:', err);
    res.status(500).json({ error: 'Failed to fetch todos' });
  }
});

/**
 * GET /api/todos/:id
 * Fetch a single todo by ID.
 */
router.get('/:id', async (req, res) => {
  try {
    const result = await query(
      'SELECT * FROM todos WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Todo not found' });
    }

    const todo = result.rows[0];
    todo.due_date = todo.due_date ? formatDate(todo.due_date) : null;
    res.json({ todo });
  } catch (err) {
    console.error('Error fetching todo:', err);
    res.status(500).json({ error: 'Failed to fetch todo' });
  }
});

/**
 * POST /api/todos
 * Creates a todo (title, due_date, priority, recurrence).
 */
router.post('/', async (req, res) => {
  try {
    const { title, due_date, priority = 'medium', recurrence = 'one_time' } = req.body || {};

    if (!title || typeof title !== 'string' || !title.trim()) {
      return res.status(400).json({ error: 'Title is required' });
    }

    const validPriorities = ['low', 'medium', 'high'];
    const validRecurrences = ['one_time', 'daily', 'weekly', 'monthly'];

    const sanitizedPriority = validPriorities.includes(priority) ? priority : 'medium';
    const sanitizedRecurrence = validRecurrences.includes(recurrence) ? recurrence : 'one_time';
    const sanitizedDueDate = due_date && String(due_date).trim() ? due_date : null;

    const result = await query(
      `INSERT INTO todos (user_id, title, due_date, priority, recurrence, is_completed)
       VALUES ($1, $2, $3, $4, $5, false)
       RETURNING *`,
      [req.user.id, title.trim(), sanitizedDueDate, sanitizedPriority, sanitizedRecurrence]
    );

    const created = result.rows[0];
    created.due_date = created.due_date ? formatDate(created.due_date) : null;

    res.status(201).json({ todo: created });
  } catch (err) {
    console.error('Error creating todo:', err);
    res.status(500).json({ error: 'Failed to create todo' });
  }
});

/**
 * PUT /api/todos/:id
 * Updates a todo.
 */
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { title, due_date, priority, recurrence, is_completed } = req.body || {};

    const existingRes = await query(
      'SELECT * FROM todos WHERE id = $1 AND user_id = $2',
      [id, req.user.id]
    );

    if (existingRes.rows.length === 0) {
      return res.status(404).json({ error: 'Todo not found' });
    }

    const current = existingRes.rows[0];

    let newTitle = current.title;
    if (title !== undefined) {
      if (typeof title !== 'string' || !title.trim()) {
        return res.status(400).json({ error: 'Title cannot be empty' });
      }
      newTitle = title.trim();
    }

    const validPriorities = ['low', 'medium', 'high'];
    const validRecurrences = ['one_time', 'daily', 'weekly', 'monthly'];

    const newPriority = (priority !== undefined && validPriorities.includes(priority))
      ? priority
      : current.priority;

    const newRecurrence = (recurrence !== undefined && validRecurrences.includes(recurrence))
      ? recurrence
      : current.recurrence;

    const newDueDate = due_date !== undefined
      ? (due_date && String(due_date).trim() ? due_date : null)
      : current.due_date;

    const newIsCompleted = is_completed !== undefined
      ? Boolean(is_completed)
      : current.is_completed;

    const updateRes = await query(
      `UPDATE todos
       SET title = $1, due_date = $2, priority = $3, recurrence = $4, is_completed = $5
       WHERE id = $6 AND user_id = $7
       RETURNING *`,
      [newTitle, newDueDate, newPriority, newRecurrence, newIsCompleted, id, req.user.id]
    );

    const updated = updateRes.rows[0];
    updated.due_date = updated.due_date ? formatDate(updated.due_date) : null;

    res.json({ todo: updated });
  } catch (err) {
    console.error('Error updating todo:', err);
    res.status(500).json({ error: 'Failed to update todo' });
  }
});

/**
 * DELETE /api/todos/:id
 * Deletes a todo.
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const deleteRes = await query(
      'DELETE FROM todos WHERE id = $1 AND user_id = $2 RETURNING id',
      [id, req.user.id]
    );

    if (deleteRes.rows.length === 0) {
      return res.status(404).json({ error: 'Todo not found' });
    }

    res.json({ message: 'Todo deleted successfully', id });
  } catch (err) {
    console.error('Error deleting todo:', err);
    res.status(500).json({ error: 'Failed to delete todo' });
  }
});

/**
 * POST /api/todos/:id/toggle
 * Toggles completion.
 * For one-time todos, flips is_completed.
 * For recurring todos, records/removes row in todo_completions for the period_start.
 */
router.post('/:id/toggle', async (req, res) => {
  try {
    const { id } = req.params;
    const { period_start } = req.body || {};

    const findRes = await query(
      'SELECT * FROM todos WHERE id = $1 AND user_id = $2',
      [id, req.user.id]
    );

    if (findRes.rows.length === 0) {
      return res.status(404).json({ error: 'Todo not found' });
    }

    const todo = findRes.rows[0];

    if (todo.recurrence === 'one_time') {
      const newStatus = !todo.is_completed;
      const updateRes = await query(
        'UPDATE todos SET is_completed = $1 WHERE id = $2 AND user_id = $3 RETURNING *',
        [newStatus, id, req.user.id]
      );
      const updated = updateRes.rows[0];
      updated.due_date = updated.due_date ? formatDate(updated.due_date) : null;

      return res.json({
        message: newStatus ? 'Todo marked completed' : 'Todo marked incomplete',
        todo: updated,
        is_completed: newStatus
      });
    } else {
      // Recurring todo
      const targetPeriodStart = period_start || getCurrentPeriodStart(todo.recurrence);

      // Check if completion exists
      const compCheck = await query(
        'SELECT id FROM todo_completions WHERE todo_id = $1 AND period_start = $2::date',
        [id, targetPeriodStart]
      );

      if (compCheck.rows.length > 0) {
        // Remove completion (uncheck)
        await query(
          'DELETE FROM todo_completions WHERE todo_id = $1 AND period_start = $2::date',
          [id, targetPeriodStart]
        );
        todo.due_date = todo.due_date ? formatDate(todo.due_date) : null;

        return res.json({
          message: 'Todo completion removed for period',
          todo: { ...todo, is_completed: false },
          period_start: targetPeriodStart,
          is_completed: false
        });
      } else {
        // Insert completion (check)
        await query(
          `INSERT INTO todo_completions (todo_id, period_start, completed_at)
           VALUES ($1, $2::date, NOW())
           ON CONFLICT (todo_id, period_start) DO NOTHING`,
          [id, targetPeriodStart]
        );
        todo.due_date = todo.due_date ? formatDate(todo.due_date) : null;

        return res.json({
          message: 'Todo marked complete for period',
          todo: { ...todo, is_completed: true },
          period_start: targetPeriodStart,
          is_completed: true
        });
      }
    }
  } catch (err) {
    console.error('Error toggling todo completion:', err);
    res.status(500).json({ error: 'Failed to toggle todo completion' });
  }
});

export default router;
