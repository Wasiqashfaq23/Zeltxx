// Single source of truth for contribution scoring, allowed types and anti-abuse caps.
export const WEIGHTS = {
  commit: 4,
  review: 3,
  task_complete: 2,
  file_upload: 2,
  comment: 1,
  pr_opened: 2,
  pr_merged: 6,
  issues_opened: 2,
  issues_closed: 4
}

// Types a member may log manually. Everything else is created by its own
// server-side trigger (git sync, webhook, task completion, resource upload).
export const MANUAL_CONTRIBUTION_TYPES = ['comment', 'review']

// Max automated contributions of a given type per user per project per day.
export const DAILY_CAPS = {
  commit: 500,
  review: 100,
  task_complete: 30,
  file_upload: 50,
  comment: 25,
  pr_opened: 50,
  pr_merged: 50,
  issues_opened: 100,
  issues_closed: 100
}

export const PROJECT_ROLES = ['admin', 'collaborator']

// GitHub webhook event categories an admin can toggle on/off per project.
export const WEBHOOK_EVENT_TYPES = ['push', 'pr', 'issues', 'review']

export const TASK_STATUSES = ['todo', 'in_progress', 'done']

export const TASK_PRIORITIES = ['low', 'medium', 'high']

export const RESOURCE_CATEGORIES = ['repo', 'docs', 'design', 'other']

/**
 * Accepts only http/https absolute URLs with a host. Blocks javascript:, data:,
 * file:, protocol-relative (//), and otherwise dangerous schemes in user input.
 */
export const isHttpUrl = (value) => {
  if (typeof value !== 'string' || value.length > 2083) return false
  try {
    const parsed = new URL(value)
    return parsed.protocol === 'http:' || parsed.protocol === 'https:'
  } catch {
    return false
  }
}