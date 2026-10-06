let draft: { name: string; phone: string } | null = null;

export function setLoginDraft(name: string, phone: string) {
  draft = { name, phone };
}

export function getLoginDraftName(verifiedPhone: string | null) {
  return draft?.phone === verifiedPhone ? draft?.name : undefined;
}

export function clearLoginDraft() {
  draft = null;
}
