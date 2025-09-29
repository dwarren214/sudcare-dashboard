import type { HourCountEntry, TrueFalseCountEntry } from "../../types/dashboard";

export const weeklyMessages = [
  { week: 1, messages: 45 },
  { week: 2, messages: 52 },
  { week: 3, messages: 61 },
  { week: 4, messages: 70 },
  { week: 5, messages: 58 },
  { week: 6, messages: 62 },
];

export const assistantResponses: TrueFalseCountEntry[] = [
  { able: "TRUE", count: 118 },
  { able: "FALSE", count: 12 },
];

export const messageTimes: HourCountEntry[] = [
  { hour: 8, count: 12 },
  { hour: 12, count: 25 },
  { hour: 17, count: 19 },
  { hour: 21, count: 14 },
];

export const participants = [
  { participant: "p101", count: 32 },
  { participant: "p137", count: 28 },
  { participant: "p266", count: 45 },
  { participant: "p322", count: 21 },
];

export const categories = [
  { name: "Support", count: 120 },
  { name: "Logistics", count: 72 },
  { name: "Medication", count: 58 },
  { name: "Check-in", count: 45 },
  { name: "Resources", count: 34 },
  { name: "Escalation", count: 12 },
];

export const subcategories = [
  { name: "Daily check-in", count: 42 },
  { name: "Appointment follow-up", count: 36 },
  { name: "Group reminder", count: 28 },
  { name: "Medication question", count: 26 },
  { name: "Resource share", count: 24 },
  { name: "Transportation", count: 16 },
  { name: "Escalation", count: 12 },
  { name: "Tech support", count: 10 },
  { name: "Insurance", count: 8 },
];
