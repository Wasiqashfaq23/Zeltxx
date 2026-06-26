import express from 'express'
import passport from 'passport'
import jwt from 'jsonwebtoken'
import { protect } from "../middleware/auth.js"

const router = express.Router()

router.get('/google',
    passport.authenticate('google', {
        scope: ['profile', 'email'], session: false
    }))

router.get("/google/callback",
    passport.authenticate('google', { failureRedirect: '/login', session: false }),
    (req, res) => {
        const token = jwt.sign(
            { id: req.user._id },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        )
        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 7 * 24 * 60 * 60 * 1000
        })
        res.redirect(process.env.CLIENT_URL + '/dashboard')
    }
)

router.post("/logout",(req,res)=>{
    res.clearCookie('token')
    res.json({message:"Logged Out"})
})

router.get("/me".protect,(req,res)=>{
    res.json(req.user)
})

export default router