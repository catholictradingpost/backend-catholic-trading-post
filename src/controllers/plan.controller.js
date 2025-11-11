import Plan from '../models/plan.model.js';

// Create a new plan
export const createPlan = async (req, res) => {
  try {
    const { name, description, price, durationInDays, benefits } = req.body;

    // Validate required fields
    if (!name || !description || !price || !durationInDays) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    // Check if the plan name already exists
    const existingPlan = await Plan.findOne({ name });
    if (existingPlan) {
      return res.status(400).json({ message: 'Plan with this name already exists' });
    }

    // Create a new plan
    const newPlan = new Plan({
      name,
      description,
      price,
      durationInDays,
      benefits,
    });

    await newPlan.save();

    res.status(201).json({ message: 'Plan created successfully', plan: newPlan });
  } catch (error) {
    res.status(500).json({ message: 'Error creating plan', error: error.message });
  }
};

// Update an existing plan by ID
export const updatePlan = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, price, durationInDays, benefits } = req.body;

    // Find the plan by ID
    const plan = await Plan.findById(id);
    if (!plan) {
      return res.status(404).json({ message: 'Plan not found' });
    }

    // Update the plan fields
    if (name) plan.name = name;
    if (description) plan.description = description;
    if (price) plan.price = price;
    if (durationInDays) plan.durationInDays = durationInDays;
    if (benefits) plan.benefits = benefits;

    await plan.save();

    res.status(200).json({ message: 'Plan updated successfully', plan });
  } catch (error) {
    res.status(500).json({ message: 'Error updating plan', error: error.message });
  }
};

// Get all available plans
export const getPlans = async (req, res) => {
  try {
    const plans = await Plan.find();
    res.status(200).json(plans);
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving plans', error: error.message });
  }
};

// Get a specific plan by ID
export const getPlanById = async (req, res) => {
  try {
    const plan = await Plan.findById(req.params.id);

    if (!plan) {
      return res.status(404).json({ message: 'Plan not found' });
    }

    res.status(200).json(plan);
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving plan', error: error.message });
  }
};

// Delete a plan by ID
export const deletePlan = async (req, res) => {
  try {
    // Extract plan ID from the request parameters
    const { id } = req.params;

    // Find the plan by ID
    const planToDelete = await Plan.findById(id);

    if (!planToDelete) {
      return res.status(404).json({ message: "Plan not found" });
    }

    // Delete the plan
    await Plan.findByIdAndDelete(id);

    return res.status(200).json({ message: "Plan deleted successfully" });
  } catch (error) {
    return res.status(500).json({ message: "Error deleting plan", error: error.message });
  }
};
