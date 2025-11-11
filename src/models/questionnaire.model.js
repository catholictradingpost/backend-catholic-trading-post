// src/models/questionnaire.model.js
import mongoose from "mongoose";

const questionnaireSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    catholic: {
      type: String,
      required: true,
    },
    parish: {
      type: String,
      required: true,
    },
    diocese: {
      type: String,
      required: true,
    },
    rite: {
      type: String,
      required: true,
    },
    riteType: {
      type: String,
      required: true,
    },
    knightOfColumbus: {
      type: Boolean,
      default: false,
    },
    knightOfMalta: {
      type: Boolean,
      default: false,
    },
    favoriteSaint: {
      type: String,
      required: true,
    },
    historicalFigure: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'verified', 'rejected'],
      default: 'pending',
    },
    observation: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("Questionnaire", questionnaireSchema);