import { useMemo } from "react";
import { useCrmStore } from "./store";
import {
  filterConnectionsByScope,
  filterContactsByScope,
  getSede,
  reportRowsForScope,
  scopeLabel,
} from "./scope";

/**
 * Dados filtrados pelo escopo multi-sede da sessão.
 * Sede regional: só contatos/conversas/CRM/WhatsApp do próprio campo.
 */
export function useScopedData() {
  const sessionScope = useCrmStore((s) => s.sessionScope);
  const allContacts = useCrmStore((s) => s.contacts);
  const allConversations = useCrmStore((s) => s.conversations);
  const allMessages = useCrmStore((s) => s.messages);
  const allDeals = useCrmStore((s) => s.deals);
  const allConnections = useCrmStore((s) => s.connections);
  const allAgents = useCrmStore((s) => s.agents);
  const allBroadcasts = useCrmStore((s) => s.broadcasts);
  const sedes = useCrmStore((s) => s.sedes ?? []);
  const operationMode = useCrmStore((s) => s.operationMode);

  return useMemo(() => {
    // Demo desativado de vez: nunca exibir contatos isDemo
    const contacts = filterContactsByScope(allContacts, sessionScope).filter(
      (c) => !c.isDemo,
    );
    const contactIds = new Set(contacts.map((c) => c.id));
    const conversations = allConversations.filter((cv) =>
      contactIds.has(cv.contactId),
    );
    const convIds = new Set(conversations.map((c) => c.id));
    const messages = allMessages.filter((m) =>
      convIds.has(m.conversationId),
    );
    const deals = allDeals.filter((d) => contactIds.has(d.contactId));
    const connections = filterConnectionsByScope(
      allConnections,
      sessionScope,
    );
    const agents =
      sessionScope.mode === "central"
        ? allAgents
        : allAgents.filter(
            (a) =>
              a.role === "regional" &&
              a.campoCode === sessionScope.campoCode,
          );
    const sede = getSede(sessionScope.campoCode, sedes);
    const reportRows = reportRowsForScope(sessionScope);
    const isRegional = sessionScope.mode === "regional";
    const label = scopeLabel(sessionScope, sedes);

    // Broadcasts: central vê todos; regional só os do próprio campo (audience field)
    const broadcasts =
      sessionScope.mode === "central"
        ? allBroadcasts
        : allBroadcasts.filter(
            (b) =>
              b.audience.fieldId === "cf5" &&
              b.audience.fieldValue?.toUpperCase() ===
                sessionScope.campoCode?.toUpperCase(),
          );

    return {
      sessionScope,
      operationMode,
      isRegional,
      isCentral: !isRegional,
      label,
      sede,
      sedes,
      contacts,
      conversations,
      messages,
      deals,
      connections,
      agents,
      broadcasts,
      reportRows,
      totalContactsGlobal: allContacts.length,
      hiddenContacts: allContacts.length - contacts.length,
    };
  }, [
    sessionScope,
    allContacts,
    allConversations,
    allMessages,
    allDeals,
    allConnections,
    allAgents,
    allBroadcasts,
    sedes,
    operationMode,
  ]);
}
