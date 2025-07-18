import { Link } from '@tanstack/react-router'

export default function Header() {
  return (
    <header className="p-2 flex gap-2 bg-white text-black justify-between">
      <nav className="flex flex-row">
        <div className="px-2 font-bold">
          <Link to="/">Home</Link>
        </div>

        <div className="px-2 font-bold">
          <Link to="/demo/tanstack-query">TanStack Query</Link>
        </div>
        <div className="px-2 font-bold">
          <Link to="/upload">Upload</Link>
        </div>
        <div className="px-2 font-bold">
          <Link to="/view">View</Link>
        </div>
      </nav>
      <nav className="flex flex-row">
        <div className="px-2 font-bold">
          <Link to="/login">Login</Link>
        </div>
        <div className="px-2 font-bold">
          <Link to="/register">Register</Link>
        </div>
      </nav>
    </header>
  )
}
