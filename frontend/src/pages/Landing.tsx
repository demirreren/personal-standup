import { useState } from "react";
import { ArrowRight } from "lucide-react";
import Aurora from "../components/Aurora";
import BentoGrid from "../components/BentoGrid";
import AuthModal from "../components/AuthModal";
import TiltedCard from "../components/TiltedCard";

export default function Landing() {
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "register">("login");

  const openLogin = () => { setAuthMode("login"); setAuthOpen(true); };
  const openRegister = () => { setAuthMode("register"); setAuthOpen(true); };

  return (
    <div className="landing">
      <div className="aurora-bg">
        <Aurora
          colorStops={["#3b82f6", "#7c3aed", "#3b82f6"]}
          blend={0.6}
          amplitude={1.2}
          speed={0.5}
        />
      </div>

      <nav className="landing-nav">
        <div className="landing-nav-inner">
          <h1 className="logo">standup<span className="logo-dot">.</span></h1>
          <div className="landing-nav-links">
            <button onClick={openLogin} className="btn-ghost">Sign in</button>
            <button onClick={openRegister} className="btn-primary">Get started <ArrowRight size={16} /></button>
          </div>
        </div>
      </nav>

      <section className="hero">
        <h1 className="hero-title">
          Know what you shipped.<br />
          <span className="hero-gradient">Not just what kept you busy.</span>
        </h1>
        <p className="hero-subtitle">
          Two check-ins a day. Thirty seconds each.<br />
          Your morning plan versus your evening reality.<br />
          That gap is where the growth happens.
        </p>
        <div className="hero-ctas">
          <button onClick={openRegister} className="btn-primary btn-lg">
            Start your first standup <ArrowRight size={18} />
          </button>
        </div>
      </section>

      <section className="checkin-preview-section">
        <p className="checkin-preview-label">your day, in two moments</p>
        <div className="checkin-preview-cards">
          <div className="checkin-preview-item">
            <TiltedCard
              imageSrc="/morning.jpg"
              altText="Morning check-in"
              captionText="Morning Check-in"
              containerHeight="380px"
              containerWidth="280px"
              imageHeight="380px"
              imageWidth="280px"
              rotateAmplitude={12}
              scaleOnHover={1.05}
              showMobileWarning={false}
              showTooltip
              displayOverlayContent
              overlayContent={
                <div className="checkin-card-label morning-label">
                  ☀️ Morning Check-in
                </div>
              }
            />
          </div>
          <div className="checkin-preview-item">
            <TiltedCard
              imageSrc="/evening.jpg"
              altText="Evening check-out"
              captionText="Evening Check-out"
              containerHeight="380px"
              containerWidth="280px"
              imageHeight="380px"
              imageWidth="280px"
              rotateAmplitude={12}
              scaleOnHover={1.05}
              showMobileWarning={false}
              showTooltip
              displayOverlayContent
              overlayContent={
                <div className="checkin-card-label evening-label">
                  🌙 Evening Check-out
                </div>
              }
            />
          </div>
        </div>
      </section>

      <section className="bento-section">
        <BentoGrid />
      </section>

      <section className="cta-section">
        <h2>Stop wondering where the day went.</h2>
        <p>For freelancers, indie hackers, remote workers, and anyone doing self-directed work.</p>
        <button onClick={openRegister} className="btn-primary btn-lg">
          Get started, it's free <ArrowRight size={18} />
        </button>
      </section>

      <footer className="landing-footer">
        <p>built by <a href="https://github.com/demirreren" target="_blank" rel="noopener noreferrer">demir</a></p>
      </footer>

      <AuthModal isOpen={authOpen} onClose={() => setAuthOpen(false)} initialMode={authMode} />
    </div>
  );
}
