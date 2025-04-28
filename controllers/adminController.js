const sendOTP = require('../middlewares/emailMiddlware')
const bankdetails = require('../models/bankModel')
const bankModel=require('../models/bankModel')
const users = require('../models/userModel')

const randomString=require('randomstring')

const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "June", "July", "Aug", "Sep", "Oct", "Nov", "Dec"]

let withdrawOTP={}
let withdrawAccountID={}

exports.getCreditCardRequests=async(req,res)=>{
    const userROLE=req.userROLE
    if(userROLE=="creditcardmanager"||userROLE=="generalmanager"){
        try {
            const fetchCreditCardRequests=await bankModel.findOne()
            res.status(200).json({allrequests:fetchCreditCardRequests.creditcardrequests})
        } catch (error) {
            res.status(500).json(error)
            console.log(error)
        }
    }else{
       res.status(401).json("Not authorized!") 
    }
}

exports.approveCreditCardRequests=async(req,res)=>{
    const userROLE=req.userROLE
    const adminID=req.userID
    const userName=req.userName
    const {id,userID}=req.body
    if(userROLE=="creditcardmanager"||userROLE=="generalmanager"){
        const bank=await bankModel.findOne();
        const isUserExists=await users.findById(userID)
        const isApplicationExists=bank.creditcardrequests.find((a)=>a['id']==id)

        if(isUserExists.creditcards.find((a)=>a['cardTier']==isApplicationExists.cardTier)){
            res.status(409).json("User already have this card!")

        }else{
               if(isApplicationExists&&isUserExists){
            let month = new Date().getMonth().toString()
            let year = (new Date().getFullYear() + 5).toString().slice(2, 4)
            const payload={
                cardholderName: `${isUserExists.firstname} ${isUserExists.lastname}`,
                accountNumber: `${randomString.generate({ length: 8, charset: 'numeric' })}0000`,
                cvv: randomString.generate({ length: 3, charset: 'numeric' }),
                cardType: "Credit",
                cardTier:isApplicationExists.cardType,
                cardBalance: isApplicationExists.cardType=="gold"?75000:50000,
                repayAmount:0,
                cardTransactions: [],
                cardExpiryDate: `${month.length >= 2 ? month : `0${month}/${year}`}`,
                status:"active",
                approvedBy:adminID,
                accountholderID:userID,
                penalty:0
            }

           

            const creditCardApprovedMessage={
                id:Date.now(),
                message:`🎉Credit Card Approved! A ${payload.cardTier} Credit Card with a ₹${payload.cardBalance} limit has been approved by ${userName}. (${userROLE}) ✔️`
            }

            const creditCardAccountholderMessage={
                id:Date.now(),
                message:`🎉 Congratulations! Your ${payload.cardTier} Credit Card request has been approved. 💳 Your credit limit is set to ₹${payload.cardBalance}. Start using your card today!`
            }
            

            await bankModel.updateOne({},{$push:{approvedcreditcards:payload,allnotifications:creditCardApprovedMessage},$inc:{bankbalance:-payload.cardBalance},$pull:{creditcardrequests:{id:id}}},)
            await users.updateOne({_id:userID},{$push:{creditcards:payload,notfications:creditCardAccountholderMessage}})
            res.status(200).json("Credit card Approved!")
            await users.updateMany({role:"creditcardmanager"},{$push:{notfications:creditCardApprovedMessage}})
        }else{
            res.status(400).json("Application not found!")
        }
        }
     

    }else{
        res.status(401).json("Not authorized!")
    }
}

exports.addStaff=async(req,res)=>{
    const {firstname, lastname, DOB, role, phonenumber,email,password}=req.body
    const userROLE=req.userROLE
    const imageurl=req.file.filename
    if(userROLE=="generalmanager"){
        try {
            const isEmailExists=await users.findOne({email})
           
            if(isEmailExists){
                res.status(409).json("Email already Exists!")
            }else{
                const newStaff=new users({firstname,lastname,DOB,role,phonenumber,email,password,imageurl})
                let bankmessage={
                    id:Date.now(),
                   message: `A new staff member has been added: ${firstname}, Role: ${role}.`    
                }
                let staffMessage={
                    id:Date.now(),
                   message: `Welcome aboard, ${firstname}! You have been added as a ${role}.`    
                }
                await newStaff.save()
                newStaff.notfications.push(staffMessage)
                await newStaff.save()
                await bankModel.findOneAndUpdate({},{$push:{allnotifications:bankmessage}},{new:true})
                
                res.status(201).json("Staff Added!")
              
            }   
        } catch (error) {
            console.log(error)
            res.status(500).json(error)
        }

    }else{
        res.status(401).json("Not authorized!")
    }
}

exports.getAllLoanRequests=async(req,res)=>{
    const userROLE=req.userROLE
    if(userROLE=="generalmanager"||userROLE=="loanofficer"){
        try {
            const allRequests=await bankdetails.findOne({})
            res.status(200).json(allRequests.loanrequest?allRequests.loanrequest:[])
        } catch (error) {
            console.log(error)
            res.status(500).json(error)
        }
    }else{
        res.status(401).json("Not Authorized")
    }
}

exports.approveLoan=async(req,res)=>{
    const userROLE=req.userROLE
    const adminName=req.userName
    const {loanID}=req.body
    if(userROLE=="generalmanager"||userROLE=="loanofficer"){
        try {
            const bank=await bankdetails.findOne({})
            let isLoanExists=bank.loanrequest.find((a)=>a['id']==loanID)
            
            if(isLoanExists){
                let interest=(isLoanExists.requestedAmount*isLoanExists.interestRate*isLoanExists.loanDuration)/100
             
                let totalLoanAmountRepay=Number(isLoanExists.requestedAmount)+interest
                let totalMonthForLoan=isLoanExists.loanDuration*12
                let totalEMI=Math.ceil(totalLoanAmountRepay/totalMonthForLoan)

                let date=new Date().getDate()
                let month=new Date().getMonth() + 1
                let year=new Date().getFullYear()

                let currentDate = `${date}/${month < 10 ? '0' + month : month}/${year}`;

               let loanpayload={
                loantype:isLoanExists.loanType,
                loanamount:isLoanExists.requestedAmount,
                loanduration:isLoanExists.loanDuration,
                interestrate:isLoanExists.interestRate,
                remainingloanamount:totalLoanAmountRepay,
                EMIAmount:totalEMI,
                EMIdate:currentDate,
                loanID:Date.now(),
                userID:isLoanExists.userID
               }

               const loanApprovedMessageForUser = {
                id: Date.now(),
                message: `🎉 Congratulations! Your loan request for ₹${isLoanExists.requestedAmount} has been approved! 🏦 The loan will be processed, and the amount will be credited to your account soon.`
            }

            const loanApprovedMessageForGM = {
                id: Date.now(),
                message: `🎉 Loan Approved! A loan request for ₹${isLoanExists.requestedAmount} has been approved by ${adminName} (${userROLE}). The loan will be processed for the account holder ${isLoanExists.fullname}. ✔️`
            }
            
            const cdate=new Date().getMonth()
            const currentMonth=monthNames[cdate]


            let isMonthAlreadyExists=bank.allloanstatusmonthly.find((a)=>a['month']==currentMonth)

            if(isMonthAlreadyExists){
                if(isMonthAlreadyExists.pending>0){
                    await bankdetails.findOneAndUpdate({'allloanstatusmonthly.month':currentMonth},{$inc:{'allloanstatusmonthly.$.pending':-1}})
                }
                await bankdetails.findOneAndUpdate({'allloanstatusmonthly.month':currentMonth},{$inc:{'allloanstatusmonthly.$.approved':1}})
            }else{
                let newMonth={   
                    pending:0,
                    approved:1,
                    rejected:0,
                }
                bankdetails.allloanstatusmonthly.push(newMonth)
            }


               await bankdetails.findOneAndUpdate({},{$inc:{bankbalance:-isLoanExists.requestedAmount,loanapprovedamount:isLoanExists.requestedAmount},$push:{approvedloans:loanpayload,allnotifications:loanApprovedMessageForGM},$pull:{loanrequest:{id:loanID}}})

               await users.updateMany({role:'loanofficer'},{$push:{notfications:loanApprovedMessageForGM}})

                await users.findOneAndUpdate({_id:isLoanExists.userID},{$inc:{'debitCard.cardBalance':Number(isLoanExists.requestedAmount)},$push:{notfications:loanApprovedMessageForUser,loans:loanpayload},$pull:{requestedloans:{id:loanID}}})
                bank.save()
                res.status(200).json("Loan Approved!")


            }else{
                res.status(400).json("Loan not found!")
            }
        } catch (error) {
            console.log(error)
            res.status(500).json(error)
        }

    }else{
        res.status(401).json("Not authorized")
    }
}

exports.getAllStaff=async(req,res)=>{
    const userROLE=req.userROLE
    if(userROLE=="generalmanager"){
        try {
            const Allusers=await users.find()
            let staffs=Allusers.filter((a)=>a['role']!=="generalmanager"&&a['role']!=="accountholder")
            res.status(200).json(staffs)
        } catch (error) {
            console.log(error)
            res.status(500).json(error)
        }
    }else{
        res.status(401).json("Not authorized")
    }
}

exports.getAllApprovedCreditCards=async(req,res)=>{
    const userROLE=req.userROLE
    if(userROLE=="creditcardmanager"||userROLE=="generalmanager"){
        try {
            const allDetails=await bankdetails.findOne({})
            res.status(200).json(allDetails.approvedcreditcards)
        } catch (error) {
            console.log(error)
            res.status(500).json(error)
        }
    }else{
        res.status(401).json("Not authorized")
    }
}

exports.onWithdrawel=async(req,res)=>{
    const userROLE=req.userROLE
    const accountNumber=req.params.accno
    const {amount}=req.body
    if(userROLE=="accountmanager"||userROLE=="generalmanager"){
        try {
            const isAccountExists=await users.findOne({'debitCard.accountNumber':accountNumber})
            if(isAccountExists){
                if(isAccountExists.debitCard['cardBalance']>=amount){
                    let OTP=randomString.generate({charset:'numeric',length:4})
                    withdrawOTP={
                        [accountNumber]:OTP, 
                    }
                    let firstdigits=accountNumber.slice(0,4)
                    withdrawAccountID={
                        accno:accountNumber,
                        amount:amount,
                        name:isAccountExists.firstname,
                        firstdigits:firstdigits,
                        id:isAccountExists._id
                    }    
                    sendOTP(isAccountExists.email,OTP)
                    res.status(200).json("OTP sent succesfully")
    
                }else{
                    res.status(400).json("Insufficent Balance")
                }
               
            }else{
                res.status(404).json("Account not found!")
            }
        } catch (error) {
            console.log(error)
            res.status(500).json(error)
        }
    }else{
        res.status(401).json("Not authorized!")
    }
}

exports.onWithdrawelOTP=async(req,res)=>{
    const adminID=req.userID
    const userROLE=req.userROLE
    let OTP=req.params.OTP
    if(userROLE=="accountmanager"||userROLE=="generalmanager"){
        if(withdrawOTP[withdrawAccountID.accno]==OTP){
            try {

                const bank=await bankdetails.findOne({})
                const isUser=await users.findOne({_id:withdrawAccountID.id})

                let month=new Date().getMonth()
                let currentMonth=monthNames[month]

                console.log(currentMonth)

                let isMonthAlreadyExistsInTransactions=bank.alltransactionsmonthly.find((a)=>a['month']==currentMonth)

                if(isMonthAlreadyExistsInTransactions){
                    await bankdetails.findOneAndUpdate({'alltransactionsmonthly.month':currentMonth},{$inc:{'alltransactionsmonthly.$.count':1}})
                }else{
                    let newMonth={
                        month:currentMonth,
                        count:1
                    }
                    bank.alltransactionsmonthly.push(newMonth)
                }

                let isMonthAlreadyExistsInUserTransaction=isUser.transactionchart.find((a)=>a['month']==currentMonth)

                if(isMonthAlreadyExistsInUserTransaction){
                    await users.findOneAndUpdate({_id:withdrawAccountID.id,'transactionchart.month':currentMonth},{$inc:{'transactionchart.$.count':1}})
                }else{
                    let newMonth={
                        month:currentMonth,
                        count:1
                    }
                    isUser.transactionchart.push(newMonth)
                }

                let isMonthAlreadyExists=bank.allwithdrawelmonthly.find((a)=>a['month']==currentMonth)

                if(isMonthAlreadyExists){
                    await bankdetails.findOneAndUpdate({'allwithdrawelmonthly.month':currentMonth},{$inc:{'allwithdrawelmonthly.$.count':1}})
                }else{
                    let newMonth={
                        month:currentMonth,
                        count:1
                    }
                    bank.allwithdrawelmonthly.push(newMonth)
                }


                const cashWithdrawalUserNotification = {
                    id: Date.now(),
                    message: `💵 Cash Withdrawal Successful! You have withdrawn ₹${withdrawAccountID.amount} using your debit card starting in ${withdrawAccountID.firstdigits}.`
                  };
                  
                  const cashWithdrawalMessageForGM = {
                    id: Date.now(),
                    message: `💳 Cash Withdrawal Alert! User ${withdrawAccountID.name}  withdrew ₹${withdrawAccountID.amount} using their debit card starting in ${withdrawAccountID.firstdigits}.`
                  };

                  const cashWithdrawalMessageForStaff = {
                    id: Date.now(),
                    message: `💳 Cash Withdrawal Notification: You have successfully withdrawn ₹${withdrawAccountID.amount} using your debit card starting in ${withdrawAccountID.firstdigits}.`
                  };
                
                  let cDate=new Date().getDate()
                  let cMonths=new Date().getMonth()
                  let cYears=new Date().getFullYear()
                
                  let currentDate=`${cDate}/${cMonths}/${cYears}`
                
                    let debitTransaction={
                    from:withdrawAccountID.name,
                    to:'withdraw',
                    date:currentDate,
                    amount:withdrawAccountID.amount,
                    message:'Withdrawel',
                    card:'debit',
                    status:'success',
                    senderID:'BANK AI (withdrawel)',
                    transactionType:"debited",
                    withdrawnBy:adminID
                    
                }
                
                
                 await users.findOneAndUpdate({'debitCard.accountNumber':withdrawAccountID.accno},{$inc:{'debitCard.cardBalance':-withdrawAccountID.amount},$push:{notfications:cashWithdrawalUserNotification,transactions:debitTransaction,'debitCard.cardTransactions':debitTransaction}})
                 
                 await bankdetails.findOneAndUpdate({},{$inc:{totalwithdrawelamount:withdrawAccountID.amount},$push:{allnotifications:cashWithdrawalMessageForGM,alltransactions:debitTransaction}})

                 await users.findOneAndUpdate({_id:adminID},{$push:{notfications:cashWithdrawalMessageForStaff}})
                 
                await bank.save()
                await isUser.save()
                

                


              

                res.status(200).json("Transaction completed!")


            } catch (error) {
                console.log(error)
                res.status(500).json(error)
            }
        }else{
            res.status(400).json("Invalid OTP")
        }
    }else{
        res.status(401).json("Not authorized!")
    }
}

exports.getAllAccountHolders=async(req,res)=>{
    const userROLE=req.userROLE
    const userID=req.userID
    if(userROLE=="accountmanager"||userROLE=="generalmanager"){
        try {
            const Allusers=await users.find({'role':'accountholder'})
            res.status(200).json(Allusers)
        } catch (error) {
            console.log(error)
            res.status(500).json(error)
        }
    }else{
        res.status(401).json("Not Authorized!")
    }
}


exports.getAllTransactions=async(req,res)=>{
    const userROLE=req.userROLE
    if(userROLE=="generalmanager"){
        try {
            const allTransactions=await bankdetails.findOne({})
            res.status(200).json(allTransactions.alltransactions)
        } catch (error) {
            console.log(error)
            res.status(500).json(error)
        }

    }else{
        res.status(401).json("Not authorized")
    }



}

exports.getAllNotifications=async(req,res)=>{
    const userROLE=req.userROLE
    if(userROLE=="generalmanager"){
        try {
            const allTransactions=await bankdetails.findOne({})
            res.status(200).json(allTransactions.allnotifications)
        } catch (error) {
            console.log(error)
            res.status(500).json(error)
        }

    }else{
        res.status(401).json("Not authorized!")
    }
}

exports.getDashboardDetailsAdmin=async(req,res)=>{
    const userRole=req.userROLE
    if(userRole=="generalmanager"||userRole=="accountmanager"||userRole=="creditcardmanager"||userRole=="operationmanager"||userRole=="loanofficer"){
        try {

            const bank=await bankdetails.findOne({})
            const allusers=await users.find() 
            const details={
                totalbalance:bank.bankbalance,
                totalusers:allusers.length,
                totalloanamountapproved:bank.loanapprovedamount,
                totalwithdrawelamount:bank.totalwithdrawelamount,
                totalcreditcardApproved:bank.approvedcreditcards.length,
                totalcreditcardrequestpending:bank.creditcardrequests.length,
                totalaccountholders:allusers.filter((a)=>a['role']=="accountholder").length,
                totalloansapproved:bank.approvedloans.length,
                totalloansrequestpending:bank.loanrequest.length,
                loanstatusmonthlychart:bank.allloanstatusmonthly,
                loanmonthlyrequestchart:bank.allloanrequestmonthly,
                creditcardMonthlyrequestschart:bank.allcreditcardrequestmonthly,
                withdrawelmonthlychart:bank.allwithdrawelmonthly

            }
            res.status(200).json(details)
            
        } catch (error) {
            console.log(error)
            res.status(500).json(error)
        }

    }else{
        res.status(401).json("Not authorized!")
    }
}

exports.sendNotificationToAllUsers=async(req,res)=>{
    const userROLE=req.userROLE
    const {title,message}=req.body
    if(userROLE=="generalmanager"){
        const notification={
            id:Date.now(),
            title:title,
            message:message,
            by:'General Manager (BANK AI)'
        }
        try {
            const sendNotification=await users.updateMany({},{$push:{'notfications':notification}})
            const bankNotification=await bankdetails.updateMany({},{$push:{allnotifications:notification}})
            res.status(200).json("Notification Send successfully!")

        } catch (error) {
            console.log(error)
            res.status(500).json(error)
        }
    }else{
        res.status(500).json("Not authorized!")
    }
}

exports.sendNotificationToUser=async(req,res)=>{
    const userROLE=req.userROLE
    const userID=req.params.userid
    const {title,message}=req.body
    if(userROLE=="generalmanager"){
        const notification={
            id:Date.now(),
            title:title,
            message:message,
            by:'General Manager (BANK AI)'
        }
        try {
            await users.updateOne({_id:userID},{$push:{'notfications':notification}})
            res.status(200).json("Notification Send successfully!")

        } catch (error) {
            console.log(error)
            res.status(500).json(error)
        }
    }else{
        res.status(500).json("Not authorized!")
    }
}

exports.fetchUserDetails=async(req,res)=>{
    const userROLE=req.userROLE
    const userid=req.params.id
    if(userROLE=="accountmanager"||userROLE=="generalmanager"){
        try {
         const isUserExists=await users.findOne({_id:userid})
         const transaction=isUserExists.transactions.slice(0,4)
         if(isUserExists){
            const payload={
                id:isUserExists._id,
                profileimage:isUserExists.imageurl,
                name:`${isUserExists.firstname} ${isUserExists.lastname}`,
                email:isUserExists.email,
                phone:isUserExists.phonenumber,
                status:isUserExists.status,
                Address:`${isUserExists.state},India`,
                debitCard:isUserExists.debitCard,
                creditcards:isUserExists.creditcards,
                transactions:transaction    

            }
            res.status(200).json(payload)
         }else{
            res.status(404).json("User not found")
         }

        } catch (error) {
            console.log(error)
            res.status(500).json(error)
        }
    }else{
        res.status(401).json("Not authorized!")
    }
}


exports.onRejectCreditCardRequest=async(req,res)=>{
    const userID=req.userID
    const userROLE=req.userROLE
    const creditCardID=req.params.id
    if(userROLE=="creditcardmanager"||userROLE=="generalmanager"){
        try {
            const userNotification = {
                id: Date.now(),
                message: "We're sorry, but your credit card request has been rejected. Please try again after some time."
            };
            
            const adminNotification = {
                id: Date.now(),
                message: "The credit card request has been rejected.",
                by:userROLE=="creditcardmanager"?"creditcardmanager":'General Manager (BANK AI)'
            };
    
            await users.findOneAndUpdate({_id:userID},{$push:{notfications:userNotification}})
            await users.updateMany({role:"creditcardmanager"},{$push:{notfications:adminNotification}})
            await bankdetails.updateOne({},{$pull:{creditcardrequests:{id:Number(creditCardID)}},$push:{allnotifications:adminNotification}})
            res.status(200).json("Credit card request Rejected succesfully!")
        } catch (error) {
            console.log(error)
            res.status(500).json(error)
        }
    }else{
        res.status(401).json("Not authorized")
    }
}

exports.onRejectLoanRequests=async(req,res)=>{
    const userID=req.userID
    const userROLE=req.userROLE
    const {loanID,loanUserID}=req.body

    if(userROLE=="loanofficer"||userROLE=="generalmanager"){    
        const userNotification={
            id:Date.now(),
            message:"We're sorry! Your loan request has been rejected. You can try applying again later."
        }
        const adminNotification={
            id:Date.now(),
            message:"A loan request has been rejected."
        }
        try {
            const bank=await bankdetails.findOne({})
            let month=new Date().getMonth()
            let currentMonth=monthNames[month]

            const isMonthAlreadyExists=bank.allloanstatusmonthly.find((a)=>a['month']==currentMonth)

            if(isMonthAlreadyExists){
                if(isMonthAlreadyExists.pending>0){
                    await bankdetails.findOneAndUpdate({'allloanstatusmonthly.month':currentMonth},{$inc:{'allloanstatusmonthly.$.pending':-1}}) 
                }
                await bankdetails.findOneAndUpdate({'allloanstatusmonthly.month':currentMonth},{$inc:{'allloanstatusmonthly.$.rejected':1}})
            }else{
                const newMonth={
                    month:currentMonth,
                    approved:0,
                    rejected:1,
                    pending:0
                }
                bank.allloanstatusmonthly.push(newMonth)
            }

            bank.save()
            await bankdetails.findOneAndUpdate({},{$pull:{loanrequest:{id:Number(loanID)}},$push:{allnotifications:adminNotification}})
            await users.updateMany({role:"loanofficer"},{$push:{notfications:adminNotification}})
            await users.updateOne({_id:loanUserID},{$pull:{requestedloans:{id:Number(loanID)}},$push:{notfications:userNotification}})
            res.status(200).json("Loan Rejected successfully")
        } catch (error) {
            console.log(error)
            res.status(500).json(error)
        }

    }else{
        res.status(500).json("Not authorized")
    }

}