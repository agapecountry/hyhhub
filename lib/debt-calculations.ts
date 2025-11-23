interface DebtPayoffProjection {
  month: number;
  date: Date;
  payment: number;
  principal: number;
  interest: number;
  balance: number;
}

interface Debt {
  id: string;
  name: string;
  current_balance: number;
  interest_rate: number;
  minimum_payment: number;
}

export function calculatePayoffSchedule(
  balance: number,
  interestRate: number,
  monthlyPayment: number,
  startDate: Date = new Date()
): DebtPayoffProjection[] {
  const schedule: DebtPayoffProjection[] = [];
  let remainingBalance = balance;
  let month = 0;
  const monthlyRate = interestRate / 100 / 12;

  if (monthlyPayment <= 0 || balance <= 0) {
    return schedule;
  }

  if (monthlyRate > 0 && monthlyPayment <= remainingBalance * monthlyRate) {
    return schedule;
  }

  while (remainingBalance > 0.01 && month < 600) {
    month++;
    const paymentDate = new Date(startDate);
    paymentDate.setMonth(paymentDate.getMonth() + month);

    const interestCharge = remainingBalance * monthlyRate;
    const principalPayment = Math.min(monthlyPayment - interestCharge, remainingBalance);
    const actualPayment = principalPayment + interestCharge;

    remainingBalance -= principalPayment;

    schedule.push({
      month,
      date: paymentDate,
      payment: actualPayment,
      principal: principalPayment,
      interest: interestCharge,
      balance: Math.max(0, remainingBalance),
    });
  }

  return schedule;
}

export function calculateAvalancheStrategy(
  debts: Debt[],
  extraMonthlyPayment: number = 0
): Map<string, DebtPayoffProjection[]> {
  const sortedDebts = [...debts].sort((a, b) => b.interest_rate - a.interest_rate);
  const schedules = new Map<string, DebtPayoffProjection[]>();

  const activeDebts = sortedDebts.map(d => ({
    ...d,
    remainingBalance: d.current_balance,
    isActive: true,
  }));

  let month = 0;
  const maxMonths = 600;

  while (activeDebts.some(d => d.isActive && d.remainingBalance > 0.01) && month < maxMonths) {
    month++;

    for (const debt of activeDebts) {
      if (!debt.isActive || debt.remainingBalance <= 0.01) continue;

      const monthlyRate = debt.interest_rate / 100 / 12;
      const interestCharge = debt.remainingBalance * monthlyRate;

      const isHighestInterest = debt.id === activeDebts.find(d => d.isActive && d.remainingBalance > 0.01)?.id;
      const payment = debt.minimum_payment + (isHighestInterest ? extraMonthlyPayment : 0);

      const principalPayment = Math.min(payment - interestCharge, debt.remainingBalance);
      const actualPayment = principalPayment + interestCharge;

      debt.remainingBalance -= principalPayment;

      if (!schedules.has(debt.id)) {
        schedules.set(debt.id, []);
      }

      schedules.get(debt.id)!.push({
        month,
        date: new Date(new Date().setMonth(new Date().getMonth() + month)),
        payment: actualPayment,
        principal: principalPayment,
        interest: interestCharge,
        balance: Math.max(0, debt.remainingBalance),
      });

      if (debt.remainingBalance <= 0.01) {
        debt.isActive = false;
      }
    }
  }

  return schedules;
}

export function calculateSnowballStrategy(
  debts: Debt[],
  extraMonthlyPayment: number = 0
): Map<string, DebtPayoffProjection[]> {
  const sortedDebts = [...debts].sort((a, b) => a.current_balance - b.current_balance);
  const schedules = new Map<string, DebtPayoffProjection[]>();

  const activeDebts = sortedDebts.map(d => ({
    ...d,
    remainingBalance: d.current_balance,
    isActive: true,
  }));

  let month = 0;
  const maxMonths = 600;

  while (activeDebts.some(d => d.isActive && d.remainingBalance > 0.01) && month < maxMonths) {
    month++;

    for (const debt of activeDebts) {
      if (!debt.isActive || debt.remainingBalance <= 0.01) continue;

      const monthlyRate = debt.interest_rate / 100 / 12;
      const interestCharge = debt.remainingBalance * monthlyRate;

      const isSmallestBalance = debt.id === activeDebts.find(d => d.isActive && d.remainingBalance > 0.01)?.id;
      const payment = debt.minimum_payment + (isSmallestBalance ? extraMonthlyPayment : 0);

      const principalPayment = Math.min(payment - interestCharge, debt.remainingBalance);
      const actualPayment = principalPayment + interestCharge;

      debt.remainingBalance -= principalPayment;

      if (!schedules.has(debt.id)) {
        schedules.set(debt.id, []);
      }

      schedules.get(debt.id)!.push({
        month,
        date: new Date(new Date().setMonth(new Date().getMonth() + month)),
        payment: actualPayment,
        principal: principalPayment,
        interest: interestCharge,
        balance: Math.max(0, debt.remainingBalance),
      });

      if (debt.remainingBalance <= 0.01) {
        debt.isActive = false;
      }
    }
  }

  return schedules;
}

export function calculateTotalInterest(schedule: DebtPayoffProjection[]): number {
  return schedule.reduce((sum, payment) => sum + payment.interest, 0);
}

export function calculatePayoffDate(schedule: DebtPayoffProjection[]): Date | null {
  if (schedule.length === 0) return null;
  return schedule[schedule.length - 1].date;
}
