import { useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm"; // For GitHub-flavored markdown
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { materialLight } from "react-syntax-highlighter/dist/esm/styles/prism"; // Syntax highlighting style


const MathWiz = () => {
  const [input, setInput] = useState(""); // State for the LaTeX equation
  const [responseMessage, setResponseMessage] = useState<string | null>(null); // State for API response
  const [loading, setLoading] = useState(false); // State for loading
  const [selectedModel, setSelectedModel] = useState("moonshotai/moonlight-16b-a3b-instruct:free"); // Default model

  
  // List of available AI models
  const models = [
    { label: "Moonlight", value: "moonshotai/moonlight-16b-a3b-instruct:free" },
    { label: "DeepSeek R1", value: "deepseek/deepseek-r1:free" },
    { label: "Reka Flash 3", value: "rekaai/reka-flash-3:free" },
    { label: "Qwen 2.5 VL", value: "qwen/qwen2.5-vl-72b-instruct:free" },
    { label: "Rogue Rose", value: "sophosympatheia/rogue-rose-103b-v0.2:free" },
    { label: "Llama 3.2 Vision", value: "meta-llama/llama-3.2-11b-vision-instruct:free" },
    { label: "Llama 3.2 Instruct", value: "meta-llama/llama-3.2-1b-instruct:free" },
    { label: "Nemotron 70B", value: "nvidia/llama-3.1-nemotron-70b-instruct:free" },
  ];

  // Load MathJax script dynamically
  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js";
    script.async = true;
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, []);

  // Re-render MathJax when the input changes
  useEffect(() => {
    if (window.MathJax) {
      window.MathJax.typesetPromise();
    }
  }, [input]);

  const handleButtonClick = (symbol: string) => {
    setInput((prev) => prev + symbol);
  };

  const handleClear = () => {
    setInput("");
  };

  const handleBackspace = () => {
    setInput((prev) => prev.slice(0, -1));
  };

  const handleSolve = async () => {
    const apiKey = import.meta.env.VITE_API_KEY; // Ensure this is set in your .env.local file
    const apiurl = "https://openrouter.ai/api/v1/chat/completions";

    if (!apiKey) {
      console.error("API key is missing. Please set it in your .env.local file.");
      alert("API key is missing. Please contact support.");
      return;
    }

    if (!input.trim()) {
      alert("Please enter a mathematical equation before solving.");
      return;
    }

    setLoading(true); // Set loading to true when the request starts
    setResponseMessage(null); // Clear previous response

    try {
      const messages = [
        {
          role: "user",
          content: [{ type: "text", text: `Solve this equation: ${input}` }],
        },
      ];

      const response = await fetch(apiurl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: selectedModel, // Use the selected model
          messages: messages,
          stream: false, // Disable streaming for simplicity
        }),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.statusText}`);
      }

      const data = await response.json();
      const solution = data.choices?.[0]?.message?.content || "No solution found.";
      setResponseMessage(solution);
    } catch (error) {
      console.error("Error during API call:", error);
      setResponseMessage("An error occurred while solving the equation.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center bg-gray-100">
      <h1 className="flex justify-center text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 animate-gradient-text mb-2 mt-0 p-4 rounded">Math Solver</h1>
      <p className="text-gray-900 mb-4">Write mathematical equations using LaTeX commands and solve them with AI.</p>

      {/* Model Selection */}
      <div className="flex justify-center mb-6 w-full max-w-6xl">
        <select
          value={selectedModel}
          onChange={(e) => setSelectedModel(e.target.value)}
          className="p-2 border border-b-4 rounded-lg text-black"
        >
          {models.map((model) => (
            <option key={model.value} value={model.value}>
              {model.label}
            </option>
          ))}
        </select>
      </div>

      {/* Input Field */}
      <div className="w-full max-w-lg mb-4">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Enter LaTeX equation"
          className="w-full p-2 border border-gray-300 rounded"
        />
      </div>

      {/* Render LaTeX Equation */}
      <div
        className="w-full max-w-lg mb-4 p-4 border border-gray-300 rounded bg-gray-100"
        dangerouslySetInnerHTML={{ __html: `\\(${input}\\)` }}
      ></div>

      {/* Scientific Keyboard */}
      <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 w-full max-w-lg mb-4 ">
        {/* Numbers */}
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 0].map((num) => (
          <button
            key={num}
            onClick={() => handleButtonClick(num.toString())}
            className="p-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            {num}
          </button>
        ))}

        {/* Operators */}
        {["+", "-", "*", "/", "(", ")", "^", "="].map((op) => (
          <button
            key={op}
            onClick={() => handleButtonClick(op)}
            className="p-2 bg-green-500 text-white rounded hover:bg-green-600"
          >
            {op}
          </button>
        ))}

        {/* LaTeX Commands */}
        {["\\frac{}", "\\sqrt{}", "\\pi", "\\sum", "\\int", "\\theta", "\\alpha", "\\beta"].map(
          (command) => (
            <button
              key={command}
              onClick={() => handleButtonClick(command)}
              className="p-2 bg-purple-500 text-white rounded hover:bg-purple-600"
            >
              {command}
            </button>
          )
        )}

        {/* Clear and Backspace */}
        <button
          onClick={handleClear}
          className="col-span-2 p-2 bg-red-500 text-white rounded hover:bg-red-600"
        >
          Clear
        </button>
        <button
          onClick={handleBackspace}
          className="col-span-2 p-2 bg-yellow-500 text-white rounded hover:bg-yellow-600"
        >
          Backspace
        </button>
      </div>

      {/* Buttons */}
      <div className="flex flex-row space-x-4 mb-4">
        <button
          onClick={handleSolve}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          disabled={loading}
        >
          {loading ? "Solving..." : "Solve"}
        </button>
      </div>

      {/* New Response */}
      {responseMessage && (
        <div className="mt-2 p-4 bg-gray-100 border border-gray-300 rounded w-full max-w-6xl">
          <h3 className="text-2xl font-bold mb-2 text-blue-600">Response:</h3>
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              p: ({ children }) => <p className="text-gray-800 mb-2">{children}</p>,
              ul: ({ children }) => <ul className="list-disc list-inside text-gray-800 mb-2">{children}</ul>,
              li: ({ children }) => <li className="mb-1">{children}</li>,
              code({
                inline,
                className,
                children,
                ...props
              }: React.HTMLAttributes<HTMLElement> & { inline?: boolean; children?: React.ReactNode }) {
                const match = /language-(\w+)/.exec(className || "");
                const code = String(children).trim();
                return !inline ? (
                  <div className="relative">
                    <SyntaxHighlighter
                      style={materialLight as any} // Fix for the style prop
                      language={match?.[1] || "text"}
                      PreTag="div"
                      {...props}
                    >
                      {code}
                    </SyntaxHighlighter>
                  </div>
                ) : (
                  <code className={className} {...props}>
                    {children}
                  </code>
                );
              },
            }}
          >
            {responseMessage}
          </ReactMarkdown>
        </div>
      )}
    </div>
  );
};

export default MathWiz;