import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const AdminSchema = new mongoose.Schema({
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
  },
  name: {
    type: String,
    default: 'Super Admin',
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Compare password helper
AdminSchema.methods.comparePassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

export default mongoose.models.Admin || mongoose.model('Admin', AdminSchema);
