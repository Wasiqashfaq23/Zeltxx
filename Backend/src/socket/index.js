import {Server} from 'socket.io'

export const initSocket=(httpServer)=>{
    const io=new Server(httpServer,{
        cors:{
            origin:process.env.CLIENT_URL,
            credentials:true
        }
    })
    io.on('connection',(socket)=>{
        console.log('socket connected', socket.id)


        socket.on('join_project', (projectId)=>{
            socket.join(projectId)
            console.log(`Socket ${socket.id} joined project ${projectId}`)
        })

        socket.on('leave_project', (projectId)=>{
            socket.leave(projectId)
            console.log(`Socket ${socket.id} left project ${projectId}`)
        })

        socket.on('disconnect', ()=>{
            console.log(`Socket disconnected`)
        })


    })
    return io
}