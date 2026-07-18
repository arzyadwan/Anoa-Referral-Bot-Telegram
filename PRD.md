PRODUCT REQUIREMENTS DOCUMENT

Telegram Referral &

Community Growth Bot

A bot and admin dashboard system to drive member acquisition, referral tracking, gamified engagement, and growth analytics for Telegram communities.

DOCUMENT VERSION

v1.0 — Draft for Review

DATE

18 Juli 2026

STATUS

Ready for Engineering Review

Table of Contents

1.  Overview

2.  Scope

3.  User Features (Telegram Bot)

4.  Referral Validation Rules

5.  Admin Dashboard

6.  Data Model

7.  Technical Architecture

1. Overview

Purpose, scope, and the problem this product solves.

1.1 Objective

Build a Telegram bot and companion admin dashboard that increases community member acquisition and engagement through a referral program, gamification mechanics, task-based incentives, and analytics reporting.

1.2 Background & Problem Statement

Community growth on Telegram is typically manual, unverifiable, and difficult to reward fairly. Admins lack visibility into who is actually driving growth, invite links are easy to abuse, and there is no structured mechanism to keep new members active after they join. This product addresses that gap with a verifiable referral engine, an engagement loop (XP, check-ins, tasks, leaderboard), and an admin dashboard for oversight and reward governance.

1.3 Core Goals

Referral system with unique, trackable referral links per user

Track and validate invites against anti-abuse rules before they count

Increase Daily Active Users (DAU) and Weekly Active Users (WAU)

Sustain engagement through leaderboard rankings and an XP/leveling system

Give admins real-time analytics and control over rewards, tasks, and broadcasts

1.4 Success Metrics

--- TABLE START ---

Metric | Description | Target Signal

Valid Referral Rate | % of referred users who pass validation rules | Increasing month-over-month

DAU / WAU Ratio | Stickiness of the community after growth campaigns | > 20%

7-Day Retention | Referred users still active 7 days after joining | Tracked per cohort

Task Completion Rate | % of active users completing at least 1 task/week | Tracked weekly

Top Inviter Concentration | Referral share held by top 1% of inviters | Monitored for abuse patterns

--- TABLE END ---

2. Scope

2.1 In Scope

Telegram bot: onboarding, referral link generation, check-ins, tasks, XP, leaderboard, reward history

Referral validation engine with configurable anti-abuse rules

Admin web dashboard: user, referral, task, and reward management; analytics; broadcast

Backend REST API and relational data model supporting the above

2.2 Out of Scope (v1)

Multi-bot / multi-community management from a single dashboard instance

Native mobile admin app (dashboard is web-only, responsive)

On-chain or crypto-based reward payouts (rewards are tracked and approved manually in v1)

Multi-language bot copy beyond a single configured default locale

3. User Features (Telegram Bot)

All functionality available to end users interacting with the bot.

3.1 Onboarding

Entry command — /start

Auto-generated referral code — Every new user is automatically issued a unique referral code / deep link on first interaction

Referral dashboard — A personal view showing referral link, invite count, valid vs. pending invites, and rewards earned

3.2 Engagement Loop

Daily check-in — Users check in once per day to earn XP; streaks may boost rewards

Tasks — Admin-defined actions (e.g. share a post, invite N friends, join a partner channel) that grant XP or rewards on completion

XP & Level — Every qualifying action (check-in, task, valid referral) grants XP; accumulated XP maps to a level

Leaderboard — Ranked view of top users by XP and by referral count, with time-window filters (daily / weekly / all-time)

Reward history — A log of rewards earned, their status (pending, approved, paid), and the action that triggered each one

4. Referral Validation Rules

A referral is only counted as valid once every rule below is satisfied. Thresholds are configurable by admins via the dashboard.

--- TABLE START ---

Rule | Description

Group / channel membership | The invited user must join the required Telegram group or channel to be eligible.

No self-referral | A user cannot use their own referral link/code to register themselves.

Single inviter attribution | Each invited user can be credited to exactly one inviter — first valid attribution wins.

Minimum stay duration | The invited user must remain a member for a configurable minimum period before the referral is finalized.

Minimum activity threshold | The invited user must send at least a configurable minimum number of messages before the referral converts from pending to valid.

--- TABLE END ---

Referrals that fail validation remain in a pending state and do not generate rewards or leaderboard credit until — or unless — they are confirmed. This protects against fake accounts, drop-in-drop-out abuse, and inflated invite counts.

5. Admin Dashboard

Web application used by community operators to manage the program.

5.1 Access & Security

Login — JWT-based authentication with session expiry and role-aware access control

5.2 Management Modules

User management — Search, view, and moderate user profiles, XP, and status (active / banned / flagged)

Referral management — Inspect referral chains, override validation status, and investigate suspicious inviter activity

Create / edit tasks — Create, edit, publish, and retire tasks, including reward value and eligibility window

Reward approval — Review pending rewards and approve, reject, or adjust before payout/fulfillment

Broadcast messages — Compose and send announcements to all users or a segmented audience

5.3 Analytics

Daily Active Users, Weekly Active Users, retention curves by cohort, and top inviter rankings

CSV export — Exportable reporting via CSV for offline analysis and stakeholder reporting

6. Data Model

Core entities. Exact field-level schema to be finalized during technical design.

--- TABLE START ---

Entity | Purpose

Users | Telegram user profile, XP, level, status, and referral code.

Referrals | Inviter → invitee relationship, validation state, and timestamps.

Rewards | Reward records tied to a triggering action, with approval status.

Tasks | Admin-defined task definitions, reward value, and eligibility window.

TaskCompletions | Per-user record of task completion and reward issuance.

XPHistory | Append-only ledger of XP-earning events per user.

DailyCheckins | Check-in log used for streaks and daily engagement tracking.

Broadcasts | Sent announcements, target audience, and delivery status.

Settings | Configurable system parameters (validation thresholds, XP rates, etc.).

AuditLogs | Admin action history for accountability and rollback.

--- TABLE END ---

7. Technical Architecture

7.1 Stack

--- TABLE START ---

Layer | Technology

Backend framework | NestJS (TypeScript)

Bot integration | Telegraf

Database | PostgreSQL

ORM | Prisma

Cache / queue | Redis

Admin frontend | Next.js + Tailwind CSS

Deployment | Docker

--- TABLE END ---

7.2 Non-Functional Requirements

Scalability — Architecture must scale to 100,000+ registered users without redesign

Security — JWT auth, role-based access control, input validation, and rate limiting on public bot/API endpoints

Deployment — Fully containerized services with reproducible Docker deployment

API documentation — REST API documented via Swagger/OpenAPI for all backend endpoints

Observability — Structured application logging and uptime/error monitoring across bot, API, and dashboard