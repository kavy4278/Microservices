import React, { useState } from 'react';
import { Icon } from '../icons.jsx';
import { Button } from '../components/ui.jsx';

const Brand = () => (
  <a className="brand" href="#top">
    <span className="brand-mark"><Icon name="leaf" size={20} /></span>
    Crumbly
  </a>
);

function MockListing() {
  return (
    <div className="card" style={{ border: '1px solid var(--border)', boxShadow: 'none' }}>
      <div className="hero-listing-media">
        <img
          src="/images/hero_biryani_meal.jpg"
          alt="Fresh hot vegetable biryani"
          className="hero-listing-img"
        />
        <span className="corner badge badge-posted">
          <span className="pulse-dot" /> Available now
        </span>
        <span className="hero-photo-tag">
          <Icon name="store" size={13} style={{ marginRight: 5, verticalAlign: '-1px' }} />
          Royal Spice Kitchen · Andheri West
        </span>
      </div>
      <div className="between">
        <div>
          <div style={{ fontFamily: 'var(--font-head)', fontWeight: 700, fontSize: '1.05rem' }}>Fresh vegetable biryani</div>
          <div className="food-meta mt-1">
            <span><Icon name="package" size={14} /> 40 portions</span>
            <span><Icon name="leaf" size={14} /> 100% Vegetarian</span>
          </div>
        </div>
        <span className="expiry soon"><Icon name="clock" size={13} /> 4h safe window</span>
      </div>
      <div className="stepper mt-3">
        <span className="step-dot done"><i><Icon name="check" size={12} stroke={3} /></i></span>
        <span className="line done" />
        <span className="step-dot done"><i><Icon name="check" size={12} stroke={3} /></i></span>
        <span className="line done" />
        <span className="step-dot current"><i>3</i></span>
        <span className="line" />
        <span className="step-dot"><i>4</i></span>
      </div>
    </div>
  );
}

function MockRoleDashboard({ activeRole = 'donor' }) {
  if (activeRole === 'ngo') {
    return (
      <div>
        <div className="row" style={{ gap: 12 }}>
          <div className="stat grow" style={{ padding: 14 }}>
            <span className="lbl">Available near me</span>
            <div className="val" style={{ fontSize: '1.5rem', color: 'var(--forest)' }}>8 listings</div>
          </div>
          <div className="stat grow" style={{ padding: 14 }}>
            <span className="lbl">Meals distributed</span>
            <div className="val" style={{ fontSize: '1.5rem', color: 'var(--orange)' }}>1,420</div>
          </div>
        </div>
        <div className="card mt-2" style={{ padding: 14, background: '#faf9f5' }}>
          <div className="between mb-2">
            <strong className="small">Active claim · Akshaya NGO</strong>
            <span className="badge badge-picked">Rider en route</span>
          </div>
          <div className="row" style={{ gap: 10, alignItems: 'center' }}>
            <img src="/images/hero_biryani_meal.jpg" alt="Claimed food" style={{ width: 44, height: 44, borderRadius: 8, objectFit: 'cover' }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: '.88rem' }}>Vegetable biryani (40 portions)</div>
              <div className="muted small">Pickup code: <strong style={{ color: 'var(--forest)', letterSpacing: '.15em' }}>8492</strong></div>
            </div>
          </div>
        </div>
      </div>
    );
  }
  if (activeRole === 'rider') {
    return (
      <div>
        <div className="row" style={{ gap: 12 }}>
          <div className="stat grow" style={{ padding: 14 }}>
            <span className="lbl">Pickups completed</span>
            <div className="val" style={{ fontSize: '1.5rem', color: 'var(--forest)' }}>32</div>
          </div>
          <div className="stat grow" style={{ padding: 14 }}>
            <span className="lbl">Hours volunteered</span>
            <div className="val" style={{ fontSize: '1.5rem', color: 'var(--orange)' }}>16.5 h</div>
          </div>
        </div>
        <div className="card mt-2" style={{ padding: 14, background: '#faf9f5' }}>
          <div className="between mb-2">
            <strong className="small">Pickup run #108</strong>
            <span className="badge badge-sage">Step 3 of 4</span>
          </div>
          <p className="muted small mb-2"><Icon name="mapPin" size={13} /> Royal Spice Kitchen → St. Jude Shelter (2.4 km)</p>
          <div className="row" style={{ gap: 8 }}>
            <span className="badge badge-picked" style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
              <Icon name="shieldCheck" size={13} /> OTP Confirmed
            </span>
            <span className="badge badge-outline">Ready to deliver</span>
          </div>
        </div>
      </div>
    );
  }
  // Default: donor
  return (
    <div>
      <div className="row" style={{ gap: 12 }}>
        <div className="stat grow" style={{ padding: 14 }}>
          <span className="lbl">Active listings</span>
          <div className="val" style={{ fontSize: '1.5rem', color: 'var(--forest)' }}>12</div>
        </div>
        <div className="stat grow" style={{ padding: 14 }}>
          <span className="lbl">Meals rescued</span>
          <div className="val" style={{ fontSize: '1.5rem', color: 'var(--orange)' }}>480</div>
        </div>
      </div>
      <div className="card mt-2" style={{ padding: 14 }}>
        <div className="between mb-2"><strong className="small">Rescue activity</strong><span className="badge badge-sage">This week</span></div>
        <div className="row" style={{ gap: 8, alignItems: 'flex-end', height: 90 }}>
          {[38, 62, 45, 80, 55, 92, 70].map((h, i) => (
            <div key={i} className="grow bar-hover" style={{ background: i === 5 ? 'var(--orange)' : 'var(--forest)', height: `${h}%`, borderRadius: 6, opacity: i === 5 ? 1 : 0.85, transition: 'transform .2s' }} />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function Landing({ onSignIn, onGetStarted }) {
  const [menu, setMenu] = useState(false);
  const [banner, setBanner] = useState(true);
  const [openFaq, setOpenFaq] = useState(0);
  const [dashboardRole, setDashboardRole] = useState('donor');

  const navLinks = [
    ['How it works', '#how'],
    ['Features', '#features'],
    ['Who it’s for', '#usecases'],
    ['FAQ', '#faq'],
  ];

  return (
    <div id="top">
      {/* 1. Announcement bar */}
      {banner && (
        <div className="announce">
          <div className="container">
            <Icon name="sparkles" size={15} />
            <span>Now onboarding restaurants, kitchens and NGOs — every handover is OTP-verified.</span>
            <button className="x" onClick={() => setBanner(false)} aria-label="Dismiss"><Icon name="xCircle" size={16} /></button>
          </div>
        </div>
      )}

      {/* 2. Navbar */}
      <header className="nav">
        <div className="container">
          <Brand />
          <nav className="nav-links">
            {navLinks.map(([label, href]) => <a key={href} href={href}>{label}</a>)}
          </nav>
          <div className="nav-actions">
            <Button variant="ghost" onClick={onSignIn}>Sign in</Button>
            <Button onClick={() => onGetStarted('donor')} iconRight="arrowRight">Rescue food</Button>
          </div>
          <button className="menu-toggle" onClick={() => setMenu((v) => !v)} aria-label="Menu">
            <Icon name={menu ? 'xCircle' : 'menu'} size={22} />
          </button>
        </div>
        {menu && (
          <div className="mobile-menu">
            {navLinks.map(([label, href]) => <a key={href} href={href} onClick={() => setMenu(false)}>{label}</a>)}
            <div className="row mt-2">
              <Button variant="secondary" onClick={onSignIn}>Sign in</Button>
              <Button onClick={() => onGetStarted('donor')}>Rescue food</Button>
            </div>
          </div>
        )}
      </header>

      {/* 3. Hero */}
      <section className="hero">
        <div className="hero-bg" />
        <div className="hero-orb hero-orb-1" />
        <div className="hero-orb hero-orb-2" />
        <div className="container">
          <div>
            <span className="eyebrow"><Icon name="recycle" size={15} /> Saving every crumb</span>
            <h1>Every crumb<br />counts.</h1>
            <p className="lead">
              Crumbly connects restaurants, kitchens and events with nearby NGOs and volunteer riders —
              so safe surplus food reaches people before it expires, never the bin.
            </p>
            <div className="hero-cta">
              <Button onClick={() => onGetStarted('donor')} icon="utensils" iconRight="arrowRight">Rescue food</Button>
              <Button variant="secondary" onClick={() => onGetStarted()} icon="search">Explore listings</Button>
            </div>
            <div className="hero-note">
              <span><Icon name="shieldCheck" size={17} /> OTP-verified handovers</span>
              <span><Icon name="clock" size={17} /> Expiry-aware listings</span>
              <span><Icon name="users" size={17} /> Four roles, one flow</span>
            </div>
          </div>
          <div className="hero-visual">
            <div className="hero-shot">
              <div className="hero-shot-bar">
                <i style={{ background: '#F87171' }} /><i style={{ background: '#FBBF24' }} /><i style={{ background: '#34D399' }} />
                <span className="small muted" style={{ marginLeft: 8 }}>app.crumbly — live listings</span>
              </div>
              <div className="hero-shot-body">
                <MockListing />
              </div>
            </div>
            <div className="floating-card fc-1">
              <span className="ico" style={{ width: 34, height: 34, borderRadius: 10, background: 'var(--sage)', color: 'var(--forest)', display: 'grid', placeItems: 'center' }}>
                <Icon name="handHeart" size={18} />
              </span>
              <div><b>Claimed by</b><div className="small muted">Akshaya NGO · 2 min ago</div></div>
            </div>
            <div className="floating-card fc-2">
              <span className="ico" style={{ width: 34, height: 34, borderRadius: 10, background: 'var(--st-picked-bg)', color: 'var(--st-picked)', display: 'grid', placeItems: 'center' }}>
                <Icon name="bike" size={18} />
              </span>
              <div><b>Rider en route</b><div className="small muted">OTP ready at pickup</div></div>
            </div>
          </div>
        </div>

        <div className="container">
          <div className="live-ticker">
            <div className="live-ticker-item">
              <span className="pulse-dot" />
              <span><strong>48,200+</strong> meals rescued</span>
            </div>
            <div className="live-ticker-item">
              <Icon name="shieldCheck" size={16} style={{ color: 'var(--forest)' }} />
              <span><strong>100%</strong> OTP verified</span>
            </div>
            <div className="live-ticker-item">
              <Icon name="clock" size={16} style={{ color: 'var(--orange)' }} />
              <span><strong>&lt; 35 min</strong> avg. turnaround</span>
            </div>
            <div className="live-ticker-item">
              <Icon name="leaf" size={16} style={{ color: 'var(--forest)' }} />
              <span><strong>18.5 tonnes</strong> CO₂ prevented</span>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Trust indicators */}
      <section className="section" style={{ paddingTop: 0 }}>
        <div className="container">
          <div className="trust-grid">
            {[
              ['shieldCheck', 'Verified pickup', 'Every handover confirmed with a one-time code.'],
              ['clock', 'Zero-guess expiry', 'Listings can’t be posted without a safe pickup window.'],
              ['users', 'Role-based access', 'Donors, NGOs, riders and admins each see only what they need.'],
              ['recycle', 'One active claim', 'No double-booking — a listing has a single claim at a time.'],
            ].map(([ico, t, d]) => (
              <div className="trust" key={t}>
                <div className="feature-ico" style={{ margin: '0 auto 12px' }}><Icon name={ico} size={22} /></div>
                <div style={{ fontFamily: 'var(--font-head)', fontWeight: 700 }}>{t}</div>
                <div className="lbl" style={{ marginTop: 6 }}>{d}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 5. Problem / Solution */}
      <section className="section section-white">
        <div className="container">
          <div className="section-head">
            <span className="kicker">The gap we close</span>
            <h2>Great food is thrown away while people go hungry</h2>
            <p className="muted mt-2">The problem isn’t a shortage of food — it’s the lack of a fast, trustworthy way to move it.</p>
          </div>
          <div className="ps-grid">
            <div className="ps-col bad">
              <h3>Without Crumbly</h3>
              <ul>
                <li><Icon name="xCircle" size={18} /> Surplus food spoils overnight because nobody nearby knows it exists.</li>
                <li><Icon name="xCircle" size={18} /> Phone calls and WhatsApp groups lose track of who took what.</li>
                <li><Icon name="xCircle" size={18} /> No proof the food reached the right hands — or any hands at all.</li>
                <li><Icon name="xCircle" size={18} /> Fresh food is tossed while shelters ration meals.</li>
              </ul>
            </div>
            <div className="ps-col good">
              <h3>With Crumbly</h3>
              <ul>
                <li><Icon name="checkCircle" size={18} /> Donors post surplus in seconds with quantity, location and a safety window.</li>
                <li><Icon name="checkCircle" size={18} /> Nearby NGOs see live listings and claim what they can distribute.</li>
                <li><Icon name="checkCircle" size={18} /> Riders confirm pickup and delivery with OTP, so every rescue is verifiable.</li>
                <li><Icon name="checkCircle" size={18} /> Admins get a clear view of the whole network and its impact.</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* 5b. Real Rescues in Motion (Story Gallery with Real Images) */}
      <section className="section section-sage">
        <div className="container">
          <div className="section-head">
            <span className="kicker">Real Rescues in Motion</span>
            <h2>From surplus in the kitchen to smiles on the table</h2>
            <p className="muted mt-2">Every step of Crumbly is powered by real people — donors, volunteer riders, and community leaders working in sync.</p>
          </div>
          <div className="story-grid">
            <div className="story-card">
              <div className="story-img-wrap">
                <img src="/images/restaurant_chef_packing.jpg" alt="Chef packaging surplus meals" className="story-img" />
                <span className="story-badge"><Icon name="store" size={14} /> 1. Kitchens pack surplus</span>
              </div>
              <div className="story-body">
                <h3>No good meal goes to waste</h3>
                <p>Commercial kitchens and caterers box fresh surplus within 15 minutes of service close. Safety timestamps guarantee quality.</p>
              </div>
            </div>
            <div className="story-card">
              <div className="story-img-wrap">
                <img src="/images/volunteer_rider_delivery.jpg" alt="Volunteer rider delivery in Mumbai" className="story-img" />
                <span className="story-badge"><Icon name="bike" size={14} /> 2. Verified OTP pickup</span>
              </div>
              <div className="story-body">
                <h3>Fast & verifiable transit</h3>
                <p>Volunteer riders arrive on two-wheelers with thermal carriers. A one-time security code confirms the handover at the doorstep.</p>
              </div>
            </div>
            <div className="story-card">
              <div className="story-img-wrap">
                <img src="/images/community_food_distribution.jpg" alt="Community meal distribution" className="story-img" />
                <span className="story-badge"><Icon name="handHeart" size={14} /> 3. Nutritious dinner served</span>
              </div>
              <div className="story-body">
                <h3>Dignified, warm meals</h3>
                <p>NGO shelters and community centers distribute hot, wholesome meals to children and families before dinner hours.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 6. Features */}
      <section className="section" id="features">
        <div className="container">
          <div className="section-head">
            <span className="kicker">What you get</span>
            <h2>Everything a food rescue needs, in one place</h2>
          </div>
          <div className="feature-grid">
            {[
              ['utensils', 'Post surplus in seconds', 'Add food type, quantity, photos and a pickup window. Validation stops unsafe listings before they go live.'],
              ['search', 'Find food near you', 'NGOs search live listings by city and food type, with clarity on what’s still available and how urgent it is.'],
              ['bike', 'Riders with a clear run', 'Volunteers see pickups assigned to them and confirm handovers step by step.'],
              ['shieldCheck', 'OTP-verified handover', 'A one-time code at pickup proves the right food changed hands — no disputes, no guesswork.'],
              ['chart', 'Impact you can see', 'Delivered rescues and meals served roll up into simple dashboards for donors and admins.'],
              ['bell', 'Expiry you can’t miss', 'Colour-coded countdowns nudge the whole network when a listing is running out of time.'],
            ].map(([ico, t, d]) => (
              <div className="feature" key={t}>
                <div className="feature-ico"><Icon name={ico} size={23} /></div>
                <h3>{t}</h3>
                <p>{d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 7. How it works */}
      <section className="section section-sage" id="how">
        <div className="container">
          <div className="section-head">
            <span className="kicker">Four steps, one rescue</span>
            <h2>From surplus to served</h2>
          </div>
          <div className="steps">
            {[
              ['Post', 'A donor lists surplus food with quantity, location and a safe pickup window.', 'utensils'],
              ['Claim', 'A nearby NGO claims the listing — it’s now reserved for them.', 'handHeart'],
              ['Collect', 'A rider picks it up and confirms the OTP at the doorstep.', 'bike'],
              ['Deliver', 'The rider confirms delivery and the rescue is recorded as meals served.', 'checkCircle'],
            ].map(([t, d, ico], i) => (
              <div className="step" key={t}>
                <div className="step-no">{i + 1}</div>
                <h3>{t}</h3>
                <p>{d}</p>
                <div className="mt-2" style={{ color: 'var(--forest)' }}><Icon name={ico} size={22} /></div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 8. Product showcase */}
      <section className="section section-white">
        <div className="container">
          <div className="showcase">
            <div>
              <span className="kicker">The workspace</span>
              <h2>A dashboard for every role</h2>
              <p className="muted mt-2">
                Sign in and Crumbly adapts to you. Donors track what they’ve posted, NGOs browse and claim,
                riders run pickups, and admins watch the whole network — all from the same clean workspace.
              </p>
              <ul className="ps-col" style={{ border: 0, padding: 0, marginTop: 18, listStyle: 'none' }}>
                {[
                  'Live status on every listing — posted, claimed, picked up, delivered.',
                  'Search and filters that respect what each role is allowed to do.',
                  'One-time codes that keep handovers honest.',
                ].map((x) => (
                  <li key={x} style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
                    <Icon name="checkCircle" size={19} style={{ color: 'var(--forest)', flex: '0 0 auto', marginTop: 3 }} />
                    <span>{x}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-3">
                <Button onClick={() => onGetStarted('ngo')} iconRight="arrowRight">See it for your NGO</Button>
              </div>
            </div>
            <div className="device">
              <div className="browser-bar">
                <i style={{ width: 11, height: 11, borderRadius: '50%', background: '#F87171', display: 'block' }} />
                <i style={{ width: 11, height: 11, borderRadius: '50%', background: '#FBBF24', display: 'block' }} />
                <i style={{ width: 11, height: 11, borderRadius: '50%', background: '#34D399', display: 'block' }} />
                <span className="small muted" style={{ marginLeft: 8, textTransform: 'capitalize' }}>{dashboardRole} dashboard</span>
              </div>
              <div className="device-inner" style={{ padding: 18 }}>
                <div className="role-tabs">
                  <button
                    className={`role-tab ${dashboardRole === 'donor' ? 'active' : ''}`}
                    onClick={() => setDashboardRole('donor')}
                  >
                    <Icon name="utensils" size={15} /> Donor
                  </button>
                  <button
                    className={`role-tab ${dashboardRole === 'ngo' ? 'active' : ''}`}
                    onClick={() => setDashboardRole('ngo')}
                  >
                    <Icon name="handHeart" size={15} /> NGO
                  </button>
                  <button
                    className={`role-tab ${dashboardRole === 'rider' ? 'active' : ''}`}
                    onClick={() => setDashboardRole('rider')}
                  >
                    <Icon name="bike" size={15} /> Rider
                  </button>
                </div>
                <MockRoleDashboard activeRole={dashboardRole} />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 9. Use cases */}
      <section className="section" id="usecases">
        <div className="container">
          <div className="section-head">
            <span className="kicker">Who it’s for</span>
            <h2>Built for the people who rescue</h2>
          </div>
          <div className="usecase-grid">
            {[
              ['Restaurants', 'store', 'Turn end-of-service surplus into meals instead of waste — post a listing in under a minute.'],
              ['Hotels & catering', 'building', 'Buffer and banquet surplus finds a home the same day, with a pickup window that fits your kitchen.'],
              ['Grocery & bakeries', 'package', 'Near-date stock that’s still safe to eat reaches families through nearby NGOs.'],
              ['NGOs & shelters', 'handHeart', 'See what’s available near you right now and claim food you can actually distribute.'],
            ].map(([tag, ico, d]) => (
              <div className="usecase" key={tag}>
                <span className="tag">{tag}</span>
                <div style={{ color: 'var(--forest)' }}><Icon name={ico} size={24} /></div>
                <p>{d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 10. Why choose us */}
      <section className="section section-forest">
        <div className="container">
          <div className="section-head">
            <span className="kicker">Why Crumbly</span>
            <h2>Trust is the whole point</h2>
          </div>
          <div className="feature-grid">
            {[
              ['shieldCheck', 'Verified, not hopeful', 'A rescue only counts once the OTP handover is confirmed — the record reflects reality.'],
              ['clock', 'Time is the ingredient', 'Expiry windows drive the whole flow, so urgency is visible to everyone who matters.'],
              ['route', 'Simple for riders', 'Clear pickups and one-tap confirmations make volunteering genuinely easy.'],
              ['chart', 'Transparent impact', 'Donors and admins see exactly how much food was delivered and served.'],
              ['users', 'Right access, every time', 'Role-based permissions keep the network safe without slowing anyone down.'],
              ['zap', 'Fast to start', 'Post your first listing in seconds — no paperwork, no learning curve.'],
            ].map(([ico, t, d]) => (
              <div className="feature" key={t} style={{ background: 'rgba(255,255,255,.06)', borderColor: 'rgba(255,255,255,.14)', boxShadow: 'none' }}>
                <div className="feature-ico" style={{ background: 'rgba(255,255,255,.12)', color: '#9ed7b6' }}><Icon name={ico} size={23} /></div>
                <h3>{t}</h3>
                <p style={{ color: '#bcd6c7' }}>{d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 11. Built on */}
      <section className="section section-white">
        <div className="container">
          <div className="section-head">
            <span className="kicker">Under the hood</span>
            <h2>A clean, service-based foundation</h2>
            <p className="muted mt-2">Crumbly is built as independent microservices behind a single gateway — reliable, observable and ready to grow.</p>
          </div>
          <div className="feature-grid" style={{ gridTemplateColumns: 'repeat(3,1fr)' }}>
            {[
              ['React + Vite', 'code', 'A fast, responsive interface that works down to mobile.'],
              ['Node + Express', 'server', 'Purpose-built services for auth, listings, claims and notifications.'],
              ['MongoDB', 'database', 'Flexible data for listings, claims and users.'],
              ['API gateway', 'route', 'One entry point with token checks and role rules.'],
              ['JWT + roles', 'shield', 'Secure, stateless sessions with role-based access control.'],
              ['Docker', 'package', 'Every service runs the same way, anywhere.'],
            ].map(([t, ico, d]) => (
              <div className="feature" key={t}>
                <div className="feature-ico"><Icon name={ico} size={23} /></div>
                <h3 style={{ fontSize: '1.1rem' }}>{t}</h3>
                <p>{d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 12. Pricing / always free */}
      <section className="section">
        <div className="container">
          <div className="panel" style={{ padding: '42px 32px', textAlign: 'center' }}>
            <span className="kicker">Always free</span>
            <h2>No fees, no barriers to rescuing food</h2>
            <p className="muted mt-2" style={{ maxWidth: 620, margin: '10px auto 0' }}>
              Crumbly is free for donors, NGOs and riders. The only thing we’re trying to move is food — never money.
            </p>
            <div className="feature-grid mt-4" style={{ gridTemplateColumns: 'repeat(3,1fr)' }}>
              {[
                ['For donors', 'utensils', 'Post unlimited surplus and track every rescue.'],
                ['For NGOs', 'handHeart', 'Browse, claim and coordinate pickups at no cost.'],
                ['For riders', 'bike', 'Volunteer, see your runs and confirm deliveries.'],
              ].map(([t, ico, d]) => (
                <div className="feature" key={t}>
                  <div className="feature-ico"><Icon name={ico} size={23} /></div>
                  <h3 style={{ fontSize: '1.1rem' }}>{t}</h3>
                  <p>{d}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 13. FAQ */}
      <section className="section section-white" id="faq">
        <div className="container">
          <div className="section-head">
            <span className="kicker">Questions</span>
            <h2>Good to know</h2>
          </div>
          <div className="faq">
            {[
              ['Who can use Crumbly?', 'Donors (restaurants, kitchens, hotels, events), NGOs and riders can join. An admin oversees the network. Each role gets its own workspace and permissions.'],
              ['How do you keep handovers safe?', 'When a rider collects, the donor confirms a one-time code. A rescue is only marked delivered after that verified handover, so the record always matches what actually happened.'],
              ['What stops unsafe or stale food?', 'Listings must set a pickup window that extends beyond a safe minimum. When time runs short, listings are flagged and eventually expire rather than linger as available.'],
              ['Can a listing be claimed twice?', 'No. A listing can have only one active claim at a time. Once claimed, it’s reserved for that NGO until it’s collected, delivered, or released.'],
              ['What does it cost?', 'Nothing. Crumbly is free for donors, NGOs and riders.'],
              ['How do I start?', 'Create an account, pick your role, and post or claim your first listing. It takes less than a minute.'],
            ].map(([q, a], i) => (
              <div className="faq-item" key={q}>
                <button className="faq-q" onClick={() => setOpenFaq(openFaq === i ? -1 : i)} aria-expanded={openFaq === i}>
                  {q}
                  <Icon name="chevronDown" size={20} style={{ transform: openFaq === i ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }} />
                </button>
                {openFaq === i && <div className="faq-a">{a}</div>}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 14. Final CTA */}
      <section className="section" style={{ paddingBottom: 90 }}>
        <div className="container">
          <div className="final-cta">
            <span className="kicker" style={{ color: '#9ed7b6' }}>Start today</span>
            <h2>Somewhere nearby, a good meal needs a home.</h2>
            <p style={{ maxWidth: 560, margin: '14px auto 26px', color: '#cfe3d7' }}>
              Join the network and turn surplus into someone’s dinner tonight.
            </p>
            <div className="row" style={{ justifyContent: 'center' }}>
              <Button variant="orange" onClick={() => onGetStarted('donor')} icon="utensils">Post surplus food</Button>
              <Button variant="secondary" onClick={() => onGetStarted('ngo')} icon="handHeart">Join as an NGO</Button>
            </div>
          </div>
        </div>
      </section>

      {/* 15. Footer */}
      <footer className="footer">
        <div className="container">
          <div className="footer-grid">
            <div>
              <Brand />
              <p className="small mt-2" style={{ maxWidth: 300, color: '#b9d4c5' }}>
                Saving every crumb — connecting donors, NGOs and volunteer riders — so good food reaches people, not landfill.
              </p>
            </div>
            <div>
              <h4>Product</h4>
              <a href="#how">How it works</a>
              <a href="#features">Features</a>
              <a href="#usecases">Who it’s for</a>
              <a href="#faq">FAQ</a>
            </div>
            <div>
              <h4>Get started</h4>
              <a href="#top" onClick={(e) => { e.preventDefault(); onGetStarted('donor'); }}>Post surplus food</a>
              <a href="#top" onClick={(e) => { e.preventDefault(); onGetStarted('ngo'); }}>Join as an NGO</a>
              <a href="#top" onClick={(e) => { e.preventDefault(); onGetStarted('rider'); }}>Volunteer as a rider</a>
              <a href="#top" onClick={(e) => { e.preventDefault(); onSignIn(); }}>Sign in</a>
            </div>
            <div>
              <h4>Contact</h4>
              <a href="mailto:hello@crumbly.org"><Icon name="mail" size={14} /> hello@crumbly.org</a>
              <a href="#top"><Icon name="phone" size={14} /> +91 90000 00000</a>
              <a href="#top"><Icon name="globe" size={14} /> Mumbai, India</a>
            </div>
          </div>
          <div className="footer-bottom">
            <span>© {new Date().getFullYear()} Crumbly. Built to reduce food waste.</span>
            <span>Every crumb counts.</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
