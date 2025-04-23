const multer=require('multer')

const storage=multer.diskStorage({
    destination:(req,file,callback)=>{
        callback(null,'./uploads')
    },
    filename:(req,file,callback)=>{
        callback(null,`profile-${Date.now()}${file.originalname}`)
    }
})

const multerMiddlware=multer({storage})

module.exports=multerMiddlware;