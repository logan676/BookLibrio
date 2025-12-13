/**
 * Background Jobs Module
 *
 * Exports job scheduler and individual jobs for manual triggering.
 */

export { initializeJobs, stopJobs, triggerJob, getJobStatus } from './scheduler'
export { refreshPopularHighlights } from './refreshPopularHighlights'
export { aggregateBookStats } from './aggregateBookStats'
export { enrichBookMetadata } from './enrichBookMetadata'
export { computeRelatedBooks } from './computeRelatedBooks'
export { cleanupExpiredAiCache } from './cleanupExpiredAiCache'
// New jobs
export { enrichGoodreadsRatings, refreshGoodreadsRating } from './enrichGoodreadsRatings'
export { generateAISummaries, generateSummariesForBook, regenerateSummary, getSummaryStats } from './generateAISummaries'
export { computeBookRankings, getRanking, getAllRankings, needsRefresh, clearRankingsCache } from './computeBookRankings'
export type { RankingType, RankedBook, RankingResult } from './computeBookRankings'
