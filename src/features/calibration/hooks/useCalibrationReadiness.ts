import { useQuery } from "@tanstack/react-query";
import { useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";

import { getCalibrationReadiness } from "@/services/calibrationService";
import type { CalibrationMinimumSample, CalibrationReadinessAsset, CalibrationReadinessView } from "@/types/calibration";

const allowedSamples = new Set<CalibrationMinimumSample>([5, 10, 30]);

function evaluateReadiness(item: CalibrationReadinessAsset, targetDays: number, minimumSample: number): CalibrationReadinessView {
  const blockers: CalibrationReadinessView["blockers"] = [];
  if (item.observedDays < targetDays) blockers.push("observationDays");
  if (item.signalCount === 0) blockers.push("signals");
  if (item.priceObservationCount === 0) blockers.push("prices");
  if (!item.latestCompletedBacktestAt) blockers.push("backtest");
  if (Math.min(item.sampleSize1d, item.sampleSize7d, item.sampleSize30d) < minimumSample) blockers.push("samples");
  return {
    ...item,
    blockers,
    ready: blockers.length === 0,
    readinessPercent: Math.round(((5 - blockers.length) / 5) * 100),
  };
}

export function useCalibrationReadiness() {
  const [params, setParams] = useSearchParams();
  const candidate = Number(params.get("sample")) as CalibrationMinimumSample;
  const minimumSample = allowedSamples.has(candidate) ? candidate : 10;
  const readinessQuery = useQuery({ queryKey: ["calibration-readiness"], queryFn: getCalibrationReadiness });
  const items = useMemo(() => readinessQuery.data?.items.map((item) => (
    evaluateReadiness(item, readinessQuery.data?.targetObservationDays ?? 30, minimumSample)
  )) ?? [], [minimumSample, readinessQuery.data]);
  const updateMinimumSample = useCallback((value: CalibrationMinimumSample) => {
    const next = new URLSearchParams(params);
    if (value === 10) next.delete("sample");
    else next.set("sample", String(value));
    setParams(next, { replace: true });
  }, [params, setParams]);
  return { readinessQuery, items, minimumSample, updateMinimumSample };
}
