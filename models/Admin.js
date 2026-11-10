import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const AdminSchema = new mongoose.Schema({
  username: {
    type: String,
    lowercase: true,
    trim: true,
    default: 'admin',
    sparse: true,
  },
  email: {
    type: String,
    lowercase: true,
    trim: true,
    default: 'admin@boxcricket.com',
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
