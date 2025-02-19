import React, { useState } from "react";
import { Snackbar, Alert } from "@mui/material";

const Login = () => {
    const [snackbar, setSnackbar] = useState({
        open: false,
        message: "",
        severity: "info", // "info", "success", "warning", "error"
    });

    const handleClose = () => {
        setSnackbar({ ...snackbar, open: false });
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        const username = event.target.username.value;
        const password = event.target.password.value;

        try {
            // Get CSRF token from cookies (or an endpoint)
            const csrfToken = document.cookie
                .split("; ")
                .find((row) => row.startsWith("csrftoken="))
                ?.split("=")[1];

            const response = await fetch("/api/login/", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "X-CSRFToken": csrfToken, // Send CSRF token
                },
                body: JSON.stringify({ username, password }),
            });

            const result = await response.json();

            if (response.ok) {
                const { access, refresh } = result;
                localStorage.setItem("accessToken", access);
                localStorage.setItem("refreshToken", refresh);
                window.location.href = "/employees";
            } else {
                console.error("Login error:", result.error);
                setSnackbar({
                    open: true,
                    message: result.error || "Invalid login credentials",
                    severity: "error",
                });
            }
        } catch (err) {
            console.error("Fetch error:", err);
            setSnackbar({
                open: true,
                message: "Something went wrong. Please try again later.",
                severity: "error",
            });
        }
    };

    return (
        <div className="login-page">
            <div className="login-container">
                <h1>Login Page</h1>
                <form className="login-form" onSubmit={handleSubmit}>
                    <label htmlFor="username">Username:</label>
                    <input type="text" id="username" name="username" required />
                    <label htmlFor="password">Password:</label>
                    <input type="password" id="password" name="password" required />
                    <button type="submit">Login</button>
                </form>
                <Snackbar
                    open={snackbar.open}
                    autoHideDuration={6000}
                    onClose={handleClose}
                >
                    <Alert
                        onClose={handleClose}
                        severity={snackbar.severity}
                        sx={{ width: "100%" }}
                    >
                        {snackbar.message}
                    </Alert>
                </Snackbar>
            </div>
        </div>
    );
};

export default Login;