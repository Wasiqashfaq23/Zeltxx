import ProjectModel from "../models/project.js"

export const createProject = async (req, res) => {
    try {
        const { name, description } = req.body

        const projectDoc = await ProjectModel.create({
            name,
            description,
            members: [{ user: req.user._id, role: 'admin' }]
        })
        res.status(201).json(projectDoc)
    } catch (error) {
        res.status(400).json({ message: error.message })
    }
}

export const getProjects = async (req, res) => {
    try {
        const projects = await ProjectModel.find({ "members.user": req.user._id, isActive: true }).populate("members.user", "name email avatar")
        res.status(200).json(projects)
    } catch (error) {
        res.status(400).json({ message: error.message })
    }
}

export const getProjectById = async (req, res) => {
    const projectDoc = await ProjectModel.findById(req.params.id).populate("members.user", "name email avatar")

    if (!projectDoc || !projectDoc.isActive) {
        return res.status(404).json({ message: "Project not found" })
    }

    const isMember = projectDoc.members.some(m => m.user._id.toString() === req.user._id.toString())

    if (!isMember) {
        return res.status(403).json({ message: "Not a member of this project" })
    }

    res.status(200).json(projectDoc)
}

export const updateProject = async (req, res) => {
    const { name, description } = req.body
    const projectDoc = await ProjectModel.findByIdAndUpdate(req.params.id, { name, description }, { new: true }).populate("members.user", "name email avatar")

    res.status(200).json(projectDoc)
}


export const deleteProject = async (req, res) => {
    await ProjectModel.findByIdAndDelete(req.params.id)
    res.status(200).json({ message: "Project deleted successfully" })
}

export const inviteMember = async (req, res) => {
    const { userId, role } = req.body
    const projectDoc = await ProjectModel.findById(req.params.id)

    const alreadyMember = projectDoc.members.some(m => m.user.toString() === userId)
    if (alreadyMember) {
        return res.status(400).json({ message: "User is already a member" })
    }

    projectDoc.members.push({ user: userId, role })
    await projectDoc.save()

    res.status(200).json(projectDoc)
}

export const removeMember = async (req, res) => {
  const projectDoc = await ProjectModel.findById(req.params.id)

  projectDoc.members = projectDoc.members.filter(
    m => m.user.toString() !== req.params.userId
  )
  await projectDoc.save()

  res.json(projectDoc)
}