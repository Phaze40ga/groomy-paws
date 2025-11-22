import { useCallback, useEffect, useMemo, useState } from 'react';
import { DashboardLayout } from '../../components/DashboardLayout';
import { api, Appointment } from '../../lib/api';
import {
  PlayCircle,
  Pause,
  Zap,
  Workflow as WorkflowIcon,
  Plus,
  AlertTriangle,
  Clock,
  MessageSquare,
  Activity,
} from 'lucide-react';

type WorkflowAction = 'send_notification' | 'create_task' | 'update_status' | 'assign_owner';
type WorkflowTrigger =
  | 'appointment_status_changed'
  | 'appointment_overdue'
  | 'new_customer'
  | 'chat_unanswered';

type Workflow = {
  id: string;
  name: string;
  description: string;
  trigger: WorkflowTrigger;
  conditions: string[];
  actions: WorkflowAction[];
  minutesDelay?: number;
  isActive: boolean;
  lastRun?: string;
};

type ConversationSummary = {
  id: string;
  customer_name?: string;
  last_message_at: string;
  last_message_sender_id?: string;
  unread_count?: number;
};

const WORKFLOW_STORAGE_KEY = 'admin_workflows';

const defaultWorkflows: Workflow[] = [
  {
    id: 'wf-1',
    name: 'Pending > 24h follow-up',
    description: 'Automatically send a reminder for appointments pending more than a day.',
    trigger: 'appointment_overdue',
    conditions: ['Status equals pending', 'Age greater than 24h'],
    actions: ['send_notification'],
    minutesDelay: 10,
    isActive: true,
    lastRun: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
  },
  {
    id: 'wf-2',
    name: 'Chat escalation',
    description: 'Escalate chats with no staff response after 30 minutes.',
    trigger: 'chat_unanswered',
    conditions: ['Customer last reply > 30m'],
    actions: ['assign_owner', 'send_notification'],
    isActive: true,
    minutesDelay: 5,
  },
];

const triggerLabels: Record<WorkflowTrigger, string> = {
  appointment_status_changed: 'Appointment status changed',
  appointment_overdue: 'Appointment overdue',
  new_customer: 'New customer created',
  chat_unanswered: 'Chat unanswered',
};

const actionLabels: Record<WorkflowAction, string> = {
  send_notification: 'Send notification',
  create_task: 'Create task',
  update_status: 'Update status',
  assign_owner: 'Assign owner',
};

export function AdminAutomation() {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [showWorkflowModal, setShowWorkflowModal] = useState(false);
  const [draftWorkflow, setDraftWorkflow] = useState<Workflow>({
    id: '',
    name: '',
    description: '',
    trigger: 'appointment_status_changed',
    conditions: [],
    actions: ['send_notification'],
    isActive: true,
  });

  const loadStoredWorkflows = useCallback(() => {
    try {
      const stored = localStorage.getItem(WORKFLOW_STORAGE_KEY);
      if (stored) {
        setWorkflows(JSON.parse(stored));
      } else {
        setWorkflows(defaultWorkflows);
      }
    } catch (error) {
      console.error('Error loading workflows:', error);
      setWorkflows(defaultWorkflows);
    }
  }, []);

  useEffect(() => {
    loadStoredWorkflows();
  }, [loadStoredWorkflows]);

  useEffect(() => {
    localStorage.setItem(WORKFLOW_STORAGE_KEY, JSON.stringify(workflows));
  }, [workflows]);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const [appointmentsRes, conversationsRes] = await Promise.all([
          api.getAppointments(),
          api.getConversations(),
        ]);
        setAppointments(appointmentsRes.appointments || []);
        setConversations(conversationsRes.conversations || []);
      } catch (error) {
        console.error('Error loading automation data:', error);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const slaMetrics = useMemo(() => {
    const now = Date.now();
    const pendingOver24h = appointments.filter(
      (apt) =>
        apt.status === 'pending' &&
        now - new Date(apt.scheduled_at).getTime() > 24 * 60 * 60 * 1000
    );
    const inProgressOverDuration = appointments.filter((apt) => {
      if (apt.status !== 'in_progress') return false;
      const actual = (now - new Date(apt.scheduled_at).getTime()) / 60000;
      return actual > apt.duration_minutes + 30;
    });
    const unansweredChats = conversations.filter((conv) => {
      if (!conv.last_message_sender_id) return false;
      const lastMessageAt = new Date(conv.last_message_at);
      const diffMinutes = (now - lastMessageAt.getTime()) / 60000;
      return diffMinutes > 30;
    });

    return {
      pendingOver24h,
      inProgressOverDuration,
      unansweredChats,
    };
  }, [appointments, conversations]);

  function toggleWorkflow(id: string) {
    setWorkflows((prev) =>
      prev.map((wf) =>
        wf.id === id
          ? {
              ...wf,
              isActive: !wf.isActive,
            }
          : wf
      )
    );
  }

  function handleWorkflowFieldChange<K extends keyof Workflow>(key: K, value: Workflow[K]) {
    setDraftWorkflow((prev) => ({
      ...prev,
      [key]: value,
    }));
  }

  function handleConditionChange(index: number, value: string) {
    setDraftWorkflow((prev) => {
      const nextConditions = [...(prev.conditions || [])];
      nextConditions[index] = value;
      return { ...prev, conditions: nextConditions };
    });
  }

  function addConditionField() {
    setDraftWorkflow((prev) => ({
      ...prev,
      conditions: [...(prev.conditions || []), ''],
    }));
  }

  function handleActionToggle(action: WorkflowAction) {
    setDraftWorkflow((prev) => {
      const hasAction = prev.actions.includes(action);
      return {
        ...prev,
        actions: hasAction
          ? prev.actions.filter((a) => a !== action)
          : [...prev.actions, action],
      };
    });
  }

  function handleWorkflowSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!draftWorkflow.name.trim()) return;

    const newWorkflow: Workflow = {
      ...draftWorkflow,
      id: draftWorkflow.id || crypto.randomUUID(),
      conditions: (draftWorkflow.conditions || []).filter(Boolean),
      actions: draftWorkflow.actions.length ? draftWorkflow.actions : ['send_notification'],
    };

    setWorkflows((prev) => {
      const existingIndex = prev.findIndex((wf) => wf.id === newWorkflow.id);
      if (existingIndex >= 0) {
        const updated = [...prev];
        updated[existingIndex] = newWorkflow;
        return updated;
      }
      return [newWorkflow, ...prev];
    });
    setShowWorkflowModal(false);
    setDraftWorkflow({
      id: '',
      name: '',
      description: '',
      trigger: 'appointment_status_changed',
      conditions: [],
      actions: ['send_notification'],
      isActive: true,
    });
  }

  function editWorkflow(workflow: Workflow) {
    setDraftWorkflow(workflow);
    setShowWorkflowModal(true);
  }

  function deleteWorkflow(id: string) {
    if (!confirm('Delete this workflow?')) return;
    setWorkflows((prev) => prev.filter((wf) => wf.id !== id));
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="py-20 flex justify-center">
          <div className="w-16 h-16 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Automation & SLA</h1>
          <p className="text-gray-600 dark:text-gray-300">
            Monitor response targets and build automations that keep your team on track.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
            <div className="flex items-center gap-3 mb-3">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Pending &gt; 24h</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {slaMetrics.pendingOver24h.length}
                </p>
              </div>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Appointments awaiting confirmation longer than the target window.
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
            <div className="flex items-center gap-3 mb-3">
              <Clock className="w-5 h-5 text-blue-500" />
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">In-progress overrun</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {slaMetrics.inProgressOverDuration.length}
                </p>
              </div>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Sessions exceeding their expected duration plus buffer time.
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
            <div className="flex items-center gap-3 mb-3">
              <MessageSquare className="w-5 h-5 text-pink-500" />
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Chats awaiting reply</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {slaMetrics.unansweredChats.length}
                </p>
              </div>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Customer conversations with no staff response in 30+ minutes.
            </p>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Workflow builder</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Automate reminders and escalations when triggers match your criteria.
              </p>
            </div>
            <button
              onClick={() => {
                setDraftWorkflow({
                  id: '',
                  name: '',
                  description: '',
                  trigger: 'appointment_status_changed',
                  conditions: [],
                  actions: ['send_notification'],
                  isActive: true,
                });
                setShowWorkflowModal(true);
              }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary-600 text-white font-medium hover:bg-primary-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              New workflow
            </button>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {workflows.map((workflow) => (
              <div
                key={workflow.id}
                className="border border-gray-200 dark:border-gray-700 rounded-xl p-4 space-y-3 bg-white dark:bg-gray-900"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                      <WorkflowIcon className="w-4 h-4 text-primary-600" />
                      {workflow.name}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{workflow.description}</p>
                  </div>
                  <button
                    onClick={() => toggleWorkflow(workflow.id)}
                    className={`px-3 py-1 text-xs font-semibold rounded-full ${
                      workflow.isActive
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-100 text-gray-500'
                    }`}
                  >
                    {workflow.isActive ? 'Active' : 'Paused'}
                  </button>
                </div>
                <div>
                  <p className="text-xs uppercase text-gray-500 dark:text-gray-400 mb-1">Trigger</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {triggerLabels[workflow.trigger]}
                  </p>
                </div>
                {workflow.conditions?.length ? (
                  <div>
                    <p className="text-xs uppercase text-gray-500 dark:text-gray-400 mb-1">Conditions</p>
                    <ul className="list-disc list-inside text-sm text-gray-700 dark:text-gray-300 space-y-1">
                      {workflow.conditions.map((condition) => (
                        <li key={condition}>{condition}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                <div>
                  <p className="text-xs uppercase text-gray-500 dark:text-gray-400 mb-1">Actions</p>
                  <div className="flex flex-wrap gap-2">
                    {workflow.actions.map((action) => (
                      <span
                        key={action}
                        className="px-2 py-1 text-xs font-semibold rounded-full bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-200"
                      >
                        {actionLabels[action]}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                  <p>
                    Delay:{' '}
                    {workflow.minutesDelay
                      ? `${workflow.minutesDelay} min`
                      : 'Immediate'}
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => editWorkflow(workflow)}
                      className="text-primary-600 dark:text-primary-400 font-semibold"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => deleteWorkflow(workflow.id)}
                      className="text-gray-500 hover:text-red-500 dark:hover:text-red-400"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
            {workflows.length === 0 && (
              <div className="border border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-6 text-center text-gray-500 dark:text-gray-400">
                No workflows yet. Create one to automate reminders and escalations.
              </div>
            )}
          </div>
        </div>
      </div>

      {showWorkflowModal && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-50 p-4 flex items-center justify-center">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {draftWorkflow.id ? 'Edit workflow' : 'Create workflow'}
              </h2>
              <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">
                Define triggers, conditions, and the actions your team cares about.
              </p>
            </div>
            <form onSubmit={handleWorkflowSubmit} className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-semibold text-gray-800 dark:text-gray-200 mb-1">
                  Name
                </label>
                <input
                  type="text"
                  value={draftWorkflow.name}
                  onChange={(e) => handleWorkflowFieldChange('name', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  placeholder="e.g. Pending appointment reminder"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-800 dark:text-gray-200 mb-1">
                  Description
                </label>
                <textarea
                  value={draftWorkflow.description}
                  onChange={(e) => handleWorkflowFieldChange('description', e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  placeholder="Explain what this workflow should accomplish"
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="block text-sm font-semibold text-gray-800 dark:text-gray-200 mb-1">
                    Trigger
                  </label>
                  <select
                    value={draftWorkflow.trigger}
                    onChange={(e) =>
                      handleWorkflowFieldChange(
                        'trigger',
                        e.target.value as WorkflowTrigger
                      )
                    }
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  >
                    {Object.entries(triggerLabels).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-800 dark:text-gray-200 mb-1">
                    Delay (minutes)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={draftWorkflow.minutesDelay ?? ''}
                    onChange={(e) =>
                      handleWorkflowFieldChange(
                        'minutesDelay',
                        e.target.value ? Number(e.target.value) : undefined
                      )
                    }
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    placeholder="Optional delay before running"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                    Conditions
                  </label>
                  <button
                    type="button"
                    onClick={addConditionField}
                    className="text-primary-600 dark:text-primary-400 text-sm font-semibold"
                  >
                    + Add condition
                  </button>
                </div>
                {draftWorkflow.conditions?.length ? (
                  <div className="space-y-2">
                    {draftWorkflow.conditions.map((condition, idx) => (
                      <input
                        key={`condition-${idx}`}
                        type="text"
                        value={condition}
                        onChange={(e) => handleConditionChange(idx, e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                        placeholder="Describe the condition"
                      />
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    No conditions yet. The workflow will run whenever the trigger fires.
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-800 dark:text-gray-200 mb-2">
                  Actions
                </label>
                <div className="grid gap-2 md:grid-cols-2">
                  {(Object.keys(actionLabels) as WorkflowAction[]).map((action) => (
                    <label
                      key={action}
                      className={`flex items-center gap-2 px-3 py-2 border rounded-lg cursor-pointer ${
                        draftWorkflow.actions.includes(action)
                          ? 'border-primary-300 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-200'
                          : 'border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={draftWorkflow.actions.includes(action)}
                        onChange={() => handleActionToggle(action)}
                      />
                      {actionLabels[action]}
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleWorkflowFieldChange('isActive', !draftWorkflow.isActive)}
                    className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      draftWorkflow.isActive
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-100 text-gray-500'
                    }`}
                  >
                    {draftWorkflow.isActive ? 'Active' : 'Paused'}
                  </button>
                </div>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setShowWorkflowModal(false)}
                    className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-lg bg-primary-600 text-white font-semibold hover:bg-primary-700 transition-colors"
                  >
                    Save workflow
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}

