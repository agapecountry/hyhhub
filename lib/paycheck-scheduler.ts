import { addMonths, isBefore, isAfter, differenceInDays, startOfDay } from 'date-fns';

export interface Bill {
  id: string;
  company: string;
  amount: number;
  due_date: number;
}

export interface Debt {
  id: string;
  name: string;
  minimum_payment: number;
  payment_day: number;
  current_balance: number;
  interest_rate: number;
  extra_payment: number;
}

export interface BudgetCategory {
  id: string;
  name: string;
  monthly_amount: number;
  due_date: number;
}

export interface Paycheck {
  date: Date;
  name: string;
  id: string;
  amount: number;
}

export interface PaymentScheduleItem {
  id: string;
  name: string;
  amount: number;
  due_date: Date;
  type: 'bill' | 'debt' | 'extra-debt' | 'budget';
  status: 'on-time' | 'late' | 'early';
  isSplit?: boolean;
  splitPart?: string;
  isFocusDebt?: boolean;
  isPaid?: boolean;
}

export interface PaycheckPeriod {
  paycheckDate: Date;
  paycheckName: string;
  paycheckId: string;
  totalIncome: number;
  totalPayments: number;
  remaining: number;
  payments: PaymentScheduleItem[];
}

export interface UnassignedPayment {
  id: string;
  name: string;
  amount: number;
  dueDate: Date;
  type: 'bill' | 'debt' | 'budget';
}

interface PendingPayment {
  id: string;
  name: string;
  amount: number;
  originalAmount: number;
  dueDate: Date;
  billingCycleStart: Date;
  type: 'bill' | 'debt' | 'budget';
  key: string;
  isDebt: boolean;
  interestRate?: number;
}

function getNextDueDate(dayOfMonth: number, fromDate: Date): Date {
  const result = new Date(fromDate);
  result.setDate(dayOfMonth);

  if (result < fromDate) {
    result.setMonth(result.getMonth() + 1);
  }

  return result;
}

export function generatePaycheckSchedule(
  paycheckPeriods: PaycheckPeriod[],
  bills: Bill[],
  debts: Debt[],
  budgetCategories: BudgetCategory[],
  debtStrategy: string,
  householdExtraPayment: number
): { schedule: PaycheckPeriod[]; unassigned: UnassignedPayment[] } {
  if (paycheckPeriods.length === 0) {
    return { schedule: [], unassigned: [] };
  }

  const endDate = addMonths(new Date(), 3);
  const today = startOfDay(new Date());
  const allPendingPayments: PendingPayment[] = [];

  bills.forEach(bill => {
    let dueDate = getNextDueDate(bill.due_date, today);

    while (isBefore(dueDate, endDate)) {
      // Billing cycle is always exactly 1 month before the due date
      // Don't clamp to today - this ensures paychecks only pay bills in their proper cycle
      const billingCycleStart = addMonths(dueDate, -1);
      allPendingPayments.push({
        id: bill.id,
        name: bill.company,
        amount: bill.amount,
        originalAmount: bill.amount,
        dueDate: dueDate,
        billingCycleStart: billingCycleStart,
        type: 'bill',
        key: `bill-${bill.id}-${dueDate.getTime()}`,
        isDebt: false,
      });
      dueDate = addMonths(dueDate, 1);
    }
  });

  debts.forEach(debt => {
    let dueDate = getNextDueDate(debt.payment_day, today);

    while (isBefore(dueDate, endDate)) {
      // Billing cycle is always exactly 1 month before the due date
      // Don't clamp to today - this ensures paychecks only pay debts in their proper cycle
      const billingCycleStart = addMonths(dueDate, -1);
      allPendingPayments.push({
        id: debt.id,
        name: debt.name,
        amount: debt.minimum_payment,
        originalAmount: debt.minimum_payment,
        dueDate: dueDate,
        billingCycleStart: billingCycleStart,
        type: 'debt',
        key: `debt-${debt.id}-${dueDate.getTime()}`,
        isDebt: true,
        interestRate: debt.interest_rate,
      });
      dueDate = addMonths(dueDate, 1);
    }
  });

  budgetCategories.forEach(category => {
    let dueDate = getNextDueDate(category.due_date, today);

    while (isBefore(dueDate, endDate)) {
      // Billing cycle is always exactly 1 month before the due date
      // Don't clamp to today - this ensures paychecks only pay budget items in their proper cycle
      const billingCycleStart = addMonths(dueDate, -1);
      allPendingPayments.push({
        id: category.id,
        name: category.name,
        amount: category.monthly_amount,
        originalAmount: category.monthly_amount,
        dueDate: dueDate,
        billingCycleStart: billingCycleStart,
        type: 'budget',
        key: `budget-${category.id}-${dueDate.getTime()}`,
        isDebt: false,
      });
      dueDate = addMonths(dueDate, 1);
    }
  });

  // Sort payments: bills and debts first (by due date), then budget items (by due date)
  allPendingPayments.sort((a, b) => {
    // Priority order: bill/debt = 1, budget = 2
    const priorityA = a.type === 'budget' ? 2 : 1;
    const priorityB = b.type === 'budget' ? 2 : 1;

    if (priorityA !== priorityB) {
      return priorityA - priorityB;
    }

    // Within same priority, sort by due date
    return a.dueDate.getTime() - b.dueDate.getTime();
  });

  const unassigned: UnassignedPayment[] = [];

  allPendingPayments.forEach(payment => {
    const eligiblePaychecks: number[] = [];

    for (let i = 0; i < paycheckPeriods.length; i++) {
      const paycheckDate = paycheckPeriods[i].paycheckDate;

      // Paycheck must be:
      // 1. On or after the billing cycle start
      // 2. On or before the due date
      // This ensures we only use paychecks within THIS bill's billing cycle
      if ((isAfter(paycheckDate, payment.billingCycleStart) || paycheckDate.getTime() === payment.billingCycleStart.getTime()) &&
          (isBefore(paycheckDate, payment.dueDate) || paycheckDate.getTime() === payment.dueDate.getTime())) {
        eligiblePaychecks.push(i);
      }
    }

    if (eligiblePaychecks.length === 0) {
      unassigned.push({
        id: payment.id,
        name: payment.name,
        amount: payment.amount,
        dueDate: payment.dueDate,
        type: payment.type,
      });
      return;
    }

    const maxSinglePaycheck = Math.max(...eligiblePaychecks.map(idx => paycheckPeriods[idx].totalIncome));
    const isBudgetItem = payment.type === 'budget';

    // For budget items: always allow splitting across max 2 paychecks
    // For bills/debts: only split if amount exceeds max single paycheck income
    const needsSplit = isBudgetItem || payment.amount > maxSinglePaycheck;

    if (needsSplit) {
      eligiblePaychecks.sort((a, b) => {
        const availableA = paycheckPeriods[a].remaining;
        const availableB = paycheckPeriods[b].remaining;
        return availableB - availableA;
      });

      let remainingAmount = payment.amount;
      let splitCounter = 1;
      const paychecksThatCanHelp = eligiblePaychecks.filter(idx => paycheckPeriods[idx].remaining > 0);

      // For budget items, limit to max 2 paychecks
      const maxPaychecksForSplit = isBudgetItem ? Math.min(2, paychecksThatCanHelp.length) : paychecksThatCanHelp.length;

      for (let i = 0; i < maxPaychecksForSplit && remainingAmount > 0.01; i++) {
        const paycheckIndex = paychecksThatCanHelp[i];
        const selectedPeriod = paycheckPeriods[paycheckIndex];
        const paymentAmount = Math.min(remainingAmount, selectedPeriod.remaining);

        if (paymentAmount <= 0) continue;

        const daysDiff = differenceInDays(payment.dueDate, selectedPeriod.paycheckDate);

        let status: 'on-time' | 'late' | 'early' = 'on-time';
        if (daysDiff < 0) status = 'late';
        else if (daysDiff > 5) status = 'early';

        selectedPeriod.payments.push({
          id: payment.id,
          name: payment.name,
          amount: paymentAmount,
          due_date: payment.dueDate,
          type: payment.type,
          status,
          isSplit: true,
          splitPart: `${splitCounter}/${maxPaychecksForSplit}`,
        });

        selectedPeriod.remaining -= paymentAmount;
        selectedPeriod.totalPayments += paymentAmount;
        remainingAmount -= paymentAmount;
        splitCounter++;
      }

      if (remainingAmount > 0.01) {
        unassigned.push({
          id: payment.id,
          name: payment.name,
          amount: remainingAmount,
          dueDate: payment.dueDate,
          type: payment.type,
        });
      }
    } else {
      eligiblePaychecks.sort((a, b) => {
        const remainingA = paycheckPeriods[a].remaining;
        const remainingB = paycheckPeriods[b].remaining;

        const canPayA = remainingA >= payment.amount;
        const canPayB = remainingB >= payment.amount;

        if (canPayA && !canPayB) return -1;
        if (!canPayA && canPayB) return 1;

        if (canPayA && canPayB) {
          return remainingB - remainingA;
        }

        return remainingB - remainingA;
      });

      let assigned = false;
      for (const paycheckIndex of eligiblePaychecks) {
        const selectedPeriod = paycheckPeriods[paycheckIndex];

        if (selectedPeriod.remaining >= payment.amount) {
          const daysDiff = differenceInDays(payment.dueDate, selectedPeriod.paycheckDate);

          let status: 'on-time' | 'late' | 'early' = 'on-time';
          if (daysDiff < 0) status = 'late';
          else if (daysDiff > 5) status = 'early';

          selectedPeriod.payments.push({
            id: payment.id,
            name: payment.name,
            amount: payment.amount,
            due_date: payment.dueDate,
            type: payment.type,
            status,
            isSplit: false,
          });

          selectedPeriod.remaining -= payment.amount;
          selectedPeriod.totalPayments += payment.amount;
          assigned = true;
          break;
        }
      }

      if (!assigned) {
        unassigned.push({
          id: payment.id,
          name: payment.name,
          amount: payment.amount,
          dueDate: payment.dueDate,
          type: payment.type,
        });
      }
    }
  });

  const focusDebt = getFocusDebt(debts, debtStrategy);

  if (focusDebt && householdExtraPayment > 0) {
    let dueDate = getNextDueDate(focusDebt.payment_day, today);

    while (isBefore(dueDate, endDate)) {
      // Calculate billing cycle for this extra payment (same as regular debt payments)
      const billingCycleStart = addMonths(dueDate, -1);

      // Find eligible paychecks within THIS billing cycle
      const eligiblePaychecks: number[] = [];

      for (let i = 0; i < paycheckPeriods.length; i++) {
        const paycheckDate = paycheckPeriods[i].paycheckDate;

        // Paycheck must be within the billing cycle
        if ((isAfter(paycheckDate, billingCycleStart) || paycheckDate.getTime() === billingCycleStart.getTime()) &&
            (isBefore(paycheckDate, dueDate) || paycheckDate.getTime() === dueDate.getTime())) {
          eligiblePaychecks.push(i);
        }
      }

      if (eligiblePaychecks.length === 0) {
        // No eligible paychecks for this cycle, move to next
        dueDate = addMonths(dueDate, 1);
        continue;
      }

      // Sort by most remaining funds first
      eligiblePaychecks.sort((a, b) => {
        const remainingA = paycheckPeriods[a].remaining;
        const remainingB = paycheckPeriods[b].remaining;
        return remainingB - remainingA;
      });

      // Try to assign to a single paycheck first (avoid splitting)
      let assigned = false;
      for (const paycheckIndex of eligiblePaychecks) {
        const selectedPeriod = paycheckPeriods[paycheckIndex];

        if (selectedPeriod.remaining >= householdExtraPayment) {
          const daysDiff = differenceInDays(dueDate, selectedPeriod.paycheckDate);

          let status: 'on-time' | 'late' | 'early' = 'on-time';
          if (daysDiff < 0) status = 'late';
          else if (daysDiff > 5) status = 'early';

          selectedPeriod.payments.push({
            id: focusDebt.id,
            name: focusDebt.name,
            amount: householdExtraPayment,
            due_date: dueDate,
            type: 'extra-debt',
            status,
            isFocusDebt: true,
            isSplit: false,
          });

          selectedPeriod.remaining -= householdExtraPayment;
          selectedPeriod.totalPayments += householdExtraPayment;
          assigned = true;
          break;
        }
      }

      // If couldn't fit in one paycheck, split across eligible paychecks
      if (!assigned) {
        let remainingExtra = householdExtraPayment;
        let splitCounter = 1;
        const paychecksThatCanHelp = eligiblePaychecks.filter(idx => paycheckPeriods[idx].remaining > 0);

        for (const paycheckIndex of paychecksThatCanHelp) {
          if (remainingExtra <= 0.01) break;

          const selectedPeriod = paycheckPeriods[paycheckIndex];
          const extraAmount = Math.min(remainingExtra, selectedPeriod.remaining);

          if (extraAmount <= 0) continue;

          const daysDiff = differenceInDays(dueDate, selectedPeriod.paycheckDate);

          let status: 'on-time' | 'late' | 'early' = 'on-time';
          if (daysDiff < 0) status = 'late';
          else if (daysDiff > 5) status = 'early';

          selectedPeriod.payments.push({
            id: focusDebt.id,
            name: focusDebt.name,
            amount: extraAmount,
            due_date: dueDate,
            type: 'extra-debt',
            status,
            isFocusDebt: true,
            isSplit: true,
            splitPart: `${splitCounter}/${paychecksThatCanHelp.length}`,
          });

          selectedPeriod.remaining -= extraAmount;
          selectedPeriod.totalPayments += extraAmount;
          remainingExtra -= extraAmount;
          splitCounter++;
        }
      }

      dueDate = addMonths(dueDate, 1);
    }
  }

  paycheckPeriods.forEach(period => {
    period.payments.sort((a, b) => a.due_date.getTime() - b.due_date.getTime());
  });

  // Filter out past due payments from unassigned list
  const filteredUnassigned = unassigned.filter(payment => {
    return !isBefore(payment.dueDate, today);
  });

  return { schedule: paycheckPeriods, unassigned: filteredUnassigned };
}

function getFocusDebt(debts: Debt[], strategy: string): Debt | null {
  if (debts.length === 0) return null;

  const activeDebts = debts.filter(d => d.current_balance > 0);
  if (activeDebts.length === 0) return null;

  if (strategy === 'avalanche') {
    return activeDebts.reduce((highest, debt) =>
      debt.interest_rate > highest.interest_rate ? debt : highest
    );
  } else if (strategy === 'snowball') {
    return activeDebts.reduce((lowest, debt) =>
      debt.current_balance < lowest.current_balance ? debt : lowest
    );
  }

  return null;
}
