import { z } from "zod";

export const assetSchema = z.object({
  id: z.string(),
  symbol: z.string(),
  name: z.string(),
  assetClass: z.enum(["b3Equity", "b3Fund", "crypto", "macro"]),
  exchange: z.string(),
  currency: z.string(),
  countryCode: z.string().nullable(),
});

export const marketSignalSchema = z.object({
  id: z.string(),
  asset: assetSchema,
  signalScore: z.number().min(-1).max(1),
  confidence: z.number().min(0).max(1),
  sourceCount: z.number().int().nonnegative(),
  independentSourceCount: z.number().int().nonnegative(),
  evidenceCount: z.number().int().nonnegative(),
  hypePenalty: z.number().min(0).max(1),
  windowStartedAt: z.string(),
  windowEndedAt: z.string(),
  methodologyVersion: z.string(),
  modelVersion: z.string(),
  questionVersion: z.string(),
});

export const signalEvidenceSchema = z.array(z.object({
  classificationId: z.string(),
  sourceName: z.string(),
  title: z.string().nullable(),
  excerpt: z.string(),
  canonicalUrl: z.string().url().nullable(),
  publishedAt: z.string(),
  sentiment: z.enum(["optimistic", "pessimistic", "neutral", "uncertain"]),
  sentimentProbability: z.number().min(0).max(1),
  relevanceExpected: z.number().min(0).max(3),
  contentType: z.enum(["news", "opinion", "technical_analysis", "meme", "spam", "uncertain"]),
  hypeProbability: z.number().min(0).max(1),
  factualClaimProbability: z.number().min(0).max(1),
  confidence: z.number().min(0).max(1),
  contributionWeight: z.number(),
  relevanceWeight: z.number().min(0).max(1),
  contentTypeWeight: z.number().min(0).max(1),
  factualWeight: z.number().min(0).max(1),
  sourceCredibility: z.number().min(0).max(1),
  diversityFactor: z.number().min(0).max(1),
  recencyFactor: z.number().min(0).max(1),
  hypeFactor: z.number().min(0).max(1),
  confidenceFactor: z.number().min(0).max(1),
  modelVersion: z.string(),
  questionVersion: z.string(),
}));

const optionalRate = z.number().nullable();

export const backtestReportSchema = z.object({
  runId: z.string(),
  asset: assetSchema,
  methodologyVersion: z.string(),
  signalMethodologyVersion: z.string(),
  modelVersion: z.string(),
  questionVersion: z.string(),
  signalThreshold: z.number().min(0).max(1),
  confidenceThreshold: z.number().min(0).max(1),
  calibrationStartedAt: z.string(),
  calibrationEndedAt: z.string(),
  evaluationStartedAt: z.string(),
  evaluationEndedAt: z.string(),
  createdAt: z.string(),
  completedAt: z.string().nullable(),
  status: z.enum(["completed", "failed", "pending", "running"]),
  results: z.array(z.object({
    horizonDays: z.number().int().positive(),
    sampleSize: z.number().int().nonnegative(),
    meanReturn: optionalRate,
    medianReturn: optionalRate,
    positiveRate: optionalRate,
    baselinePositiveRate: optionalRate,
    confidenceIntervalLow: optionalRate,
    confidenceIntervalHigh: optionalRate,
  })),
});
