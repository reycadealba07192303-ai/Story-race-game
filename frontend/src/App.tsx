import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Play, ArrowRight, Heart, Folder, BookOpen, Trophy, Target, Sparkles, PenTool, Image as ImageIcon, Video, Book, Layout, Moon, Sun, X } from 'lucide-react';
import './index.css';

function App() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    return localStorage.getItem('theme') === 'dark';
  });
  const [activeModal, setActiveModal] = useState<string | null>(null);

  const MODAL_CONTENT: Record<string, { title: string; body: string }> = {
    'help-faq': { title: 'Help Center & FAQ', body: 'Welcome to our Help Center! Here you can find answers to common questions about using Story Race Game, from setting up your account to unlocking new chapters and navigating the storyboard.' },
    'contact': { title: 'Contact Support', body: 'Need assistance? Reach out to our dedicated support team at reycadelacruzdealba@gmail.com. We typically respond within 24 hours to help with any technical or account-related issues.' },
    'reading-guides': { title: 'Reading Guides', body: 'Our Reading Guides provide structured pathways for educators and parents to maximize the learning potential of each interactive story. Discover lesson plans, discussion questions, and vocabulary lists.' },
    'system-status': { title: 'System Status', body: 'All systems are currently operational. We are running version 2.4.1. No scheduled maintenance in the next 7 days.' },
    'terms': { title: 'Terms of Service', body: 'By accessing Story Race Game, you agree to abide by our terms of use. The platform is designed for educational purposes, and we expect all users to maintain a respectful and safe environment.' },
    'privacy': { title: 'Privacy Policy', body: 'Your privacy is paramount. We only collect essential data required for educational progress tracking. We do not sell your personal information to third parties, and all data is securely encrypted.' },
    'child-privacy': { title: 'Child Privacy', body: 'Story Race Game is fully COPPA-compliant. We prioritize the safety of our young learners by ensuring that no personal identifiable information (PII) is exposed publicly.' },
    'data-security': { title: 'Data Security', body: 'We employ industry-standard encryption protocols (AES-256) to protect your data. Regular security audits are conducted to ensure our infrastructure remains resilient.' },
  };

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (isDarkMode) {
      document.body.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.body.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  // Scale the landing page on mobile to show the full desktop layout
  useEffect(() => {
    const DESKTOP_WIDTH = 1300;

    const applyMobileZoom = () => {
      const app = document.querySelector<HTMLElement>('.app');
      if (!app) return;

      if (window.innerWidth < DESKTOP_WIDTH) {
        const scale = window.innerWidth / DESKTOP_WIDTH;
        app.style.width = `${DESKTOP_WIDTH}px`;
        (app.style as CSSStyleDeclaration & { zoom: string }).zoom = String(scale);
      } else {
        app.style.width = '';
        (app.style as CSSStyleDeclaration & { zoom: string }).zoom = '';
      }
    };

    applyMobileZoom();
    window.addEventListener('resize', applyMobileZoom);
    return () => window.removeEventListener('resize', applyMobileZoom);
  }, []);

  return (
    <div className="app">
      {/* Navigation */}
      <nav className={`navbar ${isScrolled ? 'scrolled' : ''}`}>
        <div className="navbar-bg"></div>
        <div className="container nav-container">
          <div className="nav-brand">
            <img src="/774305900_27641489658835587_363435234290148032_n.jpg" alt="Story Race Game Logo" className="nav-brand-logo" />
            <span style={{ letterSpacing: '-1.5px', textTransform: 'uppercase', fontWeight: 900 }}>STORY RACEGAME</span>
          </div>
          
          <div className="nav-links">
            <a href="#about" className="nav-link">About Us</a>
            <a href="#features" className="nav-link">Features</a>
            <a href="#how-to" className="nav-link">How it Works</a>
          </div>

          <div className="nav-actions">
            <button className="theme-toggle" onClick={() => setIsDarkMode(!isDarkMode)}>
              {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
            </button>
            <Link to="/signup" className="btn-outline">Start Learning Free</Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="hero">
        <div className="container">
          <div className="hero-inner">
            <div className="hero-content">
              <div className="badge">
                <Sparkles size={16} style={{ marginRight: '8px' }} />
                Gamified Reading for Grade 8
              </div>
              <h1 className="hero-title">
                The intelligent<br />
                Reading platform
              </h1>
              <p className="hero-desc">
                Enhance Grade 8 reading comprehension and literary analysis skills through interactive, story-based activities. We turn reading into an engaging adventure.
              </p>
              
              <div className="hero-actions">
                <div className="search-box">
                  <input type="text" placeholder="What story shall we read today?" />
                  <button className="btn-primary-action">
                    <ArrowRight size={18} />
                  </button>
                </div>
              </div>
            </div>

            <div className="hero-visuals">
              <div className="floating-card card-1">
                <div className="fc-icon">
                  <Heart size={20} fill="white" />
                </div>
                <div className="fc-text">
                  <h4>Engaging Stories</h4>
                  <p>Read & Enjoy</p>
                </div>
              </div>

              <div className="floating-card card-2">
                <div className="fc-icon">
                  <Trophy size={20} color="white" />
                </div>
                <div className="fc-text">
                  <h4>Leaderboards</h4>
                  <p>Climb to the top</p>
                </div>
              </div>

              <div className="floating-card card-3">
                <div className="fc-icon">
                  <Folder size={20} fill="white" />
                </div>
                <div className="fc-text">
                  <h4>Literary Lab</h4>
                  <p>Unlock chapters</p>
                </div>
              </div>

              <img src="/learning_mascot.png" alt="Friendly Learning Mascot" className="hero-image" />
            </div>
          </div>
        </div>
      </section>

      {/* About Section - Gamified Learning Focus */}
      <section id="about" className="section section-alt">
        <div className="container about-grid">
          <div className="about-image-wrapper">
            <img 
              src="/gamified_reading.png" 
              alt="Gamified Reading" 
              className="about-image" 
            />
          </div>
          <div className="about-content">
            <div className="badge" style={{ marginBottom: '15px', background: 'rgba(0, 184, 124, 0.1)', color: 'var(--secondary)', border: '1px solid rgba(0, 184, 124, 0.2)' }}>
              <BookOpen size={16} style={{ marginRight: '8px' }} /> Gamified Reading
            </div>
            <h3>Empowering Grade 8 Students Through Gamification</h3>
            <p>
              We believe that reading shouldn't be a chore. Story Race Game uses advanced gamification techniques, interactive storyboards, and real-time leaderboards to motivate students to read more and understand better.
            </p>
            <p>
              By combining classic and contemporary literature with modern gaming mechanics, students naturally develop stronger comprehension and analytical skills without feeling like they are studying.
            </p>
          </div>
        </div>
      </section>

      {/* How to Use Section - Storyboard Design */}
      <section id="how-to" className="section">
        <div className="container">
          <h2 className="section-title">How It Works</h2>
          <p className="section-desc">Experience our interactive storyboard approach to mastering literature.</p>

          <div className="storyboard-container">
            <div className="storyboard-line"></div>
            
            <div className="storyboard-panel">
              <div className="sb-number">1</div>
              <Book size={40} className="sb-icon" />
              <h4>Story-Based Learning</h4>
              <p>Provide an interactive digital platform where Grade 8 students can learn through story-based activities.</p>
            </div>
            
            <div className="storyboard-panel" style={{ marginTop: '40px' }}>
              <div className="sb-number">2</div>
              <Layout size={40} className="sb-icon" style={{ color: 'var(--secondary)' }} />
              <h4>Reading Assessments</h4>
              <p>Improve comprehension using various assessment types such as: Multiple Choice, Sequence of Events, and Clickable Words.</p>
            </div>
            
            <div className="storyboard-panel">
              <div className="sb-number">3</div>
              <PenTool size={40} className="sb-icon" style={{ color: 'var(--primary)' }} />
              <h4>Literary Analysis</h4>
              <p>Strengthen skills by allowing students to identify: Theme, Characters, Setting, Conflict, Plot, and Moral Lesson.</p>
            </div>

            <div className="storyboard-panel" style={{ marginTop: '40px' }}>
              <div className="sb-number">4</div>
              <Trophy size={40} className="sb-icon" style={{ color: 'var(--accent)' }} />
              <h4>Gamified Motivation</h4>
              <p>Motivate students through gamification features including: Leaderboards, XP, Story Progress, Achievements, and Rewards.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section - Stunning Design */}
      <section id="features" className="section section-alt">
        <div className="container">
          <h2 className="section-title">Why Choose Story Race Game?</h2>
          <p className="section-desc">A premium gamified learning experience designed specifically for Grade 8 curriculum.</p>
          
          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon-wrapper" style={{ color: 'var(--primary)' }}>
                <Layout size={40} />
              </div>
              <h4>Interactive Storyboards</h4>
              <p>Visual narratives that guide you through complex stories, making character maps and plot analysis intuitive and memorable.</p>
            </div>
            
            <div className="feature-card">
              <div className="feature-icon-wrapper" style={{ color: 'var(--secondary)' }}>
                <Trophy size={40} />
              </div>
              <h4>Global Leaderboards</h4>
              <p>Compete with friends and classmates. Earn points by answering comprehension questions and unlocking achievements.</p>
            </div>
            
            <div className="feature-card">
              <div className="feature-icon-wrapper" style={{ color: 'var(--accent)' }}>
                <Target size={40} />
              </div>
              <h4>Skill Tracking</h4>
              <p>Detailed analytics for teachers and parents to monitor reading levels, vocabulary growth, and literary analysis proficiency.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer">
        <div className="container">
          <div className="footer-grid">
            <div>
              <div className="footer-brand">
                <img src="/774305900_27641489658835587_363435234290148032_n.jpg" alt="Logo" style={{ width: 32, height: 32, borderRadius: 8, objectFit: 'contain' }} />
                <span style={{ letterSpacing: '-1.5px', textTransform: 'uppercase', fontWeight: 900 }}>STORY RACEGAME</span>
              </div>
              <p className="footer-desc">
                Empowering the next generation of readers through gamified learning, storyboard animation, and interactive storytelling.
              </p>
            </div>
            <div>
              <h5>Platform</h5>
              <ul className="footer-links">
                <li><a href="#about">About Us</a></li>
                <li><a href="#features">Features</a></li>
                <li><a href="#how-to">How it Works</a></li>
              </ul>
            </div>
            <div>
              <h5>Resources</h5>
              <ul className="footer-links">
                <li><a href="#" onClick={(e) => { e.preventDefault(); setActiveModal('help-faq'); }}>Help Center & FAQ</a></li>
                <li><a href="#" onClick={(e) => { e.preventDefault(); setActiveModal('contact'); }}>Contact Support</a></li>
                <li><a href="#" onClick={(e) => { e.preventDefault(); setActiveModal('reading-guides'); }}>Reading Guides</a></li>
                <li><a href="#" onClick={(e) => { e.preventDefault(); setActiveModal('system-status'); }}>System Status</a></li>
              </ul>
            </div>
            <div>
              <h5>Legal</h5>
              <ul className="footer-links">
                <li><a href="#" onClick={(e) => { e.preventDefault(); setActiveModal('terms'); }}>Terms of Service</a></li>
                <li><a href="#" onClick={(e) => { e.preventDefault(); setActiveModal('privacy'); }}>Privacy Policy</a></li>
                <li><a href="#" onClick={(e) => { e.preventDefault(); setActiveModal('child-privacy'); }}>Child Privacy</a></li>
                <li><a href="#" onClick={(e) => { e.preventDefault(); setActiveModal('data-security'); }}>Data Security</a></li>
              </ul>
            </div>
          </div>
          <div className="footer-bottom">
            <p>&copy; {new Date().getFullYear()} Story Race Game. All rights reserved.</p>
          </div>
        </div>
      </footer>

      {/* Info Modal */}
      {activeModal && MODAL_CONTENT[activeModal] && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
          padding: 20
        }}>
          <div style={{
            background: isDarkMode ? '#1A1A1A' : '#fff',
            color: isDarkMode ? '#fff' : '#1A1A1A',
            width: '100%', maxWidth: 500,
            borderRadius: 24, padding: 32,
            position: 'relative',
            boxShadow: '0 20px 40px rgba(0,0,0,0.2)'
          }}>
            <button
              onClick={() => setActiveModal(null)}
              style={{
                position: 'absolute', top: 20, right: 20,
                background: 'transparent', border: 'none',
                color: isDarkMode ? '#aaa' : '#666',
                cursor: 'pointer'
              }}
            >
              <X size={24} />
            </button>
            <h3 style={{ fontSize: 24, fontWeight: 800, marginBottom: 16 }}>{MODAL_CONTENT[activeModal].title}</h3>
            <p style={{ fontSize: 16, lineHeight: 1.6, color: isDarkMode ? '#ccc' : '#666' }}>
              {MODAL_CONTENT[activeModal].body}
            </p>
            <button
              onClick={() => setActiveModal(null)}
              style={{
                marginTop: 24, width: '100%', padding: 14,
                background: 'var(--primary)', color: '#fff',
                border: 'none', borderRadius: 12,
                fontSize: 16, fontWeight: 700, cursor: 'pointer'
              }}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
