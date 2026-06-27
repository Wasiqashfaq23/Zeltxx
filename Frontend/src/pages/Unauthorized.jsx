import { Link } from 'react-router-dom'

const Unauthorized = () => {
  return (
    <div>
      <p>You don't have access to this page</p>
      <Link to="/dashboard">Go to Dashboard</Link>
    </div>
  )
}

export default Unauthorized
