import type { Contact } from "./types";

export function contactVarBag(
  contact: Contact,
  opts?: {
    agentName?: string;
    fields?: { id: string; name: string }[];
  },
): Record<string, string> {
  const first = contact.name.split(/\s+/)[0] ?? contact.name;
  const cf = contact.customFields ?? {};
  const bag: Record<string, string> = {
    id: contact.id,
    ID: contact.id,
    name: contact.name,
    Nome: contact.name,
    nome: contact.name,
    firstName: first,
    firstname: first,
    "primeiro nome": first,
    email: contact.email || cf.cf9 || "",
    Email: contact.email || cf.cf9 || "",
    phone: contact.phone,
    telefone: contact.phone,
    agente: opts?.agentName ?? "",
    atendente: opts?.agentName ?? "",
    ...cf,
  };
  for (const [k, v] of Object.entries(cf)) {
    bag[k.toLowerCase()] = v;
  }
  for (const f of opts?.fields ?? []) {
    const val = cf[f.id] ?? "";
    bag[f.id] = val;
    bag[f.name] = val;
    bag[f.name.toLowerCase()] = val;
  }
  return bag;
}

export function interpolateText(
  text: string,
  contact: Contact,
  opts?: { agentName?: string; fields?: { id: string; name: string }[] },
): string {
  if (!text) return text;
  const bag = contactVarBag(contact, opts);
  return text.replace(/\{\{?\s*([^{}]+?)\s*\}?\}/g, (full, key: string) => {
    const k = String(key).trim();
    if (!k) return full;
    const hit = bag[k] ?? bag[k.toLowerCase()];
    return hit !== undefined ? hit : full;
  });
}
