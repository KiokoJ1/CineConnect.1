/** Job / talent category filters used across the home feed and browse screens. */
export const JOB_CATEGORIES = ['All', 'Camera', 'Sound', 'Edit', 'Lighting', 'Acting'] as const;

export const TALENT_CATEGORIES = ['All', 'Camera', 'Sound', 'Editing'] as const;

/** Departments available when posting a job. */
export const DEPARTMENTS = [
  'Camera',
  'Sound',
  'Editing',
  'Lighting',
  'Acting',
  'Production',
  'Makeup',
  'Art Department',
] as const;

export type JobCategory = (typeof JOB_CATEGORIES)[number];
export type TalentCategory = (typeof TALENT_CATEGORIES)[number];

/** Experience level options for the editable profile (backend profiles.experience_level, free-text). */
export const EXPERIENCE_LEVELS = ['Entry-level', 'Mid-level', 'Senior', 'Expert'] as const;
