import { useMemo } from "react";
import {
  buildConversionFunnel,
  evaluateBottlenecks,
  normalizeBottleneckSettings,
} from "./funnel";
import { useCrmStore } from "./store";
import { useScopedData } from "./useScopedData";

export function useBottleneckAlerts() {
  const { contacts, conversations, deals } = useScopedData();
  const stages = useCrmStore((s) => s.stages);
  const raw = useCrmStore((s) => s.bottleneckSettings);
  const settings = useMemo(
    () => normalizeBottleneckSettings(raw),
    [raw],
  );

  return useMemo(() => {
    const funnel = buildConversionFunnel(
      contacts,
      conversations,
      deals,
      stages,
    );
    return {
      settings,
      funnel,
      alerts: evaluateBottlenecks(funnel, settings),
    };
  }, [contacts, conversations, deals, stages, settings]);
}
