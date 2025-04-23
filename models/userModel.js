const mongoose=require('mongoose')

const userSchema=new mongoose.Schema({
    firstname:{type:String,required:true},
    lastname:{type:String,required:true},
    DOB:{type:String,required:true},
    role:{type:String,required:true},
    phonenumber:{type:String,required:true},
    state:{type:String},
    pincode:{type:Number},
    email:{type:String,required:true},
    password:{type:String,required:true},
    imageurl:{type:String,required:true},
    monthlyincome:{type:Number},
    transactions:[],
    debitCard:{},
    loans:[],
    notfications:[],
    creditcards:[],
    transactionchart:[],
    requestedloans:[]
})

const users=mongoose.model("users",userSchema)

module.exports=users