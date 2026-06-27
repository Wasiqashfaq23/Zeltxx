const Login = () => {
  return (
    <div className="flex items-center justify-center h-screen">
      <a href="http://localhost:5000/api/auth/google"
        className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
        Sign in with Google
      </a>
    </div>
  )
}
export default Login