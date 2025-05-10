import { useState } from "react";

const models = [
  { label: "Moonlight", value: "moonshotai/moonlight-16b-a3b-instruct:free" },
  { label: "DeepSeek R1", value: "deepseek/deepseek-r1:free" },
  { label: "microsoft : phi-4-reasoning-plus", value: "microsoft/phi-4-reasoning-plus:free" },
  { label: "qwen2.5-vl-72b-instruct", value: "qwen/qwen2.5-vl-72b-instruct:free" }, // Add more models as needed
  { label: "Meta-llama/llama-3.2-11b-vision-instruct", value: "meta-llama/llama-3.2-11b-vision-instruct:free" }, // Add more models as needed
  { label: "meta-llama/llama-3.2-1b-instruct:free", value: "meta-llama/llama-3.2-1b-instruct:free" }, // Add more models as needed

];

type ConversationEntry = {
  speaker: string;
  message: string;
  role: "system" | "user" | "assistant";
};

const responder = async (
  conversationHistory: ConversationEntry[],
  currentRole: { role: string; description: string },
  otherRole: { role: string; description: string },
  model: string
) => {
  const apiKey = import.meta.env.VITE_API_KEY;
  const apiurl = "https://openrouter.ai/api/v1/chat/completions";

  if (!apiKey) {
    throw new Error("API key is missing. Please set it in your .env.local file.");
  }

  try {
    // Format conversation for the API
    const messages = [
      {
        role: "system",
        content: `You are roleplaying as ${currentRole.role}: ${currentRole.description}. 
        You are having a conversation with ${otherRole.role}: ${otherRole.description}.
        Stay completely in character as ${currentRole.role} throughout your response.
        Only respond as ${currentRole.role} would respond in this conversation.
        Maintain the conversational context and don't perform unrelated tasks.`
      }
    ];

    // Add conversation history, mapping speakers to roles
    for (const entry of conversationHistory) {
      if (entry.speaker === "Scenario") continue; // Skip the scenario entry

      messages.push({
        role: entry.role,
        content: entry.message
      });
    }

    const response = await fetch(apiurl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages,
      }),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.statusText}`);
    }

    const data = await response.json();
    const responseMessage = data.choices?.[0]?.message?.content || "No response";

    return responseMessage;
  } catch (error) {
    console.error("Error in responder function:", error);
    throw error;
  }
};

const DialExa = () => {
  const [llm1, setLlm1] = useState("moonshotai/moonlight-16b-a3b-instruct:free");
  const [llm2, setLlm2] = useState("deepseek/deepseek-r1:free");
  const [role1, setRole1] = useState("Theoretical Physicist");
  const [role2, setRole2] = useState("Experimental Physicist");
  const [description1, setDescription1] = useState("A physicist specializing in theoretical frameworks, including general relativity and quantum mechanics. Explores the boundaries of physics and is open to speculative ideas like warp drives and wormholes.");
  const [description2, setDescription2] = useState(" A physicist focused on experimental validation of physical theories. Works with particle accelerators and advanced instrumentation to test the limits of known physics. Skeptical of ideas that lack experimental evidence.");
  const [initializationQuestion, setInitializationQuestion] = useState("What are your thoughts on the feasibility of faster-than-light travel, given current scientific understanding?");
  const [scenario, setScenario] = useState("Two physicists are debating the feasibility of faster-than-light (FTL) travel. The Theoretical Physicist argues that FTL travel is theoretically possible under certain conditions, such as using a warp drive based on Einstein's equations. The Experimental Physicist counters that there is no experimental evidence to support such claims and that the energy requirements make it impractical. The discussion begins with the Theoretical Physicist asking the Experimental Physicist about their thoughts on the feasibility of FTL travel.");
  const [conversation, setConversation] = useState<ConversationEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);


  const handleFaceOff = async () => {
    setLoading(true);
    setError(null);
    try {
      if (!scenario.trim()) {
        setError("Please enter a scenario.");
        setLoading(false);
        return;
      }

      const role1Info = { role: role1, description: description1 };
      const role2Info = { role: role2, description: description2 };

      // Initialize conversation with the scenario
      const initialConversation: ConversationEntry[] = [
        { speaker: "Scenario", message: scenario, role: "system" }
      ];
      setConversation(initialConversation);

      // Extract the first question or statement if possible
      const roleMatches = scenario.match(
        new RegExp(`${role1}\\s+(?:asks|says|inquires|questions)\\s+(.*?)(?:[.!?]|$)`, "i")
      );

      // Extract the first question or statement if possible
      if (roleMatches && roleMatches[1]) {
        let extractedQuestion = roleMatches[1].trim();

        // Add appropriate punctuation if missing
        if (!/[.!?]$/.test(extractedQuestion)) {
          extractedQuestion += "?";
        }

        // Update the initializationQuestion state
        setInitializationQuestion(extractedQuestion);
      }

      // First message: Add first role's question/statement to the conversation
      const firstEntry: ConversationEntry = {
        speaker: role1,
        message: initializationQuestion,
        role: "user",
      };
      const updatedConversation = [...initialConversation, firstEntry];
      setConversation(updatedConversation);

      // Second role (LLM1) responds to the first role
      const role2Response = await responder(
        updatedConversation,
        role2Info,
        role1Info,
        llm1
      );

      const role2Entry: ConversationEntry = {
        speaker: role2,
        message: role2Response,
        role: "assistant"
      };

      let currentConversation = [...updatedConversation, role2Entry];
      setConversation(currentConversation);

      // Now start a back-and-forth conversation
      const maxTurns = 3;

      for (let i = 0; i < maxTurns; i++) {
        // Role 1 (LLM2) responds
        const role1Response = await responder(
          currentConversation,
          role1Info,
          role2Info,
          llm2
        );

        const nextRole1Entry: ConversationEntry = {
          speaker: role1,
          message: role1Response,
          role: "user"
        };

        currentConversation = [...currentConversation, nextRole1Entry];
        setConversation([...currentConversation]);

        // Role 2 (LLM1) responds
        const nextRole2Response = await responder(
          currentConversation,
          role2Info,
          role1Info,
          llm1
        );

        const nextRole2Entry: ConversationEntry = {
          speaker: role2,
          message: nextRole2Response,
          role: "assistant"
        };

        currentConversation = [...currentConversation, nextRole2Entry];
        setConversation([...currentConversation]);
      }
    } catch (error) {
      console.error("Error in FaceOff:", error);
      setError("An error occurred during the conversation. Please check the console for details.");
    } finally {
      setLoading(false);
    }
  };

  const resetConversation = () => {
    setConversation([]);
    setError(null);
  };

  return (
    <div className="flex flex-col items-center justify-center bg-gray-100">
      <h2 className="flex justify-center text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 animate-gradient-text mb-2 mt-0 p-4 rounded">
        Role Play Simulator
      </h2>
      <p className="text-gray-900 mb-4">Elevate learning through Dialog Exchange</p>

      {/* Configuration Panel */}
      <div className="w-full max-w-6xl bg-white p-6 rounded-lg shadow-md mb-6">

        {/* Model and Role Selection */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Role 1 Configuration */}
          <div>

            <div className="mb-4">
              <label className="block text-gray-700 font-medium mb-1">Select Model</label>
              <select
                value={llm2}
                onChange={(e) => setLlm2(e.target.value)}
                className="p-2 border border-b-4 rounded w-full"
              >
                {models.map((model) => (
                  <option key={model.value} value={model.value}>
                    {model.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="mb-4">
              <label className="block text-gray-700 font-medium mb-1">Role Name</label>
              <input
                type="text"
                value={role1}
                onChange={(e) => setRole1(e.target.value)}
                placeholder="e.g., Theoretical Physicist"
                className="p-2 border border-gray-300 rounded w-full"
              />
            </div>
            <div>
              <label className="block text-gray-700 font-medium mb-1">Description</label>
              <textarea
                value={description1}
                onChange={(e) => setDescription1(e.target.value)}
                placeholder="Describe the role in detail..."
                className="p-2 border border-gray-300 rounded w-full h-40 resize-y"
              ></textarea>
            </div>
          </div>

          {/* Role 2 Configuration */}
          <div>

            <div className="mb-4">
              <label className="block text-gray-700 font-medium mb-1">Select Model</label>
              <select
                value={llm1}
                onChange={(e) => setLlm1(e.target.value)}
                className="p-2 border border-b-4 rounded w-full"
              >
                {models.map((model) => (
                  <option key={model.value} value={model.value}>
                    {model.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="mb-4">
              <label className="block text-gray-700 font-medium mb-1">Role Name</label>
              <input
                type="text"
                value={role2}
                onChange={(e) => setRole2(e.target.value)}
                placeholder="e.g., Experimental Physicist"
                className="p-2 border border-gray-300 rounded w-full"
              />
            </div>
            <div>
              <label className="block text-gray-700 font-medium mb-1">Description</label>
              <textarea
                value={description2}
                onChange={(e) => setDescription2(e.target.value)}
                placeholder="Describe the role in detail..."
                className="p-2 border border-gray-300 rounded w-full h-40 resize-y"
              ></textarea>
            </div>
          </div>
        </div>

        {/* Initialize Question */}
        <div className="mt-6">
          <label className="block text-gray-700 font-bold mb-2">Initial Question</label>
          <textarea
            value={initializationQuestion}
            onChange={(e) => setInitializationQuestion(e.target.value)}
            placeholder="Describe the scenario and initial interaction..."
            className="p-3 border border-gray-300 rounded w-full h-32 resize-y"
          ></textarea>
          <p className="text-sm text-gray-500 mt-1">
            Tip: "The {role1} asks {role2} this question..."
          </p>
        </div>

        {/* Scenario Input */}
        <div className="mt-6">
          <label className="block text-gray-700 font-bold mb-2">Scenario</label>
          <textarea
            value={scenario}
            onChange={(e) => setScenario(e.target.value)}
            placeholder="Describe the scenario and initial interaction..."
            className="p-3 border border-gray-300 rounded w-full h-32 resize-y"
          ></textarea>
          <p className="text-sm text-gray-500 mt-1">
            Tip: Include how the conversation starts, e.g., "The {role1} asks {role2} about their view on..."
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-center mt-6 gap-4">
          <button
            onClick={handleFaceOff}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-md font-medium transition-colors duration-200"
            disabled={loading}
          >
            {loading ? "Generating Discussion..." : "Start Discussion"}
          </button>

          {conversation.length > 0 && (
            <button
              onClick={resetConversation}
              className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-6 py-2 rounded-md font-medium transition-colors duration-200"
              disabled={loading}
            >
              Reset
            </button>
          )}
        </div>

        {/* Error Display */}
        {error && (
          <div className="mt-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}
      </div>

      {/* Conversation Display */}
      {conversation.length > 0 && (
        <div className="w-full max-w-6xl bg-white p-6 rounded-lg shadow-md mb-6">
          <h2 className="text-xl font-bold mb-4">Physics Discussion</h2>

          {conversation.map((entry, index) => {
            if (entry.speaker === "Scenario") {
              return (
                <div key={index} className="mb-6 p-3 bg-yellow-50 border-l-4 border-yellow-500 text-yellow-800 rounded">
                  <div className="font-bold mb-1">Scenario:</div>
                  <div>{entry.message}</div>
                </div>
              );
            } else {
              const isRole1 = entry.speaker === role1;
              return (
                <div
                  key={index}
                  className={`mb-6 p-4 rounded-lg ${isRole1
                    ? "bg-blue-50 border-l-4 border-blue-600"
                    : "bg-green-50 border-l-4 border-green-600"
                    }`}
                >
                  <div className={`font-bold mb-1 ${isRole1 ? "text-blue-800" : "text-green-800"}`}>
                    {entry.speaker}:
                  </div>
                  <div className="whitespace-pre-wrap">{entry.message}</div>
                </div>
              );
            }
          })}
        </div>
      )}
    </div>
  );
};

export default DialExa;