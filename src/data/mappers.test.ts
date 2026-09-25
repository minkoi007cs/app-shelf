import { describe, it, expect } from 'vitest';
import {
  rowToAccount,
  accountToRow,
  rowToTool,
  toolToRow,
  rowToAppProject,
  appProjectToRow,
  rowToBacklogItem,
  backlogItemToRow,
  rowToPaymentSchedule,
  paymentScheduleToRow,
  seedIfEmpty,
  type Account,
  type AITool,
  type AppProject,
  type BacklogItem,
  type PaymentScheduleItem,
} from './mappers';

describe('mappers round-trips', () => {
  it('round-trips Account fully populated', () => {
    const account: Account = {
      id: 'acc-1',
      email: 'test@example.com',
      status: 'active',
      resetTime: 1700000000000,
      runOutTime: 1700003600000,
      nextDueDate: 1700086400000,
      isDisabled: true,
      note: 'Test note',
    };
    const row = accountToRow(account, 'tool-1');
    const restored = rowToAccount(row);
    expect(restored).toEqual(account);
  });

  it('round-trips Tool fully populated', () => {
    const tool: AITool = {
      id: 'tool-1',
      name: 'Gemini',
      resetCycleHours: 5,
      displayOrder: 1,
      accounts: [],
    };
    const row = toolToRow(tool);
    const restored = rowToTool(row);
    expect(restored).toEqual({
      id: tool.id,
      name: tool.name,
      resetCycleHours: tool.resetCycleHours,
      displayOrder: tool.displayOrder,
    });
  });

  it('round-trips AppProject fully populated (including isDisabled, manualChecked, and healthStatus)', () => {
    const project: AppProject = {
      id: 'app-1',
      title: "App Shelf",
      frontendUrl: 'https://example.com',
      category: 'Web',
      database: 'Supabase Data 1',
      status: 'Production',
      priority: 'High',
      description: 'App store workspace',
      author: 'developer',
      hosting: 'Vercel',
      isDisabled: true,
      techNotes: 'Vercel monorepo deployment',
      manualChecked: true,
      manualCheckedAt: '23/09/2026',
      healthStatus: 'healthy',
      healthCheckedAt: '23/09/2026 08:00',
    };
    const row = appProjectToRow(project);
    const restored = rowToAppProject(row);
    expect(restored).toEqual(project);
  });

  it('round-trips BacklogItem fully populated', () => {
    const item: BacklogItem = {
      id: 'bl-1',
      title: 'Fix issue',
      isCompleted: true,
    };
    const row = backlogItemToRow(item, 'app-1');
    const restored = rowToBacklogItem(row);
    expect(restored).toEqual(item);
  });

  it('round-trips PaymentScheduleItem fully populated', () => {
    const schedule: PaymentScheduleItem = {
      id: 'pay-1',
      title: 'Netflix',
      accountEmail: 'user@mail.com',
      dueDate: 1700000000000,
      dueDateString: '2026-09-15',
      recurrence: 'monthly',
      repeatCount: 12,
      amount: 200000,
      currency: 'VND',
      paymentMethod: 'Visa 8899',
      isAutoDebit: true,
      isPaid: false,
      isPaused: false,
      rawInput: 'raw text',
    };
    const row = paymentScheduleToRow(schedule);
    const restored = rowToPaymentSchedule(row);
    expect(restored).toEqual(schedule);
  });

  describe('seedIfEmpty', () => {
    it('returns seed when loaded is empty', () => {
      const seed = [{ id: '1' }];
      expect(seedIfEmpty([], seed)).toBe(seed);
    });

    it('returns loaded when loaded is non-empty', () => {
      const loaded = [{ id: 'loaded-1' }];
      const seed = [{ id: 'seed-1' }];
      expect(seedIfEmpty(loaded, seed)).toEqual(loaded);
    });
  });
});
