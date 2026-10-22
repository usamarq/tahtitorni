/* Group order and labels for the work index; `short` labels the filter chips. */
export const workGroups = [
  { id: 'rag-llm', label: 'RAG and LLM systems', short: 'LLM systems' },
  { id: 'research', label: 'Published research', short: 'Research' },
  { id: 'coursework', label: 'Applied ML coursework', short: 'Applied ML' },
  { id: 'systems', label: 'Robotics, systems, design', short: 'Systems and design' },
  { id: 'bsc', label: 'BSc era · FAST-NUCES', short: 'BSc era' },
] as const;

export type WorkGroupId = (typeof workGroups)[number]['id'];
