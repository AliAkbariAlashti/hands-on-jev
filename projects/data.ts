import type { Example } from "../src/examples";

export interface ProjectSpec {
  id: string;
  status: "concept";
  title: string;
  oneLiner: string;
  problem: string;
  approach: string;
  jevRole: { question: string; primitive: "choice" | "noul" | "score"; purpose: string }[];
  diagram: string;
  notes: string[];
  examples: Example[];
}

export const PROJECTS: ProjectSpec[] = [
  {
    id: "realtime-moderation",
    status: "concept",
    title: "Real-time moderation for social feeds",
    oneLiner: "Score every post against several policies in parallel, before it's visible to anyone else.",
    problem:
      "A social platform needs to catch toxicity, spam, scams, and policy violations at post time — not after " +
      "a human reviewer gets to it hours later. Keyword filters miss context and paraphrase; a full LLM call per " +
      "post is too slow and too expensive to sit in the write path of every post.",
    approach:
      "Every new post's text (plus lightweight context: author history flags, thread it's replying to) becomes " +
      "one state object. A fixed set of independent questions — one Noul per policy category, plus a Score for " +
      "severity — run against that same state in a single parallel batch, since none of them depend on each " +
      "other's answers. Code combines the results with per-category thresholds tuned on labeled data: high-" +
      "confidence violations auto-block, borderline scores route to a human queue, everything else publishes " +
      "immediately. The queue and the auto-actions both log the full question/answer set for appeal review.",
    jevRole: [
      { question: "Is this post spam or a scam attempt?", primitive: "noul", purpose: "auto-block above threshold" },
      { question: "Does this post contain harassment or hate speech?", primitive: "noul", purpose: "auto-block above threshold" },
      { question: "How severe is any policy violation here?", primitive: "score", purpose: "sets queue priority" },
      { question: "Which policy category does this violation fall under, if any?", primitive: "choice", purpose: "routes to the right reviewer team" },
    ],
    diagram: `
flowchart LR
  A["New post\\ntext + author flags"] --> B["state"]
  B --> C{{"parallel questions"}}
  C --> D["noul: spam/scam"]
  C --> E["noul: harassment"]
  C --> F["score: severity"]
  C --> G["choice: policy category"]
  D & E & F & G --> H["confidence-gated\\nrouting"]
  H -->|high confidence violation| I["auto-block"]
  H -->|borderline| J["human review queue"]
  H -->|clean| K["publish immediately"]
  I --> L[("audit log")]
  J --> L
  K --> L
`.trim(),
    notes: [
      "Independent questions over the same state run as one batch — no sequential round trips per policy.",
      "Thresholds are evaluated on labeled data per category, not assumed; auto-action bars are set separately from queue-routing bars.",
      "Raw judgments (not just the final action) are logged, so a threshold change can be replayed without re-inference.",
    ],
    examples: [
      {
        type: "noul",
        id: "mod-spam-scam",
        title: "Spam / scam gate",
        useCase: "real-time moderation",
        state: "CONGRATS!! you've been selected for a $500 gift card, click now before it expires: bit.ly/claim-2024",
        instructions: "Is this post spam or a scam attempt?",
        trueDesc: "Unsolicited prize claims, urgency pressure, suspicious shortened links",
        falseDesc: "Genuine post with no manipulation tactics",
      },
      {
        type: "score",
        id: "mod-severity",
        title: "Violation severity",
        useCase: "real-time moderation",
        state: "Nobody wants you here, just disappear already.",
        instructions: "How severe is any policy violation in this post?",
        levels: [
          "No violation",
          "Mild — rude or dismissive, not targeted harassment",
          "Moderate — targeted insult or harassment",
          "Severe — threat, targeted hate speech, or incitement",
        ],
      },
      {
        type: "choice",
        id: "mod-category",
        title: "Policy category router",
        useCase: "real-time moderation",
        state: "check out my crypto trading signals, guaranteed 40% weekly returns, dm me to get started",
        instructions: "Which policy category does this post fall under, if any?",
        options: [
          { label: "financial_scam", description: "Unrealistic investment returns, unlicensed financial advice" },
          { label: "harassment", description: "Targeted insults, threats, or hate speech" },
          { label: "spam", description: "Repetitive unsolicited promotional content" },
          { label: "none", description: "No policy violation" },
        ],
      },
    ],
  },
  {
    id: "cctv-vision-agent",
    status: "concept",
    title: "CCTV vision agent for decision-making",
    oneLiner: "A vision model describes the scene in text; Jev decides what the description means.",
    problem:
      "Camera feeds generate constant motion and noise — most of it irrelevant. A useful alerting system needs " +
      "to tell \"a delivery courier at the door\" apart from \"a person loitering near the entrance after hours,\" " +
      "and decide an alert tier, without a human staring at every feed. Jev has no vision input, so the decision " +
      "layer needs a scene description in text to work from, not raw frames.",
    approach:
      "A vision pipeline (object detection + tracking, or a captioning model) runs on the video stream and " +
      "emits short structured text on relevant events: who/what was detected, zone, time of day, dwell time, " +
      "trajectory. That description — plus static context like zone policy and time-of-day rules — becomes " +
      "Jev's state. Jev answers a small set of questions about the event: does this match a concerning pattern, " +
      "how urgent is it, which response applies. Code owns the camera loop, the vision model, and what happens " +
      "after the decision (notify, log, dispatch); Jev only judges the described event.",
    jevRole: [
      { question: "Does this event match a defined security concern for this zone?", primitive: "noul", purpose: "gates whether anything fires at all" },
      { question: "How urgent is this event?", primitive: "score", purpose: "sets response tier" },
      { question: "What type of event is this?", primitive: "choice", purpose: "routes to the matching playbook" },
    ],
    diagram: `
flowchart LR
  A["camera stream"] --> B["vision pipeline\\n(detection + tracking)"]
  B --> C["event description\\n(text)"]
  D["zone policy\\n+ time-of-day rules"] --> E["state"]
  C --> E
  E --> F{{"questions"}}
  F --> G["noul: matches concern"]
  F --> H["score: urgency"]
  F --> I["choice: event type"]
  G & H & I --> J["decision"]
  J -->|no match| K["discard, log only"]
  J -->|match| L["alert at tier\\n+ playbook"]
  L --> M[("event log")]
  K --> M
`.trim(),
    notes: [
      "Jev is text-only: it never sees pixels. The vision model's description quality is the ceiling on decision quality.",
      "Static context (zone policy, allowed hours) lives in state alongside the event, so the same event can mean different things in different zones.",
      "A Noul gate before the Score/Choice questions avoids spending a full question batch on empty frames.",
    ],
    examples: [
      {
        type: "noul",
        id: "cctv-matches-concern",
        title: "Security-concern gate",
        useCase: "CCTV vision agent",
        state: "Detected: one person, loading dock zone, 02:14, stationary for 6 minutes near the rear door, no badge scan logged.",
        instructions: "Does this event match a defined security concern for this zone, given it's outside normal operating hours (07:00-19:00)?",
        trueDesc: "Presence or behavior that violates the zone's after-hours policy",
        falseDesc: "Expected activity for this zone and time, or no policy violation",
      },
      {
        type: "score",
        id: "cctv-urgency",
        title: "Event urgency",
        useCase: "CCTV vision agent",
        state: "Detected: two people, loading dock zone, 02:14, one person appears to be attempting to force the rear door latch.",
        instructions: "How urgent is this event?",
        levels: [
          "Not urgent — log only, no response needed",
          "Low — worth a note in the next shift review",
          "Elevated — notify on-site security within the hour",
          "Critical — dispatch immediately",
        ],
      },
      {
        type: "choice",
        id: "cctv-event-type",
        title: "Event type router",
        useCase: "CCTV vision agent",
        state: "Detected: one person, front lobby zone, 13:40, wearing a delivery-branded vest, dropped a package and left within 90 seconds.",
        instructions: "What type of event is this?",
        options: [
          { label: "routine_delivery", description: "Brief presence consistent with a delivery drop-off" },
          { label: "loitering", description: "Extended presence with no clear purpose" },
          { label: "forced_entry_attempt", description: "Attempting to bypass a locked point of entry" },
          { label: "unattended_object", description: "An object left behind with no person nearby" },
        ],
      },
    ],
  },
  {
    id: "bnpl-risk",
    status: "concept",
    title: "BNPL risk management",
    oneLiner: "Turn scattered signals about a buyer and an order into one real-time approve/hold/decline decision.",
    problem:
      "A buy-now-pay-later checkout has milliseconds to decide whether to approve a plan, and the signals that " +
      "matter — order shape, account age, repayment history, device/behavioral flags — sit in different systems " +
      "and don't reduce to a single hand-written rule. Pure rules engines get brittle fast; a full underwriting " +
      "model retrain cycle is too slow to react to a new fraud pattern this week.",
    approach:
      "At checkout, code assembles one state object from the systems that already have the data: order details, " +
      "account tenure and repayment history, and device/behavioral signals from the fraud stack. Three questions " +
      "run in parallel over that state — default-risk as a Score, fraud-pattern match as a Noul, and a review-" +
      "reason Choice for anything that needs a human look. Code applies tested thresholds per signal to reach " +
      "approve, hold-for-review, or decline; raw scores are stored so a threshold or weighting change can be " +
      "replayed against history without re-running inference.",
    jevRole: [
      { question: "How likely is this buyer to default on this plan?", primitive: "score", purpose: "primary input to the approve/decline threshold" },
      { question: "Does this order match a known fraud pattern?", primitive: "noul", purpose: "can override an otherwise-approved decision" },
      { question: "If this needs human review, what's the reason?", primitive: "choice", purpose: "routes the review queue" },
    ],
    diagram: `
flowchart LR
  A["order details"] --> D["state"]
  B["account history\\n+ repayment record"] --> D
  C["device / behavioral\\nsignals"] --> D
  D --> E{{"parallel questions"}}
  E --> F["score: default risk"]
  E --> G["noul: fraud pattern"]
  E --> H["choice: review reason"]
  F & G & H --> I["threshold policy"]
  I -->|low risk, no fraud flag| J["approve"]
  I -->|fraud flag or high risk| K["decline"]
  I -->|borderline| L["hold: human review"]
  J --> M[("decision log\\nraw scores kept")]
  K --> M
  L --> M
`.trim(),
    notes: [
      "Score and Noul are kept as separate signals, not merged into one number — a fraud flag can override an otherwise-acceptable risk score.",
      "Thresholds are policy, evaluated on the platform's own outcome data, not a fixed cutoff borrowed from a cookbook.",
      "Storing raw scores (not just the final action) lets a threshold change be backtested without re-querying Jev.",
    ],
    examples: [
      {
        type: "score",
        id: "bnpl-default-risk",
        title: "Default risk",
        useCase: "BNPL risk",
        state: "Order: $340 electronics. Account age: 4 months. Repayment history: 2 of 2 prior plans paid on time. No missed payments.",
        instructions: "How likely is this buyer to default on this plan?",
        levels: [
          "Very low risk — strong repayment history, established account",
          "Low risk — limited history but no negative signals",
          "Elevated risk — some negative signals or thin history",
          "High risk — recent missed payments or strong negative signals",
        ],
      },
      {
        type: "noul",
        id: "bnpl-fraud-pattern",
        title: "Fraud pattern match",
        useCase: "BNPL risk",
        state: "Order: $1,200 electronics, shipping to a freight forwarder address. Account created 40 minutes ago. Device previously linked to 3 other accounts this week.",
        instructions: "Does this order match a known fraud pattern?",
        trueDesc: "New account, freight-forwarder shipping, device linked to multiple recent accounts — classic resale-fraud pattern",
        falseDesc: "No overlap with known fraud patterns",
      },
      {
        type: "choice",
        id: "bnpl-review-reason",
        title: "Review-queue reason",
        useCase: "BNPL risk",
        state: "Order: $610 furniture. Account age: 2 weeks. Risk score borderline. Shipping and billing address differ by one digit in the zip code.",
        instructions: "If this order needs human review, what's the most likely reason?",
        options: [
          { label: "address_mismatch", description: "Shipping and billing addresses don't clearly match" },
          { label: "thin_file", description: "Account too new to have a reliable repayment history" },
          { label: "high_order_value", description: "Order value is unusually high for this buyer's history" },
          { label: "no_review_needed", description: "Signals are clear enough to auto-decide" },
        ],
      },
    ],
  },
];
