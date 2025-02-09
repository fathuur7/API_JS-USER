// crud routes
import express from "express";
import {register, login, getUser, updateUser, deleteUser , logout } from "../../controllers/auth/authControllers.js";


const router = express.Router();

// register /api/auth/register
router.post('/register', register);

// login /api/auth/login
router.post('/login', login);


//mengambil User
router.get('/users', getUser);

//mengubah User


// menghapus User
router.delete('/users/:id', deleteUser);

router.post('/logout', logout);

// router.get("/me", authMiddleware, getCurrentUser);

export default router;