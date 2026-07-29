# Workforce Pulse

## Assumptions & Join Strategy

**Activity Logs**
- Timestamps were a mix of ISO, MM/DD/YYYY, and YYYY-MM-DD. They were parsed under the assumption that they fall within the +05:30 IST timezone (as hinted by the JSON export generation time) and were normalized to ISO Dates for internal processing.
- Missing or non-positive durations were treated as dirty data and dropped from the analysis.
- Extremely large durations (>480 minutes for a single task segment) were flagged as outliers and invalidated from calculations.
- Casing and whitespace were aggressively trimmed. App names and task categories were mapped to a standard set (e.g. `EXCEL`, `MS Excel`, and `excel` were grouped).
- Booleans for `is_repetitive` were mapped based on truthy text matching (`yes`, `1`, `true`, `y`, `t`).

**HRMS JSON**
- Different ID fields (`employee_id`, `EmployeeID`) were unified.
- Compensation data contained three distinct structures (LPA, annual INR, hourly INR). They were all normalized to a monthly INR rate. For hourly rates, an assumption of 160 hours per month (40 hours/week * 4 weeks) was used.
- Working hours were unified into a start and end string (defaulting to 09:00 - 17:00 if missing or unparseable).

**Join & Conflict Resolution**
- The join was performed on the unified `employeeId`. 
- **Duplicates**: The latest (or last processed) entry overwrote the previous one in the HRMS data, but the collision was logged as a `flaggedRow`.
- **Missing Employees**: 2 employees were found in the activity logs but not in the HRMS data. Their activities were retained (to accurately reflect time-sink breakdowns) but their compensation was treated as 0 for ROI calculations.
- **Extra Employees**: 1 employee was in the HRMS but had no activity. They were logged as an extra employee but didn't impact the dashboard since they had no logged hours.

## Formulas

**Headline Numbers**
- **Hours/Month Recoverable**: `Sum(Duration of Repetitive Tasks) * 0.70`. 
  - *Justification*: Not all repetitive work can be fully automated due to edge cases, context switching, and manual review requirements. A 70% automation potential provides a defensible, realistic estimate rather than claiming 100% of the time is saved.
- **INR/Month Recoverable**: `Sum(Recoverable Hours * Employee Hourly Rate)`. Hourly rate is derived from `Monthly Salary / 160`.

**Automation Priority Ranking**
- The ranking combines 4 normalized metrics (0 to 1 scale) into a single 100-point score:
  - `Volume (20%)`: Total hours spent on the task across the company.
  - `Repetitiveness (30%)`: The ratio of repetitive hours to total hours for this task.
  - `Employee Concentration (20%)`: The number of distinct employees performing the task (higher spread = higher priority, as it standardizes a process across more people).
  - `INR Impact (30%)`: The monetary value of the recoverable hours for this task.

## Anomaly Detection
- The anomaly component calculates the total repetitive hours logged per employee.
- It calculates the mean across the team.
- If the maximum value (the top employee) is greater than **2x the mean**, they are flagged as an anomaly on the dashboard, signaling an uneven distribution of tedious work that might lead to burnout.

## What Was Cut
- **Complex Authentication**: Cut to focus entirely on the core data pipeline and UI interactions.
- **Database Persistence**: The datasets are small enough (~540 rows) to process in-memory on the server. Setting up Postgres/Prisma would be over-engineering for a static dataset snapshot.
- **Advanced LLM Streaming**: The AI assistant uses standard non-streaming fetch to reduce edge-runtime complexity and ensure stable deployment.

## What I'd Build With 2 More Days
- **Real-time Data Polling**: Connecting to live HRMS and Activity Log APIs to ingest data on a cron schedule rather than a static CSV/JSON.
- **More Granular AI Grounding**: Implementing a proper vector store or passing aggregated SQL schemas to allow the LLM to write and execute SQL against a SQLite DB containing the logs for more complex queries.
- **User Authentication & RBAC**: Ensuring only authorized leaders can view sensitive compensation data.
