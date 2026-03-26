const mongoose = require('mongoose');

const grupoFamiliarSchema = new mongoose.Schema({
  nombre_familia: {
    type: String,
    required: [true, 'El nombre de la familia es obligatorio'],
    trim: true
  },
  codigo_identificador: {
    type: String,
    unique: true,
    required: true
  },
  miembros: [{
    usuario: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Usuario'
    },
    parentesco: {
      type: String,
      enum: ['Mamá', 'Papá', 'Hijo', 'Hija', 'Abuela', 'Abuelo', 'Tía', 'Tío', 'Otro'],
      default: 'Otro'
    }
  }],
  is_synced: {
    type: Boolean,
    default: true
  }
}, { timestamps: true });

module.exports = mongoose.model('GrupoFamiliar', grupoFamiliarSchema);
