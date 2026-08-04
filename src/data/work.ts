/* Group order and labels for the work index. */
export const workGroups = [
  { id: 'rag-llm', label: 'RAG and LLM systems' },
  { id: 'research', label: 'Published research' },
  { id: 'coursework', label: 'Applied ML coursework' },
  { id: 'systems', label: 'Robotics, systems, design' },
  { id: 'bsc', label: 'BSc era · FAST-NUCES' },
] as const;

export type WorkGroupId = (typeof workGroups)[number]['id'];
