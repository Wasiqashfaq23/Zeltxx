const UserAvatar = ({ user }) => {
  if (user?.avatar) {
    return <img src={user.avatar} alt={user.name} />
  }
  return <div>{user?.name?.charAt(0).toUpperCase() || '?'}</div>
}

export default UserAvatar