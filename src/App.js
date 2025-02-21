import {BrowserRouter as Router, Navigate, Route, Routes} from "react-router-dom";
import React, {useEffect, useState} from "react";
import "react-date-range/dist/styles.css"; // Default Style
import "react-date-range/dist/theme/default.css"; // Theme Style
import Login from "./pages/login/login";
import Employees from "./pages/employees/employees";



const App = () => {
    const [isLoggedIn, setIsLoggedIn] = useState(null); // Null during initial check

    const checkLoginStatus = async () => {
        const accessToken = localStorage.getItem("accessToken");
        const period_start = new Date().toISOString().split("T")[0]; // example value
        const period_end = period_start;

        // Token not found
        if (!accessToken) {
            console.log("No token found. User is not logged in.");
            setIsLoggedIn(false);
            return;
        }

        try {
            const response = await fetch("/api/employees/", {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    period_start,
                    period_end,
                }),
            });

            if (response.status === 401) {
                console.warn("Token invalid or expired. Logging out the user.");
                localStorage.removeItem("accessToken");
                setIsLoggedIn(false);
            } else if (response.ok) {
                console.log("Token valid. User is logged in.");
                setIsLoggedIn(true);
            }
        } catch (err) {
            console.error("Error validating token:", err);
            setIsLoggedIn(false);
        }
    };

    useEffect(() => {
        checkLoginStatus()
            .then(() => {
                console.log("Login status successfully checked.");
            })
            .catch((error) => {
                console.error("Failed to check login status:", error);
            });
    }, []);

    // Avoid rendering routes until login status is known
    if (isLoggedIn === null) {
        return <div>Loading...</div>;
    }

    return (
        <Router>
            <Routes>
                {/* Conditionally redirect based on login state */}
                <Route path="/" element={<Navigate to={isLoggedIn ? "/employees" : "/login"} replace/>}/>
                <Route path="/login" element={<Login/>}/>
                <Route
                    path="/employees"
                    element={isLoggedIn ? <Employees/> : <Navigate to="/login" replace/>}
                />
                <Route path="*" element={<Navigate to="/" replace/>}/>
            </Routes>
        </Router>
    )
        ;
};

export default App;