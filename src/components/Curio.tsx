import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm"; // For GitHub-flavored markdown
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { materialLight } from "react-syntax-highlighter/dist/esm/styles/prism"; // Syntax highlighting style


type ContentItem =
    | { type: "text"; text: string }
    | { type: "image_url"; image_url: { url: string } };
    
type HistoryItem = {
    question: string;
    response: string;
    imageUrl?: string;
};

const Curio = () => {
    const [question, setQuestion] = useState<string>(""); // State for the input
    const [responseMessage, setResponseMessage] = useState<string | null>(null); // State for API response
    const [loading, setLoading] = useState<boolean>(false);
    const [history, setHistory] = useState<HistoryItem[]>([]); // State for conversation history
    const [uploadedImage, setUploadedImage] = useState<string | null>(null); // State for uploaded image URL
    const [copiedCode, setCopiedCode] = useState<string | null>(null); // State to track copied code

    // State for model selection
    const [selectedModel, setSelectedModel] = useState("moonshotai/moonlight-16b-a3b-instruct:free"); // Default model

    const models = [
        { label: "Moonlight", value: "moonshotai/moonlight-16b-a3b-instruct:free", supportsImage: false },
        { label: "DeepSeek R1", value: "deepseek/deepseek-r1:free", supportsImage: false },
        { label: "microsoft : phi-4-reasoning-plus", value: "microsoft/phi-4-reasoning-plus:free", supportsImage: false },
        { label: "qwen2.5-vl-72b-instruct", value: "qwen/qwen2.5-vl-72b-instruct:free", supportsImage: true },
        { label: "Meta-llama/llama-3.2-11b-vision-instruct", value: "meta-llama/llama-3.2-11b-vision-instruct:free", supportsImage: false },
        { label: "meta-llama/llama-3.2-1b-instruct:free", value: "meta-llama/llama-3.2-1b-instruct:free", supportsImage: false },
        { label: "opengvlab : internvl3-14b", value: "opengvlab/internvl3-14b:free", supportsImage: true },
        { label: "google/gemma-3-4b-it", value: "google/gemma-3-4b-it:free", supportsImage: true },
    ];

    const currentModelSupportsImage = () => {
        const model = models.find(m => m.value === selectedModel);
        return model ? model.supportsImage : false;
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Check if image is supported
        if (!file.type.match('image.*')) {
            alert('Please upload an image file (JPEG, PNG, etc.)');
            return;
        }

        const reader = new FileReader();
        reader.onload = (event) => {
            if (event.target?.result) {
                setUploadedImage(event.target.result as string);
            }
        };
        reader.readAsDataURL(file);
    };

    const copyToClipboard = (code: string) => {
        navigator.clipboard.writeText(code);
        setCopiedCode(code); // Set the copied code
        setTimeout(() => setCopiedCode(null), 2000); // Reset the state after 2 seconds
    };

    const handleAsk = async () => {
        const apiKey = import.meta.env.VITE_API_KEY; // Ensure this is set in your .env.local file
        const apiurl = "https://openrouter.ai/api/v1/chat/completions";

        if (!apiKey) {
            console.error("API key is missing. Please set it in your .env.local file.");
            alert("API key is missing. Please contact support.");
            return;
        }

        if (!question.trim() && !uploadedImage) {
            alert("Please enter a question or upload an image before asking.");
            return;
        }

        setLoading(true); // Set loading to true when the request starts
        setResponseMessage(null); // Clear previous response

        try {
            const content: ContentItem[] = [];

            // Add text question to the content if it exists
            if (question.trim()) {
                content.push({
                    type: "text",
                    text: question,
                });
            }

            // Add image to the content if it exists and model supports images
            if (uploadedImage && currentModelSupportsImage()) {
                content.push({
                    type: "image_url",
                    image_url: {
                        url: uploadedImage
                    }
                });
            }

            const messages = [
                {
                    role: "user",
                    content: content
                },
            ];

            const response = await fetch(apiurl, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${apiKey}`,
                },
                body: JSON.stringify({
                    model: selectedModel,
                    messages: messages,
                    stream: true, // Enable streaming
                }),
            });

            if (!response.ok) {
                throw new Error(`API error: ${response.statusText}`);
            }

            const reader = response.body?.getReader();
            if (!reader) {
                throw new Error("Failed to get reader from response body.");
            }

            const decoder = new TextDecoder("utf-8");

            let done = false;
            let buffer = ""; // Buffer to store partial chunks
            let fullResponse = ""; // Accumulate the full response here

            while (!done) {
                const { value, done: readerDone } = await reader.read();
                done = readerDone;

                if (value) {
                    const chunk = decoder.decode(value, { stream: true });
                    buffer += chunk; // Append the chunk to the buffer

                    // Process each line in the buffer
                    let boundary = buffer.indexOf("\n");
                    while (boundary !== -1) {
                        const line = buffer.slice(0, boundary).trim(); // Extract the line
                        buffer = buffer.slice(boundary + 1); // Remove the processed line from the buffer

                        if (line === "data: [DONE]") {
                            // End of stream
                            done = true;
                            break;
                        }

                        if (line.startsWith("data:")) {
                            const jsonChunk = line.slice(5).trim(); // Remove the "data:" prefix
                            try {
                                const parsedChunk = JSON.parse(jsonChunk);
                                const chunkText = parsedChunk.choices?.[0]?.delta?.content || ""; // Adjust based on API response
                                fullResponse += chunkText; // Accumulate the response
                                setResponseMessage((prev) => (prev || "") + chunkText); // Append the chunk to the existing response
                            } catch (err) {
                                console.error("Failed to parse chunk:", jsonChunk, err);
                            }
                        }

                        boundary = buffer.indexOf("\n"); // Find the next boundary
                    }
                }
            }

            // Append the question, response, and image to the history
            setHistory((prev) => [...prev, { 
                question, 
                response: fullResponse, 
            }]);

        } catch (error) {
            console.error("Error during streaming:", error);
            setResponseMessage("An error occurred while processing the response.");
        } finally {
            setLoading(false);
        }
    };

    const clearImage = () => {
        setUploadedImage(null);
    };

    return (
        <div className="flex flex-col items-center bg-gray-100">
            <h2 className="flex justify-center text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 animate-gradient-text mb-2 mt-0 p-4 rounded">
                Ask Anything, Anytime!
            </h2>
            <p className="text-gray-900 mb-4">Let AI fuel your 'what if' moments.</p>

            {/* Model Selection */}
            <div className="flex justify-center mb-6 w-full max-w-6xl">
                <select
                    value={selectedModel}
                    onChange={(e) => {
                        setSelectedModel(e.target.value);
                        // Clear image when switching models if new model doesn't support images
                        if (!models.find(m => m.value === e.target.value)?.supportsImage) {
                            setUploadedImage(null);
                        }
                    }}
                    className="p-2 border border-b-4 rounded-lg text-black"
                >
                    {models.map((model) => (
                        <option key={model.value} value={model.value}>
                            {model.label} {model.supportsImage ? "(Input Images)" : ""}
                        </option>
                    ))}
                </select>
            </div>

            <textarea
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="Type your question here..."
                className="text-2xl border bg-white border-gray-300 p-2 rounded mb-5 w-full max-w-6xl text-black"
                rows={3}
            ></textarea>

            {/* Image Upload Section */}
            {currentModelSupportsImage() && (
                <div className="mb-4 w-full max-w-6xl">
                    <div className="flex items-center space-x-4">
                        <label className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 cursor-pointer">
                            Upload Image
                            <input 
                                type="file" 
                                accept="image/*" 
                                onChange={handleImageUpload} 
                                className="hidden" 
                            />
                        </label>
                        {uploadedImage && (
                            <>
                                <div className="relative">
                                    <img 
                                        src={uploadedImage} 
                                        alt="Uploaded preview" 
                                        className="h-20 w-20 object-cover rounded"
                                    />
                                </div>
                                <button 
                                    onClick={clearImage}
                                    className="bg-red-500 text-white px-2 py-1 rounded hover:bg-red-600"
                                >
                                    Remove
                                </button>
                            </>
                        )}
                    </div>
                </div>
            )}

            <div className="flex flex-row space-x-4 mb-4">
                <button
                    onClick={handleAsk}
                    className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                    disabled={loading}
                >
                    {loading ? "Loading..." : "Ask"}
                </button>

                <button
                    onClick={() => {
                        setLoading(false);
                        setResponseMessage(null);
                    }}
                    className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
                >
                    Abort
                </button>

                <button
                    onClick={() => {
                        setHistory([]);
                        setResponseMessage(null);
                        setQuestion("");
                        setUploadedImage(null);
                    }}
                    className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
                >
                    New Chat
                </button>
            </div>

            {responseMessage && (
                <div className="mt-2 p-2 bg-gray-100 border border-gray-300 rounded w-full max-w-6xl">
                    <h3 className="text-2xl font-bold mb-2">Response:</h3>
                    <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
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
                                            style={materialLight as any}
                                            language={match?.[1] || "text"}
                                            PreTag="div"
                                            {...props}
                                        >
                                            {code}
                                        </SyntaxHighlighter>
                                        <button
                                            onClick={() => copyToClipboard(code)}
                                            className="absolute top-2 right-2 bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600"
                                        >
                                            {copiedCode === code ? "Copied!" : "Copy"}
                                        </button>
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

            {/* Chat History */}
            <h3 className="text-2xl font-bold mb-2 mt-4">Chat History</h3>
            <div className="mt-4 p-4 bg-white border border-gray-300 rounded w-full max-w-6xl h-100 overflow-y-auto">
                {[...history].reverse().map((item, index) => (
                    <div key={index} className="mb-4">
                        <p className="font-bold text-blue-600">Q: {item.question}</p>
                        {item.imageUrl && (
                            <div className="my-2">
                                <img 
                                    src={item.imageUrl} 
                                    alt="Question context" 
                                    className="max-h-40 rounded"
                                />
                            </div>
                        )}
                        <div className="text-gray-800">
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                {item.response}
                            </ReactMarkdown>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default Curio;