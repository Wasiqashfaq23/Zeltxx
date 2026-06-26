import mongoose from 'mongoose'
import Contribution from "../models/contribution.js";
import ProjectModel from "../models/project.js";

const WEIGHTS = {
    commit: 4,
    review: 3,
    task_complete: 2,
    file_upload: 2,
    comment: 1
}

const isValidObjectId = (value) => mongoose.Types.ObjectId.isValid(value)

export const logContribution = async (req, res) => {
    try {
        const { projectId, type, meta } = req.body

        if (!projectId || !isValidObjectId(projectId)) {
            return res.status(400).json({ message: "Invalid projectId. Please provide a valid MongoDB ObjectId." })
        }

        const project = await ProjectModel.findById(projectId)
        if (!project) {
            return res.status(404).json({ message: "Project not found" })
        }

        const isMember = project.members.some(m => m.user.toString() === req.user._id.toString())
        if (!isMember) {
            return res.status(403).json({ message: "Not a member of this project" })
        }

        const weight = WEIGHTS[type] || 1

        const contribution = await Contribution.create({
            project: projectId,
            user: req.user._id,
            type,
            weight,
            meta
        })

        req.io.to(projectId).emit('new_contribution', contribution)
        res.status(201).json(contribution)
    } catch (error) {
        res.status(500).json({ message: error.message })
    }
}

export const getContribution = async (req, res) => {
    try {
        const { projectId } = req.params

        if (!projectId || !isValidObjectId(projectId)) {
            return res.status(400).json({ message: "Invalid projectId. Please provide a valid MongoDB ObjectId." })
        }

        const project = await ProjectModel.findById(projectId)
        if(!project){
            return res.status(404).json({message:"Project not found"})  
        }
        
        const isMember=project.members.some(m=>m.user.toString()===req.user._id.toString())
        if(!isMember){
            return res.status(403).json({message : "Not a member of this project"})
        }  
        const contributions=await Contribution.find({project:projectId}).populate("user","name email avatar").sort({createdAt:-1})
        res.status(200).json(contributions)
    }catch(err){
        res.status(400).json({message:err.message})
    }
}


export const getProjectSummary = async (req, res) => {
    try {
        const {projectId}=req.params

        if (!projectId || !isValidObjectId(projectId)) {
            return res.status(400).json({ message: "Invalid projectId. Please provide a valid MongoDB ObjectId." })
        }

        const project=await ProjectModel.findById(projectId)
        if(!project){
            return res.status(404).json({message:"Project not found"})  
        }
        const isMember=project.members.some(m=>m.user.toString()===req.user._id.toString())
        if(!isMember){
            return res.status(403).json({message : "Not a member of this project"})
        }

        const summary=await Contribution.aggregate([
            {$match : {project:new mongoose.Types.ObjectId(projectId)}},
            {$group:{
                _id:'$user',
                totalCount:{$sum:1},
                totalWeight:{$sum:'$weight'},
                breakdown: {$push: '$type'}
            }},
            {$lookup:{
                from:'users',
                localField:'_id',
                foreignField:'_id',
                as: 'user'
            }},
            {$unwind:'$user'},
            {$project:{'user.password':0}}
        ])

        res.json(summary)
    }    catch (error) {
        res.status(400).json({ message: error.message })
    }
}