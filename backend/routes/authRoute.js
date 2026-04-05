import {Router} from 'express'
import { signup, login, logout } from '../controllers/authController.js'

const authRouter = Router()

authRouter.post('/signup',signup)

authRouter.post('/login',login);

authRouter.post('/logout',logout);

export default authRouter