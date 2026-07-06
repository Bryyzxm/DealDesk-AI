import type { DealFactExtraction, DealRequestInput } from "../server/domain/workflow-run";

const REQUEST_CITATION_ID = "cite_seed_request_text";
const PRODUCTS_CITATION_ID = "cite_seed_requested_products";
const TERMS_CITATION_ID = "cite_seed_requested_terms";
const ATTACHMENT_CITATION_ID = "cite_seed_attachment_text";

export function createDemoDealFactExtraction(input: DealRequestInput): DealFactExtraction {
  return {
    buyerIntent: {
      label: "Buyer intent",
      value: "Quote request for DealDesk AI Enterprise seats",
      confidence: "high",
      citationIds: [REQUEST_CITATION_ID, PRODUCTS_CITATION_ID],
    },
    urgency: {
      label: "Urgency",
      value: "Customer wants a quote before Friday",
      confidence: "high",
      citationIds: [REQUEST_CITATION_ID],
    },
    productNeeds: [
      {
        label: "Seats and package",
        value: "75 Enterprise seats with premium support",
        confidence: "high",
        citationIds: [PRODUCTS_CITATION_ID],
      },
    ],
    budgetOrDiscountHints: [
      {
        label: "Payment terms",
        value: "Net 60 requested",
        confidence: "high",
        citationIds: [REQUEST_CITATION_ID, TERMS_CITATION_ID],
      },
      {
        label: "Renewal cap",
        value: "Renewal uplift capped at 4% with legacy cap language",
        confidence: "medium",
        citationIds: [TERMS_CITATION_ID, ATTACHMENT_CITATION_ID],
      },
    ],
    requestedDate: {
      label: "Requested date",
      value: "Quote before Friday; rollout start next month",
      confidence: "medium",
      citationIds: [REQUEST_CITATION_ID, TERMS_CITATION_ID],
    },
    missingFacts: [
      {
        field: "procurement_status",
        reason: "Procurement has not finished the vendor form.",
        blocksQuoteContinuation: true,
      },
      {
        field: "billing_contact",
        reason: "Billing or procurement contact is not named in the request.",
        blocksQuoteContinuation: true,
      },
    ],
    evidenceCitations: [
      {
        id: REQUEST_CITATION_ID,
        label: "Original request",
        source: "request_text",
        snippet: input.requestText,
      },
      {
        id: PRODUCTS_CITATION_ID,
        label: "Requested products",
        source: "form_field",
        snippet: input.requestedProducts,
      },
      {
        id: TERMS_CITATION_ID,
        label: "Requested terms",
        source: "form_field",
        snippet: input.requestedTerms,
      },
      {
        id: ATTACHMENT_CITATION_ID,
        label: "Attachment note",
        source: "attachment_text",
        snippet: input.attachmentText ?? "No attachment text provided.",
      },
    ],
  };
}
