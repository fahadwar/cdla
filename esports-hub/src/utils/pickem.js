const parseDateValue = (value) => {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value === 'string') {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  if (typeof value === 'object' && value?.seconds) {
    return new Date(value.seconds * 1000);
  }
  return null;
};

const statusMap = {
  inactive: { key: 'inactive', label: 'متوقفة', pill: 'pill--warning' },
  upcoming: { key: 'upcoming', label: 'ستبدأ قريبًا', pill: 'pill--info' },
  active: { key: 'active', label: 'مفتوحة الآن', pill: 'pill--success' },
  completed: { key: 'completed', label: 'اكتملت', pill: 'pill--success' },
  unscheduled: { key: 'unscheduled', label: 'غير مجدولة', pill: 'pill--warning' },
};

export const getRoundStatus = (round) => {
  if (!round) return statusMap.unscheduled;
  if (round.active === false) return statusMap.inactive;

  const start = parseDateValue(round.startDate);
  const end = parseDateValue(round.endDate);

  if (!start || !end) {
    return statusMap.unscheduled;
  }

  const now = Date.now();
  if (now < start.getTime()) return statusMap.upcoming;
  if (now > end.getTime()) return statusMap.completed;
  return statusMap.active;
};

export const describeRoundWindow = (round, formatter) => {
  if (!round) return '—';
  const startLabel = formatter ? formatter(round.startDate) : '';
  const endLabel = formatter ? formatter(round.endDate) : '';
  if (!startLabel && !endLabel) return '—';
  if (!startLabel || !endLabel) return startLabel || endLabel;
  return `${startLabel} — ${endLabel}`;
};

export const isRoundOpenForPicks = (round) => {
  if (!round || round.active === false) return false;
  const start = parseDateValue(round.startDate);
  const end = parseDateValue(round.endDate);
  if (!start || !end) return false;
  const now = Date.now();
  return now >= start.getTime() && now <= end.getTime();
};

const finalStatuses = new Set(['final', 'completed']);

export const determineMatchWinner = (match) => {
  if (!match || !finalStatuses.has(match.status)) return null;
  const teamAScore = typeof match.teamAScore === 'number' ? match.teamAScore : 0;
  const teamBScore = typeof match.teamBScore === 'number' ? match.teamBScore : 0;
  if (teamAScore === teamBScore) return null;
  return teamAScore > teamBScore ? match.teamAId : match.teamBId;
};

export const calculatePickScore = (matches = [], pick) => {
  if (!pick || !Array.isArray(pick.selections) || pick.selections.length === 0) {
    return { score: 0, totalEvaluated: 0, totalCorrect: 0 };
  }

  const winners = new Map();
  matches.forEach((match) => {
    const winner = determineMatchWinner(match);
    if (winner) {
      winners.set(match.id, winner);
    }
  });

  if (winners.size === 0) {
    return { score: pick.score ?? 0, totalEvaluated: 0, totalCorrect: 0 };
  }

  let totalEvaluated = 0;
  let totalCorrect = 0;

  pick.selections.forEach((selection) => {
    const winner = winners.get(selection.matchId);
    if (!winner) return;
    totalEvaluated += 1;
    if (selection.predictedWinnerTeamId === winner) {
      totalCorrect += 1;
    }
  });

  return { score: totalCorrect, totalEvaluated, totalCorrect };
};
