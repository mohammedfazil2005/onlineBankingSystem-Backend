const mongoose=require('mongoose')

const bankSchema=new mongoose.Schema({
    bankbalance:{type:Number},
    loanapprovedamount:{type:Number},
    totalwithdrawelamount:{type:Number},
    approvedloans:[],
    approvedcreditcards:[],
    loanrequest:[],
    creditcardrequests:[],
    alltransactions:[],
    allnotifications:[],
    allcreditcardrequestmonthly:[],
    allloanrequestmonthly:[],
    alltransactionsmonthly:[],
    allloanstatusmonthly:[],
    allwithdrawelmonthly:[],
    
})

const bankdetails=mongoose.model("bank",bankSchema)

module.exports=bankdetails