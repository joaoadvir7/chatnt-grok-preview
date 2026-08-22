import type { SessionScope } from "@/lib/types";

function formatBr(iso?: string | null) {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const date = d.toLocaleDateString("pt-BR");
  const time = d.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  return `${date} às ${time}`;
}

export type SystemRecord = {
  connectionId: string | null;
  createdAt: string | null;
  id: string;
  name: string;
  parentId: string | null;
  status: string;
  type: string;
  updatedAt: string | null;
  userId: string | null;
};

export function buildSystemRecord(
  entity: {
    id: string;
    name?: string;
    parentId?: string | null;
    folderId?: string;
    createdAt?: string;
    updatedAt?: string;
    status?: string;
    active?: boolean;
  },
  opts: {
    type: string;
    connectionId?: string | null;
    userId?: string | null;
  },
): SystemRecord {
  const status =
    entity.status ??
    (entity.active === false ? "disabled" : "enabled");
  return {
    connectionId: opts.connectionId ?? null,
    createdAt: formatBr(entity.createdAt ?? entity.updatedAt),
    id: entity.id,
    name: entity.name ?? entity.id,
    parentId: entity.parentId ?? entity.folderId ?? null,
    status,
    type: opts.type,
    updatedAt: formatBr(entity.updatedAt ?? entity.createdAt),
    userId: opts.userId ?? null,
  };
}

export function recordContext(
  sessionScope: SessionScope,
  activeAgentId: string,
  connections: { id: string; campoCode?: string }[],
) {
  const sede = sessionScope.campoCode;
  const cx =
    connections.find((c) => c.campoCode === sede)?.id ??
    connections[0]?.id ??
    null;
  return {
    connectionId: cx,
    userId: activeAgentId || null,
  };
}
