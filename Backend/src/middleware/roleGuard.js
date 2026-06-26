export const ProjectRole = (...roles) => (req, res, next) => {
    const project = req.project
    if (!project) {
        return res.status(401).json({ message: "Project not found" })
    }

    const member = project.members.find(m => m.user.toString() === req.user._id.toString())
    if (!member || !roles.includes(member.role)) {
        return res.status(403).json({ message: 'Forbidden' })
    }
    req.memberRole = member.role
    next()
}