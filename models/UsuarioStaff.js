const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const usuarioStaffSchema = new mongoose.Schema({
  nombre: {
    type: String,
    required: [true, 'Por favor añada un nombre'],
  },
  usuario: {
    type: String,
    required: [true, 'Por favor añada un usuario'],
    unique: true,
  },
  rol: {
    type: String,
    enum: ['administrador', 'encuestador'],
    default: 'encuestador',
  },
  password: {
    type: String,
    required: [true, 'Por favor añada una contraseña'],
    select: false, // Don't return by default
  },
}, { timestamps: true });

// Encriptar contraseña antes de guardar
usuarioStaffSchema.pre('save', async function (next) {
  if (!this.isModified('password')) {
    return next(); // Sin return, el código seguía ejecutándose y hasheaba undefined
  }

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Método para comparar contraseñas
usuarioStaffSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('UsuarioStaff', usuarioStaffSchema);
