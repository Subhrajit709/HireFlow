// Recruitment pipeline definition: stages, allowed transitions and "next action" guidance.
// Shared by server (validation) and client (UI).

export type StageKey =
  | "applied"
  | "under_review"
  | "shortlisted"
  | "assessment"
  | "interview"
  | "offer"
  | "hired"
  | "on_hold"
  | "rejected"
  | "withdrawn";

export interface Stage {
  key: StageKey;
  label: string;
  color: string;
  /** What the candidate sees. */
  candidateLabel: string;
  candidateText: string;
  /** What the recruiter should do next. */
  recruiterNext: string;
}

export const STAGES: Record<StageKey, Stage> = {
  applied: {
    key: "applied",
    label: "Applied",
    color: "white",
    candidateLabel: "Application submitted",
    candidateText: "We've received your application. You can still edit your screening answers until review starts.",
    recruiterNext: "Open the profile, check the fit summary and red flags, then start the review or reject.",
  },
  under_review: {
    key: "under_review",
    label: "Under Review",
    color: "blue",
    candidateLabel: "Under review",
    candidateText: "A recruiter is reviewing your profile, documents and screening answers.",
    recruiterNext: "Fill in the scorecard. Shortlist if the scores and screening answers hold up, reject if not. You can also request missing information.",
  },
  shortlisted: {
    key: "shortlisted",
    label: "Shortlisted",
    color: "purple",
    candidateLabel: "Shortlisted",
    candidateText: "Good news, you've been shortlisted! Watch for your technical assessment or interview details.",
    recruiterNext: "Send a technical assessment. For strong senior profiles you can go straight to interview.",
  },
  assessment: {
    key: "assessment",
    label: "Technical Assessment",
    color: "orange",
    candidateLabel: "Technical assessment",
    candidateText: "Please complete the technical assessment shared with you before the deadline.",
    recruiterNext: "Record the assessment score. Move to interview if passed, reject if not.",
  },
  interview: {
    key: "interview",
    label: "Interview",
    color: "pink",
    candidateLabel: "Interview",
    candidateText: "You're in the interview stage. Check the schedule and joining details below.",
    recruiterNext: "Hold the interview and update the scorecard. Then make an offer or reject.",
  },
  offer: {
    key: "offer",
    label: "Offer",
    color: "yellow",
    candidateLabel: "Offer extended",
    candidateText: "Congratulations! An offer is being prepared for you. Our team will be in touch.",
    recruiterNext: "Confirm the offer is accepted, then mark the candidate as Hired.",
  },
  hired: {
    key: "hired",
    label: "Hired",
    color: "green",
    candidateLabel: "Selected 🎉",
    candidateText: "You've been selected. Welcome aboard!",
    recruiterNext: "Done. Onboarding happens outside the portal.",
  },
  on_hold: {
    key: "on_hold",
    label: "On Hold",
    color: "gray",
    candidateLabel: "On hold",
    candidateText: "Your application is on hold for now. We'll update you as soon as anything changes.",
    recruiterNext: "Parked for later. Resume the review when a slot opens, or reject.",
  },
  rejected: {
    key: "rejected",
    label: "Rejected",
    color: "red",
    candidateLabel: "Not selected",
    candidateText: "Thank you for your time. We won't be moving forward with this application.",
    recruiterNext: "Closed. You can reopen it if the decision changes.",
  },
  withdrawn: {
    key: "withdrawn",
    label: "Withdrawn",
    color: "gray",
    candidateLabel: "Withdrawn",
    candidateText: "You withdrew this application.",
    recruiterNext: "The candidate withdrew. No action needed.",
  },
};

/** The main "happy path" shown as a stepper. */
export const MAIN_TRACK: StageKey[] = ["applied", "under_review", "shortlisted", "assessment", "interview", "offer", "hired"];

/** Allowed recruiter transitions. */
export const TRANSITIONS: Record<StageKey, StageKey[]> = {
  applied: ["under_review", "rejected", "on_hold"],
  under_review: ["shortlisted", "rejected", "on_hold"],
  shortlisted: ["assessment", "interview", "rejected", "on_hold"],
  assessment: ["interview", "rejected", "on_hold"],
  interview: ["offer", "assessment", "rejected", "on_hold"],
  offer: ["hired", "rejected"],
  hired: [],
  on_hold: ["under_review", "shortlisted", "rejected"],
  rejected: ["under_review"],
  withdrawn: [],
};

export const ACTIVE_STAGES: StageKey[] = ["applied", "under_review", "shortlisted", "assessment", "interview", "offer"];
export const TERMINAL: StageKey[] = ["hired", "rejected", "withdrawn"];

export const canWithdraw = (s: StageKey) => !["hired", "rejected", "withdrawn"].includes(s);
/** Candidate may edit screening answers only before a recruiter starts reviewing. */
export const canEditAnswers = (s: StageKey) => s === "applied";

export const stage = (k: string): Stage => STAGES[k as StageKey] ?? STAGES.applied;

export function transitionLabel(to: StageKey, from?: StageKey): string {
  if (from === "rejected" && to === "under_review") return "Reopen";
  if (from === "on_hold") return `Resume → ${STAGES[to].label}`;
  switch (to) {
    case "under_review":
      return "Start review";
    case "shortlisted":
      return "Shortlist";
    case "assessment":
      return from === "interview" ? "Another assessment" : "Send technical test";
    case "interview":
      return from === "shortlisted" ? "Skip to interview" : "Move to interview";
    case "offer":
      return "Make offer";
    case "hired":
      return "Mark hired";
    case "on_hold":
      return "Put on hold";
    case "rejected":
      return "Reject";
    default:
      return STAGES[to].label;
  }
}
