# Studio Spec Deltas — priority-message-pruning

## MODIFIED Requirements

### Requirement: Auto Compact
The system SHALL automatically compact conversation history when approaching the AI model's context window limit, using priority-based retention instead of purely chronological keep-last-N.

#### Scenario: First user message always retained
- GIVEN a long conversation that triggers compact
- WHEN splitMessages runs in priority mode
- THEN the first user message (index 0) is kept as-is (priority score >= 80)
- AND not included in the summary pool

#### Scenario: Recent messages always retained
- GIVEN a long conversation that triggers compact
- WHEN splitMessages runs in priority mode
- THEN the most recent 3 messages are kept as-is regardless of score
- AND form the "recent" portion with retained high-priority messages

#### Scenario: Tool-result messages prioritized
- GIVEN an assistant message containing tool-call results
- WHEN priority score is computed
- THEN the message receives a +20 score boost
- AND is likely to be retained over filler confirmations

#### Scenario: Attachment messages prioritized
- GIVEN a user message with file attachments
- WHEN priority score is computed
- THEN the message receives a +25 score boost
- AND is retained even if in the middle of the conversation

#### Scenario: Short confirmation de-prioritized
- GIVEN an assistant or user message under 20 characters like "好" / "ok" / "謝謝"
- WHEN priority score is computed
- THEN the message is scored below 40
- AND is sent to the summary pool (not retained in full)

#### Scenario: Feature flag toggles behavior
- GIVEN FEATURE_PRIORITY_PRUNING is false
- WHEN compact is triggered
- THEN the legacy "keep last 6" strategy is used
- GIVEN FEATURE_PRIORITY_PRUNING is true
- WHEN compact is triggered
- THEN the priority-based strategy is used

#### Scenario: Compact still emits c: event
- GIVEN priority-based compact runs
- WHEN it completes
- THEN a `c:` stream event is emitted to the frontend
- AND the event includes `originalCount`, `keptCount`, `summary` as before
- AND additionally includes `keptIndices` (which original indices were retained)

#### Scenario: Summary content reflects dropped messages
- GIVEN messages dropped to the summary pool include key decisions or user requirements
- WHEN the summary is generated
- THEN those decisions / requirements appear in the summary text
- AND the AI can still answer follow-ups that reference them

## ADDED Requirements

### Requirement: Message Priority Scoring
The system SHALL provide a deterministic, testable function to score each conversation message by retention priority.

#### Scenario: Score is in range 0-100
- WHEN scoreMessage is called on any message
- THEN it returns an integer between 0 and 100 inclusive

#### Scenario: Score is deterministic
- GIVEN the same message and conversation context
- WHEN scoreMessage is called multiple times
- THEN it always returns the same value (pure function)

#### Scenario: Score factors in message position
- GIVEN two otherwise identical messages, one at index 0, one in the middle
- WHEN scored
- THEN the first-message one scores higher due to the +40 anchor boost
