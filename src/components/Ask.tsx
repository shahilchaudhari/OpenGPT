import { useState } from "react";

const Ask = () => {
    const [question, setQuestion] = useState<string>(""); // State for the input
    const [responseMessage, setResponseMessage] = useState<string | null>(null); // State for API response
    const [loading, setLoading] = useState<boolean>(false);

    const handleAsk = async () => {
        const apiKey = import.meta.env.VITE_API_KEY; // Ensure this is set in your .env.local file
        const apiurl = "https://openrouter.ai/api/v1/chat/completions";


        if (!apiKey) {
            console.error("API key is missing. Please set it in your .env.local file.");
            alert("API key is missing. Please contact support.");
            return;
        }

        if (!question.trim()) {
            alert("Please enter a question before asking.");
            return;
        }

        setLoading(true); // Set loading to true when the request starts
        setResponseMessage(null); // Clear previous response


        try{

            const response = await fetch(apiurl, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${apiKey}`,
                },
                body: JSON.stringify({
                    model: "deepseek/deepseek-r1:free",
                    messages: [{ role: "user", content: question }],
                }),
            });

            if (!response.ok) {
                throw new Error(`API error: ${response.statusText}`);
            }

            const data = await response.json();
            console.log("API Response:", data);

            // Assuming the response contains a message in `data.choices[0].message.content`
            const message = data.choices?.[0]?.message?.content || "No response from the API.";
            setResponseMessage(message);
        } catch (error) {
            console.error("Error calling API:", error);
            setResponseMessage("An error occurred while calling the API.");
        } finally{
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col items-center h-screen bg-white">
            <input
                type="text"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="Type your question here..."
                className="text-2xl border border-gray-300 p-2 rounded mb-5 w-1/2 text-black"
            />

            <button
                onClick={handleAsk}
                className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                disabled={loading} // Disable the button while loading
            >
                {loading ? "Loading..." : "Ask"} {/* Show "Loading..." while waiting */}
            </button>
            {responseMessage && (
                <div className="mt-4 p-4 bg-gray-100 border border-gray-300 rounded w-4/5">
                    <p className="text-gray-800">{responseMessage}</p>
                </div>
            )}
        </div>
    );  
};

export default Ask;