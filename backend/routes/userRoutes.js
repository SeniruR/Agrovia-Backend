const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { authenticate } = require('../middleware/auth');
const { pool } = require('../config/database');

// Password validation middleware
const validatePassword = (password) => {
    if (typeof password !== 'string') {
        return 'Password must be a string';
    }
    if (password.length < 8) {
        return 'Password must be at least 8 characters long';
    }
    if (!/[A-Z]/.test(password)) {
        return 'Password must contain at least one uppercase letter';
    }
    if (!/[a-z]/.test(password)) {
        return 'Password must contain at least one lowercase letter';
    }
    if (!/[0-9]/.test(password)) {
        return 'Password must contain at least one number';
    }
    if (!/[!@#$%^&*]/.test(password)) {
        return 'Password must contain at least one special character (!@#$%^&*)';
    }
    return null;
};

// Validate token endpoint
router.get('/validate-token', authenticate, (req, res) => {
    console.log('Token validation request:', {
        headers: req.headers.authorization ? 'Bearer token present' : 'No bearer token',
        user: {
            id: req.user?.id,
            email: req.user?.email,
            role: req.user?.role,
            userType: req.user?.user_type
        }
    });
    
    res.json({
        success: true,
        message: 'Token is valid',
        user: {
            id: req.user?.id,
            name: req.user?.name,
            email: req.user?.email,
            role: req.user?.role,
            userType: req.user?.user_type
        }
    });
});

// Change password endpoint
router.put('/change-password', authenticate, async (req, res) => {
    try {
        const { password } = req.body;
        const userId = req.user?.id;

        console.log('Password change request received');
        console.log('User ID from auth:', userId);
        console.log('Request body (password length):', password ? password.length : 0);

        // Validate password exists
        if (!password) {
            return res.status(400).json({ 
                success: false,
                message: 'New password is required' 
            });
        }

        // Validate password requirements
        const validationError = validatePassword(password);
        if (validationError) {
            return res.status(400).json({ 
                success: false,
                message: validationError 
            });
        }

        try {
            // Check if user exists and get their current data
            const [existingUser] = await pool.execute(
                'SELECT * FROM users WHERE id = ?',
                [userId]
            );

            if (!existingUser || existingUser.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'User not found'
                });
            }

            // Hash the new password
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(password, salt);

            console.log('Attempting password update with:', {
                userId: userId,
                hasPasswordLength: hashedPassword?.length
            });

            // Update the password in the database
            const [result] = await pool.execute(
                'UPDATE users SET password_hash = ? WHERE id = ?',
                [hashedPassword, userId]
            );

            console.log('Password update result:', {
                affectedRows: result?.affectedRows,
                changedRows: result?.changedRows,
                info: result?.info
            });

            if (result.affectedRows === 0) {
                console.error('Password update failed - no rows affected. User ID:', userId);
                return res.status(500).json({ 
                    success: false,
                    message: 'Failed to update password' 
                });
            }

            console.log('Password successfully updated. Rows affected:', result.affectedRows);
            res.json({ 
                success: true,
                message: 'Password updated successfully'
            });
        } catch (dbError) {
            console.error('Database error details:', {
                error: dbError.message,
                code: dbError.code,
                sqlState: dbError.sqlState,
                sqlMessage: dbError.sqlMessage
            });
            return res.status(500).json({
                success: false,
                message: 'Database error during password update',
                error: process.env.NODE_ENV === 'development' ? 
                    `${dbError.message} (SQL: ${dbError.sqlMessage || 'unknown'})` : 
                    undefined
            });
        }
    } catch (error) {
        console.error('Error in password change endpoint:', error);
        res.status(500).json({ 
            success: false,
            message: 'Failed to change password',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

module.exports = router;
