const mongoose = require('mongoose');

// Definición progresiva de Sub-Pregunta (Recursiva)
const subPreguntaSchema = new mongoose.Schema();
subPreguntaSchema.add({
  tipo: {
    type: String,
    enum: ['texto', 'booleano', 'numero', 'simple', 'multiple'],
    required: true
  },
  nombre: String, 
  data: [mongoose.Schema.Types.Mixed] // Opciones si es simple/múltiple
});

// Enriquecemos la estructura de la DATA para las opciones
// Ahora una opción puede ser: "Texto Simple" o { texto: "Texto", subPreguntas: [...] }
const preguntaSchema = new mongoose.Schema({
  detalles: [{
    nombre: String,
    tipo: {
      type: String,
      enum: ['texto', 'booleano', 'numero', 'simple', 'multiple'],
      required: true
    },
    // Modificamos DATA para soportar objetos anidados
    data: [mongoose.Schema.Types.Mixed] 
  }],
  is_synced: {
    type: Boolean,
    default: true
  }
}, { timestamps: true });

module.exports = mongoose.model('Pregunta', preguntaSchema);
