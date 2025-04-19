import { useState } from "react";

const TestInput = () => {
    const [value, setValue] = useState("");

    return (
        <input
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="Type here..."
            className="border border-gray-300 p-2 rounded w-1/2 text-black"
        />
    );
};

export default TestInput;