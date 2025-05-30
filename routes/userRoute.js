const express = require('express')
const userRouter = new express.Router()

const userController = require('../controllers/userController')
const multerMiddlware = require('../middlewares/multerMiddleware')
const tokenAuthentication=require('../middlewares/jwtMiddleware')

userRouter.post('/register', multerMiddlware.single('imageurl'), userController.onRegister)
userRouter.post('/loginpassword',userController.onLoginWithEmailAndPassword)
userRouter.post('/login', userController.onLogin)
userRouter.post('/loginwith/google',userController.onLoginWithEmail)
userRouter.post('/verify',userController.onOTP)

userRouter.post('/creditcardApplication',tokenAuthentication,userController.onCreditCardApplication)

userRouter.post('/transfermoney',tokenAuthentication,userController.onTransaction)
userRouter.post('/transfermoney/otp/:otp',tokenAuthentication,userController.onTransactionOTP)

userRouter.get('/get/transactions',tokenAuthentication,userController.onFetchUserTransactions)
userRouter.get('/get/cards',tokenAuthentication,userController.onFetchUserCards)
userRouter.get('/get/notifications',tokenAuthentication,userController.onFetchUserNotifications)
userRouter.get('/get/profile',tokenAuthentication,userController.onFetchUserProfile)

userRouter.patch('/loanapplication',tokenAuthentication,userController.onLoanApplicatiion)
userRouter.get('/fetchloans',tokenAuthentication,userController.onFetchLoans)

userRouter.patch('/update/profile',tokenAuthentication,multerMiddlware.single('imageurl'),userController.onUpdateUserProfile)

userRouter.delete('/cancel/loanrequest/:id',tokenAuthentication,userController.onCancelLoanRequests)

userRouter.get('/get/loanamount/:id',tokenAuthentication,userController.onFetchLoanAmount)

userRouter.get('/dashboard/user',tokenAuthentication,userController.onFetchUserDashboardDetails)

userRouter.patch('/payfullamount/loan',tokenAuthentication,userController.onPayFullLoanAmount)

userRouter.patch('/payfullamount/otp/:id',tokenAuthentication,userController.onPayFullLoanAmountOTP)

userRouter.delete('/deleteNotification/:id',tokenAuthentication,userController.onDeletNotification)
userRouter.get('/fetchdebitcard',tokenAuthentication,userController.onFetchUserDebitCardDetails)


module.exports = userRouter