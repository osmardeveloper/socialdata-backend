const mongoose = require('mongoose');

const formularioPersonalizadoSchema = new mongoose.Schema({
  titulo: {
    type: String,
    required: [true, 'El título del formulario es obligatorio']
  },
  preguntas: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Pregunta',
    required: true
  }]
}, { timestamps: true });

module.exports = mongoose.model('FormularioPersonalizada', formularioPersonalizadoSchema);
