import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import User from "../models/user.js";
import Invite from "../models/invite.js";
import Notification from "../models/notification.js";
import Project from "../models/project.js";

passport.use(
    new GoogleStrategy(
        {
            clientID: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            callbackURL: process.env.GOOGLE_CALLBACK_URL
        },

        async (accessToken, refreshToken, profile, done) => {
            try {
                let user = await User.findOne({ googleId: profile.id })

                if (!user) {
                    user = await User.create({
                        googleId: profile.id,
                        name: profile.displayName,
                        email: profile.emails[0].value,
                        avatar: profile.photos[0].value
                    })
                }

                const pendingInvites = await Invite.find({ email: user.email.toLowerCase(), status: 'pending' })

                for (const invite of pendingInvites) {
                    const project = await Project.findById(invite.project)
                    if (!project) continue

                    const alreadyMember = project.members.some(m => m.user.toString() === user._id.toString())
                    if (!alreadyMember) {
                        project.members.push({ user: user._id, role: invite.role })
                        await project.save()

                        await Notification.create({
                            user: user._id,
                            type: 'project_invite',
                            message: `You were added to ${project.name}`,
                            project: project._id
                        })
                    }

                    invite.status = 'accepted'
                    await invite.save()
                }

                done(null, user)
            } catch (err) {
                done(err, null)
            }
        }
    )
);

export default passport
