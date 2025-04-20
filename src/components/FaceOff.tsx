import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const FaceOff = () => {
  const [llm1, setLlm1] = useState("moonshotai/moonlight-16b-a3b-instruct:free");
  const [llm2, setLlm2] = useState("deepseek/deepseek-r1:free");
  const [role1, setRole1] = useState("asker");
  const [role2, setRole2] = useState("responder");
  const [conversation, setConversation] = useState<{ speaker: string; message: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [initialMessage, setInitialMessage] = useState("What are your thoughts?");
  const [exchangeLimit, setExchangeLimit] = useState(6);

  const models = [
    { label: "Moonlight AI", value: "moonshotai/moonlight-16b-a3b-instruct:free" },
    { label: "DeepSeek AI", value: "deepseek/deepseek-r1:free" },
    { label: "Another Model", value: "another-model-id" },
  ];

  const handleFaceOff = async () => {
    const apiKey = import.meta.env.VITE_API_KEY; // Ensure this is set in your .env.local file
    const apiurl = "https://openrouter.ai/api/v1/chat/completions";

    if (!apiKey) {
      alert("API key is missing. Please set it in your .env.local file.");
      return;
    }

    if (!initialMessage.trim()) {
      alert("Please enter an initial message to start the conversation.");
      return;
    }

    setLoading(true);
    setConversation([]);

    try {
      const messages = [{ role: "user", content: initialMessage }];
      let currentSpeaker = "LLM 1";
      let currentModel = llm1;
      let currentRole = role1;

      for (let i = 0; i < exchangeLimit; i++) {
        const response = await fetch(apiurl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: currentModel,
            messages: messages,
            stream: false, // Disable streaming for simplicity
          }),
        });

        if (!response.ok) {
          throw new Error(`API error: ${response.statusText}`);
        }

        const data = await response.json();
        const reply = data.choices?.[0]?.message?.content || "No response";

        // Update the conversation
        setConversation((prev) => [...prev, { speaker: currentSpeaker, message: reply }]);

        // Add the reply to the messages
        messages.push({ role: currentRole, content: reply });

        // Alternate between asker and responder
        if (currentRole === "asker") {
          currentRole = "responder";
        } else {
          currentRole = "asker";
        }

        // Alternate between LLM 1 and LLM 2
        if (currentSpeaker === "LLM 1") {
          currentSpeaker = "LLM 2";
          currentModel = llm2;
        } else {
          currentSpeaker = "LLM 1";
          currentModel = llm1;
        }
      }
    } catch (error) {
      console.error("Error during Face Off:", error);
      alert("An error occurred during the Face Off.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-gray-100">
      <h1 className="text-3xl font-bold mb-4">Face Off: Debate Mode</h1>

      {/* Dropdowns for selecting LLMs and roles */}
      <div className="flex flex-col md:flex-row justify-center space-x-4 mb-6">
        <div>
          <label className="block text-gray-700 font-bold mb-2">LLM 1</label>
          <select
            value={llm1}
            onChange={(e) => setLlm1(e.target.value)}
            className="p-2 border border-gray-300 rounded"
          >
            {models.map((model) => (
              <option key={model.value} value={model.value}>
                {model.label}
              </option>
            ))}
          </select>
          <input
            type="text"
            value={role1}
            onChange={(e) => setRole1(e.target.value)}
            placeholder="Role (e.g., asker)"
            className="mt-2 p-2 border border-gray-300 rounded w-full"
          />
        </div>
        <div>
          <label className="block text-gray-700 font-bold mb-2">LLM 2</label>
          <select
            value={llm2}
            onChange={(e) => setLlm2(e.target.value)}
            className="p-2 border border-gray-300 rounded"
          >
            {models.map((model) => (
              <option key={model.value} value={model.value}>
                {model.label}
              </option>
            ))}
          </select>
          <input
            type="text"
            value={role2}
            onChange={(e) => setRole2(e.target.value)}
            placeholder="Role (e.g., responder)"
            className="mt-2 p-2 border border-gray-300 rounded w-full"
          />
        </div>
      </div>

      {/* Initial Message and Exchange Limit */}
      <div className="mb-4">
        <input
          type="text"
          value={initialMessage}
          onChange={(e) => setInitialMessage(e.target.value)}
          placeholder="Enter the initial message..."
          className="p-2 border border-gray-300 rounded w-full mb-2"
        />
        <input
          type="number"
          value={exchangeLimit}
          onChange={(e) => setExchangeLimit(Number(e.target.value))}
          placeholder="Number of exchanges"
          className="p-2 border border-gray-300 rounded w-full"
        />
      </div>

      <button
        onClick={handleFaceOff}
        className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 mb-4"
        disabled={loading}
      >
        {loading ? "Loading..." : "Start Debate"}
      </button>

      {/* Clear Conversation Button */}
      <button
        onClick={() => setConversation([])}
        className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 mb-4"
      >
        Clear Conversation
      </button>

      {/* Conversation */}
      <div className="mt-4 p-4 bg-white border border-gray-300 rounded w-4/5 h-96 overflow-y-auto">
        {conversation.map((entry, index) => (
          <div key={index} className="mb-4">
            <p className="font-bold text-blue-600">{entry.speaker}:</p>
            <div className="text-gray-800">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{entry.message}</ReactMarkdown>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default FaceOff;