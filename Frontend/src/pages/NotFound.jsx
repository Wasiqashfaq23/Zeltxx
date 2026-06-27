import { Link } from 'react-router-dom'

const NotFound = () => {
  return (
    <div>
      <p>Page not found</p>
      <Link to="/dashboard">Go to Dashboard</Link>
    </div>
  )
}

export default NotFound
