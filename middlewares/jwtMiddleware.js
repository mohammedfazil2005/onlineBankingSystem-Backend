const jwt=require('jsonwebtoken')

const tokenAuthentication=(req,res,next)=>{
    if(req.headers['authorization']){
        let token=req.headers['authorization'].split(' ')[1]
       
        try {
            let verifyToken=jwt.verify(token,process.env.SECRETKEY)
                req.userID=verifyToken.userID
                req.userROLE=verifyToken.role
                req.userName=verifyToken.name
                next()
        } catch (error) {
             console.log(error)
            res.status(500).json("Error occured!")
        }

    }else{
        res.status(400).json('token required')
        console.log('token required')
    }
}

module.exports=tokenAuthentication