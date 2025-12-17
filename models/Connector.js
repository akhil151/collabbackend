import mongoose from "mongoose"

const connectorSchema = new mongoose.Schema(
  {
    board: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Board",
      required: true,
    },
    fromElement: {
      type: String,
      required: true,
    },
    toElement: {
      type: String,
      required: true,
    },
    lineStyle: {
      type: String,
      enum: ["straight", "curved", "orthogonal"],
      default: "straight",
    },
    arrowStyle: {
      type: String,
      enum: ["arrow", "none"],
      default: "arrow",
    },
    color: {
      type: String,
      default: "#9333ea",
    },
    label: String,
    fromX: Number,
    fromY: Number,
    toX: Number,
    toY: Number,
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
)

export default mongoose.model("Connector", connectorSchema)
