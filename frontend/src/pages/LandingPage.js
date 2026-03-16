import { useNavigate } from 'react-router-dom';
import styles from './LandingPage.module.css';

function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.logo}>Hookd Tracker</div>
        <button className={styles.loginBtn} onClick={() => navigate('/login')}>
          Log in →
        </button>
      </header>

      <main className={styles.hero}>
        <div className={styles.badge}>
          <span className={styles.badgeDiamond}>✦</span> Built for in-house UGC teams
        </div>

        <h1 className={styles.headline}>
          Run your UGC program<br />
          <span className={styles.headlinePurple}>without the spreadsheets</span>
        </h1>

        <p className={styles.subtext}>
          Hookd Tracker keeps your creators accountable, your content<br />
          on brand, and your results clear.
        </p>

        <div className={styles.ctaRow}>
          <button className={styles.ctaBtn} onClick={() => navigate('/register')}>
            Try for free
          </button>
        </div>

        <div className={styles.socialProof}>
          <span>👥 100+ creators tracked</span>
          <span className={styles.divider}>|</span>
          <span>📊 TikTok &amp; Instagram</span>
          <span className={styles.divider}>|</span>
          <span>⭐ Loved by brand teams</span>
        </div>
      </main>

      {/* Feature Section 1 — Track */}
      <section className={styles.featureSection}>
        <div className={styles.featureLeft}>
          <p className={styles.featureLabel}>01 — TRACK</p>
          <h2 className={styles.featureHeadline}>Set up campaigns<br />in minutes</h2>
          <p className={styles.featureSubtext}>
            Create a campaign, add your hashtags and brief links,
            then let Hookd automatically pull in every post your
            creators publish.
          </p>
        </div>

        <div className={styles.featureRight}>
          <div className={styles.campaignCard}>

            {/* Campaign Name */}
            <div className={styles.fieldGroup}>
              <div className={styles.fieldRow}>
                <label className={styles.fieldLabel}>CAMPAIGN NAME</label>
                <label className={styles.fieldLabel}>LIVE</label>
              </div>
              <div className={styles.fieldRow}>
                <input
                  className={styles.fieldInput}
                  type="text"
                  defaultValue="Summer Brand Push"
                  readOnly
                />
                <div className={styles.toggle}>
                  <div className={styles.toggleTrack}>
                    <div className={styles.toggleThumb} />
                  </div>
                </div>
              </div>
            </div>

            {/* Cover Image */}
            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel}>COVER IMAGE</label>
              <div className={styles.dropzone}>
                <span className={styles.dropzoneIcon}>🖼️</span>
                <p className={styles.dropzoneText}>Drop an image or click to browse</p>
                <button className={styles.chooseFileBtn}>Choose File</button>
              </div>
            </div>

            {/* Campaign Window */}
            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel}>
                CAMPAIGN WINDOW <span className={styles.optional}>(OPTIONAL)</span>
              </label>
              <div className={styles.dateRow}>
                <div className={styles.dateInput}>
                  <span className={styles.dateIcon}>📅</span>
                  <span className={styles.datePlaceholder}>Start</span>
                </div>
                <div className={styles.dateInput}>
                  <span className={styles.dateIcon}>📅</span>
                  <span className={styles.datePlaceholder}>End</span>
                </div>
              </div>
            </div>

            {/* Hashtags */}
            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel}>
                HASHTAGS <span className={styles.infoIcon}>ⓘ</span>
              </label>
              <input
                className={styles.fieldInput}
                type="text"
                defaultValue="#summersale, #ad, #hookd"
                readOnly
              />
            </div>

            {/* Brief Links */}
            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel}>
                BRIEF LINKS <span className={styles.infoIcon}>ⓘ</span>
              </label>
              <button className={styles.addLinkBtn}>+ Add link</button>
            </div>

          </div>
        </div>
      </section>

      {/* Feature Section 2 — Manage */}
      <section className={styles.featureSection2}>

        {/* Left — Creator cards */}
        <div className={styles.creatorCards}>
          {[
            {
              handle: '@creatorjess',
              name: 'Jessica Lin',
              posts: 4,
              goal: 6,
              days: [true, false, true, true, true, false, false],
            },
            {
              handle: '@markdoes_ugc',
              name: 'Marcus Webb',
              posts: 2,
              goal: 6,
              days: [false, true, false, false, true, false, false],
            },
            {
              handle: '@sophiaviral',
              name: 'Sophia Reyes',
              posts: 5,
              goal: 6,
              days: [true, true, true, false, true, true, false],
            },
          ].map((creator) => (
            <div key={creator.handle} className={styles.creatorCard}>
              <div className={styles.creatorCardTop}>
                <div>
                  <p className={styles.creatorHandle}>{creator.handle}</p>
                  <p className={styles.creatorName}>{creator.name}</p>
                </div>
                <div className={styles.creatorCardTopRight}>
                  <span className={styles.postsBadge}>{creator.posts}/{creator.goal} posts</span>
                  <span className={styles.goalLabel}>{creator.goal}/week goal</span>
                </div>
              </div>
              <div className={styles.progressBarTrack}>
                <div
                  className={styles.progressBarFill}
                  style={{ width: `${(creator.posts / creator.goal) * 100}%` }}
                />
              </div>
              <div className={styles.dayGrid}>
                {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, i) => (
                  <div key={i} className={styles.dayCol}>
                    <div className={creator.days[i] ? styles.dayBoxActive : styles.dayBoxEmpty}>
                      {creator.days[i] && <span className={styles.dayCount}>1</span>}
                    </div>
                    <span className={styles.dayLabel}>{day}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Right — Copy */}
        <div className={styles.manageRight}>
          <p className={styles.featureLabel}>02 — MANAGE</p>
          <h2 className={styles.manageHeadline}>Know who's<br />hitting their<br />targets</h2>
          <p className={styles.featureSubtext}>
            Stop manually checking profiles.
            Hookd shows you each creator's weekly posting pace at a glance so
            nothing slips through the cracks.
          </p>
        </div>

      </section>

      {/* Section 3 — Analyze */}
      <section className={styles.analyzeSection}>
        <div className={styles.featureLeft}>
          <p className={styles.featureLabel}>03 — ANALYZE</p>
          <h2 className={styles.analyzeHeadline}>Spot winners<br />before they go<br />viral</h2>
          <p className={styles.featureSubtext}>
            All your posts ranked by performance,
            refreshed automatically. Double down
            on what's working — before your
            competitors do.
          </p>
        </div>

        <div className={styles.analyzeRight}>
          <div className={styles.topPostsCard}>
            <div className={styles.topPostsHeader}>
              <span className={styles.topPostsTitle}>Today's Top Posts</span>
              <span className={styles.liveBadge}><span className={styles.liveDot}>●</span> Live</span>
            </div>
            <div className={styles.postsTable}>
              <div className={styles.postsTableHead}>
                <span>Creator</span>
                <span>Posted</span>
                <span>Views</span>
              </div>
              {[
                { creator: '@creatorjess',  posted: 'Today · 6:12 PM',      views: '48,200' },
                { creator: '@sophiaviral',  posted: 'Today · 2:45 PM',      views: '12,700' },
                { creator: '@markdoes_ugc', posted: 'Today · 11:03 AM',     views: '3,410'  },
                { creator: '@creatorjess',  posted: 'Yesterday · 5:30 PM',  views: '9,880'  },
                { creator: '@sophiaviral',  posted: 'Yesterday · 3:17 PM',  views: '6,600'  },
                { creator: '@markdoes_ugc', posted: 'Yesterday · 1:02 PM',  views: '2,230'  },
              ].map((row, i) => (
                <div key={i} className={styles.postsTableRow}>
                  <span className={styles.postCreator}>{row.creator}</span>
                  <span className={styles.postPosted}>{row.posted}</span>
                  <span className={styles.postViews}>{row.views}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Section 4 — Review */}
      <section className={styles.reviewSection}>
        <div className={styles.reviewCard}>
          <div className={styles.reviewCardHeader}>
            <p className={styles.reviewCardTitle}>Wed, Mar 4 · Video Submissions</p>
            <p className={styles.reviewCardCampaign}>Campaign: Summer Brand Push</p>
          </div>
          <div className={styles.reviewTabs}>
            <span className={styles.reviewTabActive}>Pending Review (12)</span>
            <span className={styles.reviewTab}>Reviewed (3)</span>
            <span className={styles.reviewTab}>Approved (0)</span>
          </div>
          <div className={styles.reviewContent}>
            <div className={styles.videoThumb}>
              <span className={styles.playBtn}>▶</span>
            </div>
            <div className={styles.reviewInfo}>
              <p className={styles.reviewFileName}>draft_v2_final.mp4</p>
              <p className={styles.reviewUploadDate}>Uploaded Mar 4 · 2:30 PM</p>
              <p className={styles.reviewCreatorLink}>@creatorjess</p>
              <div className={styles.reviewStatusRow}>
                <span className={styles.statusPending}>⏳ pending</span>
                <span className={styles.statusTag}>reviewed</span>
                <span className={styles.statusTag}>approved</span>
              </div>
            </div>
          </div>
          <div className={styles.feedbackArea}>
            <p className={styles.feedbackLabel}>Your Feedback</p>
            <textarea className={styles.feedbackTextarea} placeholder="Leave notes for the creator..." readOnly />
            <button className={styles.sendFeedbackBtn}>Send Feedback</button>
          </div>
        </div>

        <div className={styles.reviewRight}>
          <p className={styles.featureLabel}>04 — REVIEW</p>
          <h2 className={styles.reviewHeadline}>Give feedback<br />before it goes<br />live</h2>
          <p className={styles.featureSubtext}>
            Creators submit drafts through their portal. You review, leave notes, and
            approve — all in one place, no back-and-forth DMs needed.
          </p>
        </div>
      </section>

      {/* Section 5 — Creator Portal */}
      <section className={styles.portalSection}>
        <div className={styles.featureLeft}>
          <p className={styles.featureLabel}>05 — CREATOR PORTAL</p>
          <h2 className={styles.portalHeadline}>Your creators<br />always<br />know what's<br />next</h2>
          <p className={styles.featureSubtext}>
            A clean, private portal shows each creator their upcoming tasks,
            deadlines, and campaign briefs — so you spend less time chasing.
          </p>
        </div>

        <div className={styles.portalRight}>
          <div className={styles.portalCard}>
            <div className={styles.portalCreatorHeader}>
              <span className={styles.portalIcon}>🎬</span>
              <div>
                <p className={styles.portalHandle}>@creatorjess</p>
                <p className={styles.portalSubtext}>3 tasks due this week</p>
              </div>
            </div>
            <div className={styles.taskList}>
              {[
                { text: 'Post 3 videos this week',      due: 'due Fri Mar 7th',              overdue: false },
                { text: 'Upload drafts for review',     due: 'due Fri Mar 7th',              overdue: false, link: 'Vie...' },
                { text: 'Respond to comment threads',   due: 'due Fri Mar 7th',              overdue: false },
                { text: 'Post 3 videos this week',      due: '⚠ Overdue · due Mon Mar 10th', overdue: true  },
                { text: 'Upload drafts for review',     due: '⚠ Overdue · due Mon Mar 10th', overdue: true,  link: 'Vie...' },
                { text: 'Engage with followers',        due: '⚠ Overdue · due Mon Mar 10th', overdue: true  },
              ].map((task, i) => (
                <div key={i} className={styles.taskRow}>
                  <span className={task.overdue ? styles.taskCircleOverdue : styles.taskCircle} />
                  <div>
                    <p className={styles.taskText}>
                      {task.text}
                      {task.link && <span className={styles.taskLink}> {task.link}</span>}
                    </p>
                    <p className={task.overdue ? styles.taskDueOverdue : styles.taskDue}>{task.due}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Section 6 — Pricing */}
      <section className={styles.pricingSection}>
        <h2 className={styles.pricingHeadline}>Simple pricing</h2>
        <p className={styles.pricingSubtext}>No hidden fees. Cancel anytime.</p>
        <div className={styles.pricingCards}>

          {/* Starter */}
          <div className={styles.pricingCard}>
            <p className={styles.planTier}>STARTER</p>
            <h3 className={styles.planName}>Basic Plan</h3>
            <p className={styles.planDesc}>For teams just getting their UGC program off the ground.</p>
            <p className={styles.planPrice}><span className={styles.planAmount}>$150</span><span className={styles.planPer}>/mo</span></p>
            <hr className={styles.planDivider} />
            <ul className={styles.planFeatures}>
              {['Up to 10 active creators','1 team member seat','12-hour data refresh','Manual sync anytime','Weekly digest emails','Campaign manager','TikTok & Instagram tracking'].map(f => (
                <li key={f}><span className={styles.checkGreen}>✓</span>{f}</li>
              ))}
            </ul>
            <button className={styles.planBtnOutline} onClick={() => navigate('/register')}>Start Free Trial</button>
          </div>

          {/* Pro */}
          <div className={styles.pricingCardPro}>
            <span className={styles.mostPopular}>MOST POPULAR</span>
            <p className={styles.planTierPro}>PRO</p>
            <h3 className={styles.planNamePro}>Full UGC Program</h3>
            <p className={styles.planDescPro}>Everything you need to scale an in-house UGC operation.</p>
            <p className={styles.planPricePro}><span className={styles.planAmountPro}>$275</span><span className={styles.planPerPro}>/mo</span></p>
            <hr className={styles.planDividerPro} />
            <ul className={styles.planFeaturesPro}>
              {['Everything in Starter, plus','Unlimited active creators','5 team member seats','Creator leaderboard','Creator tier system','Video review & feedback editor','Dedicated creator portal','TikTok & Instagram tracking'].map(f => (
                <li key={f}><span className={styles.checkWhite}>✓</span>{f}</li>
              ))}
            </ul>
            <button className={styles.planBtnWhite} onClick={() => navigate('/register')}>Start Free Trial</button>
          </div>

        </div>
      </section>

    </div>
  );
}

export default LandingPage;
