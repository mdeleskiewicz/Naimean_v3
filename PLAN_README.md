# UX & Workflow Improvement Plan (Top 10)

1. **Server-first calendar persistence**  
   Move calendar events and preferences to Worker APIs so data is reliable across devices and sessions.

2. **Visible sync status for all saved data**  
   Add clear saved/unsynced/error indicators so users know whether data is actually persisted.

3. **Offline queue + retry UX**  
   Queue failed writes, retry in the background, and show retry state to avoid silent data loss.

4. **Unified in-app navigation layer**  
   Add a persistent navigation shell so users can quickly move between Den, Chapel, Arcade, Notes, and Calendar.

5. **Onboarding and contextual guidance**  
   Add first-visit walkthroughs and lightweight tooltips for hotspots, edit mode, and admin-only actions.

6. **Mobile-first interaction pass**  
   Improve touch targets, gesture handling, and performance on coarse-pointer/iOS devices.

7. **Accessibility hardening**  
   Improve keyboard navigation, focus states, ARIA labels, contrast checks, and reduced-motion behavior.

8. **Global settings panel**  
   Centralize user preferences (audio, animation intensity, UI density, theme/accessibility options).

9. **Performance budgeting and asset optimization**  
   Set page-level budgets, lazy-load heavy media, and optimize large image/video assets for faster first interaction.

10. **Workflow simplification for content/admin updates**  
    Provide consistent, reusable editing patterns for hotspots/layout/content with validation and preview before save.
