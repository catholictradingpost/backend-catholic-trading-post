import openai from "../clients/openai.client.js";

export const generateAIContent = async (req, res) => {
  try {
    const { summary } = req.body;

    if (!summary) {
      return res.status(400).json({ message: "Summary is required." });
    }

    if (!openai) {
      return res.status(500).json({ message: "OpenAI is not configured." });
    }

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are a helpful assistant for generating blog titles and content.",
        },
        {
          role: "user",
          content: `Generate a title and content for a post based on the following summary: ${summary}`,
        },
      ],
    });

    if (!response.choices || response.choices.length === 0) {
      throw new Error("OpenAI response is empty");
    }

    const generatedText = response.choices[0].message.content.split("\n");
    const title = "example of title";
    const content = "example of content";

    res.status(200).json({ title, content });

  } catch (error) {
    console.error("Error generating content:", error.message);
    res.status(500).json({
      message: "Error generating content",
      error: error.message,
    });
  }
};
