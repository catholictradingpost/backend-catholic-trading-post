import Questionnaire from "../models/questionnaire.model.js";

// 1. Crear cuestionario
export const createQuestionnaire = async (req, res) => {
  try {
    const userId = req.userId;
    // Verificar que no exista ya uno para este usuario
    const exists = await Questionnaire.findOne({ user: userId });
    if (exists) {
      return res
        .status(400)
        .json({ message: "Ya existe un cuestionario para este usuario" });
    }

    const data = { ...req.body, user: userId };
    const questionnaire = new Questionnaire(data);
    await questionnaire.save();

    res.status(201).json({ message: "Cuestionario creado", questionnaire });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ message: "Error al crear cuestionario", error: error.message });
  }
};

// 2. Editar cuestionario
export const updateQuestionnaire = async (req, res) => {
  try {
    const userId = req.userId;
    const data = { ...req.body };

    const questionnaire = await Questionnaire.findOneAndUpdate(
      { user: userId },
      data,
      { new: true, runValidators: true }
    );
    if (!questionnaire) {
      return res.status(404).json({ message: "Cuestionario no encontrado" });
    }

    res.status(200).json({ message: "Cuestionario actualizado", questionnaire });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ message: "Error al actualizar cuestionario", error: error.message });
  }
};

// 3. Listar todos los cuestionarios
export const getAllQuestionnaires = async (req, res) => {
  try {
    const questionnaires = await Questionnaire.find()
      .populate("user", "first_name last_name email")
      .sort({ createdAt: -1 });
    res.status(200).json({ total: questionnaires.length, questionnaires });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ message: "Error al listar cuestionarios", error: error.message });
  }
};

// 4. Obtener un cuestionario por usuario
export const getQuestionnaireByUser = async (req, res) => {
  try {
    const userId = req.params.userId;
    const questionnaire = await Questionnaire.findOne({ user: userId })
      .populate("user", "first_name last_name email");
    if (!questionnaire) {
      return res.status(404).json({ message: "Cuestionario no encontrado" });
    }
    res.status(200).json({ questionnaire });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ message: "Error al obtener cuestionario", error: error.message });
  }
};

// 5. Eliminar cuestionario por usuario
export const deleteQuestionnaire = async (req, res) => {
  try {
    const userId = req.params.userId;
    const result = await Questionnaire.findOneAndDelete({ user: userId });
    if (!result) {
      return res.status(404).json({ message: "Cuestionario no encontrado" });
    }
    res.status(200).json({ message: "Cuestionario eliminado" });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ message: "Error al eliminar cuestionario", error: error.message });
  }
};

// 6. Update questionnaire status (Admin only)
export const updateQuestionnaireStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, observation } = req.body;

    const user = req.user;
    const userRoles = user.roles.map(role => role.name);

    if (!userRoles.includes('Super User') && !userRoles.includes('Admin')) {
      return res.status(403).json({ message: 'Unauthorized to update questionnaire status.' });
    }

    if (!['pending', 'verified', 'rejected'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status. Must be pending, verified, or rejected.' });
    }

    const questionnaire = await Questionnaire.findById(id);
    if (!questionnaire) {
      return res.status(404).json({ message: 'Questionnaire not found.' });
    }

    questionnaire.status = status;
    questionnaire.observation = observation || '';
    await questionnaire.save();

    res.status(200).json({
      message: 'Questionnaire status updated successfully',
      questionnaire,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: 'Error updating questionnaire status',
      error: error.message,
    });
  }
};

// 7. Get questionnaire by ID (for admin review)
export const getQuestionnaireById = async (req, res) => {
  try {
    const { id } = req.params;
    const questionnaire = await Questionnaire.findById(id)
      .populate("user", "first_name last_name email phone");
    if (!questionnaire) {
      return res.status(404).json({ message: "Questionnaire not found" });
    }
    res.status(200).json({ questionnaire });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ message: "Error retrieving questionnaire", error: error.message });
  }
};
