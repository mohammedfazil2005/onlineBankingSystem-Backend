require('dotenv').config()

const express=require('express')
const cors=require('cors')
require('./databaseConnection/db')

const userRouter=require('./routes/userRoute')
const adminRouter=require('./routes/adminRoute')
const server=express()

server.use(cors())
server.use(express.json())

server.use(userRouter)
server.use(adminRouter)

const PORT=3000||process.env.PORT



server.listen(PORT,()=>{
    console.log(`Server Running on PORT https://localhost:${PORT}`)
})

