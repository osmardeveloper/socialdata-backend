const mongoose = require('mongoose');

const detallePreguntaSchema = new mongoose.Schema({
  nombre: {
    type: String,
    required: [true, 'El detalle debe tener un nombre']
  },
  tipo: {
    type: String,
    enum: ['texto', 'booleano', 'multiple', 'numero', 'simple'],
    required: true
  },
  data: {
    type: mongoose.Schema.Types.Mixed,
    // Puede contener un array de opciones si el tipo es "multiple"
  }
});

const preguntaSchema = new mongoose.Schema({
  detalles: [detallePreguntaSchema]
}, { timestamps: true });

module.exports = mongoose.model('Pregunta', preguntaSchema);
