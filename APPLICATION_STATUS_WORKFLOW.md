# Application Status Workflow

## Backend endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| POST | /api/applications/projects/:projectId | Create a new application for a job. Server-side duplicate prevention remains in place. |
| GET | /api/applications/projects/:projectId | Producer view of every application for a job they own. |
| GET | /api/applications/mine | Freelancer view of their own applications and current status. |
| PATCH | /api/applications/:applicationId/status | Accept or reject an application and persist the change in Oracle. |
| GET | /api/analytics/me | Freelancer dashboard summary for Pending / Accepted / Rejected counts. |

## Database tables

| Table | Role in the workflow |
|---|---|
| applications | Source of truth for application state. Stores project_id, freelancer_id, pitch_text, status, applied_at, updated_at. |
| projects | Used to validate ownership and to resolve the related job title for producer/freelancer screens. |
| users | Provides freelancer and producer names used in application lists. |
| profiles | Supplies freelancer skills used in the UI. |
| ratings | Supplies ratings shown in the application and dashboard views. |
| notifications | Receives live status-change notifications for the freelancer when an application is accepted or rejected. |

## Files modified

### Backend
- backend/controllers/applicationController.js
- backend/services/applicationService.js
- backend/models/applicationModel.js

### Frontend
- src/api/applications.ts
- src/api/jobs.ts
- src/hooks/useNotificationSocket.ts
- src/screens/DashboardView.tsx
- app/applications/[jobId].tsx
- app/my-applications.tsx
- src/components/ApplicantCard.tsx

## Workflow implemented

1. A freelancer submits an application through the existing apply flow.
2. The backend inserts or validates the row in the Oracle applications table with the initial status of applied/pending.
3. Producers can open the Applications screen for a job they posted and review every application.
4. Producers can Accept or Reject an application from the existing UI.
5. The backend updates the application row in Oracle and blocks a second change once a final decision has already been recorded unless an explicit edit override is passed.
6. React Query invalidates the relevant producer and freelancer caches so the UI updates immediately without a manual refresh.
7. The freelancer dashboard shows Pending, Accepted, and Rejected counts, and the My Applications screen reflects the new status in real time.
