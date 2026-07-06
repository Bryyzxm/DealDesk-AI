import type { DealRequestInput } from "../server/domain/workflow-run";

export const MESSY_DEAL_REQUEST_FIXTURE = {
  sender: "maya.chen@example.test",
  accountName: "Northstar Demo Systems",
  requestText:
    "Can you get us a quote for 75 Enterprise seats before Friday? Finance is asking for net 60 again, legal wants the old renewal cap language, and the VP keeps saying the rollout has to start next month even though procurement has not finished the vendor form.",
  requestedProducts: "DealDesk AI Enterprise, 75 seats, premium support",
  requestedTerms: "Net 60, renewal uplift capped at 4%, start next month",
  attachmentText:
    "Forwarded customer note: please keep the legacy renewal cap wording and call out any rush onboarding costs separately.",
  fixtureSource: "seed:messy-enterprise-renewal",
} satisfies DealRequestInput;
