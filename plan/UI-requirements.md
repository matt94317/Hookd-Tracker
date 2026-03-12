# UI Requirements

## Campaigns List

### Summary Cards (top section)
- Display aggregate stats cards: Total Campaigns, Total Creators, Total Views
- Admin: aggregate across all campaigns
- Company: aggregate only campaigns owned by the logged-in company
- Creator: aggregate only campaigns owned by the logged-in creator

### Search & Filter
- Text search input to filter campaigns by name

### Campaign Cards (grid layout)
- Display campaigns as card blocks in a responsive grid
- Each card shows:
  - Campaign name
  - Number of creators (from campaign_creators)
  - Number of posts (from posts via accounts)
  - Total views (aggregated from posts)
  - Date range (start_date – end_date) if set
- Edit (pencil) and Delete (trash) action icons on each card (admin & company only)
- "View Details" link navigating to Campaign Detail page
- Cards are only shown for campaigns the user has access to (RBAC)

### Actions
- "+ New Campaign" button in top-right corner (visible to admin & company only)
- Clicking opens Campaign Create form

## Campaign Edit/Create

### Form Fields
- Campaign Name (text input, required)
- Start Date (date picker, optional)
- End Date (date picker, optional)

### Behavior
- Create mode: POST /campaigns — name, start_date, end_date
- Edit mode: PUT /campaigns/<id> — pre-populate fields with existing values
- Company users can only edit their own campaigns
- Admin can edit any campaign
- Form validation: name is required; end_date must be after start_date if both provided
- On success, redirect to Campaigns List or Campaign Detail

## Campaign Detail

### Campaign Summary (top section)
- Campaign name
- Date range (start_date – end_date)
- Aggregate stats cards: Total Posts, Total Views, Total Likes, Total Comments, Total Shares
  - Data sourced from GET /campaigns/<campaign_id>/posts aggregate response
- Optional: channel filter to narrow stats by platform (query param `channel`)

### Creators List (bottom section)
- Table or card list of creators assigned to this campaign
- Each creator row/card shows:
  - Creator name
  - Account connection status per platform:
    - If account NOT authorized: show "Connect Instagram" / "Connect TikTok" button
      - Button triggers GET /accounts/<account_id>/oauth-url and redirects to the returned oauth_url
    - If account authorized (access_token exists): show connected account info (platform icon + username)
  - Per-creator post count and engagement stats (from GET /creators/<creator_id>/posts)
- "+ Add Creator" button (visible to admin & company only)
  - Triggers POST /campaigns/<campaign_id>/creators with selected creator_id
- Remove creator action per row (visible to admin & company only)
  - Triggers DELETE /campaigns/<campaign_id>/creators/<creator_id>
