import { Link, useLocation } from 'react-router-dom'
import './Navbar.css'

export default function Navbar() {
  const location = useLocation()

  return (
    <nav className="navbar">
      <div className="navbar-inner">
        <Link to="/" className="nav-brand">
          <span className="brand-icon">✦</span>
          <span className="brand-name">Blogify</span>
        </Link>
        <div className="nav-links">
          <Link to="/" className={`nav-link ${location.pathname === '/' ? 'active' : ''}`}>
            Explore
          </Link>
          <Link to="/write" className="nav-cta">
            <span>+ Write</span>
          </Link>
        </div>
      </div>
    </nav>
  )
}