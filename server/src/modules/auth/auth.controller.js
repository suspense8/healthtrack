const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../../config/database');
const { logAction } = require('../shared/auditLogger');

// Login only - registration is admin-only
const login = async (req, res) => {
  const { username, password } = req.body;

  try {
    const user = await prisma.user.findUnique({ where: { username } });

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isValid = await bcrypt.compare(password, user.password_hash);

    if (!isValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate JWT with user info including role
    const token = jwt.sign(
      { 
        userId: user.user_id, 
        role: user.role,
        username: user.username 
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    // Log the login action
    await logAction({
      userId: user.user_id,
      action: 'LOGIN',
      entity: 'User',
      entityId: user.user_id,
      afterSnapshot: {
        username: user.username,
        role: user.role
      }
    });

    res.json({ 
      token, 
      user: { 
        id: user.user_id, 
        username: user.username, 
        role: user.role 
      } 
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Login failed' });
  }
};

// Get current user info from token
const me = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { user_id: req.user.userId },
      select: {
        user_id: true,
        username: true,
        role: true,
        created_at: true
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to get user info' });
  }
};

// Update user profile (username only)
const updateProfile = async (req, res) => {
  const { username } = req.body;

  if (!username || !username.trim()) {
    return res.status(400).json({ error: 'Username is required' });
  }

  try {
    // Get current user data
    const currentUser = await prisma.user.findUnique({
      where: { user_id: req.user.userId }
    });

    if (!currentUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if new username is already taken by another user
    const existingUser = await prisma.user.findUnique({
      where: { username: username.trim() }
    });

    if (existingUser && existingUser.user_id !== req.user.userId) {
      return res.status(409).json({ error: 'Username already exists' });
    }

    // Update username
    const updatedUser = await prisma.user.update({
      where: { user_id: req.user.userId },
      data: { username: username.trim() },
      select: {
        user_id: true,
        username: true,
        role: true,
        created_at: true
      }
    });

    // Log the profile update
    await logAction({
      userId: req.user.userId,
      action: 'UPDATE_PROFILE',
      entity: 'User',
      entityId: req.user.userId,
      beforeSnapshot: { username: currentUser.username },
      afterSnapshot: { username: updatedUser.username }
    });

    res.json(updatedUser);
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
};

// Change password
const changePassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  // Validation
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'Current and new passwords are required' });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({ error: 'New password must be at least 6 characters' });
  }

  try {
    // Get current user
    const user = await prisma.user.findUnique({
      where: { user_id: req.user.userId }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Verify current password
    const isValidPassword = await bcrypt.compare(currentPassword, user.password_hash);

    if (!isValidPassword) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    // Hash new password
    const newPasswordHash = await bcrypt.hash(newPassword, 10);

    // Update password
    await prisma.user.update({
      where: { user_id: req.user.userId },
      data: { password_hash: newPasswordHash }
    });

    // Log the password change
    await logAction({
      userId: req.user.userId,
      action: 'CHANGE_PASSWORD',
      entity: 'User',
      entityId: req.user.userId,
      afterSnapshot: { message: 'Password changed successfully' }
    });

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('Password change error:', error);
    res.status(500).json({ error: 'Failed to change password' });
  }
};

module.exports = { login, me, updateProfile, changePassword };

