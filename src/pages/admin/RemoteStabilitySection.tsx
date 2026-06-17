import type { NetworkDiagnostics } from "../../services/lifeosApi";
import RemoteAcceptanceChecklistCard from "./RemoteAcceptanceChecklistCard";
import RemoteHealthSummaryCard from "./RemoteHealthSummaryCard";

export default function RemoteStabilitySection({ diagnostics }: { diagnostics: NetworkDiagnostics }) {
  return (
    <>
      <RemoteHealthSummaryCard summary={diagnostics.remoteHealthSummary} />
      <RemoteAcceptanceChecklistCard checklist={diagnostics.remoteAcceptanceChecklist || []} />
    </>
  );
}
