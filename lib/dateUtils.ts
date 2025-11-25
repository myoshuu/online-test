export const formatDate = (date: Date | string): string => {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

export const formatDateTime = (date: Date | string): string => {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export const normalizeTestEndDate = (
  start?: Date | string | null,
  end?: Date | string | null
): Date | null => {
  if (!end) {
    return null;
  }

  const endDate = new Date(end);
  if (Number.isNaN(endDate.getTime())) {
    return null;
  }

  if (!start) {
    return endDate;
  }

  const startDate = new Date(start);
  if (Number.isNaN(startDate.getTime())) {
    return endDate;
  }

  if (endDate.getTime() > startDate.getTime()) {
    return endDate;
  }

  const sameCalendarDay =
    startDate.toDateString() === endDate.toDateString();
  if (sameCalendarDay) {
    const adjusted = new Date(endDate.getTime());
    adjusted.setDate(adjusted.getDate() + 1);
    return adjusted;
  }

  return endDate;
};

