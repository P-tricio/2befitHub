# Design Doc: workflow Optimization for Coaches (Audit & Planning)

This design addresses the bottlenecks in client auditing (detecting missed sessions and reading forms) and program creation (generating PDP variations).

## 1. Coach Dashboard (Traffic Light System)

A centralized view to prioritize coach intervention based on client data.

### Audit Logic
*   **Red (Action Required)**: 
    *   `> 2` scheduled tasks missed in the last 7 days.
    *   Latest `Weekly Review` form has critical scales (e.g., Stress > 8, Fatigue > 9).
    *   No app activity for `> 5` days.
*   **Yellow (Monitor)**:
    *   `1` missed task in the last 7 days.
    *   Scale trends increasing (e.g., Stress 6 -> 8).
*   **Green (On Track)**:
    *   All tasks completed.
    *   Scales stable and healthy (< 6).

### UI Components
*   **Audit Grid**: A list of active clients with colored badges.
*   **Metric Peeker**: A quick hover/popover showing sparklines for 0-10 scales (Sleep, Stress, Fatigue, Hunger) extracted from recent forms.
*   **Quick Actions**: "Send Message", "Open Planning", "Mark as Reviewed".

## 2. Microcycle Planner (The PDP Matrix)

A high-level editor to generate and vary complex programs in bulk.

### The "Matrix" Interface
*   Instead of editing one session at a time, the coach sees a week view.
*   Column 1: Day A (Protocol R | T | E)
*   Column 2: Day B (Protocol R | T | E)
*   ...
*   **Action: Mirror Protocols**: Design "A1-R" and click "Generate T & E" to instantly replicate the exercise list with corresponding PDP timing/rep rules.

### exercise Evolution (AI-Assisted)
*   **"Generate Variant A2"**: 
    1.  Clones Session A1.
    2.  For each exercise, identifies its `pattern` (e.g., Squat) and `quality` (e.g., Fuerza).
    3.  Suggests a variant from the library with the same pattern but different difficulty or implement (e.g., Back Squat -> Goblet Squat).
    4.  The coach approves or swaps.

## 3. Implementation Path
1.  **Refactor `TrainingDB`**: Add a specialized `getBatchCoachData` method to avoid multiple round-trips.
2.  **New View**: `CoachDashboard.jsx`.
3.  **Enhanced `ProgramBuilder`**: Integrate the "Matrix" mode.

---
**Verification Plan**:
*   Mock logs for a "Red" user and verify they appear correctly in the dashboard.
*   Verify that "Mirror Protocols" maintains exercise identity (IDs, names) while swapping configs.
