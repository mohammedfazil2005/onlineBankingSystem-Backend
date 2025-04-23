const users = require('../models/userModel')
const bankdetails = require('../models/bankModel')
const jwt = require('jsonwebtoken')
const randomString = require('randomstring')
const sendOTP = require('../middlewares/emailMiddlware')

let objOTP = {}

let transactionObj={}

const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "June", "July", "Aug", "Sep", "Oct", "Nov", "Dec"]

exports.onRegister = async (req, res) => {
    const { firstname, lastname, DOB, role, phonenumber, state, pincode, email, password, monthlyincome } = req.body
    const imageurl = req.file.filename
    try {
        const isUserExists = await users.findOne({ email })
        const bank = await bankdetails.findOne()

        if (isUserExists) {
            res.status(409).json("User already exisits in this email!")
        } else {


            const newUser = new users({ firstname, lastname, DOB, role, phonenumber, state, pincode, email, password, imageurl, monthlyincome })
            await newUser.save()

            if (newUser.role == "accountholder") {
                let month = new Date().getMonth().toString()
                let year = (new Date().getFullYear() + 5).toString().slice(2, 4)

                let bankdetails = {
                    cardholderName: `${newUser.firstname} ${newUser.lastname}`,
                    accountNumber: `${randomString.generate({ length: 8, charset: 'numeric' })}0000`,
                    cvv: randomString.generate({ length: 3, charset: 'numeric' }),
                    cardType: "Debit",
                    cardBalance: 1000,
                    cardTransactions: [],
                    cardExpiryDate: `${month.length >= 2 ? month : `0${month}/${year}`}`,
                    status: "active",
                    penalty:0,
                }

                newUser.debitCard = bankdetails

                bank.bankbalance = bank.bankbalance - 1000

                newUser.notfications.push({ id: Date.now(), message: "Account Created 🔐 Your account has been set up! Check your profile and update your details if needed." })
                newUser.notfications.push({ id: Date.now(), message: "₹1000 Added 🎉 A deposit of ₹1000 has been successfully credited to your account. Check your balance for details!" })
                bank.allnotifications.push({ id: newUser._id, message: `A new account has been created! ${firstname + lastname}  has successfully signed up. Check the admin panel for details. ✅` })
            } else if (newUser.role == "creditcardmanager") {
                newUser.notfications.push({
                    id: Date.now(),
                    message: "🎉 Congratulations on your new role as Credit Card Manager! You've been successfully appointed as a staff member. Explore your dashboard to get started!"
                });
                bank.allnotifications.push({
                    id: newUser._id,
                    message: `📢 New Staff Appointed! ${firstname + " " + lastname} has been assigned the role of Credit Card Manager. Review their access and responsibilities in the admin panel.`
                });
            } else if (newUser.role == "loanofficer") {
                newUser.notfications.push({
                    id: Date.now(),
                    message: "🏦 Welcome aboard! You've been appointed as a Loan Officer. Start managing and approving loan applications effectively!"
                });

                bank.allnotifications.push({
                    id: newUser._id,
                    message: `📢 New Staff Assigned! ${firstname + " " + lastname} is now a Loan Officer. Track loan activities under their supervision in the admin panel.`
                });
            } else if (newUser.role == "acccountmanager") {
                newUser.notfications.push({
                    id: Date.now(),
                    message: "💼 Welcome! You've been assigned as an Account Manager. Start handling user accounts, deposits, and withdrawals seamlessly!"
                });

                bank.allnotifications.push({
                    id: newUser._id,
                    message: `📋 Staff Update: ${firstname + " " + lastname} is now serving as an Account Manager. Monitor their account-related operations via the admin panel.`
                });
            } else if (newUser.role == "operationmanager") {
                newUser.notfications.push({
                    id: Date.now(),
                    message: "🚀 Congrats on your new position as Operations Manager! You now have access to monitor and manage key system operations."
                });

                bank.allnotifications.push({
                    id: newUser._id,
                    message: `🔧 Operations Manager Added! ${firstname + " " + lastname} has taken charge as the new Operations Manager. Overview their activities from the admin panel.`
                });
            }






            const token = jwt.sign({ userID: newUser._id, role: newUser.role, name: newUser.firstname }, process.env.SECRETKEY)

            await bank.save()
            await newUser.save()
            res.json({ token: token, user: newUser })

        }
    } catch (error) {
        res.status(500).json("Error occured")
        console.log(error)
    }
}

exports.onLoginWithEmailAndPassword = async (req, res) => {
    const { email, password } = req.body
    try {
        const isUserExists = await users.findOne({ email, password })
        if (isUserExists) {
            const token = jwt.sign({ userID: isUserExists._id, role: isUserExists.role, name: isUserExists.firstname }, process.env.SECRETKEY)
            res.status(200).json({ username: isUserExists.firstname + isUserExists.lastname, token: token })
        } else {
            res.status(400).json("User not exist!")
        }
    } catch (error) {
        console.log(error)
        res.status(500).json(error)
    }
}

exports.onLogin = async (req, res) => {
    const { email } = req.body
    try {
        const isEmailExists = await users.findOne({ email })
        if (isEmailExists) {
            const OTP = randomString.generate({ length: 4, charset: 'numeric' })
            objOTP[email] = OTP

            const OTPresponce = await sendOTP(email, OTP)

            if (OTPresponce.status == 200) {
                res.status(201).json("OTP Sent succesfully")

                setTimeout(() => {
                    delete objOTP[email]
                    console.log("OTP expired!")
                }, 3 * 60 * 1000)

            } else {
                res.status(404).json("Error occured")
            }

        } else {
            res.status(401).json("user not found!")
        }
    } catch (error) {
        console.log(error)
    }
}


exports.onOTP = async (req, res) => {
    const { email, OTP } = req.body
    try {
        const userExists = await users.findOne({ email })
        if (!objOTP[email]) {
            res.status(400).json("OTP expired")
        } else {
            if (objOTP[email] == OTP) {
                const token = jwt.sign({ userID: userExists._id, role: userExists.role, name: userExists.firstname }, process.env.SECRETKEY)
                userExists.notfications.push({ id: Date.now(), message: "Welcome back! You’re now logged in. Explore your dashboard and manage your account seamlessly. 🚀" })
                await userExists.save()
                res.status(200).json({ message: "Login success", token: token })
                delete objOTP[email]
            } else {
                res.status(400).json("Incorrect OTP")
            }
        }
    } catch (error) {
        res.status(500).json("Error occured")
    }
}


exports.onCreditCardApplication = async (req, res) => {
    let userID = req.userID
    let userROLE = req.userROLE
    if (userROLE == "accountholder") {
        const { cardType } = req.body;

        try {
            const isUserExists = await users.findById(userID)
            if (isUserExists) {

                let bankdet = await bankdetails.findOne()

                let creditCardRequestAlreadyExists = bankdet.creditcardrequests.filter((a) => a['userID'] == userID).find((user) => user.cardType == cardType)

                let isCreditCardAlreadyExists = isUserExists.creditcards.find((a) => a['cardTier'] == cardType)

                if (creditCardRequestAlreadyExists) {
                    res.status(409).json("Already requested!")
                } else {

                    if (isCreditCardAlreadyExists) {
                        res.status(409).json(`You have already ${cardType} Credit Card!`)
                    } else {
                        const payload = {
                            name: `${isUserExists.firstname} ${isUserExists.lastname}`,
                            email: `${isUserExists.email}`,
                            cardType: cardType,
                            status: "pending",
                            userID: isUserExists._id,
                            id: Date.now()
                        }

                        let notification = {
                            id: isUserExists._id,
                            message: `${isUserExists.firstname} has applied for a credit card.`
                        }

                        const monthIndex = new Date().getMonth()

                        let currentMonth = monthNames[monthIndex]

                        const isMonthAlreadyExists = bankdet.allcreditcardrequestmonthly.find((a) => a.month == currentMonth)

                        if (isMonthAlreadyExists) {
                            if (cardType == "silver") {
                                isMonthAlreadyExists.silver += 1
                            } else if (cardType == "gold") {
                                isMonthAlreadyExists.gold += 1
                            }
                        } else {
                            const newMonth = {
                                month: currentMonth,
                                silver: cardType == "silver" ? 1 : 0,
                                gold: cardType == "gold" ? 1 : 0,
                            }
                            bankdet.allcreditcardrequestmonthly.push(newMonth)
                        }


                        bankdet.creditcardrequests.push(payload);
                        bankdet.allnotifications.push(notification);

                        await bankdet.save()

                        res.status(200).json({ message: "Request success!", bank: bankdet })
                    }


                }



            } else {
                res.status(404).json("User not found!")
            }

        } catch (error) {
            console.log(error)
            res.status(500).json("Error occured")
        }
    } else {
        res.status(401).json("Not authorized!")
    }



}




exports.onTransaction = async (req, res) => {
    const userROLE = req.userROLE
    const userID = req.userID

    const {recipentAccountNumber,cardType,amount,message}=req.body

    if(userROLE=="accountholder"){

        try {
        const isUserExists=await users.findById(userID)
        const isRecipentExists=await users.findOne({'debitCard.accountNumber':recipentAccountNumber})

        if(isUserExists){
            if(isRecipentExists){
                
              let cardDetails=cardType=='gold'?isUserExists.creditcards.find((a)=>a['cardTier']=='gold'):cardType=="silver"?isUserExists.creditcards.find((a)=>a['cardTier']=="silver"):cardType=="debit"?isUserExists.debitCard:""

              if(cardDetails){

                if(cardDetails.cardBalance>=amount){

                    let date=new Date().getDate()
                    let month=new Date().getMonth()
                    let year=new Date().getFullYear()

                    let currentDate=`${date}/${month}/${year}`

                    transactionObj={
                        profileimage:isUserExists.imageurl,
                        from:isUserExists.firstname,
                        to:isRecipentExists.firstname,
                        date:currentDate,
                        amount:amount,
                        message:message?message:'',
                        card:cardType,
                        senderID:isUserExists._id,
                        receiverID:isRecipentExists._id,
                        email:isUserExists.email
                        
                    }

                    let OTP=randomString.generate({charset:'numeric',length:4})

                    await sendOTP(isUserExists.email,OTP)

                    objOTP={
                        [isUserExists.email]:OTP
                    }
                    res.status(200).json("Please Enter your OTP to confirm Transaction!")


                }else{
                    res.status(400).json("Insuffient Balance!")
                }
                

              }else{
                res.status(404).json("Card not found!")
              }

            }else{
                res.status(400).json("Oops! Account not found!")
            }
        }else{
            res.status(400).json("Please login again!")
        }
        } catch (error) {
            console.log(error)
            res.status(500).json(error)
        }

    }else{
        res.status(401).json("Not authorized!")
    }
    
}

exports.onTransactionOTP=async(req,res)=>{
    const userID=req.userID
    const userRole=req.userROLE

    const OTP=req.params.otp

    if(userRole=="accountholder"){

        if(objOTP[transactionObj.email]==OTP){

            const isRecipentExists=await users.findOne({_id:transactionObj.receiverID})
            const isSenderExists=await users.findOne({_id:userID})
            const bank=await bankdetails.findOne()

            let cardDetails=transactionObj.card=='gold'?isSenderExists.creditcards.find((a)=>a['cardTier']=='gold'):transactionObj.card==="silver"?isSenderExists.creditcards.find((a)=>a['cardTier']=="silver"):transactionObj.card==="debit"?isSenderExists.debitCard:""

            if(cardDetails){

                

                let debitTransaction={
                    to:isRecipentExists.firstname,
                    date:transactionObj.date,
                    amount:transactionObj.amount,
                    card:transactionObj.card,
                    message:transactionObj.message,
                    status:'success',
                    recipentID:isRecipentExists._id
                }

                let creditTransaction={
                    from:isSenderExists.firstname,
                    date:transactionObj.date,
                    amount:transactionObj.amount,
                    message:transactionObj.message,
                    card:'debit',
                    status:'success',
                    senderID:isRecipentExists._id
                }

                let bankTransaction={
                    from:isSenderExists.firstname,
                    to:isRecipentExists.firstname,
                    date:transactionObj.date,
                    amount:transactionObj.amount,
                    card:transactionObj.card,
                    status:'success',
                    senderID:isRecipentExists._id,
                    recipentID:isRecipentExists._id
                }
                

                let debitNotification={
                   id:Date.now(),
                   message: `₹${transactionObj.amount} has been successfully debited from your account. Check your transaction history for more details. `
                }

                let creditNotification={
                   id:Date.now(),
                   message: `You've received ₹${transactionObj.amount} from John Doe. The amount has been credited to your account `
                }

                let bankNotification={
                     id: Date.now(),
                     message: `${transactionObj.amount} has been transferred by ${isSenderExists.firstname} to ${isRecipentExists.firstname}.`
                }

                let thisMonth=new Date().getMonth()

                let currentMonth=monthNames[thisMonth]

                let isMonthAlreadyExists=bank.alltransactionsmonthly.find((a)=>a['month']==currentMonth)

              

                if(isMonthAlreadyExists){
                    await bankdetails.findOneAndUpdate({'alltransactionsmonthly.month':currentMonth},{$inc:{'alltransactionsmonthly.$.count':1}})
                }else{
                    let newMonth={
                        month:currentMonth,
                        count:1
                    }
                    bank.alltransactionsmonthly.push(newMonth)
                }

                let isMonthAlreadyExistsInUserTransaction=isSenderExists.transactionchart.find((a)=>a['month']==currentMonth)

                if(isMonthAlreadyExistsInUserTransaction){
                    await users.findOneAndUpdate({_id:userID,'transactionchart.month':currentMonth},{$inc:{'transactionchart.$.count':1}})

                    await users.findOneAndUpdate({_id:isRecipentExists._id,'transactionchart.month':currentMonth},{$inc:{'transactionchart.$.count':1}})
                }else{
                    let newMonth={
                        month:currentMonth,
                        count:1
                    }
                    isSenderExists.transactionchart.push(newMonth)
                    isRecipentExists.transactionchart.push(newMonth)
                }

                await users.findOneAndUpdate({_id:isRecipentExists._id},{$inc:{'debitCard.cardBalance':transactionObj.amount},$push:{'debitCard.cardTransactions':creditTransaction}})

                transactionObj.card=="debit"?await users.findOneAndUpdate({_id:isSenderExists._id},{$inc:{"debitCard.cardBalance":-transactionObj.amount},$push:{'debitCard.cardTransactions':debitTransaction}}):await users.findOneAndUpdate({_id:isSenderExists._id,'creditcards.cardTier':transactionObj.card},{$inc:{"creditcards.$.cardBalance":-transactionObj.amount},$push:{'creditcards.$.cardTransactions':debitTransaction}})

                isSenderExists.transactions.push(debitTransaction)
                isSenderExists.notfications.push(debitNotification)
                cardDetails.cardTransactions.push(debitTransaction)

                isRecipentExists.transactions.push(creditTransaction)
                isRecipentExists.notfications.push(creditNotification)
                isRecipentExists.debitCard['cardTransactions'].push(creditTransaction)
                

                bank.alltransactions.push(bankTransaction)
                bank.allnotifications.push(bankNotification)


                await isSenderExists.save()
                await isRecipentExists.save()
                await bank.save()

                res.status(200).json("Transaction successfully completed!")
                



                
            }else{
                res.status(400).json("Error occured!")
            }



            
        }else{
            res.status(400).json("Invalid OTP")
        }
        
    }else{
        res.status(401).json("Not authorized")
    }


}

exports.onFetchUserTransactions=async(req,res)=>{
    const userID=req.userID
    const userROLE=req.userROLE

    if(userROLE=="accountholder"){
        try {
            const isUserExists=await users.findById(userID)
            if(isUserExists){
                res.status(200).json(isUserExists.transactions)
            }else{
                res.status(400).json("user not found!")
            }
        } catch (error) {
            console.log(error)
            res.status(500).json(error)
        }
    }else{
        res.state(401).json("Not authorized")
    }



}

exports.onFetchUserCards=async(req,res)=>{
    const userID=req.userID
    const userROLE=req.userROLE

    if(userROLE=="accountholder"){
        try {
            const isUserExists=await users.findById(userID)
            if(isUserExists){
                res.status(200).json({debitCard:isUserExists.debitCard,creditcards:isUserExists.creditcards?isUserExists.creditcards:[]})
            }else{
                res.status(400).json("user not found!")
            }
        } catch (error) {
            console.log(error)
            res.status(500).json(error)
        }
    }else{
        res.state(401).json("Not authorized")
    }
}

exports.onFetchUserNotifications=async(req,res)=>{
    const userID=req.userID
    const userROLE=req.userROLE

    if(userROLE=="accountholder"){
        try {
            const isUserExists=await users.findById(userID)
            if(isUserExists){
                res.status(200).json(isUserExists.notfications)
            }else{
                res.status(400).json("user not found!")
            }
        } catch (error) {
            console.log(error)
            res.status(500).json(error)
        }
    }else{
        res.state(401).json("Not authorized")
    }
}


exports.onFetchUserProfile=async(req,res)=>{
    const userID=req.userID
    const userROLE=req.userROLE

    if(userROLE=="accountholder"){
        try {
            const isUserExists=await users.findById(userID)
            if(isUserExists){
                let userdata={
                    email:isUserExists.email,
                    firstname:isUserExists.firstname,
                    lastname:isUserExists.lastname,
                    DOB:isUserExists.DOB,
                    phonenumber:isUserExists.phonenumber,
                    state:isUserExists.state,
                    pincode:isUserExists.pincode,
                    imageurl:isUserExists.imageurl,
                }
                res.status(200).json(userdata)
            }else{
                res.status(400).json("user not found!")
            }
        } catch (error) {
            console.log(error)
            res.status(500).json(error)
        }
    }else{
        res.state(401).json("Not authorized")
    }
}

exports.onLoanApplicatiion=async(req,res)=>{
    const userID=req.userID
    const userROLE=req.userROLE

    const {loanType,loanAmount,loanDuration,interestRate}=req.body

    if(userROLE=="accountholder"){
        try {

            const isUserExists=await users.findById(userID)
            const bank=await bankdetails.findOne({})
            
            if(isUserExists.loans.length>=2){
                res.status(400).json("You currently have two active loans. Please settle them before proceeding with a new loan request.")
            }else{
                const payload={
                    fullname:`${isUserExists.firstname} ${isUserExists.lastname}`,
                    loanType:loanType,
                    loanDuration:loanDuration,
                    requestedAmount:loanAmount,
                    interestRate:interestRate,
                    status:"pending",
                    userID:isUserExists._id,
                    id:Date.now(),
                }

                const getMonth=new Date().getMonth()

                let currentMonth=monthNames[getMonth]

                let isMonthAlreadyExistsInLoanRequest=bank.allloanrequestmonthly.find((a)=>a['month']==currentMonth)

                if(isMonthAlreadyExistsInLoanRequest){
                    await bankdetails.findOneAndUpdate({'allloanrequestmonthly.month':currentMonth},{$inc:{'allloanrequestmonthly.$.count':1}})
                }else{
                    let newMonth={
                        month:currentMonth,
                        count:1
                    }
                    bank.allloanrequestmonthly.push(newMonth)
                }

                const isMonthAlreadyExistsInLoanStatus=bank.allloanstatusmonthly.find((a)=>a['month']==currentMonth)

                if(isMonthAlreadyExistsInLoanStatus){
                    await bankdetails.findOneAndUpdate({'allloanstatusmonthly.month':currentMonth},{$inc:{'allloanstatusmonthly.$.pending':1}})
                }else{
                    let newMonth={
                        month:currentMonth,
                        pending:1,
                        approved:0,
                        rejected:0,
                    }
                    bank.allloanstatusmonthly.push(newMonth)
                }
                
                let userMessage = {
                    id: Date.now(),
                    message: `Your loan application of ₹${loanAmount} has been submitted successfully. Please wait while we review your request. You’ll be notified once a decision is made.`
                }

                let adminMessage = {
                    id: Date.now(),
                    message: `Loan application received from ${isUserExists.firstname}: ₹${loanAmount} for a ${loanDuration}-year ${loanType} loan. Pending approval.`
                };
                

                await users.findOneAndUpdate({_id:userID},{$push:{requestedloans:payload,notfications:userMessage}})
                bank.loanrequest.push(payload)
                bank.allnotifications.push(adminMessage)

                await bank.save()

                res.status(200).json("Loan application submitted successfully. Please wait for approval from the bank. ")



            }

            
        } catch (error) {
            console.log(error)
            res.status(500).json(error)
        }

    }else{
        res.status(401).json("Not Authorized!")
    }


}


