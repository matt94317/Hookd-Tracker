"""
Seed script: creates mock company + creator with campaigns, accounts, and posts.

Credentials:
  Company:  company@test.com  / Test1234!
  Creator:  creator@test.com  / Test1234!
"""
import random
from datetime import datetime, timedelta, date
import bcrypt
from app import create_app, db
from app.models import User, Channel, Campaign, CampaignCreator, Account, Post

app = create_app()

def hash_pw(plain):
    return bcrypt.hashpw(plain.encode(), bcrypt.gensalt()).decode()

def make_posts(account_id, count=15):
    posts = []
    for i in range(count):
        days_ago = random.randint(0, 59)
        posts.append(Post(
            account_id=account_id,
            platform_post_id=f"mock_{account_id}_{i}",
            post_url=f"https://example.com/post/{account_id}/{i}",
            caption=f"Mock post #{i + 1} – testing Hookd Tracker 🚀",
            posted_at=datetime.utcnow() - timedelta(days=days_ago, hours=random.randint(0, 23)),
            likes=random.randint(50, 5000),
            comments=random.randint(5, 500),
            views=random.randint(500, 50000),
            shares=random.randint(0, 300),
        ))
    return posts

with app.app_context():
    # ── channels ────────────────────────────────────────────────────────────
    ig = Channel.query.filter_by(name="instagram").first()
    if not ig:
        ig = Channel(name="instagram")
        db.session.add(ig)

    tt = Channel.query.filter_by(name="tiktok").first()
    if not tt:
        tt = Channel(name="tiktok")
        db.session.add(tt)

    db.session.flush()

    # ── company user ─────────────────────────────────────────────────────────
    company = User.query.filter_by(email="company@test.com").first()
    if not company:
        company = User(
            name="Acme Brands",
            email="company@test.com",
            password=hash_pw("Test1234!"),
            role="company",
        )
        db.session.add(company)
        db.session.flush()
        print("Created company: company@test.com")
    else:
        print("Company already exists, skipping creation.")

    # ── creator user ─────────────────────────────────────────────────────────
    creator = User.query.filter_by(email="creator@test.com").first()
    if not creator:
        creator = User(
            name="Alex Creator",
            email="creator@test.com",
            password=hash_pw("Test1234!"),
            role="creator",
        )
        db.session.add(creator)
        db.session.flush()
        print("Created creator: creator@test.com")
    else:
        print("Creator already exists, skipping creation.")

    # ── campaigns ────────────────────────────────────────────────────────────
    campaigns_data = [
        ("Summer Launch 2026", date(2026, 6, 1), date(2026, 8, 31)),
        ("Back to School 2026", date(2026, 8, 15), date(2026, 9, 15)),
    ]

    campaigns = []
    for cname, start, end in campaigns_data:
        c = Campaign.query.filter_by(name=cname, company_id=company.id).first()
        if not c:
            c = Campaign(name=cname, company_id=company.id, start_date=start, end_date=end)
            db.session.add(c)
            db.session.flush()
            print(f"Created campaign: {cname}")
        else:
            print(f"Campaign '{cname}' already exists, skipping.")
        campaigns.append(c)

    # ── link creator → campaigns ──────────────────────────────────────────────
    for c in campaigns:
        exists = CampaignCreator.query.filter_by(campaign_id=c.id, creator_id=creator.id).first()
        if not exists:
            db.session.add(CampaignCreator(campaign_id=c.id, creator_id=creator.id))
            print(f"Linked creator to campaign: {c.name}")

    db.session.flush()

    # ── accounts (one IG + one TikTok per campaign) ───────────────────────────
    account_specs = [
        (ig.id, "ig_mock_001", "@alexcreator_ig"),
        (tt.id, "tt_mock_001", "@alexcreator_tt"),
    ]

    all_accounts = []
    for campaign in campaigns:
        for ch_id, plat_id, uname in account_specs:
            acct = Account.query.filter_by(
                campaign_id=campaign.id, creator_id=creator.id, channel_id=ch_id
            ).first()
            if not acct:
                acct = Account(
                    campaign_id=campaign.id,
                    creator_id=creator.id,
                    channel_id=ch_id,
                    platform_account_id=plat_id,
                    username=uname,
                    access_token="mock_access_token",
                    refresh_token="mock_refresh_token",
                    token_expires_at=datetime.utcnow() + timedelta(days=60),
                    daily_target=1000,
                    monthly_target=25000,
                )
                db.session.add(acct)
                db.session.flush()
                print(f"Created account {uname} ({campaign.name})")
                all_accounts.append(acct)

    # ── posts ─────────────────────────────────────────────────────────────────
    for acct in all_accounts:
        existing = Post.query.filter_by(account_id=acct.id).count()
        if existing == 0:
            for p in make_posts(acct.id):
                db.session.add(p)
            print(f"Added 15 mock posts for account {acct.username}")

    db.session.commit()
    print("\nSeed complete!")
    print("─" * 40)
    print("Company login:  company@test.com  /  Test1234!")
    print("Creator login:  creator@test.com  /  Test1234!")
    print("─" * 40)
