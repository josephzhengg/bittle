export interface ProcessedSubmission {
  id: string;
  submittedAt: string;
  responses: Record<string, string>;
}