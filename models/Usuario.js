const mongoose = require('mongoose');

const TIPOS_DOCUMENTO = [
  'Cédula de Ciudadanía',
  'Tarjeta de Identidad',
  'Cédula de Extranjería',
  'Pasaporte',
  'Permiso de Protección Temporal (PPT)',
  'Registro Civil'
];

const usuarioSchema = new mongoose.Schema({
  tipo_documento: {
    type: String,
    enum: TIPOS_DOCUMENTO,
    required: [true, 'El tipo de documento es obligatorio']
  },
  numero_documento: {
    type: String,
    required: [true, 'El número de documento es obligatorio'],
    unique: true,
  },
  nombre: {
    type: String,
    required: [true, 'El nombre es obligatorio']
  },
  apellido: {
    type: String,
    required: [true, 'El apellido es obligatorio']
  },
  direccion: {
    type: String,
    required: [true, 'La dirección es obligatoria']
  },
  telefono: {
    type: String,
    required: [true, 'El teléfono es obligatorio']
  },
  correo: {
    type: String,
    required: [true, 'El correo es obligatorio'],
    unique: true,
    match: [
      /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
      'Por favor agregue un correo válido'
    ]
  },
  fecha_nacimiento: {
    type: Date,
    required: [true, 'La fecha de nacimiento es obligatoria']
  },
  edad: {
    type: Number,
    required: false
  },
  grupo_familiar_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'GrupoFamiliar',
    default: null
  }
}, { timestamps: true });

module.exports = mongoose.model('Usuario', usuarioSchema);
