const mongoose=require('mongoose')
const connectionString=process.env.connectionID

mongoose.connect(connectionString).then(()=>{
    console.log("Database connected!")
}).catch((err)=>{
    console.log('Failed to connect Database',err)
})