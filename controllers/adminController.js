const bankdetails = require('../models/bankModel')
const bankModel=require('../models/bankModel')
const users=require('../models/userModel')
const randomString=require('randomstring')

const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "June", "July", "Aug", "Sep", "Oct", "Nov", "Dec"]

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
                cardTransactions: [],
                cardExpiryDate: `${month.length >= 2 ? month : `0${month}/${year}`}`,
                status:"active",
                approvedBy:adminID,
                accountholderID:userID
            }

            const creditCardApprovedMessage={
                id:Date.now(),
                message:`🎉Credit Card Approved! A ${payload.cardTier} Credit Card with a ₹${payload.cardBalance} limit has been approved by ${userName}. (${userROLE}) ✔️`
            }

            const creditCardAccountholderMessage={
                id:Date.now(),
                message:`🎉 Congratulations! Your ${payload.cardTier} Credit Card request has been approved. 💳 Your credit limit is set to ₹${payload.cardBalance}. Start using your card today!`
            }

            await bankModel.updateOne({},{$push:{approvedcreditcards:payload,allnotifications:creditCardApprovedMessage}},)
            await bankModel.updateOne({},{$pull:{creditcardrequests:{id:id}}})
            await users.updateOne({_id:userID},{$push:{creditcards:payload,notfications:creditCardAccountholderMessage}})
            res.status(200).json("Credit card Approved!")
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
                let month=(new Date().getMonth() + 2) % 12
                let year=new Date().getFullYear()

                let currentDate = `${date}/${month < 10 ? '0' + month : month}/${year}`;

               let loanpayload={
                loantype:isLoanExists.loanType,
                loanamount:isLoanExists.requestedAmount,
                loanduration:isLoanExists.loanDuration,
                interestrate:isLoanExists.interestRate,
                remainingloanamount:totalLoanAmountRepay,
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
            let cmonth=new Date().getMonth()
            let currentMonth=monthNames[cmonth]

            let isMonthAlreadyExists=bank.allloanstatusmonthly.find((a)=>a['month']==currentMonth)

            if(isMonthAlreadyExists){
                if(isMonthAlreadyExists.pending>0){
                    await bankdetails.findOneAndUpdate({'allloanstatusmonthly.month':currentMonth},{$inc:{'allloanstatusmonthly.$.pending':-1}})
                }
                await bankdetails.findOneAndUpdate({'allloanstatusmonthly.month':currentMonth},{$inc:{'allloanstatusmonthly.$.approved':1}})
            }else{
                let newMonth={
                    month:currentMonth,
                    pending:0,
                    approved:1,
                    rejected:0,
                }
                bankdetails.allloanstatusmonthly.push(newMonth)
            }


               await bankdetails.findOneAndUpdate({},{$inc:{bankbalance:-isLoanExists.requestedAmount},$push:{approvedloans:loanpayload,allnotifications:loanApprovedMessageForUser}})
                await users.findOneAndUpdate({_id:isLoanExists.userID},{$inc:{'debitCard.cardBalance':isLoanExists.requestedAmount},$push:{notfications:loanApprovedMessageForUser,loans:loanpayload},$pull:{requestedloans:{id:loanID}}})
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