const mongoose = require('mongoose');

const respuestaSchema = new mongoose.Schema({
  pregunta_id: {
    type: mongoose.Schema.Types.ObjectId, // Match con el _id del detalle dentro de Pregunta
    required: false // Permitir nulo para sub-preguntas dinámicas
  },
  pregunta_nombre: {
    type: String, // Identificador por nombre para sub-preguntas
    required: false
  },
  respuesta: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  }
}, { _id: false });

const encuestaRealizadaSchema = new mongoose.Schema({
  formulario_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'FormularioPersonalizada',
    required: [true, 'El formulario es obligatorio']
  },
  usuario_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Usuario',
    required: [true, 'El usuario encuestado es obligatorio']
  },
  encuestador_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'UsuarioStaff',
    required: [true, 'El encuestador es obligatorio']
  },
  respuestas: [respuestaSchema],
  fecha: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

module.exports = mongoose.model('EncuestaRealizada', encuestaRealizadaSchema);
